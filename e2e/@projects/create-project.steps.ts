import { Then, When } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { taskRows } from '../@tasks/task.shared';
import { pickDueDate } from '../calendar.shared';
import { openMenu, pageHeading } from '../navigation';
import type { AppWorld } from '../world';

function projectEditor(page: Page) {
  return page.getByRole('dialog', { name: 'Edit project', exact: true });
}

function projectHeader(page: Page) {
  return page.getByRole('button', { name: 'Edit project', exact: true });
}

async function startProject(page: Page) {
  const menu = await openMenu(page);
  await menu.getByRole('button', { name: 'New Project', exact: true }).click();
}

async function saveProject(page: Page) {
  const editor = projectEditor(page);
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await editor.waitFor({ state: 'hidden' });
}

When('I choose New Project from the menu', async function (this: AppWorld) {
  await startProject(this.page);
});

When(
  'I enter {string} as the project name',
  async function (this: AppWorld, name: string) {
    await projectEditor(this.page)
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(name);
  },
);

When('I save the project', async function (this: AppWorld) {
  await saveProject(this.page);
});

When(
  'I create {int} projects without entering a name',
  async function (this: AppWorld, count: number) {
    for (let index = 0; index < count; index++) {
      await startProject(this.page);
      await saveProject(this.page);
    }
  },
);

Then(
  'I see {int} project(s) named {string} in the project list',
  async function (this: AppWorld, count: number, name: string) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rowName = new RegExp(`^${escapedName} \\(\\d+\\)$`);
    const projects = this.page
      .getByRole('main')
      .getByRole('listitem')
      .getByRole('button', { name: rowName });
    await projects.first().waitFor({ state: 'visible' });
    assert.equal(await projects.count(), count);
  },
);

When(
  'I select {string} project behavior',
  async function (this: AppWorld, behavior: string) {
    await projectEditor(this.page)
      .getByRole('radiogroup', { name: 'Project Behavior', exact: true })
      .getByRole('radio', { name: behavior, exact: true })
      .click();
  },
);

Then(
  'I see the following tasks from the {string} project in Next:',
  async function (this: AppWorld, project: string, tasks: DataTable) {
    await pageHeading(this.page, 'Next').waitFor({ state: 'visible' });
    const rows = this.page
      .getByRole('main')
      .locator('section')
      .filter({
        has: this.page.getByRole('link', { name: project, exact: true }),
      })
      .getByRole('listitem');
    const expected = tasks.hashes();
    for (const { name } of expected) {
      await rows.getByText(name, { exact: true }).waitFor({ state: 'visible' });
    }
    assert.equal(await rows.count(), expected.length);
  },
);

When(
  'I add the tags {string} and {string}',
  async function (this: AppWorld, first: string, second: string) {
    await projectEditor(this.page)
      .getByRole('button', { name: 'Tags', exact: true })
      .click();
    const tags = this.page.getByRole('dialog', { name: 'Tags', exact: true });
    for (const name of [first, second]) {
      await tags.getByRole('checkbox', { name, exact: true }).check();
    }
    await tags.getByRole('button', { name: 'Save', exact: true }).click();
    await tags.waitFor({ state: 'hidden' });
  },
);

Then(
  'I see that the project has the tags {string} and {string}',
  async function (this: AppWorld, first: string, second: string) {
    const header = projectHeader(this.page);
    for (const name of [first, second]) {
      await header
        .getByText(name, { exact: true })
        .waitFor({ state: 'visible' });
    }
  },
);

When(
  'I set the due date to {string}',
  async function (this: AppWorld, iso: string) {
    await projectEditor(this.page)
      .getByRole('button', { name: 'Due', exact: true })
      .click();
    await pickDueDate(this.page, iso);
  },
);

When("I open the saved project's editor", async function (this: AppWorld) {
  await projectHeader(this.page).click();
});

Then(
  'I see that the project has a due date of {string}',
  async function (this: AppWorld, iso: string) {
    const date = new Date(`${iso}T12:00:00`);
    const displayed = new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
    }).format(date);
    await projectEditor(this.page)
      .getByText(displayed, { exact: true })
      .waitFor({ state: 'visible' });
  },
);

When(
  'I mark {string} done on the project page',
  async function (this: AppWorld, name: string) {
    await taskRows(this.page)
      .filter({ hasText: name })
      .getByRole('button', { name: 'Mark done', exact: true })
      .click();
  },
);

Then(
  'the project header shows {string}',
  async function (this: AppWorld, text: string) {
    await this.page
      .getByRole('main')
      .getByText(text, { exact: true })
      .waitFor({ state: 'visible' });
  },
);

Then(
  'the project header hides {string}',
  async function (this: AppWorld, text: string) {
    await this.page
      .getByRole('main')
      .getByText(text, { exact: true })
      .waitFor({ state: 'hidden' });
  },
);

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
