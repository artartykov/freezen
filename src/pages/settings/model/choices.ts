import type { Messages } from '@shared/i18n';
import { trashRetentionOptions } from '@shared/storage';
import type { Settings } from '@shared/storage';

export type ScalarSettingKey = {
  [Key in keyof Settings]: Settings[Key] extends string | boolean ? Key : never;
}[keyof Settings];

export type Choice = {
  key: ScalarSettingKey;
  title: string;
  label?: string;
  tip?: string;
  options: { value: string | boolean; label: string }[];
};

export type ChoiceKey =
  | 'language'
  | 'dateFormat'
  | 'timeFormat'
  | 'weekStart'
  | 'newTasks'
  | 'onCompletion'
  | 'logCompleted'
  | 'longNotes'
  | 'counts'
  | 'showLater'
  | 'showWaiting'
  | 'showReference'
  | 'areaAssign'
  | 'areaIncludeUnassigned'
  | 'trashRetention';

const LANGUAGES = ['ru', 'en'] as const;
const DATE_FORMATS = ['iso', 'ru', 'us'] as const;

function dateChoices(
  messages: Messages,
): Record<'language' | 'dateFormat' | 'timeFormat' | 'weekStart', Choice> {
  const m = messages.settings;
  return {
    language: {
      key: 'language',
      title: m.language,
      tip: m.languageTip,
      options: LANGUAGES.map((value) => ({
        value,
        label: m.languages[value],
      })),
    },
    dateFormat: {
      key: 'dateFormat',
      title: m.dateFormat,
      options: DATE_FORMATS.map((value) => ({
        value,
        label: m.dateFormats[value],
      })),
    },
    timeFormat: {
      key: 'timeFormat',
      title: m.timeFormat,
      options: [
        { value: '24h', label: m.hours24 },
        { value: '12h', label: m.hours12 },
      ],
    },
    weekStart: {
      key: 'weekStart',
      title: m.weekStart,
      tip: m.weekStartTip,
      options: [
        { value: 'sunday', label: m.weekdays.sunday },
        { value: 'monday', label: m.weekdays.monday },
      ],
    },
  };
}

export function settingsChoices(messages: Messages): Record<ChoiceKey, Choice> {
  const m = messages.settings;
  const onOff = [
    { value: true, label: messages.common.enabled },
    { value: false, label: messages.common.disabled },
  ];
  return {
    ...dateChoices(messages),
    newTasks: {
      key: 'newTasks',
      title: m.newTasks,
      options: [
        { value: 'top', label: m.newTop },
        { value: 'bottom', label: m.newBottom },
      ],
    },
    onCompletion: {
      key: 'onCompletion',
      title: m.onCompletion,
      options: [
        { value: 'leave', label: m.leave },
        { value: 'move', label: m.moveDown },
      ],
    },
    logCompleted: {
      key: 'logCompleted',
      title: m.logCompleted,
      options: [
        { value: 'immediately', label: m.immediately },
        { value: 'daily', label: m.daily },
        { value: 'manually', label: m.manually },
      ],
    },
    longNotes: {
      key: 'longNotes',
      title: m.longNotes,
      tip: m.longNotesTip,
      options: [
        { value: 'lines', label: m.firstLines },
        { value: 'full', label: m.showInFull },
      ],
    },
    counts: {
      key: 'counts',
      title: m.sidebarCounts,
      label: m.counts,
      tip: m.countsTip,
      options: [
        { value: 'important', label: m.onlyImportant },
        { value: 'all', label: m.showAllCounts },
      ],
    },
    showLater: {
      key: 'showLater',
      title: m.later,
      tip: m.laterTip,
      options: onOff,
    },
    showWaiting: { key: 'showWaiting', title: m.waiting, options: onOff },
    showReference: { key: 'showReference', title: m.reference, options: onOff },
    areaAssign: {
      key: 'areaAssign',
      title: m.areaAssignment,
      tip: m.areaAssignmentTip,
      options: [
        { value: true, label: m.assignAutomatically },
        { value: false, label: m.assignManually },
      ],
    },
    trashRetention: {
      key: 'trashRetention',
      title: m.trashRetention,
      options: trashRetentionOptions.map((value) => ({
        value,
        label: m.trashRetentionDays(value),
      })),
    },
    areaIncludeUnassigned: {
      key: 'areaIncludeUnassigned',
      title: m.areaFiltering,
      tip: m.areaFilteringTip,
      options: [
        { value: true, label: m.includeUnassigned },
        { value: false, label: m.excludeUnassigned },
      ],
    },
  };
}

export function choiceLabel(choice: Choice, settings: Settings) {
  return (
    choice.options.find((option) => option.value === settings[choice.key])
      ?.label ?? ''
  );
}
