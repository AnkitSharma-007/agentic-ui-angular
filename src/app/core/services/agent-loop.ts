import type { AgentEvent, ToolCallEvent } from '../streaming/agent-event';
import type { AgentEventStore } from '../streaming/agent-event.store';
import { summarizeChunk } from '../streaming/agent-stream';
import {
  chunkToEvents,
  initialStreamState,
  nextRoundState,
  type GeminiChunk,
  type StreamState,
} from '../streaming/to-agent-event.operator';
import type { InterruptService } from '../registry/interrupt.service';
import type { ToolRegistry } from '../registry/tool-registry';
import { settleToolCallsParallel, type SettledToolCall } from '../registry/tool-execution';
import {
  toTokenUsage,
  type TokenAccountantService,
} from '../observability/token-accountant.service';
import type { BudgetBreach, BudgetService } from '../observability/budget.service';
import { ZERO_USAGE, type TokenUsage } from '../observability/usage.types';
import type { AgentRegistry } from '../agents/agent-registry.service';
import { HANDOFF_TOOL_NAME } from '../../shared/tools/handoff-tool/handoff-tool.manifest';
import { PROPOSE_TOOL_NAME } from '../../shared/tools/propose-tool/propose-tool.manifest';
import { TOOL_SYNTHESIS_CLAUSE } from '../agents/agent-definitions';
import { normalizeUserTurnInput, type UserTurnInput } from '../media/attachment.types';
import { NetworkError } from '../errors/app-error';
import type { LoggerService } from '../logging/logger.service';

export const MAX_AGENT_ROUNDS = 8;

// Cap proposed tools per turn to prevent runaway self-extension.
export const MAX_TOOL_SYNTHESIS_PER_TURN = 2;

// Each handoff grants the receiving agent one extra round (so a handoff is never
// a turn's silent final act), bounded so two agents can't ping-pong forever.
export const MAX_HANDOFFS_PER_TURN = 2;

export interface StreamTimeouts {
  // Max wait for the first chunk — thinking models can take a while before emitting.
  readonly firstChunkMs: number;
  readonly idleMs: number;
}

// Long enough for slow-but-alive streams; short enough that a stalled connection surfaces as a retryable error.
export const DEFAULT_STREAM_TIMEOUTS: StreamTimeouts = {
  firstChunkMs: 60_000,
  idleMs: 30_000,
};

export interface StreamRoundRequest {
  readonly model: string;
  readonly contents: unknown;
  readonly config: {
    readonly systemInstruction: string;
    readonly thinkingConfig: Record<string, unknown>;
    readonly tools?: ReadonlyArray<{ readonly functionDeclarations: readonly unknown[] }>;
  };
}

export interface AgentLoopOptions {
  readonly model: string;
  readonly thinkingConfig: Record<string, unknown>;
}

export interface AgentLoopDeps {
  readonly streamChunks: (req: StreamRoundRequest) => Promise<AsyncIterable<GeminiChunk>>;
  readonly store: Pick<
    AgentEventStore,
    | 'beginTurn'
    | 'appendUserTurn'
    | 'appendToolResponses'
    | 'appendChunkToRawHistory'
    | 'bumpStats'
    | 'rawHistory'
    | 'loadRawHistory'
  >;
  readonly registry: Pick<ToolRegistry, 'get' | 'execute' | 'loadImpl' | 'declarations'>;
  readonly interrupts: Pick<InterruptService, 'pendingDecision'>;
  readonly tokenAccountant: Pick<
    TokenAccountantService,
    'beginTurn' | 'recordRound' | 'currentTurn'
  >;
  readonly budget: Pick<BudgetService, 'evaluate'>;
  readonly agents: Pick<
    AgentRegistry,
    'activeAgent' | 'activeAgentId' | 'switchActive' | 'resetForNewTurn'
  >;
  // User-defined custom tool names, unioned into every agent's declaration set. Optional in tests.
  readonly customToolNames?: () => ReadonlySet<string>;
  // Whether proposeTool is allowed; production wires a persisted flag. Defaults off.
  readonly allowToolSynthesis?: () => boolean;
  readonly now?: () => number;
  // Best-effort logger for non-fatal diagnostics. Optional in tests.
  readonly logger?: Pick<LoggerService, 'warn' | 'error'>;
  readonly timeouts?: StreamTimeouts;
}

interface RoundOutcome {
  readonly state: StreamState;
  readonly toolCalls: readonly ToolCallEvent[];
  readonly finishReason: string;
}

