import { ErrorHandler, Injectable, inject } from '@angular/core';
import { AppShellErrorService } from './app-shell-error.service';
import { ErrorService } from './error.service';

// The application's global backstop. Angular routes every otherwise-uncaught
// error here (including window `error` / `unhandledrejection` events via
// `provideBrowserGlobalErrorListeners`). We normalize + log every one, and
// escalate the ones worth showing to the app-shell boundary. Routine,
// user-triggered failures are surfaced closer to their source (inline banners
// today; toasts in Phase 2) and marked handled so they don't double-surface.
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly errors = inject(ErrorService);
  private readonly shell = inject(AppShellErrorService);

  handleError(error: unknown): void {
    const appError = this.errors.handle(unwrap(error), { source: 'global' });

    // Cancellations are silent; already-handled errors were surfaced by a
    // closer layer.
    if (appError.isSilent || appError.handled) return;

    // Setting the shell signal can synchronously trigger change detection; defer
    // to a microtask so we never mutate view state re-entrantly from within the
    // cycle that threw.
    queueMicrotask(() => this.shell.show(appError));
  }
}

// Angular and the browser wrap the original throwable in a few well-known ways
// (zone rejections, re-thrown promise reasons). Peel those back so the
// normalizer classifies the real error.
function unwrap(error: unknown): unknown {
  if (error && typeof error === 'object') {
    const wrapped = error as { rejection?: unknown; ngOriginalError?: unknown };
    if (wrapped.rejection !== undefined) return wrapped.rejection;
    if (wrapped.ngOriginalError !== undefined) return wrapped.ngOriginalError;
  }
  return error;
}
