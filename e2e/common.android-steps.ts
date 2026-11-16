import {
  AfterAll,
  BeforeAll,
  Given,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import { _android } from 'playwright';
import type { AndroidDevice } from 'playwright';
import type { ChildProcess } from 'node:child_process';
import {
  ensureEmulator,
  installApk,
  waitForEmulator,
} from './android-emulator';
import { AppWorld } from './world';

setDefaultTimeout(30_000);

let device: AndroidDevice | undefined;
let emulator: ChildProcess | undefined;
const packageName = 'app.freezen';

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
    await device?.close();
  } finally {
    emulator?.kill();
  }
});

Given('I open FreeZen', async function (this: AppWorld) {
  if (!device) throw new Error('Android emulator is not connected');
  const installed = await device.shell(`pm path ${packageName}`);
  if (!installed.toString().includes('package:')) {
    throw new Error(
      'Build a FreeZen debug APK for the selected emulator before running Android E2E.',
    );
  }
  await device.shell(`am force-stop ${packageName}`);
  await device.shell(`am start -W -n ${packageName}/.MainActivity`);
  const webView = await device.webView({ pkg: packageName });
  this.page = await webView.page();
});
