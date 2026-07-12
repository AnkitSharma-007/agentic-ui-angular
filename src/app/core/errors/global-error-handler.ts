import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorService } from './error.service';

// Global backstop for uncaught errors (via provideBrowserGlobalErrorListeners). Hands to ErrorService; cancellations and already-surfaced errors skipped inside.
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly errors = inject(ErrorService);

  handleError(error: unknown): void {
    this.errors.handle(unwrap(error), { context: { source: 'global' } });
  }
}

// Peel Angular/browser wrappers (zone rejections, ngOriginalError) so normalizer sees the real error.
function unwrap(error: unknown): unknown {
  if (error && typeof error === 'object') {
    const wrapped = error as { rejection?: unknown; ngOriginalError?: unknown };
    if (wrapped.rejection !== undefined) return wrapped.rejection;
    if (wrapped.ngOriginalError !== undefined) return wrapped.ngOriginalError;
  }
  return error;
}