export async function* runAgentTurn(
  input: string | UserTurnInput,
  turnId: string,
  options: AgentLoopOptions,
  signal: AbortSignal,
  deps: AgentLoopDeps,
): AsyncGenerator<AgentEvent> {
  const now = deps.now ?? Date.now;

  // Snapshot history before appending the user turn so a pre-commit failure can roll back the orphaned message.
  const historyBeforeTurn = deps.store.rawHistory();
  beginTurn(turnId, normalizeUserTurnInput(input), deps);
  yield { type: 'turn_start', ts: now(), turnId };

  const allowSynthesis = deps.allowToolSynthesis?.() ?? false;
  let toolsProposed = 0;

  let state: StreamState = initialStreamState(turnId);
  // Handoffs extend the round budget so the receiving agent always gets to respond.
  let maxRounds = MAX_AGENT_ROUNDS;
  let handoffs = 0;
  let round = 0;

  try {
    for (; round < maxRounds; round++) {
      if (round > 0) state = nextRoundState(state);

      const breach = checkBudgetGuard(deps);
      if (breach) {
        yield budgetTerminationEvent(turnId, completedRounds(deps), breach, now);
        return;
      }

      const includeSynthesis = allowSynthesis && toolsProposed < MAX_TOOL_SYNTHESIS_PER_TURN;

      const outcome: RoundOutcome = yield* streamRound(
        options.model,
        options.thinkingConfig,
        state,
        turnId,
        signal,
        deps,
        now,
        includeSynthesis,
      );
      state = outcome.state;

      if (outcome.toolCalls.length === 0) {
        yield {
          type: 'turn_complete',
          ts: now(),
          turnId,
          rounds: round + 1,
          finishReason: outcome.finishReason,
        };
        return;
      }

      // Re-check budget after this round's usage — the top-of-loop guard alone can overshoot by a full round.
      const overshoot = checkBudgetGuard(deps);
      if (overshoot) {
        yield budgetTerminationEvent(turnId, completedRounds(deps), overshoot, now);
        return;
      }

      yield* settleRoundToolCalls(outcome.toolCalls, turnId, signal, deps, now);
      toolsProposed += outcome.toolCalls.filter((c) => c.name === PROPOSE_TOOL_NAME).length;

      // A handoff must never be a turn's final act — the newly-active agent has
      // not spoken yet. Grant it one more round (bounded) so it can respond,
      // even if this handoff landed on the last otherwise-allowed round.
      const handedOff = yield* applyHandoffIfRequested(outcome.toolCalls, turnId, deps, now);
      if (handedOff && handoffs < MAX_HANDOFFS_PER_TURN) {
        handoffs++;
        maxRounds = MAX_AGENT_ROUNDS + handoffs;
      }
    }

    yield {
      type: 'turn_complete',
      ts: now(),
      turnId,
      rounds: round,
      finishReason: 'MAX_AGENT_ROUNDS',
    };
  } catch (err) {
    // Roll back if only the user message was added (stream-setup failure). Abort and mid-stream failures keep committed context.
    if (!signal.aborted && deps.store.rawHistory().length === historyBeforeTurn.length + 1) {
      deps.store.loadRawHistory(historyBeforeTurn);
    }
    throw err;
  }
}

