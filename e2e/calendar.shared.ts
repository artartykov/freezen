import type { Page } from 'playwright';

export async function pickDueDate(page: Page, iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  const year = date.getFullYear();
  const calendar = page.getByRole('alertdialog', {
    name: 'Due date',
    exact: true,
  });
  await calendar.getByRole('button', { name: /^Choose year\b/ }).click();
  await calendar
    .getByRole('button', { name: String(year), exact: true })
    .click();

  await calendar.getByRole('button', { name: /^Choose month\b/ }).click();
  const month = new Intl.DateTimeFormat('en', { month: 'long' }).format(date);
  await calendar.getByRole('button', { name: month, exact: true }).click();

  const day = new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(date);
  await calendar.getByRole('button', { name: day, exact: true }).click();
  await calendar.getByRole('button', { name: 'OK', exact: true }).click();
  await calendar.waitFor({ state: 'hidden' });
}
