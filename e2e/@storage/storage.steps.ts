import { Given, Then, When } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import { createTask } from '../@tasks/task.shared';
import type { AppWorld } from '../world';

const secondTabs = new WeakMap<AppWorld, Page>();

Given('I open the Inbox in a second tab', async function (this: AppWorld) {
  const tab = this.page.waitForEvent('popup');
  await this.page.evaluate(() => window.open(location.href));
  const popup = await tab;

  await popup
    .getByRole('heading', { name: 'Inbox', exact: true })
    .waitFor({ timeout: 4000 });
  secondTabs.set(this, popup);
});

When('I wait for storage to finish saving', async function (this: AppWorld) {
  await this.page
    .getByRole('status', { name: 'Saving changes' })
    .waitFor({ state: 'hidden' });
});

When(
  'I create {string} in the second tab',
  async function (this: AppWorld, title: string) {
    const tab = secondTabs.get(this);
    if (!tab) throw new Error('Missing second tab');
    await createTask(tab, title);
  },
);

Then(
  'the second tab reports a storage conflict',
  async function (this: AppWorld) {
    const tab = secondTabs.get(this);
    if (!tab) throw new Error('Missing second tab');
    await tab
      .getByRole('alert')
      .filter({ hasText: 'Data changed in another window' })
      .waitFor({ timeout: 4000 });
  },
);

Given(
  'browser writes are temporarily failing',
  async function (this: AppWorld) {
    await this.page.evaluate(() => {
      const original = Object.getOwnPropertyDescriptor(
        IDBObjectStore.prototype,
        'put',
      );
      if (!original) throw new Error('Missing IndexedDB put');
      IDBObjectStore.prototype.put = () => {
        throw new DOMException('Test quota exceeded', 'QuotaExceededError');
      };
      window.addEventListener(
        'restore-audit-storage',
        () => {
          Object.defineProperty(IDBObjectStore.prototype, 'put', original);
        },
        { once: true },
      );
    });
  },
);

Then('I see a save error', async function (this: AppWorld) {
  await this.page
    .getByRole('alert')
    .filter({ hasText: 'Could not save your changes' })
    .waitFor({ timeout: 4000 });
});

When('browser writes work again', async function (this: AppWorld) {
  await this.page.evaluate(() =>
    window.dispatchEvent(new Event('restore-audit-storage')),
  );
});

When('I retry saving', async function (this: AppWorld) {
  await this.page.getByRole('button', { name: 'Retry saving' }).click();
  await this.page
    .getByRole('status', { name: 'Saving changes' })
    .waitFor({ state: 'hidden' });
});

Then(
  '{string} is still stored',
  async function (this: AppWorld, title: string) {
    await this.page.reload();
    await this.page
      .getByRole('main')
      .getByText(title, { exact: true })
      .waitFor({ timeout: 4000 });
  },
);

function taskNote(page: Page) {
  return page
    .getByRole('dialog', { name: 'To-do', exact: true })
    .getByRole('textbox', { name: 'Notes', exact: true });
}

When(
  'I enter {string} in a new task note',
  async function (this: AppWorld, text: string) {
    await this.page
      .getByRole('button', { name: 'Add task', exact: true })
      .click();
    await taskNote(this.page).fill(text);
  },
);

When('I go back in browser history', async function (this: AppWorld) {
  await this.page.goBack();
  await taskNote(this.page).waitFor({ state: 'hidden' });
});

When('I open a new task again', async function (this: AppWorld) {
  await this.page
    .getByRole('button', { name: 'Add task', exact: true })
    .click();
});

When(
  'I open the saved task {string}',
  async function (this: AppWorld, title: string) {
    await this.page.getByRole('main').getByText(title, { exact: true }).click();
  },
);

When(
  'I enter {string} in the task note',
  async function (this: AppWorld, text: string) {
    await taskNote(this.page).fill(text);
  },
);

When(
  'I reload and restore the unsaved changes',
  async function (this: AppWorld) {
    this.page.once('dialog', (dialog) => void dialog.accept());
    await this.page.goto(new URL('/inbox', this.page.url()).href);
    await this.page
      .getByText('Unsaved changes are available for recovery', { exact: true })
      .click();
    await this.page
      .getByRole('button', { name: 'Restore unsaved changes' })
      .click();
    await this.page
      .getByText('Unsaved changes are available for recovery', { exact: true })
      .waitFor({ state: 'hidden' });
  },
);

Then(
  'the task note contains {string}',
  async function (this: AppWorld, text: string) {
    const actual = await taskNote(this.page).inputValue();
    if (actual !== text)
      throw new Error(`Expected note "${text}", got "${actual}"`);
  },
);

const backups = new WeakMap<AppWorld, string>();

When('I export a full backup', async function (this: AppWorld) {
  await this.page.goto(new URL('/settings', this.page.url()).href);
  await this.page
    .getByRole('button', { name: 'Export backup', exact: true })
    .click();
  const download = this.page.waitForEvent('download');
  await this.page.getByRole('button', { name: 'Download JSON' }).click();
  const file = await download;
  const stream = await file.createReadStream();
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>)
    chunks.push(chunk);
  backups.set(this, Buffer.concat(chunks).toString('utf8'));
});

When('I restore that backup from a file', async function (this: AppWorld) {
  const backup = backups.get(this);
  if (!backup) throw new Error('Missing backup');
  await this.page.goto(new URL('/inbox', this.page.url()).href);
  await createTask(this.page, 'Created after backup');
  await this.page
    .getByRole('status', { name: 'Saving changes' })
    .waitFor({ state: 'hidden' });
  await this.page.goto(new URL('/settings', this.page.url()).href);
  await this.page
    .getByRole('button', { name: 'Restore from backup', exact: true })
    .click();
  await this.page.getByLabel('Choose backup file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup),
  });
  await this.page
    .getByRole('button', { name: 'Restore from backup', exact: true })
    .last()
    .click();
  await this.page
    .getByRole('button', { name: 'Replace current data', exact: true })
    .click();
  await this.page
    .getByRole('status', { name: 'Saving changes' })
    .waitFor({ state: 'hidden' });
  await this.page.goto(new URL('/inbox', this.page.url()).href);
  await this.page
    .getByRole('heading', { name: 'Inbox', exact: true })
    .waitFor();
  if (
    await this.page.getByText('Created after backup', { exact: true }).count()
  ) {
    throw new Error('The restored backup still contains the later task');
  }
});
