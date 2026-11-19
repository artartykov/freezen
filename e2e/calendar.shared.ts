import assert from 'node:assert/strict';
import type { Page } from 'playwright';

export async function pickDueDate(page: Page, iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  const year = date.getFullYear();
  const calendar = page.getByRole('alertdialog', {
    name: 'Due date',
    exact: true,
  });
  const monthPicker = calendar.getByRole('button', {
    name: 'Choose year',
    exact: true,
  });
  await monthPicker.click();
  await calendar
    .getByRole('button', { name: String(year), exact: true })
    .click();

  const formatMonth = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  });
  const months = Array.from({ length: 12 }, (_, month) =>
    formatMonth.format(new Date(year, month, 1)),
  );
  const displayedMonth = (await monthPicker.innerText()).trim();
  const currentMonth = months.indexOf(displayedMonth);
  assert.ok(currentMonth >= 0, `Unexpected calendar month: ${displayedMonth}`);

  const offset = date.getMonth() - currentMonth;
  const arrow = calendar.getByRole('button', {
    name: offset < 0 ? 'Previous month' : 'Next month',
    exact: true,
  });
  for (let month = 0; month < Math.abs(offset); month++) {
    await arrow.click();
  }
  const day = new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(date);
  await calendar.getByRole('button', { name: day, exact: true }).click();
  await calendar.getByRole('button', { name: 'OK', exact: true }).click();
  await calendar.waitFor({ state: 'hidden' });
}
