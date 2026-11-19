import { Given, Then, When } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { Locator, Page } from 'playwright';
import { pickDueDate } from '../calendar.shared';
import { createTask } from '../@tasks/task.shared';
import { openMenu, pageHeading } from '../navigation';
import type { AppWorld } from '../world';

async function goToPlace(page: Page, place: string) {
  const menu = await openMenu(page);
  await menu.getByRole('link', { name: place, exact: true }).click();
  await pageHeading(page, place).waitFor({ state: 'visible' });
}

function taskRows(page: Page) {
  return page.getByRole('main').getByRole('listitem');
}

type TaskProperties = {
  tags: string[];
  due?: string;
  time?: string;
  energy?: string;
};

async function setTaskProperties(
  page: Page,
  title: string,
  { tags: tagNames, due, time, energy }: TaskProperties,
) {
  await taskRows(page).getByRole('button', { name: title }).click();
  const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
  if (tagNames.length > 0) {
    await editor.getByRole('button', { name: 'Tags', exact: true }).click();
    const tags = page.getByRole('dialog', { name: 'Tags', exact: true });
    const search = tags.getByRole('textbox', {
      name: 'Search or create tag…',
      exact: true,
    });
    for (const tag of tagNames) {
      await search.fill(tag);
      await search.press('Enter');
    }
    await tags.getByRole('button', { name: 'Save', exact: true }).click();
    await tags.waitFor({ state: 'hidden' });
  }
  if (due) {
    await editor.getByRole('button', { name: 'Due', exact: true }).click();
    await pickDueDate(page, due);
  }
  if (time) await chooseOption(page, editor, 'Time', 'Time needed', time);
  if (energy) {
    await chooseOption(page, editor, 'Energy', 'Energy needed', energy);
  }
  await editor.getByRole('button', { name: 'Back', exact: true }).click();
  await editor.waitFor({ state: 'hidden' });
}

async function chooseOption(
  page: Page,
  editor: Locator,
  button: string,
  title: string,
  option: string,
) {
  await editor.getByRole('button', { name: button, exact: true }).click();
  await page
    .getByRole('radiogroup', { name: title, exact: true })
    .getByRole('radio', { name: option, exact: true })
    .click();
}

function tagPageGroup(page: Page, group: string) {
  return page
    .getByRole('main')
    .locator('section')
    .filter({
      has: page.getByRole('button', {
        name: `${group}, collapse or expand`,
        exact: true,
      }),
    });
}

Given(
  'I create the following tasks:',
  async function (this: AppWorld, tasks: DataTable) {
    for (const { name, state, tags, due, time, energy } of tasks.hashes()) {
      await goToPlace(this.page, state[0].toUpperCase() + state.slice(1));
      await createTask(this.page, name);
      await setTaskProperties(this.page, name, {
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        due,
        time,
        energy,
      });
    }
  },
);

Given(
  'I complete the task {string} in the {word}',
  async function (this: AppWorld, name: string, place: string) {
    await goToPlace(this.page, place);
    await taskRows(this.page)
      .filter({ hasText: name })
      .getByRole('button', { name: 'Mark done', exact: true })
      .click();
  },
);

When(
  'I choose the tag {string} from the menu',
  async function (this: AppWorld, tag: string) {
    const menu = await openMenu(this.page);
    await menu.getByRole('link', { name: tag, exact: true }).click();
    await pageHeading(this.page, tag).waitFor({ state: 'visible' });
  },
);

Then(
  'I see the tag page {string}',
  async function (this: AppWorld, name: string) {
    await pageHeading(this.page, name).waitFor({ state: 'visible' });
  },
);

Then(
  'I see among the {string} group of the tag page the tasks:',
  async function (this: AppWorld, group: string, tasks: DataTable) {
    const rows = tagPageGroup(this.page, group).getByRole('listitem');
    for (const { name } of tasks.hashes()) {
      await rows.getByText(name, { exact: true }).waitFor({ state: 'visible' });
    }
  },
);

Then(
  'I see the following tasks in the {string} group of the tag page:',
  async function (this: AppWorld, group: string, tasks: DataTable) {
    const rows = tagPageGroup(this.page, group).getByRole('listitem');
    const expected = tasks.hashes();
    for (const { name } of expected) {
      await rows.getByText(name, { exact: true }).waitFor({ state: 'visible' });
    }
    assert.equal(await rows.count(), expected.length);
  },
);

Then(
  'I see {int} task(s) on the tag page',
  async function (this: AppWorld, count: number) {
    const rows = taskRows(this.page);
    await rows.first().waitFor({ state: 'visible' });
    assert.equal(await rows.count(), count);
  },
);

function filterChips(page: Page) {
  return page
    .getByRole('main')
    .getByRole('group', { name: 'Filter', exact: true })
    .getByRole('button');
}

When(
  'I select the {string} filter chip',
  async function (this: AppWorld, name: string) {
    await filterChips(this.page).getByText(name, { exact: true }).click();
  },
);

Then(
  'I see the following filter chips on the tag page:',
  async function (this: AppWorld, chips: DataTable) {
    const expected = chips.hashes().map(({ name }) => name);
    await filterChips(this.page).first().waitFor({ state: 'visible' });
    assert.deepEqual(await filterChips(this.page).allInnerTexts(), expected);
  },
);
