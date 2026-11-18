import { setWorldConstructor, World } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import type { OnboardingPermission } from '@shared/platform';

export class AppWorld extends World {
  declare page: Page;
  declare openApp: () => Promise<void>;
  declare allowOnboardingPermission: (
    permission: OnboardingPermission,
  ) => Promise<void>;
}

setWorldConstructor(AppWorld);
