import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppShellErrorService } from './app-shell-error.service';
import { AppError, ClientError, NetworkError } from './app-error';

describe('AppShellErrorService', () => {
  let service: AppShellErrorService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    service = TestBed.inject(AppShellErrorService);
  });

  it('starts empty', () => {
    expect(service.error()).toBeNull();
    expect(service.hasError()).toBe(false);
  });

  it('show()/dismiss() toggle the shell error state', () => {
    const err = new NetworkError();
    service.show(err);
    expect(service.error()).toBe(err);
    expect(service.hasError()).toBe(true);

    service.dismiss();
    expect(service.error()).toBeNull();
    expect(service.hasError()).toBe(false);
  });

  it('suggests reload for chunk-load and unrecoverable client errors only', () => {
    service.show(new AppError({ category: 'client', code: 'chunk_load' }));
    expect(service.reloadSuggested()).toBe(true);

    service.show(new ClientError());
    expect(service.reloadSuggested()).toBe(true);

    service.show(new NetworkError());
    expect(service.reloadSuggested()).toBe(false);
  });
});
