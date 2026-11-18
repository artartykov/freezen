import type { Page } from 'playwright';

export function placeName(place: string) {
  return /^"([^"]+)" project$/.exec(place)?.[1] ?? place;
}

export function pageHeading(page: Page, name: string) {
  return page.getByRole('heading', { level: 1, name, exact: true });
}

export async function openMenu(page: Page) {
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  return page.getByRole('navigation', { name: 'Menu', exact: true });
}