async function* streamRound(
  model: string,
  thinkingConfig: Record<string, unknown>,
  initialState: StreamState,
  turnId: string,
  signal: AbortSignal,
  deps: AgentLoopDeps,
  now: () => number,
  includeSynthesis: boolean,
): AsyncGenerator<AgentEvent, RoundOutcome> {
  const activeAgent = deps.agents.activeAgent();
  const declarations = declarationsForAgent(
    deps,
    activeAgent.toolNames,
    activeAgent.handoffTargets.length > 0,
    deps.customToolNames?.() ?? EMPTY_NAME_SET,
    includeSynthesis,
  );

  const systemInstruction = includeSynthesis
    ? `${activeAgent.systemPrompt} ${TOOL_SYNTHESIS_CLAUSE}`
    : activeAgent.systemPrompt;

  const stream = await deps.streamChunks({
    model,
    contents: deps.store.rawHistory(),
    config: {
      systemInstruction,
      thinkingConfig,
      tools: declarations.length > 0 ? [{ functionDeclarations: declarations }] : undefined,
    },
  });

  const roundStartedAt = now();
  const toolCalls: ToolCallEvent[] = [];
  let state = initialState;
  let latestUsage: TokenUsage = ZERO_USAGE;
  // Track usageMetadata presence so the meter shows unavailable instead of false $0 when absent.
  let sawUsage = false;
  let finishReason = 'STOP';

  // Race each next() against abort + stall timeout; for await only checks signal between chunks. Tear down on abnormal exit.
  const timeouts = deps.timeouts ?? DEFAULT_STREAM_TIMEOUTS;
  const iterator = stream[Symbol.asyncIterator]();
  let receivedFirstChunk = false;
  let completedNormally = false;
  try {
    while (true) {
      const timeoutMs = receivedFirstChunk ? timeouts.idleMs : timeouts.firstChunkMs;
      const result = await nextChunkOrAbort(iterator, signal, timeoutMs, receivedFirstChunk);
      if (result.done) break;
      receivedFirstChunk = true;
      const chunk = result.value;

      deps.store.appendChunkToRawHistory(chunk);
      const { parts, signedParts } = summarizeChunk(chunk);
      deps.store.bumpStats({ chunks: 1, parts, signedParts });

      if (chunk.usageMetadata) {
        latestUsage = toTokenUsage(chunk.usageMetadata);
        sawUsage = true;
      }

      const { events, state: nextState } = chunkToEvents(chunk, state);
      state = nextState;

      for (const event of events) {
        if (event.type === 'tool_call') {
          toolCalls.push(event);
        }
        if (event.type === 'round_complete') {
          finishReason = event.finishReason;
          const completedAt = now();
          deps.tokenAccountant.recordRound({
            turnId,
            roundIndex: event.roundIndex,
            startedAt: roundStartedAt,
            completedAt,
            usage: latestUsage,
            usageAvailable: sawUsage,
            model,
            finishReason: event.finishReason,
          });
          yield {
            ...event,
            latencyMs: completedAt - roundStartedAt,
            usage: latestUsage,
            usageAvailable: sawUsage,
          };
          continue;
        }
        yield event;
      }
    }
    completedNormally = true;
  } finally {
    // Abort, stall timeout, or throw: tear down the SDK stream so the HTTP connection does not linger.
    if (!completedNormally) {
      try {
        await iterator.return?.();
      } catch {
        // Best-effort teardown; the SDK may already have closed the stream.
      }
    }
  }

  if (!state.finalized) {
    const completedAt = now();
    deps.tokenAccountant.recordRound({
      turnId,
      roundIndex: state.roundIndex,
      startedAt: roundStartedAt,
      completedAt,
      usage: latestUsage,
      usageAvailable: sawUsage,
      model,
      finishReason: 'STOP',
    });
    yield {
      type: 'round_complete',
      ts: completedAt,
      turnId,
      roundIndex: state.roundIndex,
      finishReason: 'STOP',
      latencyMs: completedAt - roundStartedAt,
      usage: latestUsage,
      usageAvailable: sawUsage,
    };
  }

  return { state, toolCalls, finishReason };
}

// Race next() against abort and stall timeout; SDK next() won't settle until another chunk arrives.
function nextChunkOrAbort(
  iterator: AsyncIterator<GeminiChunk>,
  signal: AbortSignal,
  timeoutMs: number,
  receivedFirstChunk: boolean,
): Promise<IteratorResult<GeminiChunk>> {
  if (signal.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  let onAbort: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
  });

  const racers: Promise<IteratorResult<GeminiChunk>>[] = [iterator.next(), aborted];
  if (timeoutMs > 0) {
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(streamTimeoutError(timeoutMs, receivedFirstChunk)),
        timeoutMs,
      );
    });
    racers.push(timedOut);
  }

  return Promise.race(racers).finally(() => {
    if (onAbort) signal.removeEventListener('abort', onAbort);
    if (timer) clearTimeout(timer);
  });
}

function streamTimeoutError(timeoutMs: number, receivedFirstChunk: boolean): NetworkError {
  return new NetworkError({
    code: 'stream_timeout',
    retryable: true,
    userMessage:
      'Gemini stopped responding — the connection may have stalled. Check your connection and try again.',
    technicalMessage: `Stream timed out after ${timeoutMs}ms waiting for the ${
      receivedFirstChunk ? 'next' : 'first'
    } chunk.`,
  });
}

