import { Given, Then, When } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import {
  composerName,
  createTask,
  dismissTaskComposer,
  waitForEmptyComposer,
} from '../@tasks/task.shared';
import type { AppWorld } from '../world';

const secondTabs = new WeakMap<AppWorld, Page>();

Given('I open the Inbox in a second tab', async function (this: AppWorld) {
  const tab = this.page.waitForEvent('popup');
  await this.page.evaluate(() => window.open(location.href));
  const popup = await tab;

  await popup
    .getByRole('heading', { name: 'Inbox', exact: true })
    .waitFor({ timeout: 4000 });
  secondTabs.set(this, popup);
});

function secondTab(world: AppWorld) {
  const tab = secondTabs.get(world);
  if (!tab) throw new Error('Missing second tab');
  return tab;
}

function editor(page: Page) {
  return page.getByRole('dialog', { name: 'To-do', exact: true });
}

function saveButton(page: Page) {
  return editor(page).getByRole('button', { name: 'Send task', exact: true });
}

async function prepareTask(page: Page, title: string) {
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await composerName(page).fill(title);
}

async function reopenInbox(page: Page) {
  await page.goto(new URL('/inbox', page.url()).href);
  await page.getByRole('heading', { name: 'Inbox', exact: true }).waitFor();
}

function taskInInbox(page: Page, title: string) {
  return page.getByRole('main').getByText(title, { exact: true });
}

Given(
  'I have a saved task called {string}',
  async function (this: AppWorld, title: string) {
    await createTask(this.page, title);
  },
);

When(
  'I save {string} and {string} from different tabs',
  async function (this: AppWorld, first: string, second: string) {
    const other = secondTab(this);
    await Promise.all([
      prepareTask(this.page, first),
      prepareTask(other, second),
    ]);
    await Promise.all([
      saveButton(this.page).click(),
      saveButton(other).click(),
    ]);
  },
);

const savedTitles = new WeakMap<AppWorld, [string, string]>();

Then(
  'both tabs show {string} and {string}',
  async function (this: AppWorld, first: string, second: string) {
    const titles: [string, string] = [first, second];
    savedTitles.set(this, titles);
    for (const page of [this.page, secondTab(this)]) {
      await waitForEmptyComposer(page);
      await dismissTaskComposer(page);
      for (const title of titles) await taskInInbox(page, title).waitFor();
    }
  },
);

Then(
  'both notes are still in the Inbox after reopening it',
  async function (this: AppWorld) {
    const titles = savedTitles.get(this);
    if (!titles) throw new Error('Missing saved task titles');
    await reopenInbox(this.page);
    for (const title of titles) await taskInInbox(this.page, title).waitFor();
  },
);

When(
  'I edit {string} to say {string} and {string} in different tabs',
  async function (
    this: AppWorld,
    title: string,
    first: string,
    second: string,
  ) {
    const other = secondTab(this);
    for (const page of [this.page, other]) {
      await taskInInbox(page, title).click();
      await editor(page).waitFor();
      await pauseWrites(page, false);
    }
    await Promise.all([
      taskNote(this.page).fill(first),
      taskNote(other).fill(second),
    ]);
    await Promise.all([resumeWrites(this.page), resumeWrites(other)]);
  },
);

Then(
  '{string} keeps both versions after reopening it',
  async function (this: AppWorld, title: string) {
    for (const page of [this.page, secondTab(this)]) {
      await savingNotice(page).waitFor({ state: 'hidden' });
    }
    await reopenInbox(this.page);
    await taskInInbox(this.page, title).click();
    const current = await taskNote(this.page).inputValue();
    const other =
      current === 'First version' ? 'Second version' : 'First version';
    if (current !== 'First version' && current !== 'Second version')
      throw new Error('Missing current note');
    await editor(this.page)
      .getByText('Previous versions', { exact: true })
      .click();
    await editor(this.page).getByText(other, { exact: true }).waitFor();
  },
);

function savingNotice(page: Page) {
  return page.getByRole('status', { name: 'Saving changes' });
}

async function pauseWrites(page: Page, recovery: boolean) {
  await page.evaluate((blockRecovery) => {
    const put = Object.getOwnPropertyDescriptor(
      IDBObjectStore.prototype,
      'put',
    );
    const setItem = Object.getOwnPropertyDescriptor(
      Storage.prototype,
      'setItem',
    );
    if (!put || !setItem) throw new Error('Missing storage methods');
    IDBObjectStore.prototype.put = () => {
      throw new DOMException('Test quota exceeded', 'QuotaExceededError');
    };
    if (blockRecovery) {
      Storage.prototype.setItem = () => {
        throw new DOMException('Test quota exceeded', 'QuotaExceededError');
      };
    }
    window.addEventListener(
      'restore-test-storage',
      () => {
        Object.defineProperty(IDBObjectStore.prototype, 'put', put);
        Object.defineProperty(Storage.prototype, 'setItem', setItem);
      },
      { once: true },
    );
  }, recovery);
}

async function resumeWrites(page: Page) {
  await page.evaluate(() =>
    window.dispatchEvent(new Event('restore-test-storage')),
  );
}

