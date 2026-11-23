import type { Locator, Page } from 'playwright';
import { pickDueDate } from '../calendar.shared';

export function taskComposer(page: Page) {
  return page.getByRole('dialog', { name: 'To-do', exact: true });
}

export function composerName(page: Page) {
  return taskComposer(page).getByRole('textbox', {
    name: 'To Do',
    exact: true,
  });
}

export async function openTaskComposer(page: Page) {
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
}

export async function dismissTaskComposer(page: Page) {
  await page.keyboard.press('Escape');
  await taskComposer(page).waitFor({ state: 'hidden' });
}

export async function waitForEmptyComposer(page: Page) {
  await page.waitForFunction(() => {
    const title = document.querySelector<HTMLTextAreaElement>(
      '[data-task-composer] textarea',
    );
    return (
      title?.value === '' && title.getAttribute('aria-readonly') !== 'true'
    );
  });
}

export async function createTask(page: Page, title: string) {
  await openTaskComposer(page);
  await composerName(page).fill(title);
  await taskComposer(page)
    .getByRole('button', { name: 'Send task', exact: true })
    .click();
  await waitForEmptyComposer(page);
  await dismissTaskComposer(page);
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
    await tags.getByRole('button', { name: 'Back', exact: true }).click();
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

export function discardDialog(page: Page) {
  return page.getByRole('alertdialog', { name: 'Discard draft?', exact: true });
}
