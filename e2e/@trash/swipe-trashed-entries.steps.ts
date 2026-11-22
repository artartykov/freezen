import { Given, Then, When } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import { defaultData, serializeData } from '../../src/shared/storage/document';
import {
  createProject,
  createReference,
} from '../../src/shared/storage/factories';
import type { AppWorld } from '../world';

function row(page: Page, title: string) {
  return page
    .getByRole('main')
    .getByRole('listitem')
    .filter({
      has: page.getByRole('button', { name: new RegExp(`^${title} `) }),
    });
}

Given(
  'Trash contains a project and a reference list',
  async function (this: AppWorld) {
    const data = serializeData({
      ...defaultData,
      settings: { ...defaultData.settings, showReference: true },
      projects: [createProject({ name: 'Old project', trashed: true })],
      references: [createReference({ name: 'Old reference', trashed: true })],
    });
    await this.page.route('**/trash-fixture', (route) =>
      route.fulfill({ body: '' }),
    );
    await this.page.goto('http://127.0.0.1:1422/trash-fixture');
    await this.page.evaluate(async (document) => {
      localStorage.setItem(
        'freezen-ui',
        JSON.stringify({
          state: { onboardingCompleted: true, lastPath: '/inbox' },
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
          transaction.objectStore('data').put(document, 'document');
          transaction.onerror = () =>
            reject(transaction.error ?? new Error('Unable to save fixture'));
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
        };
      });
    }, data);
    await this.openApp();
  },
);

When(
  'I swipe {word} on the trash row {string}',
  async function (this: AppWorld, direction: string, title: string) {
    const entry = row(this.page, title);
    await entry.waitFor();
    const box = await entry.boundingBox();
    if (!box) throw new Error('The row has no bounding box');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + (direction === 'left' ? -90 : 90), y, {
      steps: 5,
    });
    await this.page.mouse.up();
  },
);

Then(
  'the trash row {string} is selected',
  async function (this: AppWorld, title: string) {
    await row(this.page, title)
      .and(this.page.locator('[aria-selected="true"]'))
      .waitFor({ timeout: 5000 });
  },
);

When(
  'I choose Delete for the selected trash rows',
  async function (this: AppWorld) {
    await this.page
      .getByRole('toolbar')
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
    await this.page
      .getByRole('alertdialog', { name: 'Delete from Trash?' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
  },
);

Then('both trash rows are removed from Trash', async function (this: AppWorld) {
  for (const title of ['Old project', 'Old reference']) {
    await row(this.page, title).waitFor({ state: 'hidden' });
  }
});

When('I choose Restore from the Move sheet', async function (this: AppWorld) {
  await this.page
    .getByRole('dialog', { name: 'Move', exact: true })
    .getByRole('radio', { name: 'Restore', exact: true })
    .click({ timeout: 5000 });
});

Then(
  'the trash row {string} disappears',
  async function (this: AppWorld, title: string) {
    await row(this.page, title).waitFor({ state: 'hidden' });
  },
);

Then(
  'the trash row {string} is visible',
  async function (this: AppWorld, title: string) {
    await row(this.page, title).waitFor();
  },
);
