import type { I18n, Locale } from './context';
import { en } from './en';
import { ru } from './ru';

export {
  I18nContext,
  formatDate,
  formatLongDate,
  formatMonthYear,
  formatNarrowWeekday,
  formatWeekday,
  useI18n,
} from './context';
export type { I18n, Locale, Messages } from './context';

const bundles: Record<Locale, I18n> = {
  en: { locale: 'en', messages: en },
  ru: { locale: 'ru', messages: ru },
};

export function i18nFor(locale: Locale) {
  return bundles[locale];
}

function selectLocale(preferences: readonly string[]): Locale {
  for (const preference of preferences) {
    const language = preference.toLowerCase().split('-')[0];

    if (language === 'en' || language === 'ru') {
      return language;
    }
  }

  return 'en';
}

export function resolveI18n(preferences: readonly string[]) {
  return i18nFor(selectLocale(preferences));
}
