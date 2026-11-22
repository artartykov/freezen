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

Then('the project has no Logged group', async function (this: AppWorld) {
  assert.equal(
    await this.page
      .getByRole('button', { name: 'Logged, collapse or expand', exact: true })
      .count(),
    0,
  );
});

Then(
  'the Logbook shows {string} from project {string}',
  async function (this: AppWorld, title: string, project: string) {
    await taskRows(this.page)
      .filter({ hasText: title })
      .getByText(project, { exact: true })
      .waitFor({ timeout: 4000 });
  },
);
