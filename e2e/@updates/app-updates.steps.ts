import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import type { AppWorld } from '../world';

async function mockUpdates(
  page: Page,
  supported: boolean,
  version: string | null,
) {
  await page.addInitScript({
    content: `(() => {
      const { supported, version } = ${JSON.stringify({ supported, version })};
      Object.assign(window, {
        isTauri: true,
        __TAURI_INTERNALS__: {
          invoke(command, args) {
            const dataKey = 'freezen-e2e-data';
            switch (command) {
              case 'load_data':
                return localStorage.getItem(dataKey);
              case 'save_data':
                if (localStorage.getItem(dataKey) !== args.expected) return false;
                localStorage.setItem(dataKey, args.data);
                return true;
              case 'supports_app_updates':
                return supported;
              case 'check_app_update':
                sessionStorage.setItem('updates-checked', 'true');
                return version;
              case 'install_app_update':
                sessionStorage.setItem(
                  'update-install-request',
                  args.version ?? '',
                );
                return true;
              default:
                throw new Error('Unexpected native command ' + command);
            }
          },
        },
      });
    })()`,
  });
}

function updatePrompt(page: Page) {
  return page.getByRole('alertdialog', {
    name: 'Update available',
    exact: true,
  });
}

Given(
  'the regular Android build has an update to {string}',
  async function (this: AppWorld, version: string) {
    await mockUpdates(this.page, true, version);
  },
);

Given(
  'the regular Android build is up to date',
  async function (this: AppWorld) {
    await mockUpdates(this.page, true, null);
  },
);

Given('I use FreeZen Dev', async function (this: AppWorld) {
  await mockUpdates(this.page, false, '1.1.0');
});

Then(
  'I see an update prompt for {string}',
  async function (this: AppWorld, version: string) {
    await updatePrompt(this.page)
      .getByText(`FreeZen ${version} is ready to install.`)
      .waitFor();
  },
);

When('I choose Later in the update prompt', async function (this: AppWorld) {
  await updatePrompt(this.page)
    .getByRole('button', { name: 'Later', exact: true })
    .click();
});

Then('the update prompt stays closed', async function (this: AppWorld) {
  await this.page
    .getByRole('button', { name: 'Check for updates', exact: true })
    .waitFor();
  assert.equal(await updatePrompt(this.page).count(), 0);
});

Then(
  'the update button is between About and Give us 5 stars',
  async function (this: AppWorld) {
    const group = this.page.locator('section').filter({
      has: this.page.getByRole('heading', { name: 'FreeZen', exact: true }),
    });
    const rows = await group.getByRole('listitem').allTextContents();
    assert.equal(rows.length, 3);
    assert.match(rows[0], /^About/);
    assert.equal(rows[1], 'Check for updates');
    assert.match(rows[2], /^Give us 5 stars/);
  },
);

When('I check for app updates', async function (this: AppWorld) {
  await this.page
    .getByRole('button', { name: 'Check for updates', exact: true })
    .click();
});

When('I choose Update in the update prompt', async function (this: AppWorld) {
  await updatePrompt(this.page)
    .getByRole('button', { name: 'Update', exact: true })
    .click();
});

Then(
  'FreeZen asks Android to install {string}',
  async function (this: AppWorld, version: string) {
    await this.page.waitForFunction(
      (expected) =>
        sessionStorage.getItem('update-install-request') === expected,
      version,
    );
  },
);

Then('I see that FreeZen is up to date', async function (this: AppWorld) {
  await this.page
    .getByRole('alertdialog', { name: 'FreeZen is up to date', exact: true })
    .waitFor();
});

Then(
  'FreeZen does not check for updates or offer an update button',
  async function (this: AppWorld) {
    assert.equal(
      await this.page
        .getByRole('button', { name: 'Check for updates', exact: true })
        .count(),
      0,
    );
    assert.equal(await updatePrompt(this.page).count(), 0);
    assert.equal(
      await this.page.evaluate(() => sessionStorage.getItem('updates-checked')),
      null,
    );
  },
);
