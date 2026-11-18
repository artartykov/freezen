import { invoke, isTauri } from '@tauri-apps/api/core';

const databaseName = 'freezen';
const storeName = 'data';
const recordKey = 'document';

export async function loadData() {
  if (isTauri()) return invoke<string | null>('load_data');

  const value: unknown = await runInStore('readonly', (store) =>
    store.get(recordKey),
  );
  if (value === undefined) return null;
  if (typeof value !== 'string') {
    throw new Error('Unexpected FreeZen data in IndexedDB');
  }
  return value;
}

export async function saveData(data: string) {
  if (isTauri()) return invoke<void>('save_data', { data });

  await runInStore('readwrite', (store) => store.put(data, recordKey));
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB'));
  });
}

async function runInStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase();

  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = run(transaction.objectStore(storeName));
      const fail = () => reject(transaction.error ?? new Error('IndexedDB'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = fail;
      transaction.onabort = fail;
    });
  } finally {
    database.close();
  }
}
