import { Given } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { AppWorld } from '../world';
import './onboarding.shared';
import type { OnboardingPermission } from '@shared/platform';

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
          args: {
            permission: OnboardingPermission;
            data: number[];
            expected: number[] | null;
          },
        ) {
          const dataKey = 'freezen-e2e-data';
          switch (command) {
            case 'load_document_recovery_files':
            case 'load_recovery_files':
            case 'load_data':
              return null;
            case 'load_document':
              return JSON.parse(localStorage.getItem(dataKey) ?? 'null') as
                number[] | null;
            case 'save_document':
              if (
                (localStorage.getItem(dataKey) ?? 'null') !==
                JSON.stringify(args.expected)
              )
                return false;
              localStorage.setItem(dataKey, JSON.stringify(args.data));
              return true;
            case 'request_onboarding_permission':
              return new Promise<boolean>((resolve) =>
                requests.set(args.permission, resolve),
              );
          }
          throw new Error(`Unexpected Tauri command: ${command}`);
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
