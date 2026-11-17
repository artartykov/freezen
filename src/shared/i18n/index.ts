import { en } from './en';
import { ru } from './ru';

const messages = { en, ru };

type Locale = keyof typeof messages;

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
  const locale = selectLocale(preferences);

  return { locale, messages: messages[locale] };
}
