import { Given, Then, When } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { defaultData } from '../../src/shared/storage/document';
import type { Tag, Task } from '../../src/shared/storage/document';
import { createTag, createTask } from '../../src/shared/storage/factories';
import { openWithBrowserData } from '../browser-fixture';
import { taskRows } from '../@tasks/task.shared';
import { goToPlace, openMenu, pageHeading } from '../navigation';
import type { AppWorld } from '../world';

Given(
  'the app starts with the following tasks:',
  async function (this: AppWorld, table: DataTable) {
    const tasks: Task[] = [];
    const tags = new Map<string, Tag>();
    for (const row of table.hashes()) {
      const { name, state, tags: names, due, minutes, energy } = row;
      assert(
        state === 'inbox' || state === 'next',
        'Invalid fixture task state',
      );
      assert(
        energy === undefined || energy === '' || energy === 'high',
        'Invalid fixture task energy',
      );
      const tagIds = (names ?? '')
        .split(',')
        .filter(Boolean)
        .map((name) => {
          const label = name.trim();
          const tag = tags.get(label) ?? createTag({ name: label });
          tags.set(label, tag);
          return tag.id;
        });
      tasks.unshift(
        createTask({
          title: name,
          state,
          tagIds,
          due: due || null,
          minutes: minutes ? Number(minutes) : null,
          energy: energy || null,
        }),
      );
    }
    await openWithBrowserData(
      this,
      { ...defaultData, tasks, tags: [...tags.values()] },
      '/focus',
    );
  },
);

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
    await goToPlace(this.page, tag);
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

Then(
  'the menu shows only the tag links {string} and {string}',
  async function (this: AppWorld, first: string, second: string) {
    const menu = await openMenu(this.page);
    const links = menu
      .getByRole('group', { name: 'Tags list', exact: true })
      .getByRole('link');
    assert.deepEqual(await links.allTextContents(), [
      'All',
      first,
      second,
      '—',
    ]);
  },
);

Then(
  'I see the project {string} on the tag page',
  async function (this: AppWorld, name: string) {
    await tagPageGroup(this.page, 'Projects')
      .getByText(`${name} (0)`, { exact: true })
      .waitFor({ timeout: 4000 });
  },
);
