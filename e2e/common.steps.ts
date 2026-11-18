import {
  After,
  AfterAll,
  Before,
  BeforeAll,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { AppWorld } from './world';
setDefaultTimeout(30_000);

let server: ViteDevServer | undefined;
let browser: Browser | undefined;

BeforeAll(async function () {
  server = await createServer({
    server: { host: '127.0.0.1', port: 1422, strictPort: true, hmr: false },
  });
  await server.listen();
  browser = await chromium.launch();
});

Before(async function (this: AppWorld) {
  if (!browser) throw new Error('Browser is not running');
  this.page = await browser.newPage();
});

After(async function (this: AppWorld) {
  await this.page?.context().close();
});

AfterAll(async function () {
  await browser?.close();
  await server?.close();
});
