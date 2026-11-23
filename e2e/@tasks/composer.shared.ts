import { Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { addDays, todayIso } from '../../src/shared/lib/date';
import { pickCalendarDate, pickDueDate } from '../calendar.shared';
import type { AppWorld } from '../world';
import {
  composerName,
  dismissTaskComposer,
  openTaskComposer,
  taskComposer,
  waitForEmptyComposer,
} from './task.shared';

export const initialViewportHeights = new WeakMap<AppWorld, number>();

When('I open the task composer', async function (this: AppWorld) {
  initialViewportHeights.set(
    this,
    await this.page.evaluate(
      () => window.visualViewport?.height ?? window.innerHeight,
    ),
  );
  await openTaskComposer(this.page);
});

Then(
  'the task composer has an inactive voice action',
  async function (this: AppWorld) {
    const action = taskComposer(this.page).getByRole('button', {
      name: 'Voice recording',
      exact: true,
    });
    assert.ok(await action.isDisabled());
  },
);

When(
  'I expand the description and enter {string}',
  async function (this: AppWorld, value: string) {
    const composer = taskComposer(this.page);
    await composer
      .getByRole('button', { name: 'Show notes', exact: true })
      .press('ArrowUp');
    await composer
      .getByRole('textbox', { name: 'Notes', exact: true })
      .fill(value);
  },
);

Then(
  'the task composer has a disabled send action',
  async function (this: AppWorld) {
    const action = taskComposer(this.page).getByRole('button', {
      name: 'Send task',
      exact: true,
    });
    assert.ok(await action.isDisabled());
  },
);

When(
  'I enter {string} as the task name and send it',
  async function (this: AppWorld, value: string) {
    await composerName(this.page).fill(value);
    await taskComposer(this.page)
      .getByRole('button', { name: 'Send task', exact: true })
      .click();
    await waitForEmptyComposer(this.page);
  },
);

Then(
  'the composer is open with an empty task name and collapsed description',
  async function (this: AppWorld) {
    await taskComposer(this.page)
      .getByRole('button', { name: 'Show notes', exact: true })
      .waitFor();
    assert.equal(await composerName(this.page).inputValue(), '');
    assert.equal(
      await taskComposer(this.page)
        .locator('textarea[aria-label="Notes"]')
        .inputValue(),
      '',
    );
  },
);

When('I dismiss the task composer', async function (this: AppWorld) {
  await dismissTaskComposer(this.page);
});

When(
  'I schedule the draft and set its time and due date',
  async function (this: AppWorld) {
    const composer = taskComposer(this.page);
    await composer.getByRole('button', { name: 'Inbox', exact: true }).click();
    await composer
      .getByRole('menuitemradio', { name: 'Scheduled', exact: true })
      .click();
    await composer.getByRole('button', { name: /^for / }).click();
    const start = this.page.getByRole('alertdialog', {
      name: 'Start date',
      exact: true,
    });
    await start.getByRole('button', { name: 'OK', exact: true }).click();
    await composer
      .getByRole('button', { name: 'Add task properties', exact: true })
      .click();
    await composer.getByRole('menuitem', { name: 'Time', exact: true }).click();
    await this.page
      .getByRole('radio', { name: '15 minutes', exact: true })
      .click();
    await composer.getByRole('button', { name: 'Due', exact: true }).click();
    await pickDueDate(this.page, addDays(todayIso(), 3));
  },
);

Then(
  'the composer shows scheduled controls below the property and send buttons',
  async function (this: AppWorld) {
    const controls = taskComposer(this.page).locator(
      '[data-composer-controls]',
    );
    assert.deepEqual(await controls.getByRole('button').allTextContents(), [
      '',
      'Due in 3 days',
      '15 min',
      '',
      'Project',
      'Scheduled',
      await controls.getByRole('button', { name: /^for / }).innerText(),
      'Repeat',
    ]);
  },
);

When(
  'I change the composer destination from {string} to {string}',
  async function (this: AppWorld, current: string, next: string) {
    const composer = taskComposer(this.page);
    await composer
      .getByRole('button', { name: current, exact: true })
      .click({ timeout: 5000 });
    const options = composer.getByRole('menu', { name: current, exact: true });
    assert.equal(
      await options
        .getByRole('menuitemradio', { name: 'Get Started with FreeZen' })
        .count(),
      0,
    );
    await options
      .getByRole('menuitemradio', { name: next, exact: true })
      .click();
  },
);

Then(
  'the composer destination is {string} with project {string}',
  async function (this: AppWorld, state: string, project: string) {
    const composer = taskComposer(this.page);
    await composer
      .getByRole('button', { name: state, exact: true })
      .waitFor({ timeout: 5000 });
    await composer
      .getByRole('button', { name: project, exact: true })
      .waitFor();
  },
);

Then(
  'the composer destination is {string} without a project',
  async function (this: AppWorld, state: string) {
    const composer = taskComposer(this.page);
    await composer.getByRole('button', { name: state, exact: true }).waitFor();
    assert.equal(
      await composer
        .getByRole('button', { name: 'Get Started with FreeZen', exact: true })
        .count(),
      0,
    );
    assert.equal(
      await composer
        .getByRole('button', { name: 'Project', exact: true })
        .count(),
      state === 'Inbox' ? 0 : 1,
    );
  },
);

When('I remove the project from the composer', async function (this: AppWorld) {
  const composer = taskComposer(this.page);
  await composer
    .getByRole('button', { name: 'Get Started with FreeZen', exact: true })
    .click();
  await composer
    .getByRole('menuitemradio', { name: 'None', exact: true })
    .click();
});

When(
  'I assign {string} as the composer project',
  async function (this: AppWorld, project: string) {
    const composer = taskComposer(this.page);
    await composer
      .getByRole('button', { name: 'Project', exact: true })
      .click();
    assert.equal(
      await composer
        .getByRole('menuitemradio', { name: 'None', exact: true })
        .count(),
      0,
    );
    await composer
      .getByRole('menuitemradio', { name: project, exact: true })
      .click();
  },
);

When(
  'I schedule the composer draft for {string} with repeat {string}',
  async function (this: AppWorld, date: string, repeat: string) {
    const composer = taskComposer(this.page);
    await composer.getByRole('button', { name: /^for / }).click();
    await pickCalendarDate(this.page, 'Start date', date);
    await composer.getByRole('button', { name: 'Repeat', exact: true }).click();
    await this.page.getByRole('radio', { name: repeat, exact: true }).click();
  },
);

Then(
  'the composer keeps the start date {string} and repeat {string}',
  async function (this: AppWorld, date: string, repeat: string) {
    const composer = taskComposer(this.page);
    const formatted = new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${date}T12:00:00`));
    await composer
      .getByRole('button', { name: `for ${formatted}`, exact: true })
      .waitFor();
    await composer.getByRole('button', { name: repeat, exact: true }).waitFor();
  },
);

Then(
  'the composer offers repeat only in the scheduled row',
  async function (this: AppWorld) {
    const composer = taskComposer(this.page);
    assert.equal(
      await composer
        .getByRole('button', { name: /^(for |Repeat$|Every )/ })
        .count(),
      0,
    );
    await composer
      .getByRole('button', { name: 'Add task properties', exact: true })
      .click();
    const menu = composer.getByRole('menu', {
      name: 'Add task properties',
      exact: true,
    });
    await menu.waitFor();
    assert.equal(
      await menu.getByRole('menuitem', { name: 'Repeat', exact: true }).count(),
      0,
    );
  },
);

Then(
  'the composer keeps the waiting contact {string}',
  async function (this: AppWorld, name: string) {
    const composer = taskComposer(this.page);
    await composer
      .getByRole('button', { name: 'Waiting', exact: true })
      .waitFor();
    await composer
      .getByRole('button', { name: `for ${name}`, exact: true })
      .waitFor();
  },
);
