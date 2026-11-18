import { Given } from '@cucumber/cucumber';
import {
  androidPermissions,
  getAndroidDevice,
  packageName,
} from '../common.android-steps';
import type { AppWorld } from '../world';
import './onboarding.shared';

Given('I am a new user', function (this: AppWorld) {
  const emulatorDevice = getAndroidDevice();
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
