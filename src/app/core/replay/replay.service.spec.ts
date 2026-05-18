import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { ReplayService } from './replay.service';
import type { ReplayPayload } from './replay.types';

function makePayload(partial: Partial<ReplayPayload> = {}): ReplayPayload {
  return {
    schemaVersion: 1,
    id: partial.id ?? 'r-1',
    title: partial.title ?? 'Test run',
    savedAt: partial.savedAt ?? new Date('2026-05-10T10:00:00.000Z').toISOString(),
    prompt: partial.prompt ?? 'Plan a weekend in Goa.',
    model: partial.model ?? 'gemini-3-flash-preview',
    events:
      partial.events ?? [
        { type: 'turn_start', ts: 0, turnId: 't1' },
        { type: 'turn_complete', ts: 100, turnId: 't1', rounds: 1, finishReason: 'STOP' },
      ],
    rawHistory: partial.rawHistory ?? [],
    durationMs: partial.durationMs ?? 100,
    eventCount: partial.eventCount ?? 2,
    stats: partial.stats ?? { chunks: 1, parts: 1, signedParts: 0 },
  };
}

describe('ReplayService', () => {
  let service: ReplayService;

  beforeEach(() => {
    // Fresh in-memory IDB per test — equivalent to a clean profile / private
    // window, avoiding cross-test pollution without needing to deleteDatabase
    // (which would deadlock against the service's open connection).
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReplayService);
  });

  it('starts with an empty cache and count = 0', () => {
    expect(service.summaries()).toEqual([]);
    expect(service.count()).toBe(0);
    expect(service.loaded()).toBe(false);
    expect(service.unavailable()).toBe(false);
    expect(service.lastError()).toBeNull();
  });

  it('save() persists a payload and surfaces a summary in the signal', async () => {
    const payload = makePayload({ id: 'run-1', title: 'Goa weekend' });

    await service.save(payload);

    expect(service.count()).toBe(1);
    const summaries = service.summaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: 'run-1',
      title: 'Goa weekend',
      durationMs: 100,
      eventCount: 2,
    });
    expect(service.lastError()).toBeNull();
  });

  it('load() round-trips the full payload including events and stats', async () => {
    const payload = makePayload({ id: 'run-rt' });
    await service.save(payload);

    const loaded = await service.load('run-rt');

    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(payload);
  });

  it('load() returns null for an unknown id', async () => {
    const loaded = await service.load('does-not-exist');
    expect(loaded).toBeNull();
  });

  it('save() with an existing id overwrites the prior record', async () => {
    await service.save(makePayload({ id: 'dup', title: 'First version', durationMs: 100 }));
    await service.save(makePayload({ id: 'dup', title: 'Second version', durationMs: 200 }));

    expect(service.count()).toBe(1);
    expect(service.summaries()[0]).toMatchObject({
      id: 'dup',
      title: 'Second version',
      durationMs: 200,
    });

    const loaded = await service.load('dup');
    expect(loaded?.title).toBe('Second version');
    expect(loaded?.durationMs).toBe(200);
  });

  it('refresh() rehydrates the cache from IDB after a fresh service instance', async () => {
    await service.save(makePayload({ id: 'persist-1', title: 'Persisted run' }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(ReplayService);

    expect(fresh.summaries()).toEqual([]);
    const summaries = await fresh.refresh();
    expect(summaries).toHaveLength(1);
    expect(fresh.summaries()).toHaveLength(1);
    expect(fresh.summaries()[0].id).toBe('persist-1');
    expect(fresh.loaded()).toBe(true);
  });

  it('refresh() sorts summaries newest-savedAt first', async () => {
    await service.save(
      makePayload({ id: 'old', savedAt: '2026-05-01T08:00:00.000Z' }),
    );
    await service.save(
      makePayload({ id: 'new', savedAt: '2026-05-15T08:00:00.000Z' }),
    );
    await service.save(
      makePayload({ id: 'mid', savedAt: '2026-05-10T08:00:00.000Z' }),
    );

    const summaries = await service.refresh();
    expect(summaries.map((s) => s.id)).toEqual(['new', 'mid', 'old']);
  });

  it('delete() removes a record and updates the cache', async () => {
    await service.save(makePayload({ id: 'keep' }));
    await service.save(makePayload({ id: 'remove' }));
    expect(service.count()).toBe(2);

    await service.delete('remove');

    expect(service.count()).toBe(1);
    expect(service.summaries().map((s) => s.id)).toEqual(['keep']);
    expect(await service.load('remove')).toBeNull();
  });

  it('clear() wipes the store and the cache', async () => {
    await service.save(makePayload({ id: 'a' }));
    await service.save(makePayload({ id: 'b' }));

    await service.clear();

    expect(service.count()).toBe(0);
    expect(service.summaries()).toEqual([]);
    expect(await service.load('a')).toBeNull();
    expect(await service.load('b')).toBeNull();
  });

  it('summaries are pure projections — they drop events and rawHistory', async () => {
    await service.save(makePayload({ id: 'thin' }));
    const summary = service.summaries()[0];
    expect(summary).not.toHaveProperty('events');
    expect(summary).not.toHaveProperty('rawHistory');
    expect(summary).not.toHaveProperty('schemaVersion');
  });

  it('refresh() flips loaded() to true even when the read fails', async () => {
    // Force idbGetAll to fail by stubbing the IDB factory to one that throws
    // when opening a transaction. We do this by saving first (so the DB is
    // initialised), then poisoning the database with a broken `transaction`.
    await service.save(makePayload({ id: 'one' }));

    const fresh = TestBed.inject(ReplayService);
    // Reach into the private dbPromise to corrupt transactions on a brand-new
    // instance.
    type Private = { dbPromise: Promise<IDBDatabase> | null };
    const priv = fresh as unknown as Private;
    priv.dbPromise = Promise.resolve({
      transaction: () => {
        throw new Error('store missing');
      },
    } as unknown as IDBDatabase);

    expect(fresh.loaded()).toBe(false);
    const result = await fresh.refresh();
    expect(result).toEqual([]);
    expect(fresh.loaded()).toBe(true);
    expect(fresh.lastError()).not.toBeNull();
  });

  it('refresh() drops stale cached summaries when a subsequent read fails', async () => {
    // First refresh succeeds and populates the cache.
    await service.save(makePayload({ id: 'cached', title: 'Cached run' }));
    await service.refresh();
    expect(service.summaries()).toHaveLength(1);

    // Poison the next refresh so idbGetAll throws.
    type Private = { dbPromise: Promise<IDBDatabase> | null };
    (service as unknown as Private).dbPromise = Promise.resolve({
      transaction: () => {
        throw new Error('store missing');
      },
    } as unknown as IDBDatabase);

    const result = await service.refresh();

    // The returned array AND the cached signal must agree: empty, so the
    // Library's `refreshFailed` predicate can fire instead of showing
    // outdated rows.
    expect(result).toEqual([]);
    expect(service.summaries()).toEqual([]);
    expect(service.lastError()).not.toBeNull();
  });

  it('clearError() resets lastError so callers can dismiss a transient failure banner', async () => {
    type Private = { _lastError: { set: (v: string | null) => void } };
    (service as unknown as Private)._lastError.set('IDB write failed');

    expect(service.lastError()).toBe('IDB write failed');
    service.clearError();
    expect(service.lastError()).toBeNull();
  });
});
