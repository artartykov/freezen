import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import type { AppWorld } from '../world';
import { taskComposer, taskRows } from './task.shared';

When(
  'I open More actions for {string} at {int} pixels',
  async function (this: AppWorld, title: string, width: number) {
    await this.page.setViewportSize({ width, height: 720 });
    await taskRows(this.page).getByRole('button', { name: title }).click();
    await taskComposer(this.page)
      .getByRole('button', { name: 'More actions', exact: true })
      .click();
  },
);

Then(
  'the menu is above and right-aligned with the More actions button',
  async function (this: AppWorld) {
    const editor = taskComposer(this.page);
    const trigger = editor.getByRole('button', {
      name: 'More actions',
      exact: true,
    });
    const menu = editor.getByRole('menu', {
      name: 'More actions',
      exact: true,
    });
    await menu.waitFor({ state: 'visible' });
    await menu.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished),
      );
    });

    const [buttonBox, menuBox] = await Promise.all([
      trigger.boundingBox(),
      menu.boundingBox(),
    ]);
    assert.ok(buttonBox && menuBox);
    const alignment = menuBox.x + menuBox.width - buttonBox.x - buttonBox.width;
    assert.ok(
      Math.abs(alignment) <= 1,
      `Menu right edge offset: ${alignment}px`,
    );
    assert.ok(menuBox.y >= 0 && menuBox.x >= 0);
    assert.ok(menuBox.y + menuBox.height < buttonBox.y);
  },
);
