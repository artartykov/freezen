import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { taskRows } from '../@tasks/task.shared';
import { goToPlace, pageHeading } from '../navigation';
import type { AppWorld } from '../world';

When(
  'I set Effort time format to {string}',
  async function (this: AppWorld, option: string) {
    const { page } = this;
    const title = 'Effort time format';
    await goToPlace(page, 'Settings');
    const setting = page.getByRole('button', { name: /^Effort time format\b/ });
    await setting.click();
    await page
      .getByRole('radiogroup', { name: title, exact: true })
      .getByRole('radio', { name: option, exact: true })
      .click();
    await setting.filter({ hasText: option }).waitFor();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await pageHeading(page, 'Settings').waitFor({ state: 'hidden' });
  },
);

Then(
  'the task {string} shows {int} pomodoro icons in the list and editor',
  async function (this: AppWorld, task: string, count: number) {
    const { page } = this;
    const label = `${count} pomodoros`;
    const row = taskRows(page).filter({
      has: page.getByText(task, { exact: true }),
    });
    const estimate = row.getByRole('img', { name: label, exact: true });
    await estimate.waitFor();
    assert.equal(
      await estimate
        .locator('img')
        .evaluateAll(async (icons: HTMLImageElement[]) => {
          await Promise.all(icons.map((icon) => icon.decode()));
          return icons.length;
        }),
      count,
    );
    await row.getByRole('button', { name: task }).click();
    const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
    await editor.getByRole('button', { name: label, exact: true }).click();
    const picker = page.getByRole('dialog', {
      name: 'Time needed',
      exact: true,
    });
    await picker
      .getByRole('radio', { name: label, exact: true, checked: true })
      .waitFor();
    await picker.getByRole('button', { name: 'Back', exact: true }).click();
    await editor.getByRole('button', { name: 'Back', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
  },
);

Then(
  'the task {string} shows an estimate of {string}',
  async function (this: AppWorld, task: string, estimate: string) {
    await taskRows(this.page)
      .filter({ has: this.page.getByText(task, { exact: true }) })
      .getByText(estimate, { exact: true })
      .waitFor();
  },
);
