import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import { goToPlace, pageHeading } from '../navigation';
import type { AppWorld } from '../world';

function doneToggle(page: Page) {
  return page.getByRole('button', {
    name: 'Done, collapse or expand',
    exact: true,
  });
}

When(
  'I set On completion to {string}',
  async function (this: AppWorld, option: string) {
    const { page } = this;
    await goToPlace(page, 'Settings');
    const setting = page.getByRole('button', { name: /^On completion\b/ });
    await setting.click();
    await page
      .getByRole('radiogroup', { name: 'On completion', exact: true })
      .getByRole('radio', { name: option, exact: true })
      .click();
    await setting.filter({ hasText: option }).waitFor();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await pageHeading(page, 'Settings').waitFor({ state: 'hidden' });
  },
);

Then('there is no Done group', async function (this: AppWorld) {
  assert.equal(await doneToggle(this.page).count(), 0);
});

When('I toggle Done', async function (this: AppWorld) {
  await doneToggle(this.page).click();
});

Then(
  'Done is collapsed and shows {int} task(s)',
  async function (this: AppWorld, count: number) {
    const toggle = doneToggle(this.page);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await toggle.getByText(String(count), { exact: true }).waitFor();
  },
);

Then('Done is expanded and hides its count', async function (this: AppWorld) {
  const toggle = doneToggle(this.page);
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(await toggle.innerText(), '');
});
