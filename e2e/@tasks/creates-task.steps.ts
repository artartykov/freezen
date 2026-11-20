import { Then, When } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';
import { goToPlace, pageHeading, placeName } from '../navigation';
import type { AppWorld } from '../world';
import { createTask, setTaskProperties } from './task.shared';

When(
  'I create the following tasks:',
  async function (this: AppWorld, tasks: DataTable) {
    for (const { name, state, tags, due, time, energy } of tasks.hashes()) {
      if (state)
        await goToPlace(this.page, state[0].toUpperCase() + state.slice(1));
      await createTask(this.page, name);
      const tagNames = (tags ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      if (tagNames.length || due || time || energy) {
        await setTaskProperties(this.page, name, {
          tags: tagNames,
          due,
          time,
          energy,
        });
      }
    }
  },
);

Then(
  /^I see the task "([^"]+)" in the (.+)$/,
  async function (this: AppWorld, title: string, place: string) {
    await pageHeading(this.page, placeName(place)).waitFor({
      state: 'visible',
    });
    await this.page
      .getByRole('main')
      .getByRole('listitem')
      .getByText(title, { exact: true })
      .waitFor({ state: 'visible' });
  },
);
