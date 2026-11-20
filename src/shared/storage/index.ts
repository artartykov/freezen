import { loadData, saveData } from '@shared/platform';
import { parseData, serializeData } from './document';
import type { AppData } from './document';
import {
  journalRecovery,
  readRecoveries,
  recoveryKey,
  removeRecovery,
  useRecovery,
} from './recovery';
import type { Recovery } from './recovery';
import { useSaveStatus } from './saveStatus';
import { createSaveQueue } from './saveQueue';
import { replaceData, useData } from './store';

export type * from './document';
export { useSaveStatus } from './saveStatus';
export { useRecovery } from './recovery';
export type { Recovery } from './recovery';
export {
  defaultData,
  defaultSettings,
  parseData,
  serializeData,
} from './document';
export { changeData, getData, replaceData, useData } from './store';
export * from './factories';
export * from './queries';
export * from './areas';
export * from './mutations';
export { addTutorialProject, createTutorialData } from './seed';
export type { TutorialMessages } from './seed';

class StorageConflict extends Error {}

export class StorageLoadError extends Error {
  constructor(
    readonly snapshot: string,
    cause: unknown,
  ) {
    super('Could not read the FreeZen document', { cause });
  }
}

export async function openStorage(seed: () => AppData) {
  let expected = await loadData();
  let data: AppData;
  try {
    data = expected === null ? seed() : parseData(expected);
  } catch (error) {
    if (expected === null) throw error;
    throw new StorageLoadError(expected, error);
  }

  const key = recoveryKey();
  let latest = serializeData(data);
  function journal() {
    journalRecovery({ key, base: expected, snapshot: latest });
  }
  let restore: Recovery | undefined;
  const queue = createSaveQueue(
    async (snapshot) => {
      useSaveStatus.setState({ kind: 'saving' }, true);
      if (!(await saveData(snapshot, expected))) throw new StorageConflict();
      removeRecovery({ key, base: expected, snapshot });
      expected = snapshot;
      if (restore?.snapshot === snapshot) {
        removeRecovery(restore);
        restore = undefined;
      }
      refreshRecoveries();
      if (snapshot === latest) useSaveStatus.setState({ kind: 'saved' }, true);
      else journal();
    },
    (error) => {
      if (error instanceof StorageConflict) {
        useSaveStatus.setState({ kind: 'conflict', snapshot: latest }, true);
      } else {
        console.error(error);
        useSaveStatus.setState(
          { kind: 'failed', retry: () => queue.retry(), snapshot: latest },
          true,
        );
      }
    },
  );

  if (expected === null) {
    if (!(await saveData(latest, null))) {
      expected = await loadData();
      if (expected === null) throw new StorageConflict();
      try {
        data = parseData(expected);
      } catch (error) {
        throw new StorageLoadError(expected, error);
      }
      latest = serializeData(data);
    } else {
      expected = latest;
    }
  }

  function refreshRecoveries() {
    useRecovery.setState({
      entries: readRecoveries().filter(
        (entry) => entry.key !== key && entry.snapshot !== expected,
      ),
    });
  }

  replaceData(data);
  refreshRecoveries();
  useData.subscribe((next) => {
    const snapshot = serializeData(next);
    if (snapshot === latest) return;
    latest = snapshot;
    journal();
    if (useSaveStatus.getState().kind === 'conflict') {
      useSaveStatus.setState({ kind: 'conflict', snapshot }, true);
      return;
    }
    queue.enqueue(snapshot);
  });

  async function recover(entry: Recovery) {
    if (useSaveStatus.getState().kind !== 'saved' || entry.base !== expected)
      return false;
    const recovered = parseData(entry.snapshot);
    restore = entry;
    replaceData(recovered);
    if (useSaveStatus.getState().kind === 'saved') {
      removeRecovery(entry);
      restore = undefined;
      refreshRecoveries();
      return true;
    }
    await queue.settled();
    return useSaveStatus.getState().kind === 'saved';
  }

  useRecovery.setState({ recover });

  window.addEventListener('beforeunload', (event) => {
    if (useSaveStatus.getState().kind === 'saved') return;
    event.preventDefault();
    event.returnValue = true;
  });
}
