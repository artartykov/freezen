import { describe, expect, it } from 'vitest';
import type { TaskEvent } from '@shared/platform';
import {
  applyTaskEvents,
  dialogIdOf,
  fallbackTasks,
  toTaskState,
} from './tasks';
import type { Drafts } from './tasks';

const empty: Drafts = { tasks: [], ids: {} };

const add: TaskEvent = {
  op: 'add',
  id: 1,
  title: ' Call Ivan ',
  state: 'next',
  due: '2026-11-20',
};

describe('applyTaskEvents', () => {
  it('adds a task to the Inbox with a trimmed title and a valid due date', () => {
    const { tasks, ids } = applyTaskEvents(empty, [add]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      title: 'Call Ivan',
      state: 'inbox',
      due: '2026-11-20',
    });
    expect(ids[1]).toBe(tasks[0]?.id);
  });

  it('keeps waiting and someday states', () => {
    expect(toTaskState('waiting')).toBe('waiting');
    expect(toTaskState('someday')).toBe('someday');
    expect(toTaskState('next')).toBe('inbox');
  });

  it('ignores a due date that is not an ISO date', () => {
    const { tasks } = applyTaskEvents(empty, [{ ...add, due: 'Friday' }]);
    expect(tasks[0]?.due).toBeNull();
  });

  it('updates only the fields that came with the event', () => {
    const added = applyTaskEvents(empty, [add]);
    const { tasks } = applyTaskEvents(added, [
      { op: 'update', id: 1, title: 'Call Anna' },
    ]);
    expect(tasks[0]).toMatchObject({ title: 'Call Anna', due: '2026-11-20' });
  });

  it('clears the due date when the update carries null', () => {
    const added = applyTaskEvents(empty, [add]);
    const { tasks } = applyTaskEvents(added, [
      { op: 'update', id: 1, due: null },
    ]);
    expect(tasks[0]?.due).toBeNull();
    expect(tasks[0]?.title).toBe('Call Ivan');
  });

  it('removes a task', () => {
    const added = applyTaskEvents(empty, [add]);
    const { tasks } = applyTaskEvents(added, [{ op: 'remove', id: 1 }]);
    expect(tasks).toEqual([]);
  });

  it('ignores events for an unknown task', () => {
    const added = applyTaskEvents(empty, [add]);
    const result = applyTaskEvents(added, [
      { op: 'update', id: 9, title: 'x' },
      { op: 'remove', id: 9 },
    ]);
    expect(result.tasks).toHaveLength(1);
  });
});

describe('dialogIdOf', () => {
  it('finds the dialog id of a draft task', () => {
    const { tasks, ids } = applyTaskEvents(empty, [add]);
    expect(dialogIdOf(ids, tasks[0]?.id ?? '')).toBe(1);
    expect(dialogIdOf(ids, 'missing')).toBeNull();
  });
});

describe('fallbackTasks', () => {
  it('keeps the recognized text as one Inbox task', () => {
    expect(fallbackTasks(' buy milk ')[0]).toMatchObject({
      title: 'buy milk',
      state: 'inbox',
    });
  });

  it('creates nothing from empty text', () => {
    expect(fallbackTasks('   ')).toEqual([]);
  });
});
