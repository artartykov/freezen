import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { goToPlace } from '../navigation';
import type { AppWorld } from '../world';

When('I open synchronization settings', async function (this: AppWorld) {
  await goToPlace(this.page, 'Settings');
  await this.page
    .getByRole('heading', { name: 'Synchronization', exact: true })
    .waitFor();
});

Then(
  'I can show a pairing code as text and as a QR code with a countdown',
  async function (this: AppWorld) {
    await this.page
      .getByRole('button', { name: 'Show code', exact: true })
      .click();
    const dialog = this.page.getByRole('dialog', {
      name: 'Pairing code',
      exact: true,
    });
    const output = dialog.locator('output');
    await output.waitFor();
    assert.match(
      (await output.textContent())?.trim() ?? '',
      /^[A-Z2-9]{4}-[A-Z2-9]{4}$/,
    );
    await dialog
      .getByRole('img', { name: 'Pairing code', exact: true })
      .waitFor();
    const countdown = dialog.getByRole('timer');
    await countdown
      .filter({ hasText: /^Code expires in [0-5]:[0-5]\d$/ })
      .waitFor();
    const initial = await countdown.textContent();
    await countdown.filter({ hasNotText: initial ?? '' }).waitFor();
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
  },
);

Then(
  'the first of eight code fields is focused when I enter a code',
  async function (this: AppWorld) {
    await this.page
      .getByRole('button', { name: 'Enter code', exact: true })
      .click();
    const dialog = this.page.getByRole('dialog', {
      name: 'Enter code',
      exact: true,
    });
    const fields = dialog.getByRole('textbox');
    await fields.first().waitFor();
    assert.equal(await fields.count(), 8);
    await fields.first().and(this.page.locator(':focus')).waitFor();
  },
);
