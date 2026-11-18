import { Then, When } from '@cucumber/cucumber';
import type { AppWorld } from '../world';

const headings = {
  Welcome:
    /^(Free your mind\s*Focus on what matters|Освободи разум\s*Сосредоточься на важном)$/i,
  Notifications: /^(Notifications|Уведомления)$/,
  Calendar: /^(Calendar|Календарь)$/,
  Focus: /^(Focus|Фокус)$/,
};

Then(
  /^I see the (Welcome|Notifications|Calendar|Focus) page$/,
  async function (this: AppWorld, page: keyof typeof headings) {
    await this.page
      .getByRole('heading', { level: 1, name: headings[page] })
      .waitFor({ state: 'visible' });
  },
);

When('I continue', async function (this: AppWorld) {
  await this.page
    .getByRole('button', { name: /^(Continue|Продолжить)$/ })
    .click();
});

When('I choose to turn on notifications', async function (this: AppWorld) {
  await this.page
    .getByRole('button', {
      name: /^(Turn on notifications|Включить уведомления)$/,
    })
    .click();
});

When('I allow notifications', async function (this: AppWorld) {
  await this.allowOnboardingPermission('notifications');
});

When('I choose to allow calendar access', async function (this: AppWorld) {
  await this.page
    .getByRole('button', {
      name: /^(Allow calendar access|Разрешить доступ к календарю)$/,
    })
    .click();
});

When('I allow calendar access', async function (this: AppWorld) {
  await this.allowOnboardingPermission('calendar');
});
