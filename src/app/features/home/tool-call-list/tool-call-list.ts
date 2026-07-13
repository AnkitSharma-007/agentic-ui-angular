import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

import { ToolRegistry } from '../../../core/registry/tool-registry';
import { LoggerService } from '../../../core/logging/logger.service';
import type { ToolCallState } from '../../../core/streaming/agent-event.store';
import { ToolErrorFallbackComponent } from '../../../shared/error-boundary/tool-error-fallback';

@Component({
  selector: 'app-tool-call-list',
  imports: [NgComponentOutlet, ToolErrorFallbackComponent],
  templateUrl: './tool-call-list.html',
  styleUrl: './tool-call-list.scss',
})
export class ToolCallListComponent {
  protected readonly registry = inject(ToolRegistry);
  private readonly logger = inject(LoggerService);

  readonly calls = input.required<readonly ToolCallState[]>();

  protected readonly displayed = computed(() =>
    collapseSingletonCards(this.calls(), (name) => this.registry.get(name)?.singleton ?? false),
  );

  protected readonly retryingTools = signal<ReadonlySet<string>>(new Set());

  constructor() {
    effect(() => {
      const ids = new Set(this.displayed().map((c) => c.callId));
      for (const key of [...this.inputsCache.keys()]) {
        if (!ids.has(key)) this.inputsCache.delete(key);
      }
    });
  }

  protected componentFor(call: ToolCallState) {
    void this.registry.loadedNames();
    return this.registry.componentFor(call.name);
  }

  protected retryToolLoad(name: string): void {
    if (this.retryingTools().has(name)) return;
    this.retryingTools.update((s) => new Set(s).add(name));
    void this.registry
      .loadImpl(name)
      .catch((err) => {
        this.logger.debug('Tool module retry failed.', {
          category: 'chunk_load',
          context: { feature: 'home', op: 'retryToolLoad', tool: name },
          error: err,
        });
      })
      .finally(() => {
        this.retryingTools.update((s) => {
          const next = new Set(s);
          next.delete(name);
          return next;
        });
      });
  }

  // NgComponentOutlet re-applies inputs on new references; cache per callId and reuse while fields unchanged.
  private readonly inputsCache = new Map<
    string,
    {
      readonly args: unknown;
      readonly result: unknown;
      readonly status: ToolCallState['status'];
      readonly errorMessage: string | null;
      readonly interruptReason: string | null;
      readonly value: Record<string, unknown>;
    }
  >();

  protected inputsFor(call: ToolCallState): Record<string, unknown> {
    const interruptReason = call.interruptReason ?? null;
    const cached = this.inputsCache.get(call.callId);
    if (
      cached &&
      cached.args === call.args &&
      cached.result === call.result &&
      cached.status === call.status &&
      cached.errorMessage === call.errorMessage &&
      cached.interruptReason === interruptReason
    ) {
      return cached.value;
    }
    const value: Record<string, unknown> = {
      callId: call.callId,
      args: call.args,
      result: call.result,
      status: call.status,
      errorMessage: call.errorMessage,
      interruptReason,
    };
    this.inputsCache.set(call.callId, {
      args: call.args,
      result: call.result,
      status: call.status,
      errorMessage: call.errorMessage,
      interruptReason,
      value,
    });
    return value;
  }
}

// Collapse singleton tools to one card (latest, preferring non-failed); registry drives which names qualify.
function collapseSingletonCards(
  calls: readonly ToolCallState[],
  isSingleton: (name: string) => boolean,
): readonly ToolCallState[] {
  const winners = new Map<string, ToolCallState>();
  let hasSingleton = false;
  for (const call of calls) {
    if (!isSingleton(call.name)) continue;
    hasSingleton = true;
    const kept = winners.get(call.name);
    if (!kept) {
      winners.set(call.name, call);
      continue;
    }
    const keptFailed = kept.status === 'error' || kept.status === 'rejected';
    const candFailed = call.status === 'error' || call.status === 'rejected';
    if (keptFailed && !candFailed) winners.set(call.name, call);
    else if (keptFailed === candFailed) winners.set(call.name, call);
  }
  if (!hasSingleton) return calls;
  return calls.filter((c) => !isSingleton(c.name) || winners.get(c.name)?.callId === c.callId);
}
