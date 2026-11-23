import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { taskRows } from '../@tasks/task.shared';
import { openMenu } from '../navigation';
import type { AppWorld } from '../world';

When(
  'I open the move menu for {string}',
  async function (this: AppWorld, task: string) {
    const editor = this.page.getByRole('dialog', {
      name: 'To-do',
      exact: true,
    });
    if (!(await editor.isVisible())) {
      await taskRows(this.page).getByRole('button', { name: task }).click();
    }
    await editor.getByRole('button', { name: 'Move', exact: true }).click();
  },
);

Then(
  'the move menu marks {string} and {string}',
  async function (this: AppWorld, project: string, status: string) {
    const menu = this.page.getByRole('dialog', { name: 'Move', exact: true });
    await menu
      .getByRole('radio', { name: project, checked: true, exact: true })
      .waitFor({ timeout: 3000 });
    await menu
      .getByRole('radio', { name: status, checked: true, exact: true })
      .waitFor({ timeout: 3000 });
    assert.equal(await menu.getByRole('radio', { checked: true }).count(), 2);
    assert.equal(
      await menu.getByRole('radio', { name: 'Focus', exact: true }).count(),
      0,
    );
  },
);

When(
  'I choose {string} in the move menu',
  async function (this: AppWorld, status: string) {
    const menu = this.page.getByRole('dialog', { name: 'Move', exact: true });
    await menu
      .getByRole('radio', { name: status, exact: true })
      .click({ timeout: 4000 });
    await menu.waitFor({ state: 'hidden' });
  },
);

When(
  'I create the reference list {string}',
  async function (this: AppWorld, name: string) {
    const menu = await openMenu(this.page);
    await menu.getByRole('button', { name: 'New Reference List' }).click();
    const editor = this.page.getByRole('dialog', {
      name: 'Edit reference list',
      exact: true,
    });
    await editor
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(name);
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
  },
);

Then(
  'the task {string} is gone from the project',
  async function (this: AppWorld, title: string) {
    await this.page
      .getByRole('dialog', { name: 'To-do', exact: true })
      .waitFor({ state: 'hidden' });
    await taskRows(this.page)
      .getByText(title, { exact: true })
      .waitFor({ state: 'hidden' });
  },
);

Then(
  'I see {string} as a reference item',
  async function (this: AppWorld, title: string) {
    const row = taskRows(this.page).filter({
      has: this.page.getByText(title, { exact: true }),
    });
    await row.waitFor({ timeout: 4000 });
    assert.equal(
      await row.getByRole('button', { name: 'Mark done' }).count(),
      0,
    );
  },
);

Then(
  '{string} is the first option in the {string} section of Move',
  async function (this: AppWorld, option: string, section: string) {
    const first = this.page
      .getByRole('dialog', { name: 'Move', exact: true })
      .getByRole('radiogroup', { name: section, exact: true })
      .getByRole('radio')
      .first();
    await first.waitFor({ timeout: 4000 });
    assert.equal(await first.innerText(), option);
    await first.locator('svg.lucide-circle-minus').waitFor({ timeout: 4000 });
  },
);

Then(
  'the move menu does not offer {string}',
  async function (this: AppWorld, option: string) {
    const menu = this.page.getByRole('dialog', { name: 'Move', exact: true });
    await menu.waitFor({ timeout: 4000 });
    assert.equal(
      await menu.getByRole('radio', { name: option, exact: true }).count(),
      0,
    );
  },
);
