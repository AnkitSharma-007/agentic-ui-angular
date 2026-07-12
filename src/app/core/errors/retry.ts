import { normalizeError } from './normalize-error';
import type { AppError } from './app-error';

// Bounded retry with exponential backoff + jitter, used only for *setup*
// failures (establishing a stream / a one-shot probe) — never mid-stream, where
// a retry would duplicate already-emitted output and re-bill tokens.
//
// The policy is deliberately conservative: only errors classified as
// `retryable` (transient network / rate-limit) are retried, cancellations are
// never retried, and the whole thing is abort-aware — a pending backoff sleep
// rejects immediately when the signal fires so Stop is honored without waiting
// out the delay.

export interface RetryOptions {
  // Aborts both the operation waits and the backoff sleeps.
  readonly signal?: AbortSignal;
  // Total attempts including the first (so 3 = 1 try + 2 retries). Default 3.
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  // Override the default "retry only retryable errors" policy.
  readonly shouldRetry?: (error: AppError, attempt: number) => boolean;
  // Observed before each backoff sleep — handy for logging.
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
        // Re-throw the *original* value so downstream classification/redaction
        // sees exactly what was thrown (retry is transparent on failure).
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

// A `setTimeout` wrapped as a promise that rejects (AbortError) the moment the
// signal fires, and always clears its timer/listener so nothing leaks.
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  return new Promise<void>((resolve, reject) => {
    let onAbort: (() => void) | null = null;
    const done = () => {
      if (onAbort && signal) signal.removeEventListener('abort', onAbort);
    };
    const timer = setTimeout(() => {
      done();
      resolve();
    }, ms);
    if (signal) {
      onAbort = () => {
        clearTimeout(timer);
        done();
        reject(new DOMException('Aborted', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}
