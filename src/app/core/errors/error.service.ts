import { Service, inject } from '@angular/core';
import { LoggerService, type LogMeta } from '../logging/logger.service';
import type { LogLevel } from '../logging/log-sink';
import {
  NotificationService,
  type NotificationKind,
} from '../../shared/notifications/notification.service';
import { AppShellErrorService } from './app-shell-error.service';
import { AppError, type ErrorSeverity } from './app-error';
import { normalizeError } from './normalize-error';

// Where handled errors surface: auto (default routing), toast, shell (app-breaking), none (log only).
export type ErrorSurface = 'auto' | 'toast' | 'shell' | 'none';

export interface HandleOptions {
  readonly context?: Record<string, unknown>;
  readonly surface?: ErrorSurface;
  readonly correlationId?: string;
  // When provided (and the error surfaces as a toast), adds a "Retry" action.
  readonly retry?: () => void;
}

// Central boundary policy: normalize → log → present. Use normalize() for classification only.
@Service()
export class ErrorService {
  private readonly logger = inject(LoggerService);
  private readonly notifications = inject(NotificationService);
  private readonly shell = inject(AppShellErrorService);

  handle(error: unknown, options?: HandleOptions): AppError {
    const appError = normalizeError(error, options?.context);
    if (options?.correlationId) appError.enrich({ correlationId: options.correlationId });
    this.log(appError);
    this.present(appError, options);
    return appError;
  }

  normalize(error: unknown, context?: Record<string, unknown>): AppError {
    return normalizeError(error, context);
  }

  private present(appError: AppError, options?: HandleOptions): void {
    const surface = options?.surface ?? 'auto';
    if (surface === 'none' || appError.isSilent || appError.handled) return;

    const target = surface === 'auto' ? routeSurface(appError) : surface;
    if (target === 'shell') {
      this.shell.show(appError);
    } else {
      this.notifications.notify(appError.userMessage, {
        kind: severityToKind(appError.severity),
        action: options?.retry ? { label: 'Retry', handler: options.retry } : undefined,
        dedupeKey: `${appError.category}:${appError.code ?? ''}:${appError.userMessage}`,
      });
    }
    appError.markHandled();
  }

  private log(appError: AppError): void {
    const meta: LogMeta = {
      category: appError.category,
      correlationId: appError.correlationId,
      context: appError.context ? { ...appError.context } : undefined,
      error: appError.cause ?? appError,
    };
    const detail = appError.technicalMessage || appError.userMessage;

    if (appError.isSilent) {
      this.logger.debug(detail, meta);
      return;
    }
    this.logger[severityToLevel(appError.severity)](detail, meta);
  }
}

// App-breaking errors → shell boundary; everything else → toast.
function routeSurface(appError: AppError): 'toast' | 'shell' {
  if (appError.code === 'chunk_load' || appError.severity === 'fatal') return 'shell';
  return 'toast';
}

function severityToKind(severity: ErrorSeverity): NotificationKind {
  switch (severity) {
    case 'info':
      return 'info';
    case 'warn':
      return 'warn';
    case 'error':
    case 'fatal':
      return 'error';
  }
}

function severityToLevel(severity: ErrorSeverity): LogLevel {
  switch (severity) {
    case 'info':
      return 'info';
    case 'warn':
      return 'warn';
    case 'error':
    case 'fatal':
      return 'error';
  }
}
