import { Given, Then } from '@cucumber/cucumber';
import type * as AutomergeApi from '@automerge/automerge/slim';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { newDataDocument } from '../../src/shared/storage/automerge';
import { createTask } from '../../src/shared/storage/factories';
import { defaultData, serializeData } from '../../src/shared/storage/document';
import type { AppWorld } from '../world';

type Files<T> = { main: T | null; backup: T | null };

type StorageFixture = {
  document: Files<number[]>;
  legacy: Files<string>;
  corrupt: number[] | null;
};

const originals = new WeakMap<AppWorld, StorageFixture>();
const title = 'Recoverable Android note';
const data = { ...defaultData, tasks: [createTask({ title })] };
const resolveModule = createRequire(`${process.cwd()}/package.json`);
const Automerge = resolveModule(
  '@automerge/automerge/slim',
) as typeof AutomergeApi;

async function documentFixtures() {
  if (!Automerge.isWasmInitialized()) {
    const wasm = await readFile(
      resolveModule.resolve('@automerge/automerge/automerge.wasm'),
    );
    await Automerge.initializeWasm(new Uint8Array(wasm));
  }
  const valid = newDataDocument(data);
  const newer = Automerge.change(Automerge.clone(valid), (draft) => {
    draft.version = 999;
  });
  return {
    valid: Array.from(Automerge.save(valid)),
    newer: Array.from(Automerge.save(newer)),
    corrupt: [0, 1, 2],
  };
}

async function installFixture(world: AppWorld, fixture: StorageFixture) {
  originals.set(world, fixture);
  await world.page.addInitScript((files: StorageFixture) => {
    const { document, legacy } = files;
    localStorage.setItem(
      'freezen-ui',
      JSON.stringify({
        state: { onboardingCompleted: true, lastPath: '/inbox' },
        version: 1,
      }),
    );
    Object.assign(window, {
      isTauri: true,
      recoveryTestFiles: files,
      __TAURI_INTERNALS__: {
        invoke(command: string, args: { data?: number[]; restore?: number[] }) {
          switch (command) {
            case 'load_data':
              return legacy.main;
            case 'load_recovery_files':
              return [
                legacy.main !== null,
                legacy.main,
                legacy.backup !== null,
                legacy.backup,
              ];
            case 'load_document':
              return document.main;
            case 'load_document_recovery_files':
              return [
                document.main !== null,
                document.main,
                document.backup !== null,
                document.backup,
              ];
            case 'save_document':
              if (!args.data) throw new Error('Missing binary document');
              document.main = args.data;
              document.backup = args.data;
              return true;
            case 'prepare_android_document':
              if (args.restore !== undefined) {
                files.corrupt = document.main;
                document.main = args.restore;
              } else document.backup = document.main;
              return true;
            default:
              throw new Error('Unexpected native command ' + command);
          }
        },
      },
    });
  }, fixture);
}

Given(
  'Android storage has a {string} main file and a {word} recovery copy',
  async function (this: AppWorld, state: string, backup: string) {
    const { valid, newer, corrupt } = await documentFixtures();
    const mainFiles: Record<string, number[] | null> = {
      missing: null,
      corrupt,
      newer,
      valid,
    };
    const backups: Record<string, number[] | null> = {
      missing: null,
      invalid: corrupt,
      valid,
    };
    await installFixture(this, {
      document: { main: mainFiles[state], backup: backups[backup] },
      legacy: { main: null, backup: null },
      corrupt: null,
    });
  },
);

Given(
  'Android storage has corrupt legacy JSON and a valid legacy recovery copy',
  async function (this: AppWorld) {
    await installFixture(this, {
      document: { main: null, backup: null },
      legacy: { main: '{"version":', backup: serializeData(data) },
      corrupt: null,
    });
  },
);

async function readFiles(world: AppWorld) {
  return world.page.evaluate(
    () =>
      (window as typeof window & { recoveryTestFiles: StorageFixture })
        .recoveryTestFiles,
  );
}

async function waitForNote(world: AppWorld) {
  await world.page
    .getByRole('main')
    .getByText(title, { exact: true })
    .waitFor();
}

Then(
  'Android storage restores the recovery copy automatically',
  async function (this: AppWorld) {
    await waitForNote(this);
    const original = originals.get(this)!;
    const files = await readFiles(this);
    assert.deepEqual(files.document, {
      main: original.document.backup,
      backup: original.document.backup,
    });
    assert.deepEqual(files.corrupt, original.document.main);
  },
);

Then(
  'FreeZen reports a storage load error without changing the files',
  async function (this: AppWorld) {
    await this.page
      .getByRole('alert')
      .getByText(/Could not load your data/)
      .waitFor();
    assert.deepEqual(await readFiles(this), originals.get(this));
  },
);

Then(
  'Android storage copies the main file to the backup',
  async function (this: AppWorld) {
    await waitForNote(this);
    const files = await readFiles(this);
    assert.deepEqual(files.document.backup, originals.get(this)?.document.main);
  },
);

Then(
  'FreeZen migrates the legacy recovery copy without changing the legacy JSON',
  async function (this: AppWorld) {
    await waitForNote(this);
    const files = await readFiles(this);
    assert.deepEqual(files.legacy, originals.get(this)?.legacy);
    assert(files.document.main);
    assert.deepEqual(files.document.backup, files.document.main);
  },
);
