import { Given, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { createTask } from '../../src/shared/storage/factories';
import { defaultData, serializeData } from '../../src/shared/storage/document';
import type { AppWorld } from '../world';

type Files = {
  main: string | null;
  backup: string | null;
};

const original = new WeakMap<AppWorld, Files>();
const title = 'Recoverable Android note';
const note = serializeData({
  ...defaultData,
  tasks: [createTask({ title })],
});

Given(
  'Android storage has a {string} main file and a {word} recovery copy',
  async function (this: AppWorld, state: string, backup: string) {
    const mainFiles: Record<string, string | null> = {
      missing: null,
      corrupt: '{"version":',
      newer: '{"version":999}',
      valid: note,
    };
    const backupFiles: Record<string, string | null> = {
      missing: null,
      invalid: 'broken backup',
      valid: note,
    };
    const files = { main: mainFiles[state], backup: backupFiles[backup] };
    original.set(this, files);
    await this.page.addInitScript((initial: Files) => {
      const files = { ...initial };
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
          invoke(command: string, args: { restore?: string }) {
            switch (command) {
              case 'load_data':
                return files.main;
              case 'load_recovery_files':
                return [
                  files.main !== null,
                  files.main,
                  files.backup !== null,
                  files.backup,
                ];
              case 'prepare_android_data':
                if (args.restore !== undefined) files.main = args.restore;
                else files.backup = files.main;
                return true;
              default:
                return false;
            }
          },
        },
      });
    }, files);
  },
);

async function readFiles(world: AppWorld) {
  return world.page.evaluate(
    () =>
      (window as typeof window & { recoveryTestFiles: Files })
        .recoveryTestFiles,
  );
}

Then(
  'Android storage restores the recovery copy automatically',
  async function (this: AppWorld) {
    await this.page
      .getByRole('main')
      .getByText(title, { exact: true })
      .waitFor();
    assert.deepEqual(await readFiles(this), { main: note, backup: note });
  },
);

Then(
  'FreeZen reports a storage load error without changing the files',
  async function (this: AppWorld) {
    await this.page
      .getByRole('alert')
      .getByText(/Could not load your data/)
      .waitFor();
    assert.deepEqual(await readFiles(this), original.get(this));
  },
);

Then(
  'Android storage copies the main file to the backup',
  async function (this: AppWorld) {
    await this.page
      .getByRole('main')
      .getByText(title, { exact: true })
      .waitFor();
    assert.deepEqual(await readFiles(this), { main: note, backup: note });
  },
);
