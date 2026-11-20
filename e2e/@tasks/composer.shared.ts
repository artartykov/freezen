import { Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { addDays, todayIso } from '../../src/shared/lib/date';
import { pickDueDate } from '../calendar.shared';
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
      .getByRole('button', { name: 'Show description', exact: true })
      .click();
    await composer
      .getByRole('textbox', { name: 'Description', exact: true })
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
      .getByRole('button', { name: 'Show description', exact: true })
      .waitFor();
    assert.equal(await composerName(this.page).inputValue(), '');
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
  'the composer shows the start date, due and time in order',
  async function (this: AppWorld) {
    const track = this.page.locator('[data-composer-track]');
    const buttons = await track.getByRole('button').allTextContents();
    assert.match(buttons.join(' '), /^Scheduled for .+ Due in 3 days 15 min$/);
  },
);
