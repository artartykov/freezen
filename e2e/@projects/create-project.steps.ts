import { Then, When } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { createTask } from '../@tasks/task.shared';
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

When(
  'I create the following tasks in the {string} project:',
  async function (this: AppWorld, project: string, tasks: DataTable) {
    await pageHeading(this.page, project).waitFor({ state: 'visible' });
    const rows = this.page.getByRole('main').getByRole('listitem');
    for (const { name } of tasks.hashes()) {
      await createTask(this.page, name);
      await rows.getByText(name, { exact: true }).waitFor({ state: 'visible' });
    }
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
    const date = new Date(`${iso}T12:00:00`);
    const year = date.getFullYear();
    await projectEditor(this.page)
      .getByRole('button', { name: 'Due', exact: true })
      .click();
    const calendar = this.page.getByRole('alertdialog', {
      name: 'Due date',
      exact: true,
    });
    const monthPicker = calendar.getByRole('button', {
      name: 'Choose year',
      exact: true,
    });
    await monthPicker.click();
    await calendar
      .getByRole('button', { name: String(year), exact: true })
      .click();

    const formatMonth = new Intl.DateTimeFormat('en', {
      month: 'long',
      year: 'numeric',
    });
    const months = Array.from({ length: 12 }, (_, month) =>
      formatMonth.format(new Date(year, month, 1)),
    );
    const displayedMonth = (await monthPicker.innerText()).trim();
    const currentMonth = months.indexOf(displayedMonth);
    assert.ok(
      currentMonth >= 0,
      `Unexpected calendar month: ${displayedMonth}`,
    );

    const offset = date.getMonth() - currentMonth;
    const arrow = calendar.getByRole('button', {
      name: offset < 0 ? 'Previous month' : 'Next month',
      exact: true,
    });
    for (let month = 0; month < Math.abs(offset); month++) {
      await arrow.click();
    }
    const day = new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(
      date,
    );
    await calendar.getByRole('button', { name: day, exact: true }).click();
    await calendar.getByRole('button', { name: 'OK', exact: true }).click();
    await calendar.waitFor({ state: 'hidden' });
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
