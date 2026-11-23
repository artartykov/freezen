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
  'the task {string} shows an estimate of {string}',
  async function (this: AppWorld, task: string, estimate: string) {
    await taskRows(this.page)
      .filter({ has: this.page.getByText(task, { exact: true }) })
      .getByText(estimate, { exact: true })
      .waitFor();
  },
);
