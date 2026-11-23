import { After, Given, Then, When } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';
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
  'the Development section and Erase data button are absent',
  async function (this: AppWorld) {
    const heading = this.page.getByRole('heading', {
      name: 'Development',
      exact: true,
    });
    const button = this.page.getByRole('button', {
      name: 'Erase data',
      exact: true,
    });
    assert.equal(await heading.count(), 0);
    assert.equal(await button.count(), 0);
  },
);

Then(
  'the {string} setting is disabled',
  async function (this: AppWorld, name: string) {
    const setting = this.page.getByRole('button', { name });
    assert.equal(await setting.isDisabled(), true);
  },
);

Then(
  'Date Format lists ISO, RU, and US in that order',
  async function (this: AppWorld) {
    await this.page.getByRole('button', { name: /^Date format\b/ }).click();
    const options = this.page
      .getByRole('radiogroup', { name: 'Date format', exact: true })
      .getByRole('radio');
    await options.first().waitFor();
    assert.deepEqual(await options.allTextContents(), [
      '2026-01-05 (ISO)',
      '05.01.2026 (RU)',
      'Jan 5, 2026 (US)',
    ]);
  },
);

Then(
  'Time Format lists the 24-hour option first',
  async function (this: AppWorld) {
    await this.page.getByRole('button', { name: /^Time format\b/ }).click();
    const options = this.page
      .getByRole('radiogroup', { name: 'Time format', exact: true })
      .getByRole('radio');
    await options.first().waitFor();
    assert.deepEqual(await options.allTextContents(), ['24h', '12h']);
  },
);

Then(
  'New to-dos defaults to At the top of lists',
  async function (this: AppWorld) {
    await this.page.getByRole('button', { name: /^New to-dos\b/ }).click();
    const options = this.page.getByRole('radiogroup', {
      name: 'New to-dos',
      exact: true,
    });
    const top = options.getByRole('radio', {
      name: 'At the top of lists',
      exact: true,
      checked: true,
    });
    await top.waitFor();
    await options
      .getByRole('radio', { name: 'At the bottom of list', exact: true })
      .waitFor();
  },
);

Then(
  'the settings are shown in the requested order',
  async function (this: AppWorld) {
    const groups = this.page.getByRole('main').locator('section');
    assert.deepEqual(await groups.locator('h2').allTextContents(), [
      'Synchronization',
      'Manage',
      'Sidebar',
      'Workflow',
      'Feature',
      'Notification',
      'Language & Region',
      'Advanced',
      'Support',
      'FreeZen',
    ]);
    const rows = await groups
      .locator('li span.text-\\[17px\\]')
      .allTextContents();
    assert.deepEqual(rows, [
      'Devices',
      'Show code',
      'Enter code',
      'Manage tags',
      'Attachments',
      'Calendar events',
      'Counts',
      'New to-dos',
      'Log completed items',
      'On completion',
      'Long-running notes',
      'Effort time format',
      'Waiting',
      'Reference lists',
      'Later',
      'Daily nudge',
      'Weekly Review',
      'Language',
      'Date format',
      'Time format',
      'Week starts on',
      'Area Assignment',
      'Area Filtering',
      'Trash Retention',
      'Quick Guide',
      'Re-create tutorial project',
      'About',
      'Give us 5 stars?',
    ]);
    for (const label of ['Attachments', 'Give us 5 stars?']) {
      const row = groups.locator('[aria-disabled="true"]').filter({
        has: this.page.getByText(label, { exact: true }),
      });
      assert.equal(await row.count(), 1);
    }
  },
);

Then(
  'Trash Retention offers 30, 90, and 180 days with 30 selected',
  async function (this: AppWorld) {
    await this.page.getByRole('button', { name: /^Trash Retention\b/ }).click();
    const options = this.page
      .getByRole('radiogroup', { name: 'Trash Retention', exact: true })
      .getByRole('radio');
    await options.first().waitFor();
    assert.deepEqual(await options.allTextContents(), [
      '30 days',
      '90 days',
      '180 days',
    ]);
    assert.equal(await options.first().getAttribute('aria-checked'), 'true');
  },
);

When('I select 90 days for Trash Retention', async function (this: AppWorld) {
  await this.page.getByRole('radio', { name: '90 days', exact: true }).click();
  await this.page
    .getByRole('button', { name: /^Trash Retention\s+90 days$/ })
    .waitFor();
});

Then(
  'Trash Retention still shows 90 days after reloading',
  async function (this: AppWorld) {
    await this.page.reload();
    await this.page
      .getByRole('button', { name: /^Trash Retention\s+90 days$/ })
      .waitFor();
  },
);

Then(
  'the following settings show their defaults:',
  async function (this: AppWorld, settings: DataTable) {
    const { page } = this;
    for (const { setting, value } of settings.hashes()) {
      const row = page
        .getByRole('button')
        .filter({ has: page.getByText(setting, { exact: true }) });
      await row.getByText(value, { exact: true }).waitFor({ timeout: 3000 });
    }
  },
);
