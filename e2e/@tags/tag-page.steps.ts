import { Given, Then, When } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { taskRows } from '../@tasks/task.shared';
import { goToPlace, pageHeading } from '../navigation';
import type { AppWorld } from '../world';

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

function doneToggle(page: Page) {
  return page.getByRole('button', {
    name: 'Done, collapse or expand',
    exact: true,
  });
}

When('I toggle Done', async function (this: AppWorld) {
  await doneToggle(this.page).click();
});

Then(
  'Done is collapsed and shows {int} task(s)',
  async function (this: AppWorld, count: number) {
    const toggle = doneToggle(this.page);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await toggle.getByText(String(count), { exact: true }).waitFor();
  },
);

Then('Done is expanded and hides its count', async function (this: AppWorld) {
  const toggle = doneToggle(this.page);
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(await toggle.innerText(), '');
});
