import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { taskRows } from '../@tasks/task.shared';
import type { AppWorld } from '../world';

When('I collect Done tasks to Logbook', async function (this: AppWorld) {
  await this.page
    .getByRole('button', { name: 'Collect to Logbook', exact: true })
    .click({ timeout: 4000 });
  assert.equal(await this.page.getByRole('alertdialog').count(), 0);
});

Then(
  '{string} is absent from the Logbook',
  async function (this: AppWorld, title: string) {
    assert.equal(
      await taskRows(this.page).getByText(title, { exact: true }).count(),
      0,
    );
  },
);

function loggedToggle(page: AppWorld['page']) {
  return page.getByRole('button', {
    name: 'Logged, collapse or expand',
    exact: true,
  });
}

Then(
  'the project Logged group is collapsed with a count of {int}',
  async function (this: AppWorld, count: number) {
    const toggle = loggedToggle(this.page);
    await toggle.waitFor({ timeout: 4000 });
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await toggle.textContent(), String(count));
  },
);

When('I expand the project Logged group', async function (this: AppWorld) {
  await loggedToggle(this.page).click();
});

Then(
  'the project Logged group shows {string}',
  async function (this: AppWorld, title: string) {
    assert.equal(await loggedToggle(this.page).textContent(), '');
    await this.page
      .locator('section')
      .filter({ has: loggedToggle(this.page) })
      .getByText(title, { exact: true })
      .waitFor({ timeout: 4000 });
  },
);

Then('the project Logged group is below Done', async function (this: AppWorld) {
  const done = this.page.getByRole('button', {
    name: 'Done, collapse or expand',
    exact: true,
  });
  await done.waitFor();
  const logged = await loggedToggle(this.page).elementHandle();
  assert.ok(
    await done.evaluate(
      (button, other) =>
        !!(
          button.compareDocumentPosition(other) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
      logged,
    ),
  );
});

When(
  'I restore the logged task {string}',
  async function (this: AppWorld, title: string) {
    await taskRows(this.page)
      .filter({ hasText: title })
      .getByRole('button', { name: 'Mark not done', exact: true })
      .click();
    await this.page
      .getByRole('alertdialog', { name: 'Restore task?', exact: true })
      .getByRole('button', { name: 'Restore', exact: true })
      .click();
  },
);

Then(
  'I see the active task {string} in the project',
  async function (this: AppWorld, title: string) {
    await taskRows(this.page)
      .filter({ hasText: title })
      .getByRole('button', { name: 'Mark done', exact: true })
      .waitFor({ timeout: 4000 });
  },
);
