import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';
import { goToPlace, pageHeading, placeName } from '../navigation';
import type { AppWorld } from '../world';
import { createTask, setTaskProperties, taskRows } from './task.shared';

When(
  'I create the following tasks:',
  async function (this: AppWorld, tasks: DataTable) {
    for (const { name, state, tags, due, time, energy } of tasks.hashes()) {
      if (state)
        await goToPlace(this.page, state[0].toUpperCase() + state.slice(1));
      await createTask(this.page, name);
      const tagNames = (tags ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      if (tagNames.length || due || time || energy) {
        await setTaskProperties(this.page, name, {
          tags: tagNames,
          due,
          time,
          energy,
        });
      }
    }
  },
);

Then(
  /^I see the task "([^"]+)" in the (.+)$/,
  async function (this: AppWorld, title: string, place: string) {
    await pageHeading(this.page, placeName(place)).waitFor({
      state: 'visible',
    });
    await this.page
      .getByRole('main')
      .getByRole('listitem')
      .getByText(title, { exact: true })
      .waitFor({ state: 'visible' });
  },
);

Then(
  'the handle for editing {string} stays at the top when the keyboard opens and closes',
  async function (this: AppWorld, title: string) {
    const { page } = this;
    await page.setViewportSize({ width: 390, height: 700 });
    await page.getByRole('main').getByRole('button', { name: title }).click();
    const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
    const panel = editor.locator('div.absolute.inset-x-0.bottom-0');
    const top = () => panel.evaluate((node) => getComputedStyle(node).top);

    assert.equal(
      await top(),
      '0px',
      'Editor should touch the top before opening the keyboard',
    );
    await editor.getByRole('textbox', { name: 'Title', exact: true }).focus();
    await page.setViewportSize({ width: 390, height: 400 });
    assert.equal(
      await top(),
      '0px',
      'Editor should touch the top with the keyboard open',
    );
    await page.setViewportSize({ width: 390, height: 700 });
    assert.equal(
      await top(),
      '0px',
      'Editor should touch the top after closing the keyboard',
    );
  },
);

Then(
  'swiping the editor for {string} down keeps it down until it closes',
  async function (this: AppWorld, title: string) {
    const { page } = this;
    await page.getByRole('main').getByRole('button', { name: title }).click();
    const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
    const panel = editor.locator('div.absolute.inset-x-0.bottom-0');
    await panel.evaluate(async (node) => {
      await Promise.all(node.getAnimations().map(({ finished }) => finished));
    });
    await page.evaluate(() => {
      const back = history.back.bind(history);
      history.back = () => {
        window.addEventListener('resume-editor-dismissal', back, {
          once: true,
        });
      };
    });
    const bounds = await panel.boundingBox();
    assert.ok(bounds);
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + 10;
    const offset = 150;
    try {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + offset, { steps: 5 });
      const draggedTop = await panel.evaluate(
        (node) => node.getBoundingClientRect().top,
      );
      assert.ok(draggedTop >= bounds.y + offset - 1);
      await page.mouse.up();
      const releasedTop = await panel.evaluate(
        (node) =>
          new Promise<number>((resolve) => {
            requestAnimationFrame(() =>
              resolve(node.getBoundingClientRect().top),
            );
          }),
      );
      assert.ok(
        releasedTop >= draggedTop - 1,
        'Editor jumped up after release while the route was still open',
      );
    } finally {
      await page.evaluate(() =>
        window.dispatchEvent(new Event('resume-editor-dismissal')),
      );
    }
    await editor.waitFor({ state: 'hidden' });
  },
);

When(
  'the task {string} has the note {string}',
  async function (this: AppWorld, title: string, note: string) {
    const { page } = this;
    await taskRows(page).getByRole('button', { name: title }).click();
    const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
    await editor
      .getByRole('textbox', { name: 'Notes', exact: true })
      .fill(note);
    await editor.getByRole('button', { name: 'Back', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
  },
);

When(
  'task rows show tags and notes as {string}',
  async function (this: AppWorld, notes: string) {
    const { page } = this;
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByText('View Options', { exact: true }).click();
    const options = page.getByRole('dialog', { name: 'View Options' });
    await options.waitFor();
    for (const [name, enabled] of [
      ['Show Tags', true],
      ['Show Notes', notes === 'text'],
    ] as const) {
      const toggle = options.getByRole('switch', { name, checked: !enabled });
      if (await toggle.count()) await toggle.click();
    }
    await options.getByRole('button', { name: 'Back', exact: true }).click();
    await options.waitFor({ state: 'hidden' });
  },
);

When(
  'I mark the task {string} as done',
  async function (this: AppWorld, title: string) {
    await taskRows(this.page)
      .filter({ hasText: title })
      .getByRole('button', { name: 'Mark done', exact: true })
      .click();
  },
);

Then(
  'the completed row for {string} shows only its title',
  async function (this: AppWorld, title: string) {
    const row = taskRows(this.page).filter({ hasText: title });
    await row
      .getByRole('button', { name: 'Mark not done', exact: true })
      .waitFor();
    assert.equal(await row.innerText(), title);
    assert.equal(await row.getByLabel('Has notes', { exact: true }).count(), 0);
  },
);