Given(
  'browser writes are temporarily failing',
  async function (this: AppWorld) {
    await pauseWrites(this.page, false);
  },
);

Given(
  'both storage and recovery writes are temporarily failing',
  async function (this: AppWorld) {
    await pauseWrites(this.page, true);
  },
);

When('browser writes work again', async function (this: AppWorld) {
  await resumeWrites(this.page);
});

When(
  'I press Save for a new task named {string}',
  async function (this: AppWorld, title: string) {
    await prepareTask(this.page, title);
    await saveButton(this.page).click();
  },
);

Then('its editor stays open while saving', async function (this: AppWorld) {
  await savingNotice(this.page).waitFor();
  await editor(this.page).waitFor();
});

Then(
  'I see a save error and the editor still contains {string}',
  async function (this: AppWorld, title: string) {
    await saveError(this.page).waitFor();
    const actual = await composerName(this.page).inputValue();
    if (actual !== title) throw new Error('Draft text was lost');
  },
);

function saveError(page: Page) {
  return page.getByRole('alertdialog', {
    name: 'Could not save your changes.',
  });
}

When('I retry saving', async function (this: AppWorld) {
  await saveError(this.page)
    .getByRole('button', { name: 'Retry saving', exact: true })
    .click();
});

Then('the save error returns after the retry', async function (this: AppWorld) {
  const error = saveError(this.page);
  await error.getByRole('button', { name: 'Saving…' }).waitFor();
  await error.getByRole('button', { name: 'Retry saving' }).waitFor();
});

Then(
  'the composer resets and {string} is still stored',
  async function (this: AppWorld, title: string) {
    await waitForEmptyComposer(this.page);
    await saveError(this.page).waitFor({ state: 'hidden' });
    await dismissTaskComposer(this.page);
    await reopenInbox(this.page);
    await taskInInbox(this.page, title).waitFor();
  },
);

Then(
  '{string} is still stored',
  async function (this: AppWorld, title: string) {
    await this.page.reload();
    await this.page
      .getByRole('main')
      .getByText(title, { exact: true })
      .waitFor({ timeout: 4000 });
  },
);

function taskNote(page: Page) {
  return page
    .getByRole('dialog', { name: 'To-do', exact: true })
    .getByRole('textbox', { name: 'Notes', exact: true });
}

When(
  'I enter {string} in a new task note',
  async function (this: AppWorld, text: string) {
    await this.page
      .getByRole('button', { name: 'Add task', exact: true })
      .click();
    await editor(this.page)
      .getByRole('button', { name: 'Show notes', exact: true })
      .press('ArrowUp');
    await editor(this.page)
      .getByRole('textbox', { name: 'Notes', exact: true })
      .fill(text);
  },
);

When('I go back in browser history', async function (this: AppWorld) {
  await this.page.evaluate(() => window.history.back());
});

function discardDialog(page: Page) {
  return page.getByRole('alertdialog', { name: 'Discard draft?', exact: true });
}

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

Then(
  'I return to the Inbox without a storage warning',
  async function (this: AppWorld) {
    await editor(this.page).waitFor({ state: 'hidden' });
    await this.page
      .getByRole('heading', { name: 'Inbox', exact: true })
      .waitFor();
    await saveError(this.page).waitFor({ state: 'hidden' });
  },
);

Then(
  '{string} is absent after reloading the Inbox',
  async function (this: AppWorld, title: string) {
    await this.page.reload();
    await this.page
      .getByRole('heading', { name: 'Inbox', exact: true })
      .waitFor();
    if (await taskInInbox(this.page, title).count())
      throw new Error('Discarded draft is still in the Inbox');
  },
);

When(
  'I hold Escape while the save error is open',
  async function (this: AppWorld) {
    await this.page.keyboard.down('Escape');
    await saveError(this.page).waitFor({ state: 'hidden' });
    await this.page.keyboard.down('Escape');
    await this.page.keyboard.up('Escape');
  },
);

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

Then(
  'the save error closes and the editor stays open',
  async function (this: AppWorld) {
    await saveError(this.page).waitFor({ state: 'hidden' });
    await editor(this.page).waitFor();
    if (await discardDialog(this.page).isVisible())
      throw new Error('Holding Escape also opened the discard confirmation');
  },
);

When(
  'I open the saved task {string}',
  async function (this: AppWorld, title: string) {
    await this.page.getByRole('main').getByText(title, { exact: true }).click();
  },
);

When(
  'I enter {string} in the task note',
  async function (this: AppWorld, text: string) {
    await taskNote(this.page).fill(text);
  },
);

When(
  'I reload the page while that change is saving',
  async function (this: AppWorld) {
    await savingNotice(this.page).waitFor();
    await this.page.reload();
  },
);

Then('I see no storage warning', async function (this: AppWorld) {
  await savingNotice(this.page).waitFor({ state: 'hidden' });
  await saveError(this.page).waitFor({ state: 'hidden' });
});

Then(
  'the task note contains {string}',
  async function (this: AppWorld, text: string) {
    const note = editor(this.page).getByRole('textbox', {
      name: 'Notes',
      exact: true,
    });
    const actual = await note.inputValue();
    if (actual !== text)
      throw new Error(`Expected note "${text}", got "${actual}"`);
  },
);
