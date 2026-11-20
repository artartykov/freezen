import { invoke, isTauri } from '@tauri-apps/api/core';

const databaseName = 'freezen';
const storeName = 'data';
const recordKey = 'document';

type RecoveryFiles = [
  mainExists: boolean,
  main: string | null,
  backupExists: boolean,
  backup: string | null,
];

export async function loadRecoveryFiles() {
  return isTauri() ? invoke<RecoveryFiles | null>('load_recovery_files') : null;
}

export async function prepareAndroidData(
  mainExists: boolean,
  expected: string | null,
  restore?: string,
) {
  return invoke<boolean>('prepare_android_data', {
    mainExists,
    expected,
    restore,
  });
}

export async function loadData() {
  if (isTauri()) return invoke<string | null>('load_data');

  const database = await openDatabase();
  try {
    return await new Promise<string | null>((resolve, reject) => {
      const request = database
        .transaction(storeName)
        .objectStore(storeName)
        .get(recordKey);
      request.onerror = () =>
        reject(request.error ?? new Error('IndexedDB read failed'));
      request.onsuccess = () => {
        const value: unknown = request.result;
        if (value === undefined) resolve(null);
        else if (typeof value === 'string') resolve(value);
        else reject(new Error('Unexpected FreeZen data in IndexedDB'));
      };
    });
  } finally {
    database.close();
  }
}

export async function saveData(data: string, expected: string | null) {
  if (isTauri()) return invoke<boolean>('save_data', { data, expected });

  const database = await openDatabase();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite', {
        durability: 'strict',
      });
      const store = transaction.objectStore(storeName);
      const read = store.get(recordKey);
      let matches = false;
      transaction.oncomplete = () => resolve(matches);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('IndexedDB write aborted'));
      read.onsuccess = () => {
        const current: unknown = read.result;
        if (current !== (expected ?? undefined)) return;
        try {
          store.put(data, recordKey);
          matches = true;
        } catch (error) {
          transaction.abort();
          reject(
            error instanceof Error
              ? error
              : new Error('IndexedDB write failed', { cause: error }),
          );
        }
      };
    });
  } finally {
    database.close();
  }
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB'));
  });
}
