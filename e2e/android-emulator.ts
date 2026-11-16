import { execFile, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;

function sdkTool(directory: string, name: string) {
  const executable = process.platform === 'win32' ? `${name}.exe` : name;
  const path = sdk ? join(sdk, directory, executable) : executable;
  return existsSync(path) ? path : executable;
}

const adb = sdkTool('platform-tools', 'adb');
const emulator = sdkTool('emulator', 'emulator');

export async function installApk(serial: string) {
  const apk = resolve(
    process.env.ANDROID_APK ??
      'src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk',
  );
  if (!existsSync(apk)) {
    if (process.env.ANDROID_APK) throw new Error(`APK not found: ${apk}`);
    return;
  }
  console.log(`Installing debug APK: ${apk}`);
  await exec(adb, ['-s', serial, 'install', '-r', apk], { timeout: 60_000 });
}

export async function ensureEmulator(): Promise<ChildProcess | undefined> {
  const { stdout } = await exec(adb, ['devices'], { timeout: 10_000 });
  if (/^emulator-\d+\s/m.test(stdout)) return undefined;
  if (process.env.ANDROID_SERIAL) {
    throw new Error(`Emulator ${process.env.ANDROID_SERIAL} is not running`);
  }
  const available = await exec(emulator, ['-list-avds'], { timeout: 10_000 });
  const avds = available.stdout.trim().split(/\r?\n/).filter(Boolean);
  const avd =
    process.env.ANDROID_AVD ??
    (avds.includes('e2e-phone')
      ? 'e2e-phone'
      : avds.length === 1
        ? avds[0]
        : undefined);
  if (!avd || !avds.includes(avd)) {
    throw new Error(
      'Set ANDROID_AVD to an installed AVD name from emulator -list-avds',
    );
  }
  console.log(`Starting Android emulator: ${avd}`);
  const child = spawn(
    emulator,
    ['-avd', avd, '-no-window', '-no-audio', '-no-snapshot', '-no-boot-anim'],
    { stdio: 'ignore' },
  );
  await new Promise<void>((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });
  return child;
}

export async function waitForEmulator(child?: ChildProcess) {
  console.log('Waiting for Android emulator to finish booting...');
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (child && (child.exitCode !== null || child.signalCode !== null)) {
      throw new Error(
        'Android emulator exited before booting; try starting the AVD manually',
      );
    }
    const { stdout } = await exec(adb, ['devices'], { timeout: 10_000 });
    const serials = [...stdout.matchAll(/^(emulator-\d+)\s+device$/gm)].map(
      (match) => match[1],
    );
    const serial =
      process.env.ANDROID_SERIAL ??
      (serials.length === 1 ? serials[0] : undefined);
    if (serials.length > 1 && !process.env.ANDROID_SERIAL) {
      throw new Error('Set ANDROID_SERIAL when multiple emulators are running');
    }
    if (serial && serials.includes(serial)) {
      const boot = await exec(
        adb,
        ['-s', serial, 'shell', 'getprop', 'sys.boot_completed'],
        { timeout: 10_000 },
      );
      if (boot.stdout.trim() === '1') return;
    }
    await setTimeout(1_000);
  }
  throw new Error('Android emulator did not finish booting within 180 seconds');
}
