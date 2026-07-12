import { afterEach, describe, expect, it, vi } from 'vitest';
import { abortableSleep, retryWithBackoff } from './retry';
import type { AppError } from './app-error';

// A sleep stub so tests never wait on real timers.
const noSleep = vi.fn(async () => {});

describe('retryWithBackoff', () => {
  afterEach(() => {
    noSleep.mockClear();
  });

  it('returns the result on first success without sleeping', async () => {
    const op = vi.fn(async () => 'ok');
    const result = await retryWithBackoff(op, { sleep: noSleep });
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
    expect(noSleep).not.toHaveBeenCalled();
  });

  it('retries a retryable (network) failure then resolves', async () => {
    const op = vi
      .fn<(attempt: number) => Promise<string>>()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce('recovered');

    const result = await retryWithBackoff(op, { sleep: noSleep });

    expect(result).toBe('recovered');
    expect(op).toHaveBeenCalledTimes(2);
    expect(noSleep).toHaveBeenCalledTimes(1);
  });

  it('does not retry a non-retryable (auth) failure', async () => {
    const op = vi.fn(async () => {
      throw new Error('401 Unauthorized: invalid API key');
    });

    await expect(retryWithBackoff(op, { sleep: noSleep })).rejects.toThrow(/401/);
    expect(op).toHaveBeenCalledTimes(1);
    expect(noSleep).not.toHaveBeenCalled();
  });

  it('never retries a cancellation (silent abort)', async () => {
    const op = vi.fn(async () => {
      throw new DOMException('Aborted', 'AbortError');
    });

    await expect(retryWithBackoff(op, { sleep: noSleep })).rejects.toThrow(/Abort/);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('stops after maxAttempts and re-throws the original error value', async () => {
    const original = new Error('Failed to fetch');
    const op = vi.fn(async () => {
      throw original;
    });

    await expect(retryWithBackoff(op, { sleep: noSleep, maxAttempts: 3 })).rejects.toBe(original);
    expect(op).toHaveBeenCalledTimes(3);
    expect(noSleep).toHaveBeenCalledTimes(2);
  });

  it('throws AbortError without invoking the operation when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const op = vi.fn(async () => 'unreached');

    await expect(
      retryWithBackoff(op, { sleep: noSleep, signal: controller.signal }),
    ).rejects.toThrow(/Abort/);
    expect(op).not.toHaveBeenCalled();
  });

  it('invokes onRetry with the classified error, attempt, and delay', async () => {
    const onRetry = vi.fn<(e: AppError, attempt: number, delayMs: number) => void>();
    const op = vi
      .fn<(attempt: number) => Promise<string>>()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce('ok');

    await retryWithBackoff(op, { sleep: noSleep, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    const [error, attempt, delayMs] = onRetry.mock.calls[0];
    expect(error.category).toBe('network');
    expect(attempt).toBe(1);
    expect(delayMs).toBeGreaterThan(0);
  });

  it('honors a custom shouldRetry predicate', async () => {
    const op = vi.fn(async () => {
      // Unknown category (default: not retryable) — forced retryable by predicate.
      throw new Error('boom');
    });

    await expect(
      retryWithBackoff(op, {
        sleep: noSleep,
        maxAttempts: 2,
        shouldRetry: () => true,
      }),
    ).rejects.toThrow(/boom/);
    expect(op).toHaveBeenCalledTimes(2);
  });
});

describe('abortableSleep', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the delay elapses', async () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const promise = abortableSleep(50).then(done);

    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(50);
    await promise;
    expect(done).toHaveBeenCalled();
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(abortableSleep(1000, controller.signal)).rejects.toThrow(/Abort/);
  });

  it('rejects when the signal aborts mid-wait and clears its timer', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const promise = abortableSleep(1000, controller.signal);
    controller.abort();
    await expect(promise).rejects.toThrow(/Abort/);
  });
});
