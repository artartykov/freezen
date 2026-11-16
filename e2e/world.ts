import { setWorldConstructor, World } from '@cucumber/cucumber';
import type { Page } from 'playwright';

export class AppWorld extends World {
  declare page: Page;
}

setWorldConstructor(AppWorld);
