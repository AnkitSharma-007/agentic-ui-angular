import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  idbClear,
  idbDelete,
  idbGet,
  idbGetAll,
  idbPut,
  openDb,
} from './indexeddb.helpers';

const DB_NAME = 'idb-spec';
const STORE = 'items';

interface Item {
  readonly id: string;
  readonly value: number;
}

async function fresh(): Promise<IDBDatabase> {
  return openDb(DB_NAME, 1, (db) => {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE, { keyPath: 'id' });
    }
  });
}

describe('indexeddb.helpers', () => {
  beforeEach(() => {
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  });

  it('openDb() runs the upgrade callback on first open', async () => {
    let upgraded = false;
    const db = await openDb(DB_NAME, 1, (database) => {
      upgraded = true;
      database.createObjectStore(STORE, { keyPath: 'id' });
    });
    expect(upgraded).toBe(true);
    expect(db.objectStoreNames.contains(STORE)).toBe(true);
  });

  it('idbPut + idbGet round-trips a record', async () => {
    const db = await fresh();
    await idbPut<Item>(db, STORE, { id: 'a', value: 1 });
    const got = await idbGet<Item>(db, STORE, 'a');
    expect(got).toEqual({ id: 'a', value: 1 });
  });

  it('idbGetAll() returns every stored record', async () => {
    const db = await fresh();
    await idbPut<Item>(db, STORE, { id: 'a', value: 1 });
    await idbPut<Item>(db, STORE, { id: 'b', value: 2 });
    const all = await idbGetAll<Item>(db, STORE);
    expect(all.map((i) => i.id).sort()).toEqual(['a', 'b']);
  });

  it('idbDelete() removes a record', async () => {
    const db = await fresh();
    await idbPut<Item>(db, STORE, { id: 'gone', value: 0 });
    await idbDelete(db, STORE, 'gone');
    expect(await idbGet(db, STORE, 'gone')).toBeUndefined();
  });

  it('idbClear() empties the store', async () => {
    const db = await fresh();
    await idbPut<Item>(db, STORE, { id: 'a', value: 1 });
    await idbPut<Item>(db, STORE, { id: 'b', value: 2 });
    await idbClear(db, STORE);
    expect(await idbGetAll<Item>(db, STORE)).toEqual([]);
  });

  it('openDb() rejects when indexedDB is unavailable', async () => {
    (globalThis as unknown as { indexedDB: IDBFactory | undefined }).indexedDB =
      undefined as unknown as IDBFactory;
    await expect(openDb(DB_NAME, 1, () => undefined)).rejects.toThrow(
      /IndexedDB is not available/,
    );
  });
});
