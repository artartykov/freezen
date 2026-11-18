export const en = {
  hero: {
    title1: { emphasis: 'Free', rest: 'your mind' },
    title2: { emphasis: 'Focus', rest: 'on what matters' },
  },
  onboarding: {
    continue: 'Continue',
    skip: 'Not now',
    focus: 'Focus',
    permissionStatus: {
      denied: 'Permission was denied. You can try again or choose Not now.',
      failed: 'Could not request permission. Try again or choose Not now.',
      browserBlocked:
        'Notifications are blocked. Allow them in your browser’s site settings or choose Not now.',
      browserUnavailable:
        'Browser notifications require HTTPS or localhost and a browser that supports them.',
    },
    notifications: {
      title: 'Notifications',
      description:
        "We'll remind you before a task is due. Nothing else, no noise",
      action: 'Turn on notifications',
      preview: {
        title: 'FreeZen',
        detail: 'Call the dentist, due at 3 PM',
        time: 'now',
      },
    },
    calendar: {
      title: 'Calendar',
      description:
        'See your events next to your tasks, so your whole day fits on one screen',
      action: 'Allow calendar access',
      preview: {
        title: 'Team sync',
        detail: '10:00 to 10:30',
        time: 'today',
      },
    },
  },
  storage: {
    loadFailed:
      'Could not load your data. Nothing was changed. Restart the app to try again.',
  },
};
