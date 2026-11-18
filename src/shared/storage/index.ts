import { loadData, saveData } from '@shared/platform';
import { parseData, serializeData } from './document';
import type { AppData } from './document';
import { createSaveQueue } from './saveQueue';
import { replaceData, useData } from './store';

export type * from './document';
export { defaultData, defaultSettings } from './document';
export { changeData, getData, replaceData, useData } from './store';
export * from './factories';
export * from './queries';
export * from './areas';
export * from './mutations';
export { addTutorialProject, createTutorialData } from './seed';
export type { TutorialMessages } from './seed';

export async function openStorage(seed: () => AppData) {
  const raw = await loadData();
  let data = raw === null ? seed() : parseData(raw);
  const queue = createSaveQueue(saveData, (error) => console.error(error));

  if (raw === null) queue.enqueue(serializeData(data));

  replaceData(data);
  useData.subscribe((next) => {
    data = next;
    queue.enqueue(serializeData(data));
  });

  return {
    get data() {
      return data;
    },
  };
}

export type AppStorage = Awaited<ReturnType<typeof openStorage>>;
