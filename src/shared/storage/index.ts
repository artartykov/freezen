import { loadData, saveData } from '@shared/platform';
import { parseData, serializeData } from './document';
import type { AppData } from './document';
import { createSaveQueue } from './saveQueue';

export type { AppData } from './document';

export async function openStorage() {
  let data = parseData(await loadData());
  const queue = createSaveQueue(saveData, (error) => console.error(error));

  return {
    get data() {
      return data;
    },
    update(change: (current: AppData) => AppData) {
      data = change(data);
      queue.enqueue(serializeData(data));
    },
  };
}

export type AppStorage = Awaited<ReturnType<typeof openStorage>>;
