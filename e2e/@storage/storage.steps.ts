import { Given, Then, When } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import { createTask } from '../@tasks/task.shared';
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
  return editor(page).getByRole('button', { name: 'Save', exact: true });
}

async function prepareTask(page: Page, title: string) {
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await editor(page)
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill(title);
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
      await editor(page).waitFor({ state: 'hidden' });
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
    await this.page
      .getByRole('alert')
      .filter({ hasText: 'Could not save your changes' })
      .waitFor();
    const actual = await editor(this.page)
      .getByRole('textbox', { name: 'Title', exact: true })
      .inputValue();
    if (actual !== title) throw new Error('Draft text was lost');
  },
);

When('I retry saving', async function (this: AppWorld) {
  await editor(this.page)
    .getByRole('button', { name: 'Retry saving', exact: true })
    .click();
});

Then(
  'the editor closes and {string} is still stored',
  async function (this: AppWorld, title: string) {
    await editor(this.page).waitFor({ state: 'hidden' });
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
    await taskNote(this.page).fill(text);
  },
);

When('I go back in browser history', async function (this: AppWorld) {
  await this.page.goBack();
  await taskNote(this.page).waitFor({ state: 'hidden' });
});

When('I open a new task again', async function (this: AppWorld) {
  await this.page
    .getByRole('button', { name: 'Add task', exact: true })
    .click();
});

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
  'I reopen the Inbox while that change is saving',
  async function (this: AppWorld) {
    await savingNotice(this.page).waitFor();
    await reopenInbox(this.page);
  },
);

Then('I see no storage warning', async function (this: AppWorld) {
  await this.page.getByRole('alert').waitFor({ state: 'hidden' });
});

Then(
  'the task note contains {string}',
  async function (this: AppWorld, text: string) {
    const actual = await taskNote(this.page).inputValue();
    if (actual !== text)
      throw new Error(`Expected note "${text}", got "${actual}"`);
  },
);

const backups = new WeakMap<AppWorld, string>();

When('I export a full backup', async function (this: AppWorld) {
  await this.page.goto(new URL('/settings', this.page.url()).href);
  const download = this.page.waitForEvent('download');
  await this.page
    .getByRole('button', { name: 'Export backup', exact: true })
    .click();
  const file = await download;
  const stream = await file.createReadStream();
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>)
    chunks.push(chunk);
  backups.set(this, Buffer.concat(chunks).toString('utf8'));
});

When('I restore that backup from a file', async function (this: AppWorld) {
  const backup = backups.get(this);
  if (!backup) throw new Error('Missing backup');
  await this.page.goto(new URL('/inbox', this.page.url()).href);
  await createTask(this.page, 'Created after backup');
  await this.page
    .getByRole('status', { name: 'Saving changes' })
    .waitFor({ state: 'hidden' });
  await this.page.goto(new URL('/settings', this.page.url()).href);
  await this.page.getByLabel('Choose backup file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup),
  });
  await this.page
    .getByRole('button', { name: 'Replace current data', exact: true })
    .click();
  await this.page
    .getByRole('status', { name: 'Saving changes' })
    .waitFor({ state: 'hidden' });
  await this.page.goto(new URL('/inbox', this.page.url()).href);
  await this.page
    .getByRole('heading', { name: 'Inbox', exact: true })
    .waitFor();
  if (
    await this.page.getByText('Created after backup', { exact: true }).count()
  ) {
    throw new Error('The restored backup still contains the later task');
  }
});
