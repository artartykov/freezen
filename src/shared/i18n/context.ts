import { createContext, use } from 'react';
import type { en } from './en';

export type Messages = typeof en;

export type Locale = 'en' | 'ru';

export type I18n = { locale: Locale; messages: Messages };

export const I18nContext = createContext<I18n | null>(null);

export function useI18n() {
  const i18n = use(I18nContext);
  if (!i18n) throw new Error('I18nContext is missing');
  return i18n;
}

export function formatDate(iso: string, locale: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function formatWeekday(iso: string, locale: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, day));
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, style: 'month' | 'narrow' | 'long') {
  const key = `${locale}:${style}`;
  const cached = formatters.get(key);
  if (cached) return cached;
  const options: Intl.DateTimeFormatOptions =
    style === 'month'
      ? { month: 'long', year: 'numeric' }
      : style === 'narrow'
        ? { weekday: 'narrow' }
        : { dateStyle: 'long' };
  const created = new Intl.DateTimeFormat(locale, options);
  formatters.set(key, created);
  return created;
}

export function formatMonthYear(date: Date, locale: string) {
  return formatter(locale, 'month').format(date);
}

export function formatNarrowWeekday(date: Date, locale: string) {
  return formatter(locale, 'narrow').format(date);
}

export function formatLongDate(date: Date, locale: string) {
  return formatter(locale, 'long').format(date);
}
