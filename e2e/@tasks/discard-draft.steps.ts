import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import type { AppWorld } from '../world';
import { composerName, discardDialog, taskComposer } from './task.shared';

When(
  'I enter {string} in a new task note',
  async function (this: AppWorld, text: string) {
    await this.page
      .getByRole('button', { name: 'Add task', exact: true })
      .click();
    await taskComposer(this.page)
      .getByRole('button', { name: 'Show notes', exact: true })
      .press('ArrowUp');
    await taskComposer(this.page)
      .getByRole('textbox', { name: 'Notes', exact: true })
      .fill(text);
  },
);

When('I go back in browser history', async function (this: AppWorld) {
  await this.page.evaluate(() => window.history.back());
});

Then(
  'I am asked whether to discard the draft',
  async function (this: AppWorld) {
    const dialog = discardDialog(this.page);
    await dialog.waitFor();
    if (
      await dialog.evaluate((node) => node.contains(document.activeElement))
    ) {
      throw new Error('The discard dialog received automatic focus');
    }
  },
);

When('I click outside the task composer', async function (this: AppWorld) {
  await this.page.mouse.click(12, 12);
});

Then('I can focus Cancel with Tab', async function (this: AppWorld) {
  await this.page.keyboard.press('Tab');
  const cancel = discardDialog(this.page).getByRole('button', {
    name: 'Cancel',
    exact: true,
  });
  if (!(await cancel.evaluate((button) => button === document.activeElement))) {
    throw new Error('Tab did not focus Cancel');
  }
});

When('I cancel discarding the draft', async function (this: AppWorld) {
  await discardDialog(this.page)
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
});

When('I confirm discarding the draft', async function (this: AppWorld) {
  await discardDialog(this.page)
    .getByRole('button', { name: 'Discard', exact: true })
    .click();
});

When(
  'I open a new task and enter the title {string}',
  async function (this: AppWorld, title: string) {
    await this.page
      .getByRole('button', { name: 'Add task', exact: true })
      .click();
    await composerName(this.page).pressSequentially(title);
  },
);

function assertNewTaskUrl(page: Page) {
  const url = new URL(page.url());
  if (
    url.pathname !== '/inbox' ||
    url.searchParams.get('edit') !== 'new-task'
  ) {
    throw new Error(`The editor URL moved to ${url.pathname}${url.search}`);
  }
}

Then(
  'the new task editor stays open behind the confirmation',
  async function (this: AppWorld) {
    await this.page
      .locator('dialog[open][aria-label="To-do"]')
      .waitFor({ state: 'attached' });
    assertNewTaskUrl(this.page);
  },
);

Then(
  'the draft titled {string} is still open in the Inbox',
  async function (this: AppWorld, title: string) {
    await discardDialog(this.page).waitFor({ state: 'hidden' });
    const field = composerName(this.page);
    if ((await field.inputValue()) !== title)
      throw new Error('Draft title changed');
    assertNewTaskUrl(this.page);
  },
);

When('I press Escape', async function (this: AppWorld) {
  await this.page.keyboard.press('Escape');
});

When(
  'I enter a draft in the {string} field',
  async function (this: AppWorld, field: string) {
    const composer = taskComposer(this.page);
    if (field === 'Notes')
      await composer
        .getByRole('button', { name: 'Show notes', exact: true })
        .press('ArrowUp');
    await composer
      .getByRole('textbox', { name: field, exact: true })
      .fill('Keep typing');
  },
);

Then(
  'cancelling discard after tapping outside restores focus to the {string} field',
  async function (this: AppWorld, field: string) {
    const { page } = this;
    const composer = taskComposer(page);
    const input = composer.getByRole('textbox', { name: field, exact: true });
    await input.press('End');
    await page.mouse.click(20, 30);
    const discard = discardDialog(page);
    await discard.getByRole('button', { name: 'Cancel', exact: true }).click();
    await discard.waitFor({ state: 'hidden' });
    assert.equal(
      await input.evaluate((node) => node === document.activeElement),
      true,
    );
    await page.keyboard.type(' here');
    assert.equal(await input.inputValue(), 'Keep typing here');
  },
);
