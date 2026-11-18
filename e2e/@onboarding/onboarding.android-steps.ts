import { Given } from '@cucumber/cucumber';
import { getAndroidDevice } from '../common.android-steps';
import type { AppWorld } from '../world';
import './onboarding.shared';

const packageName = 'app.freezen';
const androidPermissions = {
  notifications: 'android.permission.POST_NOTIFICATIONS',
  calendar: 'android.permission.READ_CALENDAR',
};

Given('I am a new user', async function (this: AppWorld) {
  const emulatorDevice = getAndroidDevice();
  const result = await emulatorDevice.shell(`pm clear ${packageName}`);
  if (result.toString().trim() !== 'Success') {
    throw new Error(`Could not clear FreeZen app data: ${result.toString()}`);
  }

  for (const permission of Object.values(androidPermissions)) {
    await emulatorDevice.shell(`pm revoke ${packageName} ${permission}`);
    await emulatorDevice.shell(
      `pm clear-permission-flags ${packageName} ${permission} user-set user-fixed`,
    );
  }

  this.allowOnboardingPermission = async (permission) => {
    await emulatorDevice.tap({ res: /^.*:id\/permission_allow_button$/ });
    const packageInfo = await emulatorDevice.shell(
      `dumpsys package ${packageName}`,
    );
    const granted = packageInfo
      .toString()
      .split('\n')
      .some((line) =>
        line
          .trim()
          .startsWith(`${androidPermissions[permission]}: granted=true`),
      );

    if (!granted) throw new Error(`Android did not grant ${permission}`);
  };
});

Given('I open FreeZen', async function (this: AppWorld) {
  const device = getAndroidDevice();
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
