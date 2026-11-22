import { Then } from '@cucumber/cucumber';
import type { AppWorld } from '../world';

Then(
  'the task details and word wrapping options are enabled',
  async function (this: AppWorld) {
    const { page } = this;
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByText('View Options', { exact: true }).click();
    const options = page.getByRole('dialog', { name: 'View Options' });
    for (const name of [
      'Word-wrap long task names',
      'Show Notes',
      'Show Tags',
      'Show Effort',
    ]) {
      await options
        .getByRole('switch', { name, exact: true, checked: true })
        .waitFor({ timeout: 3000 });
    }
  },
);
