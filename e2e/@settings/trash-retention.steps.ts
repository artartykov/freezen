import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import { taskRows } from '../@tasks/task.shared';
import type { AppWorld } from '../world';

const initialTime = Date.UTC(2026, 0, 5, 12);
const day = 24 * 60 * 60 * 1000;

function task(page: Page, title: string) {
  return taskRows(page).getByText(title, { exact: true });
}

Given(
  'the clock is set to the initial retention test date',
  async function (this: AppWorld) {
    await this.page.clock.setFixedTime(initialTime);
  },
);

When(
  'I set the clock to {int} days after the old task was moved to Trash',
  async function (this: AppWorld, days: number) {
    await this.page.clock.setFixedTime(initialTime + days * day);
  },
);

When(
  'I set Trash Retention to {string}',
  async function (this: AppWorld, duration: string) {
    const setting = this.page.getByRole('button', {
      name: /^Trash Retention\b/,
    });
    await setting.click();
    await this.page
      .getByRole('radiogroup', { name: 'Trash Retention', exact: true })
      .getByRole('radio', { name: duration, exact: true })
      .click();
    await setting.filter({ hasText: duration }).waitFor();
  },
);

When(
  'I move {string} to Trash for the retention check',
  async function (this: AppWorld, title: string) {
    await task(this.page, title).click();
    await this.page
      .getByRole('dialog', { name: 'To-do', exact: true })
      .getByRole('button', { name: 'Trash', exact: true })
      .click();
    await this.page
      .getByRole('alertdialog', { name: 'Move to Trash?', exact: true })
      .getByRole('button', { name: 'Trash', exact: true })
      .click();
    await task(this.page, title).waitFor({ state: 'hidden' });
  },
);

Then(
  '{string} is still in Trash',
  async function (this: AppWorld, title: string) {
    await task(this.page, title).waitFor();
  },
);

Then(
  '{string} is absent from Trash',
  async function (this: AppWorld, title: string) {
    assert.equal(await task(this.page, title).count(), 0);
  },
);

When('I leave Settings', async function (this: AppWorld) {
  await this.page
    .getByRole('main')
    .getByRole('button', { name: 'Back', exact: true })
    .click();
  await this.page
    .getByRole('heading', { name: 'Settings', exact: true })
    .waitFor({ state: 'hidden' });
});
