import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { taskRows } from '../@tasks/task.shared';
import type { AppWorld } from '../world';

When(
  'I open the move menu for {string} from {string}',
  async function (this: AppWorld, task: string, status: string) {
    const editor = this.page.getByRole('dialog', {
      name: 'To-do',
      exact: true,
    });
    if (!(await editor.isVisible())) {
      await taskRows(this.page).getByRole('button', { name: task }).click();
    }
    await editor.getByRole('button', { name: status, exact: true }).click();
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
    await menu.getByRole('radio', { name: status, exact: true }).click();
    await menu.waitFor({ state: 'hidden' });
  },
);
