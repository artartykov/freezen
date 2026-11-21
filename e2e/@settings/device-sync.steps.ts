import './device-sync-ui.shared';

import assert from 'node:assert/strict';
import { After, Before, Given, Then, When } from '@cucumber/cucumber';
import type { Locator, Page } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { createTask, taskRows } from '../@tasks/task.shared';
import { pageHeading } from '../navigation';
import type { AppWorld } from '../world';
import { startPairingRelay } from './nostr-relay';

type Fixture = {
  relay: Awaited<ReturnType<typeof startPairingRelay>>;
  server: ViteDevServer;
  other: Page;
  url: string;
  offline: boolean;
};

const fixtures = new WeakMap<AppWorld, Fixture>();

function fixture(world: AppWorld) {
  const run = fixtures.get(world);
  if (!run) throw new Error('Device sync fixture is missing');
  return run;
}

Before({ tags: '@device-sync' }, async function (this: AppWorld) {
  const browser = this.page.context().browser();
  assert.ok(browser);
  const relay = await startPairingRelay();
  const server = await createServer({
    define: {
      'import.meta.env.VITE_SYNC_RELAY_URL': JSON.stringify(relay.url),
    },
    server: { host: '127.0.0.1', port: 0, hmr: false },
  });
  const otherContext = await browser.newContext({ locale: 'en-US' });
  const other = await otherContext.newPage();
  const run: Fixture = { relay, server, other, url: '', offline: false };
  fixtures.set(this, run);
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address !== 'string');
  run.url = `http://127.0.0.1:${address.port}`;
  await Promise.all(
    [this.page, other].map(async (page) => {
      await page.addInitScript(() => {
        if (localStorage.getItem('freezen-ui') === null) {
          localStorage.setItem(
            'freezen-ui',
            JSON.stringify({
              state: { onboardingCompleted: true, lastPath: '/inbox' },
              version: 1,
            }),
          );
        }
      });
      await page.routeWebSocket(relay.url, (socket) => {
        if (run.offline) void socket.close();
        else socket.connectToServer();
      });
    }),
  );
});

After({ tags: '@device-sync' }, async function (this: AppWorld) {
  const run = fixtures.get(this);
  if (!run) return;
  await run.other.context().close();
  await run.relay.close();
  await run.server.close();
});

async function openPage(page: Page, url: string, title: string) {
  await page.goto(url);
  await pageHeading(page, title).waitFor();
}

function task(page: Page, name: string) {
  return taskRows(page).getByText(name, { exact: true });
}

function buttons(scope: Page | Locator, name: string | RegExp) {
  return scope.getByRole('button', { name, exact: true });
}

async function expectTasks(pages: Page[], names: string[]) {
  await Promise.all(
    pages.flatMap((page) => names.map((name) => task(page, name).waitFor())),
  );
}

async function expectSettings(page: Page, url: string, count: number) {
  await openPage(page, `${url}/settings`, 'Settings');
  await buttons(page, new RegExp(`^Devices\\s+${count} connected$`)).waitFor();
}

const firstTask = 'First device task';
const secondTask = 'Second device task';
const renamed = 'Renamed while offline';
const note = 'Note changed while offline';

Given(
  'two independent devices have different local tasks',
  async function (this: AppWorld) {
    const { other, url } = fixture(this);
    await Promise.all(
      [this.page, other].map(async (page, index) => {
        await openPage(page, `${url}/inbox`, 'Inbox');
        await createTask(page, index === 0 ? firstTask : secondTask);
        await expectSettings(page, url, 0);
      }),
    );
  },
);

When(
  'the second device enters the code shown by the first device',
  async function (this: AppWorld) {
    const { other } = fixture(this);
    await buttons(this.page, 'Show code').click();
    const code = this.page.getByRole('dialog', {
      name: 'Pairing code',
      exact: true,
    });
    const output = code
      .getByLabel('Pairing code', { exact: true })
      .and(code.locator('output'));
    await output.waitFor();
    const value = (await output.textContent())?.trim().replace('-', '');
    assert.ok(value);
    assert.match(value, /^[A-Z2-9]{8}$/);
    await buttons(other, 'Enter code').click();
    await other
      .getByRole('textbox', { name: 'Character 1 of 8' })
      .pressSequentially(value);
    await this.page
      .getByRole('alertdialog', { name: /^Connect .+\?$/ })
      .waitFor();
  },
);

Then(
  'the second device waits for approval before receiving data',
  async function (this: AppWorld) {
    const { other, url } = fixture(this);
    await other
      .getByText('Waiting for confirmation on the other device', {
        exact: true,
      })
      .waitFor();
    const privateTab = await other.context().newPage();
    try {
      await openPage(privateTab, `${url}/inbox`, 'Inbox');
      assert.equal(await task(privateTab, firstTask).count(), 0);
      await task(privateTab, secondTask).waitFor();
    } finally {
      await privateTab.close();
    }
  },
);

