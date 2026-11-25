import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { pageHeading } from '../navigation';
import type { AppWorld } from '../world';

When(
  'I resize the browser to {int} pixels wide',
  async function (this: AppWorld, width: number) {
    await this.page.setViewportSize({ width, height: 900 });
  },
);

Then(
  'the persistent menu and the page form a centered two-column layout',
  async function (this: AppWorld) {
    const menu = this.page.getByRole('navigation', { name: 'Menu' });
    await this.page
      .getByRole('dialog', { name: 'Menu' })
      .waitFor({ state: 'hidden' });
    await menu.waitFor();
    assert.equal(
      await this.page.getByRole('button', { name: 'Open menu' }).count(),
      0,
    );
    const menuBox = await menu.boundingBox();
    const mainBox = await this.page.getByRole('main').boundingBox();
    const width = await this.page.evaluate(
      () => document.documentElement.clientWidth,
    );
    assert.ok(menuBox && mainBox);
    assert.equal(menuBox.width, 280);
    assert.equal(mainBox.width, 440);
    assert.ok(menuBox.x + menuBox.width <= mainBox.x);
    assert.ok(Math.abs(menuBox.x + mainBox.x + mainBox.width - width) <= 1);
  },
);

When('I follow Inbox in the persistent menu', async function (this: AppWorld) {
  await this.page
    .getByRole('navigation', { name: 'Menu' })
    .getByRole('link', { name: 'Inbox', exact: true })
    .click();
  await pageHeading(this.page, 'Inbox').waitFor();
});

Then('navigation opens as a modal drawer', async function (this: AppWorld) {
  const trigger = this.page.getByRole('button', {
    name: 'Open menu',
    exact: true,
  });
  assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
  await trigger.click();
  await this.page
    .getByRole('dialog', { name: 'Menu' })
    .getByRole('navigation')
    .waitFor();
});
