import { After, Given, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { preview } from 'vite';
import type { AppWorld } from '../world';

const run = promisify(execFile);
const previews = new WeakMap<
  AppWorld,
  { directory: string; server?: Awaited<ReturnType<typeof preview>> }
>();

After(async function (this: AppWorld) {
  const build = previews.get(this);
  if (build) {
    await build.server?.close();
    await rm(build.directory, { recursive: true, force: true });
  }
});

Given(
  'I use the {string} settings build',
  async function (this: AppWorld, variant: string) {
    if (variant === 'development') return;

    const directory = await mkdtemp(join(tmpdir(), 'freezen-settings-'));
    const build = {
      directory,
      server: undefined as Awaited<ReturnType<typeof preview>> | undefined,
    };
    previews.set(this, build);
    await run(
      process.execPath,
      ['node_modules/vite/bin/vite.js', 'build', '--outDir', directory],
      {
        env: {
          ...process.env,
          NODE_ENV: 'production',
          FREEZEN_PREVIEW: variant === 'preview' ? '1' : '0',
        },
      },
    );
    build.server = await preview({
      build: { outDir: directory },
      preview: { host: '127.0.0.1', port: 0 },
    });
    const url = build.server.resolvedUrls?.local[0];
    assert.ok(url);
    this.openApp = async () => {
      await this.page.goto(url);
    };
  },
);

Then(
  'the Development section and Erase data button are {string}',
  async function (this: AppWorld, visibility: string) {
    const heading = this.page.getByRole('heading', {
      name: 'Development',
      exact: true,
    });
    const button = this.page.getByRole('button', {
      name: 'Erase data',
      exact: true,
    });
    if (visibility === 'visible') {
      await heading.waitFor();
      await button.waitFor();
    } else {
      assert.equal(await heading.count(), 0);
      assert.equal(await button.count(), 0);
    }
  },
);
