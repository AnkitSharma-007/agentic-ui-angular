import { normalizeError } from './normalize-error';
import type { AppError } from './app-error';
import { abortableSleep } from '../async/abortable-delay';

export { abortableSleep };

// Bounded retry with exponential backoff+jitter for setup failures only — never mid-stream (would duplicate output/re-bill).
// Conservative: only retryable errors retried, aborts never, signal-aware backoff sleep.

export interface RetryOptions {
  // Aborts both the operation waits and the backoff sleeps.
  readonly signal?: AbortSignal;
  // Total attempts including the first (so 3 = 1 try + 2 retries). Default 3.
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  // Override the default "retry only retryable errors" policy.
  readonly shouldRetry?: (error: AppError, attempt: number) => boolean;
  readonly onRetry?: (error: AppError, attempt: number, delayMs: number) => void;
  // Injectable for deterministic tests.
  readonly sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export async function retryWithBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 4000;
  const sleep = options.sleep ?? abortableSleep;
  const shouldRetry = options.shouldRetry ?? ((error: AppError) => error.retryable);

  let attempt = 0;
  for (;;) {
    attempt++;
    if (options.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    try {
      return await operation(attempt);
    } catch (raw) {
      const appError = normalizeError(raw);
      const exhausted = attempt >= maxAttempts;
      if (exhausted || appError.isSilent || !shouldRetry(appError, attempt)) {
        // Re-throw original value so downstream classification sees exactly what was thrown.
        throw raw;
      }
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delayMs = applyJitter(backoff);
      options.onRetry?.(appError, attempt, delayMs);
      await sleep(delayMs, options.signal);
    }
  }
}

// Full-ish jitter: 50–100% of the computed backoff, so concurrent clients don't
// retry in lockstep.
function applyJitter(delayMs: number): number {
  return Math.round(delayMs * (0.5 + Math.random() * 0.5));
}