async function* settleRoundToolCalls(
  toolCalls: readonly ToolCallEvent[],
  turnId: string,
  signal: AbortSignal,
  deps: AgentLoopDeps,
  now: () => number,
): AsyncGenerator<AgentEvent> {
  // Pre-warm descriptor lazy loads for UI rendering; skip empty names (nameless calls never touch the registry).
  const uniqueNames = Array.from(new Set(toolCalls.map((c) => c.name))).filter(
    (name) => name.length > 0,
  );
  for (const name of uniqueNames) {
    deps.registry.loadImpl(name).catch((err) => {
      deps.logger?.warn(`Failed to preload tool descriptor "${name}".`, {
        category: 'client',
        context: { tool: name },
        error: err,
      });
    });
  }

  for (const call of toolCalls) {
    const descriptor = deps.registry.get(call.name);
    if (descriptor?.interruptive) {
      yield {
        type: 'interrupt_request',
        ts: now(),
        turnId,
        callId: call.callId,
        reason: descriptor.interruptReason ?? `${call.name} needs your approval before running.`,
      };
    }
  }

  const settled = new Map<string, SettledToolCall>();
  for await (const item of settleToolCallsParallel(toolCalls, turnId, signal, {
    registry: deps.registry,
    interrupts: deps.interrupts,
  })) {
    settled.set(item.call.callId, item);
    for (const event of item.events) yield event;
  }

  deps.store.appendToolResponses(
    toolCalls.map((call) => {
      // Guard lookup: if a call never settled, send a well-formed error part instead of crashing.
      const item = settled.get(call.callId);
      return {
        name: call.name,
        response: item?.responseForModel ?? {
          error: 'Tool call did not produce a result.',
        },
      };
    }),
  );
}

// Returns true when the active agent actually changed (so the caller can grant
// the receiving agent a round); false for no handoff or a rejected transition.
async function* applyHandoffIfRequested(
  toolCalls: readonly ToolCallEvent[],
  turnId: string,
  deps: AgentLoopDeps,
  now: () => number,
): AsyncGenerator<AgentEvent, boolean> {
  const lastHandoff = [...toolCalls].reverse().find((c) => c.name === HANDOFF_TOOL_NAME);
  if (!lastHandoff) return false;

  const args = lastHandoff.args as Record<string, unknown>;
  const toAgentId = typeof args['specialist'] === 'string' ? args['specialist'] : '';
  const reason = typeof args['reason'] === 'string' ? args['reason'] : '';
  const fromAgentId = deps.agents.activeAgentId();
  const transition = deps.agents.switchActive({ turnId, toAgentId, reason });
  if (!transition) return false;

  yield {
    type: 'agent_handoff',
    ts: now(),
    turnId,
    fromAgentId,
    toAgentId,
    reason,
  };
  return true;
}

function beginTurn(turnId: string, input: UserTurnInput, deps: AgentLoopDeps): void {
  deps.store.beginTurn(turnId);
  deps.tokenAccountant.beginTurn(turnId);
  deps.agents.resetForNewTurn();
  deps.store.appendUserTurn(input);
}

const EMPTY_NAME_SET: ReadonlySet<string> = new Set<string>();

function declarationsForAgent(
  deps: AgentLoopDeps,
  allowedNames: readonly string[],
  includeHandoff: boolean,
  customNames: ReadonlySet<string>,
  includeSynthesis: boolean,
) {
  const allowed = new Set<string>(allowedNames);
  if (includeHandoff) allowed.add(HANDOFF_TOOL_NAME);
  if (includeSynthesis) allowed.add(PROPOSE_TOOL_NAME);
  for (const name of customNames) allowed.add(name);
  return deps.registry.declarations().filter((d) => allowed.has(d.name));
}

function checkBudgetGuard(deps: AgentLoopDeps): BudgetBreach | null {
  const turn = deps.tokenAccountant.currentTurn();
  return deps.budget.evaluate({
    tokensUsed: turn.totals.totalTokens,
    roundsUsed: turn.rounds.length,
    costUsd: turn.costUsd,
  });
}

// Completed rounds from the accountant (not the loop index) so budget-exit turn_complete.rounds reflects actual work.
function completedRounds(deps: AgentLoopDeps): number {
  return deps.tokenAccountant.currentTurn().rounds.length;
}

function budgetTerminationEvent(
  turnId: string,
  rounds: number,
  breach: BudgetBreach,
  now: () => number,
): AgentEvent {
  return {
    type: 'turn_complete',
    ts: now(),
    turnId,
    rounds,
    finishReason: `BUDGET_EXCEEDED:${breach.kind}`,
  };
}
