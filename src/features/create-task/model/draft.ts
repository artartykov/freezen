import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isDraftChanged } from '@shared/lib';
import { useUiState } from '@shared/model';
import {
  addReferenceItem,
  addTask,
  changeData,
  createReferenceItem,
  createTask,
  newId,
  updateTask,
  updateReferenceItem,
  assignArea,
} from '@shared/storage';
import type { ReferenceItem, Task } from '@shared/storage';

export type TaskDraft =
  { kind: 'task'; task: Task } | { kind: 'item'; item: ReferenceItem };

export type DraftDefaults = Partial<Task> | { referenceId: string };

type DraftState = {
  draft: TaskDraft | null;
  initial: TaskDraft | null;
  scope: string | null;
  parked: Record<string, { draft: TaskDraft; initial: TaskDraft }>;
};

export const useTaskDraft = create<DraftState>()(
  persist<DraftState>(
    () => ({ draft: null, initial: null, scope: null, parked: {} }),
    {
      name: 'freezen:task-drafts',
      storage: createJSONStorage(() => ({
        getItem: (key) => sessionStorage.getItem(key),
        setItem(key, value) {
          try {
            sessionStorage.setItem(key, value);
          } catch (error) {
            console.error(error);
          }
        },
        removeItem: (key) => sessionStorage.removeItem(key),
      })),
    },
  ),
);

export function startTaskDraft(defaults: DraftDefaults) {
  const scope = JSON.stringify(defaults);
  const current = useTaskDraft.getState();
  if (current.scope === scope && current.draft) return;

  const parked = { ...current.parked };
  if (
    current.scope &&
    current.draft &&
    current.initial &&
    isTaskDraftChanged(current.draft)
  ) {
    parked[current.scope] = { draft: current.draft, initial: current.initial };
  }
  const stored = parked[scope];
  delete parked[scope];
  if (stored) {
    useTaskDraft.setState({ ...stored, scope, parked });
    return;
  }

  const draft: TaskDraft =
    'referenceId' in defaults
      ? {
          kind: 'item',
          item: createReferenceItem({ referenceId: defaults.referenceId }),
        }
      : { kind: 'task', task: createTask(defaults) };
  useTaskDraft.setState({ draft, initial: draft, scope, parked });
}

export function updateTaskDraft(draft: TaskDraft) {
  useTaskDraft.setState({ draft });
}

export function clearTaskDraft() {
  useTaskDraft.setState({ draft: null, initial: null, scope: null });
}

export function resetTaskDraft() {
  const { initial } = useTaskDraft.getState();
  if (initial?.kind !== 'task') return;
  const task = { ...initial.task, id: newId(), title: '' };
  const draft = { kind: 'task', task } as const;
  useTaskDraft.setState({ draft, initial: draft });
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
    changeData((data) => {
      const existing = data.tasks.find((entry) => entry.id === task.id);
      return existing
        ? updateTask(data, task.id, {
            ...task,
            noteHistory: existing.noteHistory,
          })
        : assignArea(addTask(data, task), [task.id], area);
    });
  } else {
    const item = {
      ...draft.item,
      title: draft.item.title.trim() || untitled.item,
    };
    changeData((data) => {
      const existing = data.referenceItems.find(
        (entry) => entry.id === item.id,
      );
      return existing
        ? updateReferenceItem(data, item.id, {
            ...item,
            noteHistory: existing.noteHistory,
          })
        : addReferenceItem(data, item);
    });
  }
}
