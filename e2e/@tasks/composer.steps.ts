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
      name: 'Show description',
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
      .getByRole('textbox', { name: 'Description', exact: true })
      .waitFor();
  },
);

When(
  'I enter a description and pull the handle down',
  async function (this: AppWorld) {
    const page = this.page;
    const composer = taskComposer(page);
    await composer
      .getByRole('textbox', { name: 'Description', exact: true })
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
      name: 'Hide description',
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
      name: 'Description',
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