When('the first device approves the pairing', async function (this: AppWorld) {
  await buttons(this.page.getByRole('alertdialog'), 'Connect').click();
});

When('the first device rejects the pairing', async function (this: AppWorld) {
  await buttons(this.page.getByRole('alertdialog'), 'Decline').click();
  await fixture(this)
    .other.getByText('The other device declined the request', { exact: true })
    .waitFor();
});

Then(
  'both devices see both tasks and list each other as paired',
  async function (this: AppWorld) {
    const { other, url } = fixture(this);
    const pages = [this.page, other];
    await Promise.all(
      pages.map(async (page) => {
        await buttons(page, /^Devices\s+1 connected$/).waitFor();
        await openPage(page, `${url}/inbox`, 'Inbox');
      }),
    );
    await expectTasks(pages, [firstTask, secondTask]);
  },
);

async function editTask(page: Page, field: 'Title' | 'Notes', value: string) {
  await task(page, firstTask).click();
  const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
  if (field === 'Notes') {
    const show = buttons(editor, 'Show notes');
    if (await show.isVisible()) await show.click();
  }
  await editor.getByRole('textbox', { name: field, exact: true }).fill(value);
  await buttons(editor, 'Back').click();
  await editor.waitFor({ state: 'hidden' });
}

When(
  'both devices restart and edit different fields of the same task offline',
  async function (this: AppWorld) {
    const run = fixture(this);
    const pages = [this.page, run.other];
    run.offline = true;
    await Promise.all(
      pages.map((page) => openPage(page, `${run.url}/inbox`, 'Inbox')),
    );
    await Promise.all([
      editTask(this.page, 'Title', renamed),
      editTask(run.other, 'Notes', note),
    ]);
    run.offline = false;
    await Promise.all(
      pages.map((page) => openPage(page, `${run.url}/inbox`, 'Inbox')),
    );
  },
);

Then(
  'both edits are visible on both devices after reconnecting',
  async function (this: AppWorld) {
    const { other } = fixture(this);
    const pages = [this.page, other];
    await expectTasks(pages, [renamed, secondTask]);
    await Promise.all(
      pages.map(async (page) => {
        await task(page, renamed).click();
        const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
        const notes = editor.getByRole('textbox', {
          name: 'Notes',
          exact: true,
        });
        await notes.waitFor();
        await page.waitForFunction(
          (expected) =>
            [...document.querySelectorAll('textarea')].some(
              (field) => field.value === expected,
            ),
          note,
        );
        await buttons(editor, 'Back').click();
      }),
    );
  },
);

When(
  'the first device disconnects the second device',
  async function (this: AppWorld) {
    const { url, other } = fixture(this);
    await Promise.all([
      expectSettings(this.page, url, 1),
      expectSettings(other, url, 1),
    ]);
    await buttons(this.page, /^Devices\s+1 connected$/).click();
    const list = this.page.getByRole('dialog', {
      name: 'Devices',
      exact: true,
    });
    await list.getByText(/Browser · Online/).waitFor();
    await buttons(list, /^Disconnect /).click();
    await buttons(this.page.getByRole('alertdialog'), 'Disconnect').click();
    await list.getByText('No connected devices', { exact: true }).waitFor();
    await buttons(other, /^Devices\s+0 connected$/).waitFor();
  },
);

Then(
  'the devices keep their tasks and stop sharing changes',
  async function (this: AppWorld) {
    const { other, url } = fixture(this);
    const pages = [this.page, other];
    await Promise.all(
      pages.map((page) => openPage(page, `${url}/inbox`, 'Inbox')),
    );
    await expectTasks(pages, [renamed, secondTask]);
    await createTask(this.page, 'After disconnect');
    await task(this.page, 'After disconnect').waitFor();
    await openPage(other, `${url}/inbox`, 'Inbox');
    assert.equal(await task(other, 'After disconnect').count(), 0);
  },
);

Then(
  "neither device receives the other's task or lists a paired device",
  async function (this: AppWorld) {
    const { other, url } = fixture(this);
    const pages = [this.page, other];
    await Promise.all(pages.map((page) => expectSettings(page, url, 0)));
    await Promise.all(
      pages.map((page) => openPage(page, `${url}/inbox`, 'Inbox')),
    );
    await Promise.all([
      expectTasks([this.page], [firstTask]),
      expectTasks([other], [secondTask]),
    ]);
    assert.equal(await task(this.page, secondTask).count(), 0);
    assert.equal(await task(other, firstTask).count(), 0);
  },
);
