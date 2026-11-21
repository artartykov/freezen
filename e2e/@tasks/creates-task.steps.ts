import assert from 'node:assert/strict';
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

Then(
  'the handle for editing {string} stays at the top when the keyboard opens and closes',
  async function (this: AppWorld, title: string) {
    const { page } = this;
    await page.setViewportSize({ width: 390, height: 700 });
    await page.getByRole('main').getByRole('button', { name: title }).click();
    const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
    const panel = editor.locator('div.absolute.inset-x-0.bottom-0');
    const top = () => panel.evaluate((node) => getComputedStyle(node).top);

    assert.equal(
      await top(),
      '0px',
      'Editor should touch the top before opening the keyboard',
    );
    await editor.getByRole('textbox', { name: 'Title', exact: true }).focus();
    await page.setViewportSize({ width: 390, height: 400 });
    assert.equal(
      await top(),
      '0px',
      'Editor should touch the top with the keyboard open',
    );
    await page.setViewportSize({ width: 390, height: 700 });
    assert.equal(
      await top(),
      '0px',
      'Editor should touch the top after closing the keyboard',
    );
  },
);
