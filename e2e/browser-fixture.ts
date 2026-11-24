import type * as AutomergeApi from '@automerge/automerge/slim';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { newDataDocument } from '../src/shared/storage/automerge';
import type { AppData } from '../src/shared/storage/document';
import { pageHeading } from './navigation';
import type { AppWorld } from './world';

export const browserAppPort =
  1422 + Number(process.env.CUCUMBER_WORKER_ID ?? 0);
export const browserAppUrl = `http://127.0.0.1:${browserAppPort}`;

const resolveModule = createRequire(`${process.cwd()}/package.json`);
const Automerge = resolveModule(
  '@automerge/automerge/slim',
) as typeof AutomergeApi;

export async function openAfterOnboarding(world: AppWorld) {
  await world.page.addInitScript(() => {
    if (window.top !== window || !/^https?:$/.test(location.protocol)) return;
    const marker = 'freezen-e2e-onboarding-fixture';
    if (sessionStorage.getItem(marker)) return;
    sessionStorage.setItem(marker, '1');
    localStorage.setItem(
      'freezen-ui',
      JSON.stringify({
        state: { onboardingCompleted: true, lastPath: '/focus' },
        version: 1,
      }),
    );
  });
  await world.openApp();
  await pageHeading(world.page, 'Focus').waitFor();
}

export async function openWithBrowserData(
  world: AppWorld,
  data: AppData,
  lastPath: string,
) {
  if (!Automerge.isWasmInitialized()) {
    const wasm = await readFile(
      resolveModule.resolve('@automerge/automerge/automerge.wasm'),
    );
    await Automerge.initializeWasm(new Uint8Array(wasm));
  }
  const bytes = Array.from(Automerge.save(newDataDocument(data)));
  const url = new URL('/e2e-fixture', browserAppUrl).href;
  await world.page.route(url, (route) => route.fulfill({ body: '' }), {
    times: 1,
  });
  await world.page.goto(url);
  await world.page.evaluate(
    async ({ bytes, lastPath }) => {
      localStorage.setItem(
        'freezen-ui',
        JSON.stringify({
          state: { onboardingCompleted: true, lastPath },
          version: 1,
        }),
      );
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('freezen', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('data');
        open.onerror = () =>
          reject(open.error ?? new Error('Unable to open fixture storage'));
        open.onsuccess = () => {
          const database = open.result;
          const transaction = database.transaction('data', 'readwrite');
          transaction
            .objectStore('data')
            .put(Uint8Array.from(bytes), 'automerge');
          transaction.onabort = () => {
            database.close();
            reject(transaction.error ?? new Error('Unable to save fixture'));
          };
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
        };
      });
    },
    { bytes, lastPath },
  );
  await world.openApp();
}
