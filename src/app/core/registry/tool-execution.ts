import type { AgentEvent, ToolCallEvent } from '../streaming/agent-event';
import type { InterruptDecision, InterruptService } from '../registry/interrupt.service';
import type { ToolMeta, ToolExecutionContext } from './tool-descriptor';
import type { ToolRegistry } from './tool-registry';

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
  const meta: ToolMeta | undefined = deps.registry.get(call.name);
  const events: AgentEvent[] = [];

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
    const message = err instanceof Error ? err.message : String(err);
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
  const pending = new Map<string, Promise<SettledToolCall>>();
  for (const call of calls) {
    pending.set(call.callId, settleSingleCall(call, turnId, signal, deps));
  }

  while (pending.size > 0) {
    const settled = await Promise.race(pending.values());
    pending.delete(settled.call.callId);
    yield settled;
  }
}
