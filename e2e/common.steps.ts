import {
  After,
  AfterAll,
  Before,
  BeforeAll,
  Given,
  setDefaultTimeout,
  When,
} from '@cucumber/cucumber';
import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { completeOnboarding } from './@onboarding/onboarding.shared';
import { goToPlace, placeName } from './navigation';
import { AppWorld } from './world';
import {
  browserAppPort,
  browserAppUrl,
  openAfterOnboarding,
} from './browser-fixture';
setDefaultTimeout(30_000);

let server: ViteDevServer | undefined;
let browser: Browser | undefined;

BeforeAll(async function () {
  server = await createServer({
    server: {
      host: '127.0.0.1',
      port: browserAppPort,
      strictPort: true,
      hmr: false,
    },
  });
  await server.listen();
  browser = await chromium.launch();
});

Before(async function (this: AppWorld) {
  if (!browser) throw new Error('Browser is not running');
  this.page = await browser.newPage({ locale: 'en-US' });
  this.openApp = async () => {
    await this.page.goto(browserAppUrl);
  };
});

After(async function (this: AppWorld) {
  await this.page?.context().close();
});

AfterAll(async function () {
  await browser?.close();
  await server?.close();
});

Given('I open FreeZen', async function (this: AppWorld) {
  await this.openApp();
});

When('I restart the app', async function (this: AppWorld) {
  await this.openApp();
});

When('I complete onboarding', async function (this: AppWorld) {
  await completeOnboarding(this);
});

When(/^I go to the (.+)$/, async function (this: AppWorld, place: string) {
  await goToPlace(this.page, placeName(place));
});

Given(
  'I start with onboarding already completed',
  async function (this: AppWorld) {
    await openAfterOnboarding(this);
  },
);
