import type { Page } from 'playwright';

export async function createTask(page: Page, title: string) {
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
  await editor.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await editor.waitFor({ state: 'hidden' });
}
