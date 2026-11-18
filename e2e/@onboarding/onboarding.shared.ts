import { Then, When } from '@cucumber/cucumber';
import type { AppWorld } from '../world';

const headings = {
  Welcome:
    /^(Free your mind\s*Focus on what matters|Освободи разум\s*Сосредоточься на важном)$/i,
  Notifications: /^(Notifications|Уведомления)$/,
  Calendar: /^(Calendar|Календарь)$/,
  Focus: /^(Focus|Фокус)$/,
};

type OnboardingPage = keyof typeof headings;

function waitForPage(world: AppWorld, page: OnboardingPage) {
  return world.page
    .getByRole('heading', { level: 1, name: headings[page] })
    .waitFor({ state: 'visible' });
}

function clickButton(world: AppWorld, name: RegExp) {
  return world.page.getByRole('button', { name }).click();
}

const continueButton = /^(Continue|Продолжить)$/;
const skipButton = /^(Not now|Не сейчас)$/;

Then(
  /^I see the (Welcome|Notifications|Calendar|Focus) page$/,
  async function (this: AppWorld, page: OnboardingPage) {
    await waitForPage(this, page);
  },
);

When('I continue', async function (this: AppWorld) {
  await clickButton(this, continueButton);
});

When('I choose to turn on notifications', async function (this: AppWorld) {
  await clickButton(this, /^(Turn on notifications|Включить уведомления)$/);
});

When('I allow notifications', async function (this: AppWorld) {
  await this.allowOnboardingPermission('notifications');
});

When('I choose to allow calendar access', async function (this: AppWorld) {
  await clickButton(
    this,
    /^(Allow calendar access|Разрешить доступ к календарю)$/,
  );
});

When('I allow calendar access', async function (this: AppWorld) {
  await this.allowOnboardingPermission('calendar');
});

export async function completeOnboarding(world: AppWorld) {
  await world.openApp();
  await clickButton(world, continueButton);
  await waitForPage(world, 'Notifications');
  await clickButton(world, skipButton);
  await waitForPage(world, 'Calendar');
  await clickButton(world, skipButton);
  await waitForPage(world, 'Focus');
}
