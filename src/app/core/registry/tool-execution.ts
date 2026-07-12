import type { AgentEvent, ToolCallEvent } from '../streaming/agent-event';
import type { InterruptDecision, InterruptService } from '../registry/interrupt.service';
import type { ToolMeta, ToolExecutionContext } from './tool-descriptor';
import type { ToolRegistry } from './tool-registry';
import { redactString } from '../logging/redact';

export interface SettledToolCall {
  readonly call: ToolCallEvent;
  readonly events: readonly AgentEvent[];
  readonly responseForModel: Record<string, unknown> | { readonly error: string };
}

export interface ToolExecutionDeps {
  readonly registry: Pick<ToolRegistry, 'get' | 'execute'>;
  readonly interrupts: Pick<InterruptService, 'pendingDecision'>;
}

export async function settleSingleCall(
  call: ToolCallEvent,
  turnId: string,
  signal: AbortSignal,
  deps: ToolExecutionDeps,
): Promise<SettledToolCall> {
  // Bail if batch already cancelled — avoid new interrupt/execution after abort.
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

  const events: AgentEvent[] = [];

  // Nameless functionCall: synthetic error instead of registry lookup on empty name.
  if (!call.name) {
    const responseForModel = {
      error: 'The model emitted a tool call without a name; it was skipped.',
    } as const;
    events.push({
      type: 'tool_result',
      ts: Date.now(),
      turnId,
      callId: call.callId,
      result: responseForModel,
    });
    return { call, events, responseForModel };
  }

  const meta: ToolMeta | undefined = deps.registry.get(call.name);

  let decision: InterruptDecision = { kind: 'approve' };
  if (meta?.interruptive) {
    decision = await deps.interrupts.pendingDecision(call.callId, signal);
    events.push({
      type: 'interrupt_resolved',
      ts: Date.now(),
      turnId,
      callId: call.callId,
      decision: decision.kind,
      note: decision.kind === 'select' ? undefined : decision.note,
      selection: decision.kind === 'select' ? decision.selection : undefined,
    });
  }

  if (decision.kind === 'reject') {
    const reason = decision.note?.trim() || 'Cancelled by user.';
    const responseForModel = { rejected: true, reason } as const;
    events.push({
      type: 'tool_result',
      ts: Date.now(),
      turnId,
      callId: call.callId,
      result: responseForModel as unknown as Record<string, unknown>,
    });
    return { call, events, responseForModel };
  }

  if (decision.kind === 'select') {
    const responseForModel = { selected: decision.selection } as const;
    events.push({
      type: 'tool_result',
      ts: Date.now(),
      turnId,
      callId: call.callId,
      result: responseForModel as unknown as Record<string, unknown>,
    });
    return { call, events, responseForModel };
  }

  try {
    const ctx: ToolExecutionContext = { callId: call.callId, signal };
    const result = await deps.registry.execute(call.name, call.args, ctx);
    events.push({
      type: 'tool_result',
      ts: Date.now(),
      turnId,
      callId: call.callId,
      result,
    });
    return { call, events, responseForModel: result };
  } catch (err) {
    // Error string goes to model and tool card — redact secrets before leaving executor; message only, never stack.
    const raw = err instanceof Error ? err.message : String(err);
    const message = redactString(raw) || 'The tool failed to produce a result.';
    const responseForModel = { error: message } as const;
    events.push({
      type: 'tool_result',
      ts: Date.now(),
      turnId,
      callId: call.callId,
      result: responseForModel,
    });
    return { call, events, responseForModel };
  }
}

export async function* settleToolCallsParallel(
  calls: readonly ToolCallEvent[],
  turnId: string,
  signal: AbortSignal,
  deps: ToolExecutionDeps,
): AsyncGenerator<SettledToolCall> {
  // Per-batch controller cancels in-flight siblings when parent aborts or a call rejects; tools honoring ctx.signal stop.
  const batch = new AbortController();
  const onParentAbort = () => batch.abort();
  if (signal.aborted) batch.abort();
  else signal.addEventListener('abort', onParentAbort, { once: true });

  const pending = new Map<string, Promise<SettledToolCall>>();
  for (const call of calls) {
    pending.set(call.callId, settleSingleCall(call, turnId, batch.signal, deps));
  }

  try {
    while (pending.size > 0) {
      const settled = await Promise.race(pending.values());
      pending.delete(settled.call.callId);
      yield settled;
    }
  } catch (err) {
    batch.abort();
    // Let cancelled siblings unwind before propagating — avoids unhandled rejections after throw.
    await Promise.allSettled(pending.values());
    throw err;
  } finally {
    signal.removeEventListener('abort', onParentAbort);
  }
}
