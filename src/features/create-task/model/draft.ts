import { create } from 'zustand';
import { isDraftChanged } from '@shared/lib';
import { useUiState } from '@shared/model';
import {
  addReferenceItem,
  addTask,
  changeData,
  createReferenceItem,
  createTask,
  assignArea,
} from '@shared/storage';
import type { ReferenceItem, Task } from '@shared/storage';

export type TaskDraft =
  { kind: 'task'; task: Task } | { kind: 'item'; item: ReferenceItem };

export type DraftDefaults = Partial<Task> | { referenceId: string };

export const useTaskDraft = create<{
  draft: TaskDraft | null;
  initial: TaskDraft | null;
}>(() => ({
  draft: null,
  initial: null,
}));

export function startTaskDraft(defaults: DraftDefaults) {
  const draft: TaskDraft =
    'referenceId' in defaults
      ? {
          kind: 'item',
          item: createReferenceItem({ referenceId: defaults.referenceId }),
        }
      : { kind: 'task', task: createTask(defaults) };
  useTaskDraft.setState({ draft, initial: draft });
}

export function updateTaskDraft(draft: TaskDraft) {
  useTaskDraft.setState({ draft });
}

export function clearTaskDraft() {
  useTaskDraft.setState({ draft: null, initial: null });
}

export function isTaskDraftChanged(draft: TaskDraft) {
  const { initial } = useTaskDraft.getState();
  if (draft.kind === 'task' && initial?.kind === 'task')
    return isDraftChanged(draft.task, initial.task, 'title');
  if (draft.kind === 'item' && initial?.kind === 'item')
    return isDraftChanged(draft.item, initial.item, 'title');
  return true;
}

export function saveTaskDraft(
  draft: TaskDraft,
  untitled: { task: string; item: string },
) {
  if (draft.kind === 'task') {
    const task = {
      ...draft.task,
      title: draft.task.title.trim() || untitled.task,
    };
    const area = useUiState.getState().area;
    changeData((data) => assignArea(addTask(data, task), [task.id], area));
  } else {
    const item = {
      ...draft.item,
      title: draft.item.title.trim() || untitled.item,
    };
    changeData((data) => addReferenceItem(data, item));
  }
  clearTaskDraft();
}
