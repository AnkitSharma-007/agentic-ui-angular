// Persists the session-tier KEK as an opaque CryptoKey handle in IndexedDB; ciphertext lives in sessionStorage.

import { idbDelete, idbGet, idbPut, openDb } from '../storage/indexeddb.helpers';

const DB_NAME = 'atlas-session-key';
const DB_VERSION = 1;
const STORE = 'kek';
const ROW_ID = 'session-kek';

interface KekRow {
  readonly id: string;
  readonly key: CryptoKey;
}

function db(): Promise<IDBDatabase> {
  return openDb(DB_NAME, DB_VERSION, (database) => {
    if (!database.objectStoreNames.contains(STORE)) {
      database.createObjectStore(STORE, { keyPath: 'id' });
    }
  });
}

export async function putSessionKek(key: CryptoKey): Promise<void> {
  await idbPut<KekRow>(await db(), STORE, { id: ROW_ID, key });
}

export async function getSessionKek(): Promise<CryptoKey | null> {
  const row = await idbGet<KekRow>(await db(), STORE, ROW_ID);
  return row?.key ?? null;
}

export async function deleteSessionKek(): Promise<void> {
  await idbDelete(await db(), STORE, ROW_ID);
}
