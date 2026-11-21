import * as Automerge from '@automerge/automerge/slim';
import automergeWasm from '@automerge/automerge/automerge.wasm?url';
import {
  equalDocumentBytes,
  loadDocument,
  loadDocumentRecoveryFiles,
  loadLegacyData,
  loadLegacyRecoveryFiles,
  prepareAndroidDocument,
  saveDocument,
} from '@shared/platform';
import {
  archiveTextConflicts,
  loadDataDocument,
  newDataDocument,
  readDataDocument,
  updateDataDocument,
} from './automerge';
import type { DataDocument } from './automerge';
import {
  FutureDataVersionError,
  parseData,
  UnsupportedDataError,
} from './document';
import type { AppData } from './document';
import { reconcileData } from './reconcile';
import {
  journalRecovery,
  readRecoveries,
  recoveryKey,
  removeRecovery,
} from './recovery';
import type { Recovery } from './recovery';
import { createSaveQueue } from './saveQueue';
import { useSaveStatus } from './saveStatus';
import { replaceData, useData } from './store';

type SyncDocument = {
  current: () => DataDocument;
  apply: (doc: DataDocument) => void;
  subscribe: (notify: () => void) => () => void;
};

let syncDocument: SyncDocument | undefined;

function sameHeads(left: DataDocument, right: DataDocument) {
  const heads = Automerge.getHeads(left);
  const other = Automerge.getHeads(right);
  return (
    heads.length === other.length && heads.every((head, i) => head === other[i])
  );
}

export function openDataSync(send: (message: Uint8Array) => void) {
  const storage = syncDocument;
  if (!storage) throw new Error('Document storage is unavailable');
  let state = Automerge.initSyncState();
  let closed = false;
  let scheduled = false;

  function schedule() {
    if (closed || scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (closed) return;
      const [next, message] = Automerge.generateSyncMessage(
        storage!.current(),
        state,
      );
      state = next;
      if (message !== null) send(message);
    });
  }

  const unsubscribe = storage.subscribe(schedule);
  schedule();
  return {
    flush: schedule,
    async fingerprint() {
      if (useSaveStatus.getState().kind !== 'saved') return null;
      const doc = storage.current();
      const heads = Automerge.getHeads(doc).sort().join(':');
      const hash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(heads),
      );
      if (
        storage.current() !== doc ||
        useSaveStatus.getState().kind !== 'saved'
      ) {
        return null;
      }
      return Array.from(new Uint8Array(hash), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
    },
    receive(message: Uint8Array) {
      if (closed) return;
      const current = storage.current();
      const copy = Automerge.clone(current, Automerge.getActorId(current));
      const [next, nextState] = Automerge.receiveSyncMessage(
        copy,
        state,
        message,
      );
      if (!sameHeads(current, next)) storage.apply(next);
      state = nextState;
      schedule();
    },
    close() {
      closed = true;
      unsubscribe();
    },
  };
}

function recoverableMain<T, U>(raw: T | null, parse: (value: T) => U) {
  if (raw === null) return null;
  try {
    return parse(raw);
  } catch (error) {
    if (error instanceof FutureDataVersionError) throw error;
    if (error instanceof UnsupportedDataError) return null;
    throw error;
  }
}

async function loadStartupDocument() {
  for (let attempt = 0; attempt < 4; attempt++) {
    const files = await loadDocumentRecoveryFiles();
    if (files === null) {
      const bytes = await loadDocument();
      return bytes === null ? null : { bytes, doc: loadDataDocument(bytes) };
    }
    const [mainExists, main, backupExists, backup] = files;
    if (!mainExists && !backupExists) return null;

    const doc = recoverableMain(main, loadDataDocument);
    if (doc !== null && main !== null) {
      if (await prepareAndroidDocument(mainExists, main))
        return { bytes: main, doc };
    } else {
      if (backup === null) throw new Error('No readable recovery copy');
      const restored = loadDataDocument(backup);
      if (await prepareAndroidDocument(mainExists, main, backup))
        return { bytes: backup, doc: restored };
    }
  }
  throw new Error('Storage changed while opening');
}

async function readLegacyData() {
  const files = await loadLegacyRecoveryFiles();
  if (files === null) {
    const raw = await loadLegacyData();
    return raw === null ? null : parseData(raw);
  }
  const [mainExists, main, backupExists, backup] = files;
  if (!mainExists && !backupExists) return null;
  const data = recoverableMain(main, parseData);
  if (data) return data;
  if (backup === null) throw new Error('No readable legacy recovery copy');
  return parseData(backup);
}

function readJournalDocument(entries: Recovery[]) {
  for (const entry of entries) {
    try {
      if (entry.format === 'automerge') {
        return loadDataDocument(decodeJournal(entry.snapshot));
      }
      return newDataDocument(parseData(entry.snapshot));
    } catch (error) {
      console.error(error);
    }
  }
  return undefined;
}

async function prepareStorage(seed: () => AppData, entries: Recovery[]) {
  if (!Automerge.isWasmInitialized())
    await Automerge.initializeWasm(automergeWasm);
  const stored = await loadStartupDocument();
  if (stored) return stored;
  const data = await readLegacyData();
  const doc =
    data === null
      ? (readJournalDocument(entries) ?? newDataDocument(seed()))
      : newDataDocument(data);
  const bytes = Automerge.save(doc);
  if (!(await saveDocument(bytes, null))) {
    const concurrent = await loadStartupDocument();
    if (!concurrent) throw new Error('Could not initialize storage');
    return concurrent;
  }
  const verified = await loadStartupDocument();
  if (!verified) throw new Error('Could not verify initialized storage');
  return verified;
}

