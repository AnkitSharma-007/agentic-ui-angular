import { describe, expect, it, vi, afterEach } from 'vitest';
import type { AgentEvent, TurnStartEvent, TextDeltaEvent } from '../streaming/agent-event';
import { play, type ReplaySpeed } from './replay-player';

afterEach(() => {
  vi.useRealTimers();
});

function event(ts: number, partial: Partial<AgentEvent> = {}): AgentEvent {
  return {
    type: 'text_delta',
    ts,
    turnId: 't1',
    chunk: 'x',
    ...partial,
  } as AgentEvent;
}

describe('replay player', () => {
  it('completes immediately on empty input', async () => {
    const out: AgentEvent[] = [];
    let completed = false;
    play([]).subscribe({ next: (e) => out.push(e), complete: () => (completed = true) });
    await Promise.resolve();
    expect(out).toEqual([]);
    expect(completed).toBe(true);
  });

  it('emits the first event on the next microtask', async () => {
    const start: TurnStartEvent = { type: 'turn_start', ts: 1000, turnId: 't1' };
    const out: AgentEvent[] = [];
    let completed = false;

    play([start]).subscribe({ next: (e) => out.push(e), complete: () => (completed = true) });

    expect(out).toEqual([]);

    await Promise.resolve();

    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('turn_start');
    expect(completed).toBe(true);
  });

  it('honours inter-event deltas at 1x via injected scheduler', async () => {
    const scheduled: Array<{ delay: number; cb: () => void }> = [];
    const schedule = vi.fn((cb: () => void, ms: number) => {
      scheduled.push({ delay: ms, cb });
      return { cancel: vi.fn() };
    });

    const events: AgentEvent[] = [
      event(1000),
      event(1100),
      event(1400),
      event(1450),
    ];
    const out: AgentEvent[] = [];
    let completed = false;
    play(events, { schedule }).subscribe({
      next: (e) => out.push(e),
      complete: () => (completed = true),
    });

    await Promise.resolve();
    expect(out).toHaveLength(1);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(scheduled[0].delay).toBe(100);

    scheduled[0].cb();
    expect(out).toHaveLength(2);
    expect(scheduled[1].delay).toBe(300);

    scheduled[1].cb();
    expect(out).toHaveLength(3);
    expect(scheduled[2].delay).toBe(50);

    scheduled[2].cb();
    expect(out).toHaveLength(4);
    expect(completed).toBe(true);
  });

  it('scales delays by the speed multiplier', async () => {
    const scheduled: Array<{ delay: number; cb: () => void }> = [];
    const schedule = vi.fn((cb: () => void, ms: number) => {
      scheduled.push({ delay: ms, cb });
      return { cancel: vi.fn() };
    });

    const events: AgentEvent[] = [event(0), event(1000), event(3000)];
    play(events, { speed: 2, schedule }).subscribe();

    await Promise.resolve();
    expect(scheduled[0].delay).toBe(500);
    scheduled[0].cb();
    expect(scheduled[1].delay).toBe(1000);
  });

  it('reads speed dynamically when given a getter (supports mid-playback changes)', async () => {
    let currentSpeed: ReplaySpeed = 1;
    const scheduled: Array<{ delay: number; cb: () => void }> = [];
    const schedule = vi.fn((cb: () => void, ms: number) => {
      scheduled.push({ delay: ms, cb });
      return { cancel: vi.fn() };
    });

    const events: AgentEvent[] = [event(0), event(1000), event(3000)];
    play(events, { speed: () => currentSpeed, schedule }).subscribe();

    await Promise.resolve();
    expect(scheduled[0].delay).toBe(1000);

    currentSpeed = 4;
    scheduled[0].cb();
    expect(scheduled[1].delay).toBe(500);
  });

  it('clamps individual delays to maxDelayMs', async () => {
    const scheduled: Array<{ delay: number; cb: () => void }> = [];
    const schedule = (cb: () => void, ms: number) => {
      scheduled.push({ delay: ms, cb });
      return { cancel: () => undefined };
    };

    const events: AgentEvent[] = [event(0), event(60_000)];
    play(events, { schedule, maxDelayMs: 4000 }).subscribe();

    await Promise.resolve();
    expect(scheduled[0].delay).toBe(4000);
  });

  it('rewrites ts on emitted events to the current epoch', async () => {
    const before = Date.now();
    const events: AgentEvent[] = [
      { type: 'turn_start', ts: 1_700_000_000_000, turnId: 't1' },
    ];
    const out: AgentEvent[] = [];
    play(events).subscribe({ next: (e) => out.push(e) });

    await Promise.resolve();
    expect(out[0].ts).toBeGreaterThanOrEqual(before);
    expect(out[0].ts).toBeLessThanOrEqual(Date.now() + 50);
  });

  it('completes (no further events) when AbortSignal aborts mid-stream', async () => {
    const scheduled: Array<{ cancel: ReturnType<typeof vi.fn>; cb: () => void }> = [];
    const schedule = (cb: () => void, _ms: number) => {
      const handle = { cancel: vi.fn(), cb };
      scheduled.push(handle);
      return handle;
    };

    const controller = new AbortController();
    const events: AgentEvent[] = [event(0), event(100), event(200)];
    const out: AgentEvent[] = [];
    let completed = false;

    play(events, { schedule, signal: controller.signal }).subscribe({
      next: (e) => out.push(e),
      complete: () => (completed = true),
    });

    await Promise.resolve();
    expect(out).toHaveLength(1);

    controller.abort();
    expect(scheduled[0].cancel).toHaveBeenCalledTimes(1);
    expect(completed).toBe(true);
    expect(out).toHaveLength(1);
  });

  it('completes immediately if AbortSignal was already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const events: AgentEvent[] = [event(0), event(100)];
    const out: AgentEvent[] = [];
    let completed = false;

    play(events, { signal: controller.signal }).subscribe({
      next: (e) => out.push(e),
      complete: () => (completed = true),
    });

    await Promise.resolve();
    expect(out).toEqual([]);
    expect(completed).toBe(true);
  });

  it('cancels the pending timer when the subscription is torn down', async () => {
    const scheduled: Array<{ cancel: ReturnType<typeof vi.fn>; cb: () => void }> = [];
    const schedule = (cb: () => void, _ms: number) => {
      const handle = { cancel: vi.fn(), cb };
      scheduled.push(handle);
      return handle;
    };

    const events: AgentEvent[] = [event(0), event(100), event(200)];
    const sub = play(events, { schedule }).subscribe();

    await Promise.resolve();
    sub.unsubscribe();
    expect(scheduled[0].cancel).toHaveBeenCalledTimes(1);
  });

  it('preserves event content beyond ts (chunk, type, custom fields)', async () => {
    const delta: TextDeltaEvent = {
      type: 'text_delta',
      ts: 1000,
      turnId: 't1',
      chunk: 'hello',
    };
    const out: AgentEvent[] = [];
    play([delta]).subscribe({ next: (e) => out.push(e) });

    await Promise.resolve();
    expect(out[0]).toMatchObject({ type: 'text_delta', turnId: 't1', chunk: 'hello' });
    expect(out[0].ts).not.toBe(1000);
  });
});
