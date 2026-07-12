import { Service, computed, signal } from '@angular/core';
import type { AppError } from './app-error';

// The last-resort UI state for the app shell. When the GlobalErrorHandler (or a
// navigation/chunk-load failure) catches something users should know about, it
// records it here and the root shell renders a dismissible boundary banner.
// Kept separate from `ErrorService` so the error pipeline stays presentation-
// agnostic and this signal state can be read directly by the shell template.
@Service()
export class AppShellErrorService {
  private readonly _error = signal<AppError | null>(null);

  readonly error = this._error.asReadonly();
  readonly hasError = computed(() => this._error() !== null);

  // True when the surfaced error is best resolved by reloading (a stale-deploy
  // chunk-load failure, or an otherwise unrecoverable client error).
  readonly reloadSuggested = computed(() => {
    const err = this._error();
    if (!err) return false;
    return err.code === 'chunk_load' || (!err.recoverable && err.category === 'client');
  });

  show(error: AppError): void {
    this._error.set(error);
  }

  dismiss(): void {
    this._error.set(null);
  }
}
