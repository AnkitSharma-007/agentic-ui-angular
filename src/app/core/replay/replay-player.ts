import { Observable } from 'rxjs';
import type { AgentEvent } from '../streaming/agent-event';

export type ReplaySpeed = 0.5 | 1 | 2 | 4;

export interface ReplayPlayOptions {
  readonly speed?: ReplaySpeed | (() => ReplaySpeed);
  readonly maxDelayMs?: number;
  readonly signal?: AbortSignal;
  readonly schedule?: ScheduleFn;
}

type ScheduleFn = (cb: () => void, ms: number) => { cancel: () => void };

const DEFAULT_SCHEDULE: ScheduleFn = (cb, ms) => {
  const handle = setTimeout(cb, ms) as unknown as number;
  return { cancel: () => clearTimeout(handle) };
};

export function play(
  events: readonly AgentEvent[],
  options: ReplayPlayOptions = {},
): Observable<AgentEvent> {
  const speedOption = options.speed;
  const getSpeed: () => ReplaySpeed =
    typeof speedOption === 'function' ? speedOption : () => speedOption ?? 1;
  const maxDelayMs = options.maxDelayMs ?? 4000;
  const schedule = options.schedule ?? DEFAULT_SCHEDULE;

  return new Observable<AgentEvent>((subscriber) => {
    if (events.length === 0) {
      subscriber.complete();
      return;
    }

    if (options.signal?.aborted) {
      subscriber.complete();
      return;
    }

    let cancelled = false;
    let cancelCurrent: (() => void) | null = null;

    const cleanup = () => {
      cancelled = true;
      cancelCurrent?.();
      cancelCurrent = null;
      options.signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      subscriber.complete();
    };

    options.signal?.addEventListener('abort', onAbort, { once: true });

    const tick = (i: number) => {
      if (cancelled) return;
      const event = events[i];
      subscriber.next({ ...event, ts: Date.now() } as AgentEvent);

      if (i + 1 >= events.length) {
        cleanup();
        subscriber.complete();
        return;
      }
      const delay = Math.max(0, Math.min((events[i + 1].ts - event.ts) / getSpeed(), maxDelayMs));
      cancelCurrent = schedule(() => tick(i + 1), delay).cancel;
    };

    queueMicrotask(() => {
      if (!cancelled) tick(0);
    });

    return cleanup;
  });
}
