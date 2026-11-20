import './composer.shared';

import { Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { AppWorld } from '../world';
import { taskComposer } from './task.shared';

Then(
  'the description follows the handle before release',
  async function (this: AppWorld) {
    const page = this.page;
    const composer = taskComposer(page);
    const handle = composer.getByRole('button', {
      name: 'Show notes',
      exact: true,
    });
    const bounds = await handle.boundingBox();
    assert.ok(bounds);
    const form = composer.locator('[data-task-composer]');
    const initialHeight = (await form.boundingBox())?.height ?? 0;
    const x = bounds.x + 8;
    const y = bounds.y + bounds.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 30);
    await page.waitForFunction((height) => {
      const form = document.querySelector('[data-task-composer]');
      return (form?.getBoundingClientRect().height ?? 0) > height + 12;
    }, initialHeight);
    assert.equal(await handle.getAttribute('aria-expanded'), 'false');
    await page.mouse.up();
    await composer
      .getByRole('textbox', { name: 'Notes', exact: true })
      .waitFor();
  },
);

When(
  'I enter a description and pull the handle down',
  async function (this: AppWorld) {
    const page = this.page;
    const composer = taskComposer(page);
    await composer
      .getByRole('textbox', { name: 'Notes', exact: true })
      .fill('Keep the checklist');
    await page.waitForFunction(() => {
      const panel = document.querySelector(
        '[data-task-composer] [data-expanded]',
      );
      return (
        panel &&
        panel.getAnimations().length === 0 &&
        panel.getBoundingClientRect().height >= 50
      );
    });
    const handle = composer.getByRole('button', {
      name: 'Hide notes',
      exact: true,
    });
    const bounds = await handle.boundingBox();
    assert.ok(bounds);
    const initialHeight =
      (await composer.locator('[data-expanded]').boundingBox())?.height ?? 0;
    assert.ok(initialHeight >= 50);
    const x = bounds.x + bounds.width - 8;
    const y = bounds.y + bounds.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 50);
    await page.waitForFunction((height) => {
      const panel = document.querySelector(
        '[data-task-composer] [data-dragging]',
      );
      return panel && panel.getBoundingClientRect().height < height - 25;
    }, initialHeight);
    await page.mouse.up();
  },
);

Then(
  'the description returns with its text intact',
  async function (this: AppWorld) {
    const composer = taskComposer(this.page);
    const note = composer.getByRole('textbox', {
      name: 'Notes',
      exact: true,
    });
    assert.equal(await note.inputValue(), 'Keep the checklist');
    await this.page.waitForFunction(() => {
      const panel = document.querySelector(
        '[data-task-composer] [data-expanded]',
      );
      return (
        panel &&
        panel.getBoundingClientRect().height >= 50 &&
        !panel.hasAttribute('data-dragging')
      );
    });
  },
);

Then(
  'choosing a due date returns focus to the task name',
  async function (this: AppWorld) {
    const page = this.page;
    const composer = taskComposer(page);
    const name = composer.getByRole('textbox', {
      name: 'To Do',
      exact: true,
    });
    await composer.getByRole('button', { name: 'Due', exact: true }).click();
    const picker = this.page.getByRole('alertdialog', {
      name: 'Due date',
      exact: true,
    });
    await picker.locator('button[aria-pressed][aria-label]').first().click();
    await picker.getByRole('button', { name: 'OK', exact: true }).click();
    await name.and(page.locator(':focus')).waitFor();
  },
);

Then(
  'changing the destination returns focus to the task name',
  async function (this: AppWorld) {
    const page = this.page;
    const composer = taskComposer(page);
    await composer.getByRole('button', { name: 'Inbox', exact: true }).click();
    await composer
      .getByRole('menuitemradio', { name: 'Focus', exact: true })
      .click();
    await composer
      .getByRole('textbox', { name: 'To Do', exact: true })
      .and(page.locator(':focus'))
      .waitFor();
  },
);

Then(
  'starring the task and selecting properties return focus to the description',
  async function (this: AppWorld) {
    const page = this.page;
    const composer = taskComposer(page);
    const description = composer.getByRole('textbox', {
      name: 'Notes',
      exact: true,
    });
    await composer
      .getByRole('button', { name: 'Remove from Focus', exact: true })
      .click();
    await description.and(page.locator(':focus')).waitFor();
    await composer
      .getByRole('button', { name: 'Add task properties', exact: true })
      .click();
    await composer.getByRole('menuitem', { name: 'Tags', exact: true }).click();
    const tags = page.getByRole('dialog', { name: 'Tags', exact: true });
    await tags.getByRole('checkbox', { name: 'Calls', exact: true }).click();
    await tags.getByRole('button', { name: 'Save', exact: true }).click();
    await description.and(page.locator(':focus')).waitFor();
    await composer
      .getByRole('button', { name: 'Add task properties', exact: true })
      .click();
    await composer.getByRole('menuitem', { name: 'Time', exact: true }).click();
    await page.getByRole('radio', { name: '15 minutes', exact: true }).click();
    await description.and(page.locator(':focus')).waitFor();
  },
);

Then(
  'canceling a picker without a focused input does not focus an input',
  async function (this: AppWorld) {
    const page = this.page;
    const composer = taskComposer(page);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
    });
    await composer.getByRole('button', { name: /^Due/ }).click();
    const picker = page.getByRole('alertdialog', {
      name: 'Due date',
      exact: true,
    });
    await picker.getByRole('button', { name: 'Cancel', exact: true }).click();
    await picker.waitFor({ state: 'hidden' });
    assert.equal(await composer.locator('textarea:focus').count(), 0);
  },
);

Then(
  'clicking the handle does not expand or collapse the description',
  async function (this: AppWorld) {
    const composer = taskComposer(this.page);
    const closedHandle = composer.getByRole('button', {
      name: 'Show notes',
      exact: true,
    });
    await closedHandle.click();
    assert.equal(await closedHandle.getAttribute('aria-expanded'), 'false');
    await closedHandle.press('ArrowUp');
    const openHandle = composer.getByRole('button', {
      name: 'Hide notes',
      exact: true,
    });
    await openHandle.click();
    assert.equal(await openHandle.getAttribute('aria-expanded'), 'true');
  },
);

Then(
  'sending a task with Enter keeps the composer in place and focuses the task name',
  async function (this: AppWorld) {
    const page = this.page;
    const composer = taskComposer(page);
    const name = composer.getByRole('textbox', {
      name: 'To Do',
      exact: true,
    });
    await name.fill('Keyboard task');
    const positions = await composer
      .locator('[data-task-composer]')
      .evaluateHandle((node) => {
        const positions: number[] = [node.getBoundingClientRect().top];
        const observer = new ResizeObserver(() =>
          positions.push(node.getBoundingClientRect().top),
        );
        observer.observe(node);
        return { positions, observer };
      });
    await name.press('Enter');
    await page.waitForFunction(
      () =>
        document.activeElement instanceof HTMLTextAreaElement &&
        document.activeElement.value === '',
    );
    const tops = await positions.evaluate(({ positions, observer }) => {
      observer.disconnect();
      return positions;
    });
    assert.ok(Math.max(...tops) - Math.min(...tops) < 1);
    await name.and(page.locator(':focus')).waitFor();
  },
);

Then('the default task destination is Inbox', async function (this: AppWorld) {
  await taskComposer(this.page)
    .getByRole('button', { name: 'Inbox', exact: true })
    .waitFor({ timeout: 3000 });
});
