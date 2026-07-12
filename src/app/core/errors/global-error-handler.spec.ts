import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { GlobalErrorHandler } from './global-error-handler';
import { AppShellErrorService } from './app-shell-error.service';
import { AppError } from './app-error';
import { LOG_SINKS, type LogEntry, type LogSink } from '../logging/log-sink';

class CapturingSink implements LogSink {
  readonly entries: LogEntry[] = [];
  write(entry: LogEntry): void {
    this.entries.push(entry);
  }
}

// The handler escalates to the shell on a microtask; wait for it to flush.
const flushMicrotasks = () => Promise.resolve();

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;
  let shell: AppShellErrorService;
  let sink: CapturingSink;

  beforeEach(() => {
    sink = new CapturingSink();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: LOG_SINKS, useValue: [sink] },
        GlobalErrorHandler,
      ],
    });
    handler = TestBed.inject(GlobalErrorHandler);
    shell = TestBed.inject(AppShellErrorService);
  });

  it('logs every error and escalates non-silent ones to the shell', async () => {
    handler.handleError(new Error('boom'));
    expect(sink.entries).toHaveLength(1);

    await flushMicrotasks();
    expect(shell.error()).not.toBeNull();
    expect(shell.error()?.category).toBe('unknown');
  });

  it('does not escalate silent (abort) errors', async () => {
    handler.handleError(new DOMException('Aborted', 'AbortError'));
    await flushMicrotasks();
    expect(shell.error()).toBeNull();
  });

  it('does not escalate errors already handled by a closer layer', async () => {
    handler.handleError(new AppError({ category: 'api', handled: true }));
    await flushMicrotasks();
    expect(shell.error()).toBeNull();
  });

  it('unwraps zone/promise-wrapped rejections before classifying', async () => {
    handler.handleError({ rejection: new Error('401 Unauthorized') });
    await flushMicrotasks();
    expect(shell.error()?.category).toBe('auth');
  });
});
