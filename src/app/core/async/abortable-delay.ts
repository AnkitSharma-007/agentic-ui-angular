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