export async function openStorage(seed: () => AppData) {
  const entries = readRecoveries();
  const startup = await prepareStorage(seed, entries);
  let expected = startup.bytes;
  let latest = startup.doc;
  let view = readDataDocument(latest);
  let journal: Recovery | undefined;
  let journaled = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = 1500;
  const key = recoveryKey();
  const channel =
    typeof BroadcastChannel === 'function'
      ? new BroadcastChannel('freezen:document')
      : undefined;
  const recovered: Recovery[] = [];
  const listeners = new Set<() => void>();

  function writeJournal() {
    const entry: Recovery = {
      key,
      base: null,
      snapshot: encodeJournal(Automerge.save(latest)),
      format: 'automerge',
    };
    journaled = journalRecovery(entry);
    if (journaled) journal = entry;
  }

  function publish(doc: DataDocument, data: AppData) {
    latest = doc;
    view = data;
    replaceData(data);
    for (const notify of listeners) notify();
  }

  function adopt(doc: DataDocument) {
    readDataDocument(doc);
    const resolved = archiveTextConflicts(doc);
    publish(resolved, readDataDocument(resolved));
  }

  function mergeIntoCurrent(incoming: DataDocument) {
    const clone = Automerge.clone(latest, Automerge.getActorId(latest));
    return Automerge.merge(clone, incoming);
  }

  function savePending() {
    writeJournal();
    useSaveStatus.setState({ kind: 'saving' }, true);
    queue.enqueue('save');
  }

  function accept(snapshot: Uint8Array, doc: DataDocument) {
    expected = snapshot;
    retryDelay = 1500;
    for (const entry of recovered.splice(0)) removeRecovery(entry);
    if (latest !== doc) {
      writeJournal();
      return;
    }
    if (journal) removeRecovery(journal);
    journal = undefined;
    journaled = false;
    useSaveStatus.setState({ kind: 'saved' }, true);
    refreshInBackground();
  }

  function retry() {
    useSaveStatus.setState({ kind: 'saving' }, true);
    queue.retry();
    return queue.settled();
  }

  const queue = createSaveQueue(
    async () => {
      clearTimeout(retryTimer);
      for (let attempt = 0; attempt < 4; attempt++) {
        const doc = latest;
        const snapshot = Automerge.save(doc);
        if (
          equalDocumentBytes(snapshot, expected) ||
          (await saveDocument(snapshot, expected))
        ) {
          accept(snapshot, doc);
          channel?.postMessage('saved');
          return;
        }
        const remote = await loadDocument();
        if (remote === null) throw new Error('Stored document is missing');
        const incoming = loadDataDocument(remote);
        adopt(mergeIntoCurrent(incoming));
        expected = remote;
        writeJournal();
      }
      throw new Error('Concurrent writes are still in progress');
    },
    (error) => {
      console.error(error);
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => queue.retry(), retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30000);
      if (!journaled) writeJournal();
      if (!journaled) {
        useSaveStatus.setState({ kind: 'failed', retry }, true);
      }
    },
  );

  for (const entry of entries) {
    try {
      if (entry.format === 'automerge') {
        const remote = loadDataDocument(decodeJournal(entry.snapshot));
        const merged = mergeIntoCurrent(remote);
        readDataDocument(merged);
        latest = archiveTextConflicts(merged);
        view = readDataDocument(latest);
      } else {
        const base = parseData(entry.base);
        const snapshot = parseData(entry.snapshot);
        const merged = reconcileData(base, view, snapshot);
        latest = updateDataDocument(latest, view, merged);
        view = merged;
      }
      recovered.push(entry);
    } catch (error) {
      console.error(error);
    }
  }

  publish(latest, view);
  useData.subscribe((next) => {
    if (next === view) return;
    const previous = latest;
    latest = updateDataDocument(latest, view, next);
    view = next;
    if (latest === previous) return;
    savePending();
    for (const notify of listeners) notify();
  });

  if (recovered.length) savePending();

  async function refresh() {
    if (useSaveStatus.getState().kind !== 'saved') return;
    const previous = expected;
    const remote = await loadDocument();
    if (
      remote === null ||
      previous !== expected ||
      equalDocumentBytes(remote, expected) ||
      useSaveStatus.getState().kind !== 'saved'
    )
      return;
    const incoming = loadDataDocument(remote);
    adopt(mergeIntoCurrent(incoming));
    expected = remote;
    if (!sameHeads(latest, incoming)) savePending();
  }

  function refreshInBackground() {
    void refresh().catch((error: unknown) => console.error(error));
  }

  syncDocument = {
    current: () => latest,
    apply(doc) {
      adopt(doc);
      savePending();
    },
    subscribe(notify) {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
  };

  channel?.addEventListener('message', refreshInBackground);
  window.addEventListener('focus', refreshInBackground);
  window.addEventListener('beforeunload', (event) => {
    if (journaled || useSaveStatus.getState().kind === 'saved') return;
    event.preventDefault();
    event.returnValue = true;
  });
}

function encodeJournal(bytes: Uint8Array) {
  let text = '';
  const blockSize = 8192;
  for (let i = 0; i < bytes.length; i += blockSize)
    text += String.fromCharCode(...bytes.subarray(i, i + blockSize));
  return btoa(text);
}

function decodeJournal(data: string) {
  return Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
}
