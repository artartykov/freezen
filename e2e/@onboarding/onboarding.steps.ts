import { Given } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { AppWorld } from '../world';
import './onboarding.shared';
import type { OnboardingPermission } from '../../src/shared/platform';

declare global {
  interface Window {
    onboardingPermissionRequests: Map<
      OnboardingPermission,
      (granted: boolean) => void
    >;
  }
}

Given('I am a new user', async function (this: AppWorld) {
  assert.equal(this.page.url(), 'about:blank');
  await this.page.addInitScript(() => {
    const requests = new Map<
      OnboardingPermission,
      (granted: boolean) => void
    >();
    window.onboardingPermissionRequests = requests;
    Object.assign(window, {
      isTauri: true,
      __TAURI_INTERNALS__: {
        invoke(
          command: string,
          { permission }: { permission: OnboardingPermission },
        ) {
          if (command !== 'request_onboarding_permission') {
            throw new Error(`Unexpected Tauri command: ${command}`);
          }
          return new Promise<boolean>((resolve) =>
            requests.set(permission, resolve),
          );
        },
      },
    });
  });

  this.allowOnboardingPermission = async (permission) => {
    await this.page.waitForFunction(
      (name) => window.onboardingPermissionRequests.has(name),
      permission,
    );
    await this.page.evaluate((name) => {
      const requests = window.onboardingPermissionRequests;
      requests.get(name)?.(true);
      requests.delete(name);
    }, permission);
  };
});

Given('I open FreeZen', async function (this: AppWorld) {
  await this.page.goto('http://127.0.0.1:1422');
});
