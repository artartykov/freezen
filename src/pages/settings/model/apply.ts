import type { Messages } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import {
  changeData,
  disableLater,
  disableReference,
  disableWaiting,
  getData,
  liveReferences,
  updateSettings,
} from '@shared/storage';
import type { AiSettings, AppData, Settings } from '@shared/storage';
import type { ScalarSettingKey } from './choices';

type Disable = {
  count: number;
  name: string;
  target: string;
  run: (data: AppData) => AppData;
};

function disableFor(key: ScalarSettingKey, messages: Messages): Disable | null {
  const data = getData();
  const m = messages.settings;
  if (key === 'showLater') {
    return {
      count: data.tasks.filter((task) => task.state === 'later').length,
      name: m.later,
      target: messages.places.someday.title,
      run: disableLater,
    };
  }
  if (key === 'showWaiting') {
    return {
      count: data.tasks.filter((task) => task.state === 'waiting').length,
      name: m.waiting,
      target: messages.places.next.title,
      run: disableWaiting,
    };
  }
  if (key === 'showReference') {
    return {
      count: liveReferences(data).length,
      name: m.reference,
      target: '',
      run: disableReference,
    };
  }
  return null;
}

export function applySetting(
  key: ScalarSettingKey,
  value: string | boolean,
  messages: Messages,
) {
  const disable =
    value === false && getData().settings[key] !== false
      ? disableFor(key, messages)
      : null;
  if (!disable) {
    changeData((data) => updateSettings(data, { [key]: value }));
    return;
  }
  if (!disable.count) {
    changeData(disable.run);
    return;
  }
  const m = messages.settings;
  askConfirm({
    title: m.disableTitle(disable.name),
    text:
      key === 'showReference'
        ? m.disableReferenceText(disable.count)
        : m.disableText(disable.count, disable.name, disable.target),
    confirm: m.disableConfirm,
    danger: true,
    onConfirm: () => changeData(disable.run),
  });
}

export function saveSettings(fields: Partial<Settings>) {
  changeData((data) => updateSettings(data, fields));
}

export function changeAi(update: (ai: AiSettings) => AiSettings) {
  changeData((data) => updateSettings(data, { ai: update(data.settings.ai) }));
}
