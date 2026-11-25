import type { Page } from 'playwright';

export function placeName(place: string) {
  return /^"([^"]+)" project$/.exec(place)?.[1] ?? place;
}

export function pageHeading(page: Page, name: string) {
  return page.getByRole('heading', { level: 1, name, exact: true });
}

export async function openMenu(page: Page) {
  const menu = page.getByRole('navigation', { name: 'Menu', exact: true });
  const trigger = page.getByRole('button', { name: 'Open menu', exact: true });
  await menu.or(trigger).first().waitFor();
  if (await trigger.isVisible()) await trigger.click();
  return menu;
}

export async function goToPlace(page: Page, name: string) {
  const menu = await openMenu(page);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await menu
    .getByRole('link', { name: new RegExp(`^${escaped}(\\s*\\d+)?$`) })
    .click();
  await pageHeading(page, name).waitFor({ state: 'visible' });
}
