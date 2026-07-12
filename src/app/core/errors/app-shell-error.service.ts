import { Service, computed, signal } from '@angular/core';
import type { AppError } from './app-error';

// Shell UI state for persistent boundary banner. Separate from ErrorService so pipeline stays presentation-agnostic.
@Service()
export class AppShellErrorService {
  private readonly _error = signal<AppError | null>(null);

  readonly error = this._error.asReadonly();
  readonly hasError = computed(() => this._error() !== null);

  // True when reload is the best fix (chunk_load or unrecoverable client error).
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
