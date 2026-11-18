import type { en } from './en';

export const ru = {
  hero: {
    title1: { emphasis: 'Освободи', rest: 'разум' },
    title2: { emphasis: 'Сосредоточься', rest: 'на важном' },
  },
  onboarding: {
    continue: 'Продолжить',
    skip: 'Не сейчас',
    focus: 'Фокус',
    notifications: {
      title: 'Уведомления',
      description:
        'Напомним о задаче до истечения срока. Без лишних уведомлений',
      action: 'Включить уведомления',
      preview: {
        title: 'FreeZen',
        detail: 'Стоматолог до 15:00',
        time: 'сейчас',
      },
    },
    calendar: {
      title: 'Календарь',
      description: 'События и задачи рядом. Весь день виден на одном экране',
      action: 'Разрешить доступ к календарю',
      preview: {
        title: 'Встреча команды',
        detail: 'С 10:00 до 10:30',
        time: 'сегодня',
      },
    },
  },
} satisfies typeof en;
