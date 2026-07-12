// Minimal promise-based wrapper around IndexedDB. Library-free so we don't
// ship `idb` / `dexie` just for ~8 calls. Errors reject; callers wrap in try/catch.

export function openDb(
  name: string,
  version: number,
  upgrade: (db: IDBDatabase, oldVersion: number) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = (event) =>
      upgrade(request.result, (event as IDBVersionChangeEvent).oldVersion);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IDB open failed.'));
    request.onblocked = () =>
      reject(new Error('IDB open blocked. Close other tabs and retry.'));
  });
}

export function idbPut<T>(db: IDBDatabase, store: string, value: T): Promise<void> {
  return run(db, store, 'readwrite', (s) => s.put(value as IDBValidKey));
}

export function idbGet<T>(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  return run<T | undefined>(db, store, 'readonly', (s) => s.get(key));
}

export function idbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return run<T[]>(db, store, 'readonly', (s) => s.getAll());
}

export function idbDelete(db: IDBDatabase, store: string, key: IDBValidKey): Promise<void> {
  return run(db, store, 'readwrite', (s) => s.delete(key));
}

export function idbClear(db: IDBDatabase, store: string): Promise<void> {
  return run(db, store, 'readwrite', (s) => s.clear());
}

// Multi-store atomic writes — keeps paired stores from drifting if the tab dies mid-write.
export function idbPutMany(
  db: IDBDatabase,
  ops: ReadonlyArray<{ readonly store: string; readonly value: unknown }>,
): Promise<void> {
  const stores = [...new Set(ops.map((o) => o.store))];
  return runTx(db, stores, 'readwrite', (tx) => {
    for (const op of ops) tx.objectStore(op.store).put(op.value as IDBValidKey);
  });
}

export function idbDeleteMany(
  db: IDBDatabase,
  ops: ReadonlyArray<{ readonly store: string; readonly key: IDBValidKey }>,
): Promise<void> {
  const stores = [...new Set(ops.map((o) => o.store))];
  return runTx(db, stores, 'readwrite', (tx) => {
    for (const op of ops) tx.objectStore(op.store).delete(op.key);
  });
}

export function idbClearStores(
  db: IDBDatabase,
  stores: readonly string[],
): Promise<void> {
  return runTx(db, stores, 'readwrite', (tx) => {
    for (const store of stores) tx.objectStore(store).clear();
  });
}

function run<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = body(store);
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error(`IDB ${mode} failed.`));
    tx.onerror = () => reject(tx.error ?? new Error(`IDB ${mode} txn failed.`));
    tx.onabort = () => reject(tx.error ?? new Error(`IDB ${mode} txn aborted.`));
  });
}

// Resolve on transaction commit, not per-request — batch writes report as one success/failure.
function runTx(
  db: IDBDatabase,
  storeNames: readonly string[],
  mode: IDBTransactionMode,
  body: (tx: IDBTransaction) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([...storeNames], mode);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`IDB ${mode} txn failed.`));
    tx.onabort = () => reject(tx.error ?? new Error(`IDB ${mode} txn aborted.`));
    body(tx);
  });
}
