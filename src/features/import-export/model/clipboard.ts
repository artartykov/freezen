import type { Messages } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import { addTask, changeData, createTask } from '@shared/storage';
import type { Task } from '@shared/storage';

export function shareText(text: string, title?: string) {
  function copy() {
    navigator.clipboard?.writeText(text).catch(() => undefined);
  }

  if (typeof navigator.share !== 'function') {
    copy();
    return;
  }
  navigator.share({ title, text }).catch((error: unknown) => {
    if (!(error instanceof DOMException && error.name === 'AbortError')) copy();
  });
}

export function shareTasks(titles: string[], heading?: string) {
  const lines = titles.map((title) => `• ${title}`).join('\n');
  shareText(heading ? `${heading}\n${lines}` : lines, heading);
}

export function pasteTasks(defaults: Partial<Task>, messages: Messages) {
  function nothing() {
    askConfirm({
      title: messages.clipboard.nothingTitle,
      text: messages.clipboard.nothingText,
      confirm: messages.common.ok,
      cancel: '',
      onConfirm: () => undefined,
    });
  }

  if (!navigator.clipboard?.readText) {
    nothing();
    return;
  }
  navigator.clipboard.readText().then((text) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
      .filter(Boolean);
    if (!lines.length) {
      nothing();
      return;
    }
    const tasks = lines
      .reverse()
      .map((title) => createTask({ ...defaults, title }));
    changeData((data) =>
      tasks.reduce((current, task) => addTask(current, task), data),
    );
  }, nothing);
}
