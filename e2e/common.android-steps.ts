import {
  AfterAll,
  Before,
  BeforeAll,
  Given,
  setDefaultTimeout,
  When,
} from '@cucumber/cucumber';
import { _android } from 'playwright';
import type { AndroidDevice } from 'playwright';
import type { ChildProcess } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import {
  ensureEmulator,
  installApk,
  waitForEmulator,
} from './android-emulator';
import { completeOnboarding } from './@onboarding/onboarding.shared';
import type { AppWorld } from './world';
import './world';

setDefaultTimeout(30_000);

export const packageName = 'app.freezen';
export const androidPermissions = {
  notifications: 'android.permission.POST_NOTIFICATIONS',
  calendar: 'android.permission.READ_CALENDAR',
};
const localStorageDir = 'app_webview/Default/Local Storage/leveldb';
const localStorageCommitTimeout = 10_000;
const webViewConnectTimeout = 5_000;
const appLaunchStepTimeout = 60_000;
const launchAttempts = 3;
const playwrightDriverPackage = 'com.microsoft.playwright.androiddriver';

let device: AndroidDevice | undefined;
let emulator: ChildProcess | undefined;

BeforeAll({ timeout: 300_000 }, async function () {
  emulator = await ensureEmulator();
  await waitForEmulator(emulator);
  const devices = await _android.devices();
  const emulators = devices.filter((candidate) =>
    candidate.serial().startsWith('emulator-'),
  );
  device = process.env.ANDROID_SERIAL
    ? emulators.find(
        (candidate) => candidate.serial() === process.env.ANDROID_SERIAL,
      )
    : emulators.length === 1
      ? emulators[0]
      : undefined;
  if (!device) {
    await Promise.all(devices.map((candidate) => candidate.close()));
    throw new Error(
      'Start an Android SDK emulator with a FreeZen debug APK installed. Set ANDROID_SERIAL when multiple emulators are running.',
    );
  }
  await Promise.all(
    devices
      .filter((candidate) => candidate !== device)
      .map((candidate) => candidate.close()),
  );
  await installApk(device.serial());
});

AfterAll(async function () {
  try {
    await device?.shell(`am force-stop ${playwrightDriverPackage}`);
  } finally {
    try {
      await device?.close();
    } finally {
      emulator?.kill();
    }
  }
});

export function getAndroidDevice() {
  if (!device) throw new Error('Android emulator is not connected');
  return device;
}

function withTimeout<T>(promise: Promise<T>, timeout: number, action: string) {
  let timer: NodeJS.Timeout | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = globalThis.setTimeout(
      () => reject(new Error(`${action} timed out after ${timeout} ms`)),
      timeout,
    );
  });
  return Promise.race([promise, expired]).finally(() => clearTimeout(timer));
}

async function launchApp(device: AndroidDevice) {
  await device.shell(`am force-stop ${packageName}`);
  await device.shell(`am start -W -n ${packageName}/.MainActivity`);
  const pid = (await device.shell(`pidof ${packageName}`)).toString().trim();
  if (!/^\d+$/.test(pid)) {
    throw new Error(`FreeZen did not start: pidof returned "${pid}"`);
  }
  const webView = await device.webView(
    { socketName: `webview_devtools_remote_${pid}` },
    { timeout: webViewConnectTimeout },
  );
  return withTimeout(
    webView.page(),
    webViewConnectTimeout,
    'Connecting to the FreeZen WebView',
  );
}

async function resetApp(device: AndroidDevice) {
  const result = await device.shell(`pm clear ${packageName}`);
  if (result.toString().trim() !== 'Success') {
    throw new Error(`Could not clear FreeZen app data: ${result.toString()}`);
  }

  for (const permission of Object.values(androidPermissions)) {
    await device.shell(`pm revoke ${packageName} ${permission}`);
    await device.shell(
      `pm clear-permission-flags ${packageName} ${permission} user-set user-fixed`,
    );
  }
}

Before(async function (this: AppWorld) {
  await resetApp(getAndroidDevice());
  this.openApp = async () => {
    const device = getAndroidDevice();
    const installed = await device.shell(`pm path ${packageName}`);
    if (!installed.toString().includes('package:')) {
      throw new Error(
        'Build a FreeZen debug APK for the selected emulator before running Android E2E.',
      );
    }
    const failures: string[] = [];
    for (let attempt = 1; attempt <= launchAttempts; attempt++) {
      try {
        this.page = await launchApp(device);
        return;
      } catch (error) {
        failures.push(
          `Attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    throw new Error(`Could not launch FreeZen:\n${failures.join('\n')}`);
  };
});

Given(
  'I open FreeZen',
  { timeout: appLaunchStepTimeout },
  async function (this: AppWorld) {
    await this.openApp();
  },
);

async function waitForLocalStorageOnDisk(world: AppWorld) {
  const values = await world.page.evaluate(() =>
    Object.keys(localStorage).map((key) => localStorage.getItem(key) ?? ''),
  );
  const encodings = values.map((value) => [
    Buffer.from(value, 'latin1'),
    Buffer.from(value, 'utf16le'),
  ]);
  const deadline = Date.now() + localStorageCommitTimeout;

  for (;;) {
    const files = await getAndroidDevice().shell(
      `run-as ${packageName} sh -c 'cat "${localStorageDir}"/*.log'`,
    );
    if (
      encodings.every((variants) =>
        variants.some((variant) => files.includes(variant)),
      )
    ) {
      return;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `WebView did not write localStorage to ${localStorageDir} within ${localStorageCommitTimeout} ms`,
      );
    }
    await setTimeout(100);
  }
}

When(
  'I restart the app',
  { timeout: appLaunchStepTimeout },
  async function (this: AppWorld) {
    await waitForLocalStorageOnDisk(this);
    await this.openApp();
  },
);

When(
  'I complete onboarding',
  { timeout: appLaunchStepTimeout },
  async function (this: AppWorld) {
    await completeOnboarding(this);
  },
);

Given(
  'I start with onboarding already completed',
  { timeout: appLaunchStepTimeout },
  async function (this: AppWorld) {
    await completeOnboarding(this);
  },
);
