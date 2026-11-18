import { Then, When } from '@cucumber/cucumber';
import { pageHeading, placeName } from '../navigation';
import type { AppWorld } from '../world';
import { createTask } from './task.shared';

const taskTitle = 'Plan the next release';

When('I create a task', async function (this: AppWorld) {
  await createTask(this.page, taskTitle);
});

Then(
  /^I see the new task in the (.+)$/,
  async function (this: AppWorld, place: string) {
    await pageHeading(this.page, placeName(place)).waitFor({
      state: 'visible',
    });
    await this.page
      .getByRole('main')
      .getByRole('listitem')
      .getByText(taskTitle, { exact: true })
      .waitFor({ state: 'visible' });
  },
);
