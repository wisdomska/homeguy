/**
 * A very small IndexedDB wrapper. No library: the brief allows no component
 * or utility packages, and this is 60 lines.
 *
 * Everything the user authors - saved, discarded, notes, ratings, contact
 * status - is written here first and queued for sync second. Research
 * Dossier contract D: nothing the user authored may ever be lost to a
 * dropped connection, and 4,289 fibre cuts in H1 2026 say that is not a
 * hypothetical.
 */

const DB_NAME = 'homeguy';
const DB_VERSION = 1;

export const STORE_ENTRIES = 'entries';
export const STORE_PREFS = 'prefs';
export const STORE_QUEUE = 'queue';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise !== null) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        db.createObjectStore(STORE_ENTRIES, { keyPath: 'clusterId' });
      }
      if (!db.objectStoreNames.contains(STORE_PREFS)) {
        db.createObjectStore(STORE_PREFS);
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function idbGetAll<T>(store: string): Promise<T[]> {
  return run<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>).catch(() => []);
}

export function idbPut<T>(store: string, value: T, key?: IDBValidKey): Promise<void> {
  return run(store, 'readwrite', (s) =>
    key === undefined ? s.put(value) : s.put(value, key),
  ).then(() => undefined);
}

export function idbDelete(store: string, key: IDBValidKey): Promise<void> {
  return run(store, 'readwrite', (s) => s.delete(key)).then(() => undefined);
}

export function idbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return run<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>).catch(
    () => undefined,
  );
}

export function idbClear(store: string): Promise<void> {
  return run(store, 'readwrite', (s) => s.clear()).then(() => undefined);
}
