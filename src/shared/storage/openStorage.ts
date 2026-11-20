import { loadData, saveData } from '@shared/platform';
import { parseData, serializeData } from './document';
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

export async function openStorage(seed: () => AppData) {
  const entries = readRecoveries();
  const recoveries = entries.flatMap((entry) => {
    try {
      return [
        {
          entry,
          original: parseData(entry.base),
          snapshot: parseData(entry.snapshot),
        },
      ];
    } catch (error) {
      console.error(error);
      return [];
    }
  });
  let expected = await loadData();
  if (expected === null) {
    const initial = serializeData(recoveries[0]?.snapshot ?? seed());
    expected = (await saveData(initial, null)) ? initial : await loadData();
    if (expected === null) throw new Error('Could not initialize storage');
  }

  let base = parseData(expected);
  let latest = base;
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

  function writeJournal() {
    const entry = { key, base: expected, snapshot: serializeData(latest) };
    const written = journalRecovery(entry);
    if (written) journal = entry;
    journaled = written;
  }

  function adopt(data: AppData) {
    latest = data;
    replaceData(data);
  }

  function accept(snapshot: string, data: AppData) {
    expected = snapshot;
    base = data;
    retryDelay = 1500;
    for (const entry of recovered.splice(0)) removeRecovery(entry);
    if (latest !== data) {
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
  }

  const queue = createSaveQueue(
    async () => {
      clearTimeout(retryTimer);
      for (let attempt = 0; attempt < 4; attempt++) {
        const data = latest;
        const snapshot = serializeData(data);
        if (snapshot === expected || (await saveData(snapshot, expected))) {
          accept(snapshot, data);
          channel?.postMessage('saved');
          return;
        }
        const remote = await loadData();
        if (remote === null) throw new Error('Stored document is missing');
        const incoming = parseData(remote);
        const merged = reconcileData(base, latest, incoming);
        expected = remote;
        base = incoming;
        adopt(merged);
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
        useSaveStatus.setState({ kind: 'failed', retry: () => retry() }, true);
      }
    },
  );

  for (const { entry, original, snapshot } of recoveries) {
    latest = reconcileData(original, latest, snapshot);
    recovered.push(entry);
  }

  adopt(latest);
  useData.subscribe((next) => {
    if (next === latest) return;
    if (serializeData(next) === serializeData(latest)) return;
    latest = next;
    writeJournal();
    useSaveStatus.setState({ kind: 'saving' }, true);
    queue.enqueue('save');
  });

  if (recovered.length) {
    writeJournal();
    useSaveStatus.setState({ kind: 'saving' }, true);
    queue.enqueue('recover');
  }

  async function refresh() {
    if (useSaveStatus.getState().kind !== 'saved') return;
    const previous = expected;
    const remote = await loadData();
    if (
      remote === null ||
      remote === expected ||
      previous !== expected ||
      useSaveStatus.getState().kind !== 'saved'
    )
      return;
    base = parseData(remote);
    expected = remote;
    adopt(base);
  }

  function refreshInBackground() {
    void refresh().catch((error: unknown) => console.error(error));
  }

  channel?.addEventListener('message', refreshInBackground);
  window.addEventListener('focus', refreshInBackground);
  window.addEventListener('beforeunload', (event) => {
    if (journaled || useSaveStatus.getState().kind === 'saved') return;
    event.preventDefault();
    event.returnValue = true;
  });
}
