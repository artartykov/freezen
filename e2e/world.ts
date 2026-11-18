import { setWorldConstructor, World } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import type { OnboardingPermission } from '../src/shared/platform';

export class AppWorld extends World {
  declare page: Page;
  declare allowOnboardingPermission: (
    permission: OnboardingPermission,
  ) => Promise<void>;
}

setWorldConstructor(AppWorld);
