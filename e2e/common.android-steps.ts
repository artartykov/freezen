import { AfterAll, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber';
import { _android } from 'playwright';
import type { AndroidDevice } from 'playwright';
import type { ChildProcess } from 'node:child_process';
import {
  ensureEmulator,
  installApk,
  waitForEmulator,
} from './android-emulator';
import './world';

setDefaultTimeout(30_000);

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
    await device?.close();
  } finally {
    emulator?.kill();
  }
});

export function getAndroidDevice() {
  if (!device) throw new Error('Android emulator is not connected');
  return device;
}
