import { Service, computed, signal } from '@angular/core';
import {
  idbClearStores,
  idbDeleteMany,
  idbGet,
  idbGetAll,
  idbPutMany,
  openDb,
} from '../storage/indexeddb.helpers';
import type { ReplayPayload, ReplaySummary } from './replay.types';
import { isValidReplayPayload, isValidReplaySummary, toSummary } from './replay.types';
import { MAX_REPLAY_COUNT, MAX_TOTAL_REPLAY_BYTES } from './replay-size';

const DB_NAME = 'agentic-ui-angular';
// v2 adds a lightweight `summaries` store so the Library route no longer has to
// deserialize every full payload (incl. inline base64 media) just to list runs.
const DB_VERSION = 2;
const STORE_REPLAYS = 'replays';
const STORE_SUMMARIES = 'summaries';

@Service()
export class ReplayService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private readonly _summaries = signal<readonly ReplaySummary[]>([]);
  private readonly _unavailable = signal<boolean>(false);
  private readonly _lastError = signal<string | null>(null);
  private readonly _loaded = signal<boolean>(false);

  readonly summaries = this._summaries.asReadonly();
  readonly unavailable = this._unavailable.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly count = computed(() => this._summaries().length);

  async save(payload: ReplayPayload): Promise<void> {
    try {
      const db = await this.db();
      // Full payload + its summary in one transaction so the two stores can't
      // drift if the write is interrupted.
      await idbPutMany(db, [
        { store: STORE_REPLAYS, value: payload },
        { store: STORE_SUMMARIES, value: toSummary(payload) },
      ]);
      this._summaries.update((list) => {
        const withoutDup = list.filter((s) => s.id !== payload.id);
        return [toSummary(payload), ...withoutDup].sort(byDateDesc);
      });
      await this.enforceCaps(db, payload.id);
      this._lastError.set(null);
    } catch (err) {
      this.captureError(err);
      throw err;
    }
  }

  async refresh(): Promise<readonly ReplaySummary[]> {
    try {
      const db = await this.db();
      // Read only the lightweight summary rows — the whole point of the v2
      // store. Skip corrupt/tampered rows so one bad row can't crash the list.
      let summaries = (await idbGetAll<unknown>(db, STORE_SUMMARIES)).filter(
        isValidReplaySummary,
      );
      // One-time migration: profiles upgraded from v1 have full payloads but no
      // summaries yet. Derive them once and persist so later refreshes stay
      // cheap. (A genuinely empty library just does one extra empty read.)
      if (summaries.length === 0) {
        summaries = await this.backfillSummaries(db);
      }
      const sorted = [...summaries].sort(byDateDesc);
      this._summaries.set(sorted);
      this._loaded.set(true);
      this._lastError.set(null);
      return sorted;
    } catch (err) {
      this.captureError(err);
      // Flip out of the indeterminate spinner and drop stale rows so the
      // Library's `refreshFailed` predicate (loaded && empty && error) fires.
      this._loaded.set(true);
      this._summaries.set([]);
      return [];
    }
  }

  async load(id: string): Promise<ReplayPayload | null> {
    try {
      const db = await this.db();
      const payload = await idbGet<ReplayPayload>(db, STORE_REPLAYS, id);
      this._lastError.set(null);
      return payload ?? null;
    } catch (err) {
      this.captureError(err);
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const db = await this.db();
      await idbDeleteMany(db, [
        { store: STORE_REPLAYS, key: id },
        { store: STORE_SUMMARIES, key: id },
      ]);
      this._summaries.update((list) => list.filter((s) => s.id !== id));
      this._lastError.set(null);
    } catch (err) {
      this.captureError(err);
      throw err;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.db();
      await idbClearStores(db, [STORE_REPLAYS, STORE_SUMMARIES]);
      this._summaries.set([]);
      this._lastError.set(null);
    } catch (err) {
      this.captureError(err);
      throw err;
    }
  }

  clearError(): void {
    this._lastError.set(null);
  }

  // Rebuild the summary store from any full payloads left by a v1 profile.
  private async backfillSummaries(db: IDBDatabase): Promise<ReplaySummary[]> {
    const payloads = (await idbGetAll<unknown>(db, STORE_REPLAYS)).filter(
      isValidReplayPayload,
    );
    if (payloads.length === 0) return [];
    const derived = payloads.map(toSummary);
    await idbPutMany(
      db,
      derived.map((summary) => ({ store: STORE_SUMMARIES, value: summary })),
    );
    return derived;
  }

  // N7: after a save, evict the oldest runs (LRU by savedAt) until both the
  // count and the total encoded size are back under budget. Never evicts the
  // run that was just saved. Runs saved before `sizeBytes` existed count as 0
  // toward the byte budget but still count toward the count budget.
  private async enforceCaps(db: IDBDatabase, justSavedId: string): Promise<void> {
    const current = this._summaries();
    let count = current.length;
    let totalBytes = current.reduce((sum, s) => sum + (s.sizeBytes ?? 0), 0);
    if (count <= MAX_REPLAY_COUNT && totalBytes <= MAX_TOTAL_REPLAY_BYTES) return;

    const evict: ReplaySummary[] = [];
    for (let i = current.length - 1; i >= 0; i--) {
      if (count <= MAX_REPLAY_COUNT && totalBytes <= MAX_TOTAL_REPLAY_BYTES) break;
      const victim = current[i];
      if (victim.id === justSavedId) continue;
      evict.push(victim);
      count--;
      totalBytes -= victim.sizeBytes ?? 0;
    }
    if (evict.length === 0) return;

    await idbDeleteMany(
      db,
      evict.flatMap((s) => [
        { store: STORE_REPLAYS, key: s.id },
        { store: STORE_SUMMARIES, key: s.id },
      ]),
    );
    const evicted = new Set(evict.map((s) => s.id));
    this._summaries.update((list) => list.filter((s) => !evicted.has(s.id)));
  }

  private db(): Promise<IDBDatabase> {
    if (this._unavailable()) {
      return Promise.reject(
        new Error('Replay storage is unavailable in this browser.'),
      );
    }
    if (!this.dbPromise) {
      this.dbPromise = openDb(DB_NAME, DB_VERSION, (db) => {
        if (!db.objectStoreNames.contains(STORE_REPLAYS)) {
          db.createObjectStore(STORE_REPLAYS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SUMMARIES)) {
          db.createObjectStore(STORE_SUMMARIES, { keyPath: 'id' });
        }
      }).catch((err) => {
        this._unavailable.set(true);
        this.captureError(err);
        throw err;
      });
    }
    return this.dbPromise;
  }

  private captureError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this._lastError.set(message);
  }
}

function byDateDesc(a: ReplaySummary, b: ReplaySummary): number {
  return b.savedAt.localeCompare(a.savedAt);
}
