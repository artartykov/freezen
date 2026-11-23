import { Then, When } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import { taskRows } from '../@tasks/task.shared';
import type { AppWorld } from '../world';

function editor(page: Page) {
  return page.getByRole('dialog', { name: 'New Item', exact: true });
}

function row(page: Page, title: string) {
  return taskRows(page).filter({
    has: page.getByRole('button', { name: title, exact: true }),
  });
}

When(
  'I add the reference item {string}',
  async function (this: AppWorld, title: string) {
    await this.page
      .getByRole('button', { name: 'Add item', exact: true })
      .click();
    const dialog = editor(this.page);
    await dialog
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(title);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
  },
);

When(
  'I swipe {word} on the reference item {string}',
  async function (this: AppWorld, direction: string, title: string) {
    const box = await row(this.page, title).boundingBox({ timeout: 4000 });
    if (!box) throw new Error('The reference item is not visible');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + (direction === 'left' ? -90 : 90), y, {
      steps: 5,
    });
    await this.page.mouse.up();
  },
);

Then(
  'the reference item {string} is selected',
  async function (this: AppWorld, title: string) {
    await row(this.page, title)
      .and(this.page.locator('[aria-selected="true"]'))
      .waitFor({ timeout: 4000 });
  },
);

When(
  'I click Move for the selected reference items',
  async function (this: AppWorld) {
    await this.page
      .getByRole('toolbar')
      .getByRole('button', { name: 'Move', exact: true })
      .click({ timeout: 4000 });
  },
);

When(
  'I open the reference item {string}',
  async function (this: AppWorld, title: string) {
    await row(this.page, title)
      .getByRole('button', { name: title, exact: true })
      .click();
  },
);

When(
  'I click Move in the reference item editor',
  async function (this: AppWorld) {
    await editor(this.page)
      .getByRole('button', { name: 'Move', exact: true })
      .click({ timeout: 4000 });
  },
);

Then(
  'the reference item {string} is absent',
  async function (this: AppWorld, title: string) {
    await editor(this.page).waitFor({ state: 'hidden', timeout: 4000 });
    await row(this.page, title).waitFor({ state: 'hidden', timeout: 4000 });
  },
);

Then(
  'I see {string} as an active task',
  async function (this: AppWorld, title: string) {
    await row(this.page, title)
      .getByRole('button', { name: 'Mark done', exact: true })
      .waitFor({ timeout: 4000 });
  },
);

When(
  'I restore the reference item {string} from Trash',
  async function (this: AppWorld, title: string) {
    await taskRows(this.page)
      .getByRole('button', { name: title })
      .click({ timeout: 4000 });
    const dialog = editor(this.page);
    await dialog
      .getByRole('button', { name: 'Restore', exact: true })
      .click({ timeout: 4000 });
    await dialog.waitFor({ state: 'hidden' });
  },
);
