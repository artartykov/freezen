import { invoke, isTauri } from '@tauri-apps/api/core';

const databaseName = 'freezen';
const storeName = 'data';
const legacyKey = 'document';
const documentKey = 'automerge';

type RecoveryFiles<T> = [
  mainExists: boolean,
  main: T | null,
  backupExists: boolean,
  backup: T | null,
];

function decode(bytes: number[] | null) {
  return bytes === null ? null : Uint8Array.from(bytes);
}

export async function loadLegacyRecoveryFiles() {
  return isTauri()
    ? invoke<RecoveryFiles<string> | null>('load_recovery_files')
    : null;
}

export async function loadLegacyData() {
  if (isTauri()) return invoke<string | null>('load_data');
  const data = await readRecord(legacyKey);
  if (data === undefined) return null;
  if (typeof data === 'string') return data;
  throw new Error('Unexpected legacy FreeZen data in IndexedDB');
}

export async function loadDocumentRecoveryFiles(): Promise<RecoveryFiles<Uint8Array> | null> {
  if (!isTauri()) return null;
  const files = await invoke<RecoveryFiles<number[]> | null>(
    'load_document_recovery_files',
  );
  if (files === null) return null;
  const [mainExists, main, backupExists, backup] = files;
  return [mainExists, decode(main), backupExists, decode(backup)];
}

export async function prepareAndroidDocument(
  mainExists: boolean,
  expected: Uint8Array | null,
  restore?: Uint8Array,
) {
  return invoke<boolean>('prepare_android_document', {
    mainExists,
    expected: expected === null ? null : Array.from(expected),
    restore: restore === undefined ? undefined : Array.from(restore),
  });
}

export async function loadDocument() {
  if (isTauri()) {
    return decode(await invoke<number[] | null>('load_document'));
  }
  const data = await readRecord(documentKey);
  if (data === undefined) return null;
  if (data instanceof Uint8Array) return data;
  throw new Error('Unexpected FreeZen document in IndexedDB');
}

export function equalDocumentBytes(left: Uint8Array, right: Uint8Array) {
  return (
    left === right ||
    (left.length === right.length &&
      left.every((value, index) => value === right[index]))
  );
}

export async function saveDocument(
  data: Uint8Array,
  expected: Uint8Array | null,
) {
  if (isTauri()) {
    return invoke<boolean>('save_document', {
      data: Array.from(data),
      expected: expected === null ? null : Array.from(expected),
    });
  }

  const database = await openDatabase();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite', {
        durability: 'strict',
      });
      const store = transaction.objectStore(storeName);
      const read = store.get(documentKey);
      let matches = false;
      transaction.oncomplete = () => resolve(matches);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('IndexedDB write aborted'));
      read.onsuccess = () => {
        const current: unknown = read.result;
        if (
          expected === null
            ? current !== undefined
            : !(current instanceof Uint8Array) ||
              !equalDocumentBytes(current, expected)
        )
          return;
        try {
          store.put(data, documentKey);
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

async function readRecord(key: string) {
  const database = await openDatabase();
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const request = database
        .transaction(storeName)
        .objectStore(storeName)
        .get(key);
      request.onerror = () =>
        reject(request.error ?? new Error('IndexedDB read failed'));
      request.onsuccess = () => resolve(request.result as unknown);
    });
  } finally {
    database.close();
  }
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB'));
    request.onsuccess = () => resolve(request.result);
  });
}
