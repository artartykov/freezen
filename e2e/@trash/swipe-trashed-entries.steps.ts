import { Given, Then, When } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import {
  type AppData,
  defaultData,
  serializeData,
} from '../../src/shared/storage/document';
import {
  createProject,
  createReference,
  createTask,
} from '../../src/shared/storage/factories';
import { taskRows } from '../@tasks/task.shared';
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
    const data = {
      ...defaultData,
      settings: { ...defaultData.settings, showReference: true },
      projects: [createProject({ name: 'Old project', trashed: true })],
      references: [createReference({ name: 'Old reference', trashed: true })],
    };
    await openTrashFixture(this, data);
  },
);

async function openTrashFixture(world: AppWorld, data: AppData) {
  await world.page.route('**/trash-fixture', (route) =>
    route.fulfill({ body: '' }),
  );
  await world.page.goto('http://127.0.0.1:1422/trash-fixture');
  await world.page.evaluate(async (document) => {
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
  }, serializeData(data));
  await world.openApp();
}

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

const separatelyTrashedTitles = ['Task 1', 'Task 2', 'Task 3', 'Task 4'];

Given(
  'I moved four tasks to Trash before moving their project',
  async function (this: AppWorld) {
    const project = createProject({ name: 'Get started', trashed: true });
    const tasks = [
      ...separatelyTrashedTitles.map((title) =>
        createTask({ title, projectId: project.id, trashed: true }),
      ),
      ...['Task 5', 'Task 6', 'Task 7'].map((title) =>
        createTask({ title, projectId: project.id }),
      ),
    ];
    await openTrashFixture(this, {
      ...defaultData,
      projects: [project],
      tasks,
    });
  },
);

Then(
  'all four separately trashed tasks are visible',
  async function (this: AppWorld) {
    for (const title of separatelyTrashedTitles) {
      await taskRows(this.page)
        .getByRole('button', { name: new RegExp(`^${title}`) })
        .waitFor({ timeout: 5000 });
    }
  },
);

Then(
  'the trash row {string} counts {int} tasks',
  async function (this: AppWorld, title: string, count: number) {
    await row(this.page, title)
      .getByText(`${title} (${count})`, { exact: true })
      .waitFor({ timeout: 5000 });
  },
);
