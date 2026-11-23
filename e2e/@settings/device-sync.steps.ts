import './device-sync-ui.shared';

import assert from 'node:assert/strict';
import { After, Before, Given, Then, When } from '@cucumber/cucumber';
import type { ConsoleMessage, Locator, Page, WebSocket } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { createTask, setTaskProperties, taskRows } from '../@tasks/task.shared';
import { openMenu, pageHeading } from '../navigation';
import type { AppWorld } from '../world';
import { startPairingRelay } from './nostr-relay';

type Fixture = {
  relay: Awaited<ReturnType<typeof startPairingRelay>>;
  server: ViteDevServer;
  other: Page;
  third?: Page;
  referenceUrl?: string;
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
  await Promise.all([this.page, other].map((page) => prepareDevice(page, run)));
});

async function prepareDevice(page: Page, run: Fixture) {
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
  await page.routeWebSocket(run.relay.url, (socket) => {
    if (run.offline) void socket.close();
    else socket.connectToServer();
  });
}

After({ tags: '@device-sync' }, async function (this: AppWorld) {
  const run = fixtures.get(this);
  if (!run) return;
  await run.other.context().close();
  await run.third?.context().close();
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

function observeSyncPage(page: Page, record: (event: string) => void) {
  function onConsole(message: ConsoleMessage) {
    if (message.type() === 'error' || message.type() === 'warning')
      record(`console ${message.type()}: ${message.text()}`);
  }
  function onPageError(error: Error) {
    record(`page error: ${error.message}`);
  }
  function onWebSocket(socket: WebSocket) {
    record('WebSocket created');
    socket.once('close', () => record('WebSocket closed'));
    socket.on('socketerror', (error) => record(`WebSocket error: ${error}`));
  }
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('websocket', onWebSocket);
  return () => {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('websocket', onWebSocket);
  };
}

async function expectTasks(pages: Page[], names: string[]) {
  await Promise.all(
    pages.flatMap((page) => names.map((name) => task(page, name).waitFor())),
  );
}

async function expectSettings(page: Page, url: string, count: number) {
  await openPage(page, `${url}/settings`, 'Settings');
  const summary = count ? `\\d+ of ${count} online` : '0 online';
  await buttons(page, new RegExp(`^Devices\\s+${summary}$`)).waitFor();
}

const firstTask = 'First device task';
const secondTask = 'Second device task';
const renamed = 'Renamed while offline';
const note = 'Note changed while offline';
const titles = ['First title edit', 'Second title edit'];
const notes = ['First note edit', 'Second note edit'];
const referenceName = 'Reading list';
const referenceItem = 'Link added offline';

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

Given(
  'each device assigns its own version of the same tag to its task',
  async function (this: AppWorld) {
    const { other, url } = fixture(this);
    await Promise.all(
      [this.page, other].map(async (page, index) => {
        await openPage(page, `${url}/inbox`, 'Inbox');
        await setTaskProperties(page, index === 0 ? firstTask : secondTask, {
          tags: [index === 0 ? 'Shared tag' : 'SHARED TAG'],
        });
        await expectSettings(page, url, 0);
      }),
    );
  },
);

Then(
  'both devices show one shared tag containing both tasks',
  async function (this: AppWorld) {
    await Promise.all(
      [this.page, fixture(this).other].map(async (page) => {
        const menu = await openMenu(page);
        const tag = menu.getByRole('link', { name: /^Shared tag$/i });
        await tag.first().waitFor();
        assert.equal(await tag.count(), 1);
        await tag.click();
        await expectTasks([page], [firstTask, secondTask]);
      }),
    );
  },
);

When(
  'the second device enters the code shown by the first device',
  async function (this: AppWorld) {
    await requestPairing(this.page, fixture(this).other);
  },
);

async function requestPairing(host: Page, guest: Page) {
  await buttons(host, 'Show code').click();
  const code = host.getByRole('dialog', { name: 'Pairing code', exact: true });
  const output = code
    .getByLabel('Pairing code', { exact: true })
    .and(code.locator('output'));
  await output.waitFor();
  const value = (await output.textContent())?.trim().replace('-', '');
  assert.ok(value);
  assert.match(value, /^[A-Z2-9]{8}$/);
  await buttons(guest, 'Enter code').click();
  await guest
    .getByRole('textbox', { name: 'Character 1 of 8' })
    .pressSequentially(value);
  await host.getByRole('alertdialog', { name: /^Connect .+\?$/ }).waitFor();
}

When(
  'the first device pairs with a third device',
  async function (this: AppWorld) {
    const run = fixture(this);
    const browser = this.page.context().browser();
    assert.ok(browser);
    const context = await browser.newContext({ locale: 'en-US' });
    const third = await context.newPage();
    run.third = third;
    await prepareDevice(third, run);
    await Promise.all([
      expectSettings(this.page, run.url, 1),
      expectSettings(third, run.url, 0),
    ]);
    await requestPairing(this.page, third);
    await buttons(this.page.getByRole('alertdialog'), 'Connect').click();
    await buttons(this.page, /^Devices\s+2 of 2 online$/).waitFor();
    await openPage(third, `${run.url}/inbox`, 'Inbox');
    await expectTasks([third], [firstTask, secondTask]);
  },
);

Then(
  'manual sync stays in progress until the third device confirms',
  async function (this: AppWorld) {
    const { third } = fixture(this);
    assert.ok(third);
    let release!: () => void;
    const confirmation = new Promise<void>((resolve) => {
      release = resolve;
    });
    await third.exposeFunction('waitForSyncConfirmation', () => confirmation);
    await third.evaluate(() => {
      const digest = crypto.subtle.digest.bind(crypto.subtle);
      const { waitForSyncConfirmation } = window as typeof window & {
        waitForSyncConfirmation: () => Promise<void>;
      };
      crypto.subtle.digest = async (algorithm, data) => {
        if (
          algorithm === 'SHA-256' &&
          /^(?:[a-f0-9]{64}:)*[a-f0-9]{64}$/.test(
            new TextDecoder().decode(data),
          )
        ) {
          console.debug('Third device ready to confirm sync');
          await waitForSyncConfirmation();
        }
        return digest(algorithm, data);
      };
    });

    const attempted = third.waitForEvent('console', {
      predicate: (message) =>
        message.text() === 'Third device ready to confirm sync',
    });
    const complete = this.page
      .getByRole('status')
      .filter({ hasText: /^Sync complete$/ });
    try {
      await Promise.all([attempted, buttons(this.page, 'Sync now').click()]);
      await assert.rejects(complete.waitFor({ timeout: 1000 }), {
        name: 'TimeoutError',
      });
      assert.equal(
        await buttons(this.page, 'Sync now').getAttribute('aria-busy'),
        'true',
      );
    } finally {
      release();
    }
    await complete.waitFor();
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
    const devices = [
      { page: this.page, name: 'first device' },
      { page: other, name: 'second device' },
    ];
    const started = performance.now();
    const deadline = started + 29_000;
    const timeline: string[] = [];
    function record(event: string) {
      timeline.push(`+${Math.round(performance.now() - started)}ms ${event}`);
    }
    const stopObserving = devices.map(({ page, name }) =>
      observeSyncPage(page, (event) => record(`${name}: ${event}`)),
    );
    async function waitForSyncCheck(
      description: string,
      check: (timeout: number) => Promise<unknown>,
    ) {
      record(`Waiting for ${description}`);
      try {
        await check(Math.max(1, Math.floor(deadline - performance.now())));
        record(`Confirmed ${description}`);
      } catch (cause) {
        record(`Failed waiting for ${description}`);
        throw cause;
      }
    }

    try {
      await Promise.all(
        devices.map(async ({ page, name }) => {
          await waitForSyncCheck(
            `${name} to show 1 of 1 devices online`,
            (timeout) =>
              buttons(page, /^Devices\s+1 of 1 online$/).waitFor({ timeout }),
          );
          await waitForSyncCheck(`${name} to navigate to Inbox`, (timeout) =>
            page.goto(`${url}/inbox`, { timeout }),
          );
          await waitForSyncCheck(
            `${name} to show the Inbox heading`,
            (timeout) => pageHeading(page, 'Inbox').waitFor({ timeout }),
          );
        }),
      );
      await Promise.all(
        devices.flatMap(({ page, name }) =>
          [firstTask, secondTask].map((taskName) =>
            waitForSyncCheck(
              `${name} to show "${taskName}" in Inbox`,
              (timeout) => task(page, taskName).waitFor({ timeout }),
            ),
          ),
        ),
      );
    } catch (cause) {
      const locations = devices.map(
        ({ page, name }) => `${name}: ${page.url()}`,
      );
      throw new Error([...locations, ...timeline].join('\n'), { cause });
    } finally {
      stopObserving.forEach((stop) => stop());
    }
  },
);

async function editTask(
  page: Page,
  field: 'Title' | 'Notes',
  value: string,
  name = firstTask,
) {
  await task(page, name).click();
  const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
  if (field === 'Notes') {
    const show = buttons(editor, 'Show notes');
    if (await show.isVisible()) await show.click();
  }
  await editor.getByRole('textbox', { name: field, exact: true }).fill(value);
  await buttons(editor, 'Back').click();
  await editor.waitFor({ state: 'hidden' });
}

async function restartDevices(
  world: AppWorld,
  offline: boolean,
  path: string,
  heading: string,
) {
  const run = fixture(world);
  run.offline = offline;
  await Promise.all(
    [world.page, run.other].map((page) =>
      openPage(page, `${run.url}${path}`, heading),
    ),
  );
}

async function syncFromInbox(world: AppWorld) {
  const { url } = fixture(world);
  await expectSettings(world.page, url, 1);
  await confirmManualSync(world.page);
  await openPage(world.page, `${url}/inbox`, 'Inbox');
}

function renamedTask(page: Page) {
  return taskRows(page).getByText(/^(First|Second) title edit$/);
}

When(
  'both devices change the same task title offline and reconnect',
  async function (this: AppWorld) {
    const { other } = fixture(this);
    await restartDevices(this, true, '/inbox', 'Inbox');
    await Promise.all(
      [this.page, other].map((page, index) =>
        editTask(page, 'Title', titles[index]),
      ),
    );
    await restartDevices(this, false, '/inbox', 'Inbox');
    await syncFromInbox(this);
  },
);

When(
  'both devices change the same task note offline and reconnect',
  async function (this: AppWorld) {
    const { other } = fixture(this);
    await restartDevices(this, true, '/inbox', 'Inbox');
    await Promise.all(
      [this.page, other].map(async (page, index) =>
        editTask(
          page,
          'Notes',
          notes[index],
          await renamedTask(page).innerText(),
        ),
      ),
    );
    await restartDevices(this, false, '/inbox', 'Inbox');
    await syncFromInbox(this);
  },
);

Then(
  'both note edits are available on each device',
  async function (this: AppWorld) {
    for (const page of [this.page, fixture(this).other]) {
      await renamedTask(page).click();
      const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
      const current = await editor
        .getByRole('textbox', { name: 'Notes', exact: true })
        .inputValue();
      assert.ok(notes.includes(current));
      await editor.getByText('Previous versions', { exact: true }).click();
      await editor
        .getByText(current === notes[0] ? notes[1] : notes[0], { exact: true })
        .waitFor({ timeout: 5000 });
    }
  },
);

When(
  'the first device creates a reference list and synchronizes it',
  async function (this: AppWorld) {
    const { page } = this;
    const run = fixture(this);
    await expectSettings(page, run.url, 1);
    await buttons(page, /^Reference lists\s/).click();
    await page.getByRole('radio', { name: 'Enabled', exact: true }).click();
    await openPage(page, `${run.url}/references`, 'Reference');
    await buttons(page, 'Add reference list').click();
    const editor = page.getByRole('dialog', {
      name: 'Edit reference list',
      exact: true,
    });
    await editor
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(referenceName);
    await buttons(editor, 'Save').click();
    await pageHeading(page, referenceName).waitFor();
    run.referenceUrl = page.url();
    await syncFromInbox(this);
  },
);

When(
  'one device converts the list while the other adds an item offline',
  async function (this: AppWorld) {
    const { page } = this;
    const run = fixture(this);
    const { referenceUrl } = run;
    assert.ok(referenceUrl);
    run.offline = true;
    await Promise.all(
      [page, run.other].map((device) =>
        openPage(device, referenceUrl, referenceName),
      ),
    );
    await buttons(page, 'Edit reference list').click();
    await buttons(page, 'More actions').click();
    await page
      .getByRole('menuitem', { name: 'Convert to project', exact: true })
      .press('Enter');
    await buttons(page.getByRole('alertdialog'), 'Convert to project').click();
    await openPage(page, `${run.url}/projects`, 'Projects');
    await buttons(page.getByRole('main'), /^Reading list \(0\)$/).waitFor();

    await buttons(run.other, 'Add item').click();
    const editor = run.other.getByRole('dialog', {
      name: 'New Item',
      exact: true,
    });
    await editor
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(referenceItem);
    await buttons(editor, 'Save').click();
    await editor.waitFor({ state: 'hidden' });
    await task(run.other, referenceItem).waitFor();

    await restartDevices(this, false, '/inbox', 'Inbox');
    await syncFromInbox(this);
  },
);

Then(
  'the added item is available in the recovered list on both devices',
  async function (this: AppWorld) {
    const { other, referenceUrl } = fixture(this);
    assert.ok(referenceUrl);
    await Promise.all(
      [this.page, other].map(async (page) => {
        await openPage(page, referenceUrl, referenceName);
        await task(page, referenceItem).waitFor();
      }),
    );
  },
);

When(
  'both devices restart and edit different fields of the same task offline',
  async function (this: AppWorld) {
    const run = fixture(this);
    const pages = [this.page, run.other];
    run.offline = true;
    await Promise.all(
      pages.map(async (page) => {
        await openPage(page, `${run.url}/settings`, 'Settings');
        assert.match(
          await buttons(page, /^Devices/).innerText(),
          /0 of 1 online/,
        );
      }),
    );
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
    await buttons(this.page, /^Devices\s+1 of 1 online$/).click();
    const list = this.page.getByRole('dialog', {
      name: 'Devices',
      exact: true,
    });
    await list.getByText(/Browser · Online/).waitFor();
    await buttons(list, /^Configure /).click();
    await buttons(
      this.page.getByRole('dialog', { name: 'Configure', exact: true }),
      'Disconnect',
    ).click();
    await buttons(this.page.getByRole('alertdialog'), 'Disconnect').click();
    await list.getByText('No connected devices', { exact: true }).waitFor();
    await buttons(other, /^Devices\s+0 online$/).waitFor();
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

When(
  'the first device moves its task to Trash',
  async function (this: AppWorld) {
    await task(this.page, firstTask).click();
    const editor = this.page.getByRole('dialog', {
      name: 'To-do',
      exact: true,
    });
    await buttons(editor, 'Trash').click();
    const confirm = this.page.getByRole('alertdialog', {
      name: 'Move to Trash?',
    });
    await buttons(confirm, 'Trash').click();
    await task(this.page, firstTask).waitFor({ state: 'hidden' });
  },
);

Then(
  'the task appears in Trash on both devices',
  async function (this: AppWorld) {
    const { other, url } = fixture(this);
    const pages = [this.page, other];
    await Promise.all(
      pages.map((page) => openPage(page, `${url}/trash`, 'Trash')),
    );
    await expectTasks(pages, [firstTask]);
  },
);

When(
  'the first device empties its Trash and synchronizes',
  async function (this: AppWorld) {
    const { url } = fixture(this);
    await buttons(this.page, 'Empty Trash (1)').click();
    const confirm = this.page.getByRole('alertdialog', {
      name: 'Empty trash?',
    });
    await buttons(confirm, 'OK').click();
    await this.page.getByText('Trash is empty', { exact: true }).waitFor();
    await expectSettings(this.page, url, 1);
    await confirmManualSync(this.page);
  },
);

When(
  'the first device deletes its task from Trash using the {string} and synchronizes',
  async function (this: AppWorld, action: string) {
    const { page } = this;
    const { url } = fixture(this);
    const row = task(page, firstTask);
    if (action === 'selection bar') {
      const bounds = await row.boundingBox();
      assert.ok(bounds);
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x - 80, y, { steps: 5 });
      await page.mouse.up();
      await buttons(
        page.getByRole('toolbar', { name: 'Selected to-dos' }),
        'Delete',
      ).click();
    } else {
      assert.equal(action, 'task editor');
      await row.click();
      const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
      await buttons(editor, 'Delete').click();
    }
    await buttons(page.getByRole('alertdialog'), 'Delete').click();
    await page.getByText('Trash is empty', { exact: true }).waitFor();
    await expectSettings(page, url, 1);
    await confirmManualSync(page);
  },
);

Then(
  'Trash is empty on the first device and still contains the task on the second',
  async function (this: AppWorld) {
    const { other, url } = fixture(this);
    await openPage(this.page, `${url}/trash`, 'Trash');
    await this.page.getByText('Trash is empty', { exact: true }).waitFor();
    assert.equal(
      await task(other, firstTask).count(),
      1,
      'The second device should retain the task in Trash after synchronization',
    );
  },
);

When(
  'the second device moves the task from Trash back to Inbox',
  async function (this: AppWorld) {
    const { other, url } = fixture(this);
    await openPage(this.page, `${url}/inbox`, 'Inbox');
    await task(other, firstTask).click();
    const editor = other.getByRole('dialog', { name: 'To-do', exact: true });
    await buttons(editor, 'Move').click();
    const move = other.getByRole('dialog', { name: 'Move', exact: true });
    await move.getByRole('radio', { name: 'Inbox', exact: true }).click();
    await task(other, firstTask).waitFor({ state: 'hidden' });
    await openPage(other, `${url}/inbox`, 'Inbox');
  },
);

Then(
  'the restored task appears in Inbox on both devices',
  async function (this: AppWorld) {
    await expectTasks([this.page, fixture(this).other], [firstTask]);
  },
);

Then(
  'opening and closing each synchronization overlay preserves the URL and scroll position',
  async function (this: AppWorld) {
    const page = this.page;
    await page.setViewportSize({ width: 390, height: 700 });
    const settingsUrl = page.url();

    for (const [name, label] of [
      [/^Devices\s+0 online$/, 'Devices'],
      ['Show code', 'Pairing code'],
      ['Enter code', 'Enter code'],
    ] as const) {
      const button = buttons(page, name);
      await button.evaluate((element) =>
        window.scrollBy(0, element.getBoundingClientRect().top - 24),
      );
      const before = await page.evaluate(() => window.scrollY);
      assert.ok(before > 0);

      await button.click();
      const overlay = page.getByRole('dialog', { name: label, exact: true });
      await overlay.waitFor();
      assert.equal(page.url(), settingsUrl, label);
      assert.equal(await page.evaluate(() => window.scrollY), before, label);

      await page.keyboard.press('Escape');
      await overlay.waitFor({ state: 'hidden' });
      assert.equal(page.url(), settingsUrl, label);
      assert.equal(await page.evaluate(() => window.scrollY), before, label);
    }
  },
);

async function confirmManualSync(page: Page) {
  await buttons(page, /^Devices\s+1 of 1 online$/).waitFor();
  await buttons(page, 'Sync now').click();
  await page
    .getByRole('status')
    .filter({ hasText: /^Sync complete$/ })
    .waitFor();
  await page
    .getByText('Sync complete', { exact: true })
    .waitFor({ state: 'hidden' });
}

Then(
  'manual sync confirms that both devices have the same data',
  async function (this: AppWorld) {
    const { url } = fixture(this);
    await expectSettings(this.page, url, 1);
    await confirmManualSync(this.page);
  },
);

Then(
  'manual sync reports failure without an online device',
  async function (this: AppWorld) {
    const { url } = fixture(this);
    await expectSettings(this.page, url, 0);
    await buttons(this.page, 'Sync now').click();
    await this.page
      .getByRole('status')
      .filter({ hasText: /^Sync failed$/ })
      .waitFor();
    await this.page
      .getByText('Sync failed', { exact: true })
      .waitFor({ state: 'hidden' });
  },
);

When(
  'the first device customizes the second device as {string}',
  async function (this: AppWorld, name: string) {
    const { url } = fixture(this);
    await expectSettings(this.page, url, 1);
    await buttons(this.page, /^Devices\s+1 of 1 online$/).click();
    const list = this.page.getByRole('dialog', {
      name: 'Devices',
      exact: true,
    });
    await buttons(list, /^Configure /).click();
    const editor = this.page.getByRole('dialog', {
      name: 'Configure',
      exact: true,
    });
    await editor.getByRole('textbox', { name: 'Device name' }).fill(name);
    await buttons(editor, 'Tablet').click();
    await editor.getByRole('radio', { name: 'Blue', exact: true }).click();
    await buttons(editor, 'Back').click();
    await buttons(list, `Configure ${name}`).waitFor();
    await buttons(list, 'Back').click();
  },
);

async function expectToolbarDevice(page: Page, name: string, status: RegExp) {
  await buttons(page, /^Devices · 1 · /).click();
  const panel = page.getByRole('group', { name: 'Devices', exact: true });
  const row = panel.getByRole('listitem').filter({ hasText: name });
  await row.getByText(status).waitFor();
  const icon = row.locator('svg.lucide-tablet');
  await icon.waitFor();
  assert.equal(
    await icon.evaluate((element) => getComputedStyle(element).stroke),
    'rgb(33, 150, 243)',
  );
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'hidden' });
}

Then(
  'the first device toolbar shows {string} synchronized',
  async function (this: AppWorld, name: string) {
    await openPage(this.page, `${fixture(this).url}/inbox`, 'Inbox');
    await expectToolbarDevice(this.page, name, /^Synced · Online$/);
  },
);

Then(
  'the customized device appearance survives a reload',
  async function (this: AppWorld) {
    await this.page.reload();
    await expectToolbarDevice(this.page, 'Work tablet', /^Synced · Online$/);
  },
);

When(
  'both paired devices restart without a connection',
  async function (this: AppWorld) {
    const run = fixture(this);
    run.offline = true;
    await Promise.all(
      [this.page, run.other].map((page) =>
        openPage(page, `${run.url}/inbox`, 'Inbox'),
      ),
    );
  },
);

Then(
  'the first device still shows {string} synchronized but offline',
  async function (this: AppWorld, name: string) {
    await expectToolbarDevice(this.page, name, /^Synced · Offline$/);
  },
);

When(
  'the first device creates a task while the other device is offline',
  async function (this: AppWorld) {
    await createTask(this.page, 'Queued for device sync');
  },
);

Then(
  'the first device shows {string} waiting to sync',
  async function (this: AppWorld, name: string) {
    await buttons(this.page, 'Devices · 1 · Waiting for 1 device').waitFor();
    await expectToolbarDevice(this.page, name, /^Waiting to sync · Offline$/);
  },
);

When('the devices reconnect', async function (this: AppWorld) {
  const run = fixture(this);
  run.offline = false;
  await Promise.all(
    [this.page, run.other].map((page) =>
      openPage(page, `${run.url}/inbox`, 'Inbox'),
    ),
  );
  await task(run.other, 'Queued for device sync').waitFor();
});
