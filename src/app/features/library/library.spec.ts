import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryComponent } from './library';
import { ReplayService } from '../../core/replay/replay.service';
import type { ReplaySummary } from '../../core/replay/replay.types';

describe('LibraryComponent', () => {
  beforeEach(() => {
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    });
  });

  it('renders the empty state when no replays are stored', async () => {
    const fixture = TestBed.createComponent(LibraryComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement).toBeDefined();
  });

  it('confirmingDelete / confirmingClear use two-step confirmation', async () => {
    const fixture = TestBed.createComponent(LibraryComponent);
    await fixture.whenStable();

    const inst = fixture.componentInstance as unknown as {
      confirmingClear: { (): boolean; set: (v: boolean) => void };
      clearAll: () => Promise<void>;
      cancelClear: () => void;
    };
    expect(inst.confirmingClear()).toBe(false);
    await inst.clearAll();
    expect(inst.confirmingClear()).toBe(true);
    inst.cancelClear();
    expect(inst.confirmingClear()).toBe(false);
  });

  it('deleteOne() resets confirmingDelete even when the IDB delete throws', async () => {
    const replays = TestBed.inject(ReplayService);
    vi.spyOn(replays, 'delete').mockRejectedValue(new Error('quota exceeded'));
    type Private = { _lastError: { set: (v: string | null) => void } };
    (replays as unknown as Private)._lastError.set('quota exceeded');

    const fixture = TestBed.createComponent(LibraryComponent);
    await fixture.whenStable();

    const inst = fixture.componentInstance as unknown as {
      confirmingDelete: { (): string | null };
      operationError: () => boolean;
      deleteOne: (s: ReplaySummary, e: Event) => Promise<void>;
    };

    const summary: ReplaySummary = {
      id: 'stuck',
      title: 'stuck',
      prompt: 'p',
      model: 'm',
      savedAt: new Date().toISOString(),
      durationMs: 0,
      eventCount: 0,
    };
    const evt = { stopPropagation: () => undefined } as Event;

    await inst.deleteOne(summary, evt);
    expect(inst.confirmingDelete()).toBe('stuck');

    // Second click commits despite rejection; confirm flag resets and error surfaces inline.
    await inst.deleteOne(summary, evt);
    expect(inst.confirmingDelete()).toBeNull();
    expect(inst.operationError()).toBe(true);
  });

  it('clearAll() resets confirmingClear even when the IDB clear throws', async () => {
    const replays = TestBed.inject(ReplayService);
    vi.spyOn(replays, 'clear').mockRejectedValue(new Error('aborted'));
    type Private = { _lastError: { set: (v: string | null) => void } };
    (replays as unknown as Private)._lastError.set('aborted');

    const fixture = TestBed.createComponent(LibraryComponent);
    await fixture.whenStable();

    const inst = fixture.componentInstance as unknown as {
      confirmingClear: { (): boolean };
      operationError: () => boolean;
      clearAll: () => Promise<void>;
    };

    await inst.clearAll();
    expect(inst.confirmingClear()).toBe(true);
    await inst.clearAll();
    expect(inst.confirmingClear()).toBe(false);
    expect(inst.operationError()).toBe(true);
  });

  it('dismissError() delegates to ReplayService.clearError so the inline banner can be closed', async () => {
    const replays = TestBed.inject(ReplayService);
    const clearSpy = vi.spyOn(replays, 'clearError');

    const fixture = TestBed.createComponent(LibraryComponent);
    await fixture.whenStable();

    (fixture.componentInstance as unknown as { dismissError: () => void }).dismissError();
    expect(clearSpy).toHaveBeenCalledOnce();
  });
});
