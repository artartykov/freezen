import type { Locator, Page } from 'playwright';
import { pickDueDate } from '../calendar.shared';

export async function createTask(page: Page, title: string) {
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
  await editor.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await editor.waitFor({ state: 'hidden' });
}

export function taskRows(page: Page) {
  return page.getByRole('main').getByRole('listitem');
}

export type TaskProperties = {
  tags?: string[];
  due?: string;
  time?: string;
  energy?: string;
};

export async function setTaskProperties(
  page: Page,
  title: string,
  { tags: tagNames = [], due, time, energy }: TaskProperties,
) {
  await taskRows(page).getByRole('button', { name: title }).click();
  const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
  if (tagNames.length > 0) {
    await editor.getByRole('button', { name: 'Tags', exact: true }).click();
    const tags = page.getByRole('dialog', { name: 'Tags', exact: true });
    const search = tags.getByRole('textbox', {
      name: 'Search or create tag…',
      exact: true,
    });
    for (const tag of tagNames) {
      await search.fill(tag);
      await search.press('Enter');
    }
    await tags.getByRole('button', { name: 'Save', exact: true }).click();
    await tags.waitFor({ state: 'hidden' });
  }
  if (due) {
    await editor.getByRole('button', { name: 'Due', exact: true }).click();
    await pickDueDate(page, due);
  }
  if (time) await chooseOption(page, editor, 'Time', 'Time needed', time);
  if (energy) {
    await chooseOption(page, editor, 'Energy', 'Energy needed', energy);
  }
  await editor.getByRole('button', { name: 'Back', exact: true }).click();
  await editor.waitFor({ state: 'hidden' });
}

async function chooseOption(
  page: Page,
  editor: Locator,
  button: string,
  title: string,
  option: string,
) {
  await editor.getByRole('button', { name: button, exact: true }).click();
  await page
    .getByRole('radiogroup', { name: title, exact: true })
    .getByRole('radio', { name: option, exact: true })
    .click();
}
