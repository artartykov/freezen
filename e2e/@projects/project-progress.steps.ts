import { Then, When } from '@cucumber/cucumber';
import { taskRows } from '../@tasks/task.shared';
import type { AppWorld } from '../world';

When(
  'I mark {string} done on the project page',
  async function (this: AppWorld, name: string) {
    await taskRows(this.page)
      .filter({ hasText: name })
      .getByRole('button', { name: 'Mark done', exact: true })
      .click();
  },
);

Then(
  'the project header shows {string}',
  async function (this: AppWorld, text: string) {
    await this.page
      .getByRole('main')
      .getByText(text, { exact: true })
      .waitFor({ state: 'visible' });
  },
);

Then(
  'the project header hides {string}',
  async function (this: AppWorld, text: string) {
    await this.page
      .getByRole('main')
      .getByText(text, { exact: true })
      .waitFor({ state: 'hidden' });
  },
);
