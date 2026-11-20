import { describe, expect, it } from 'vitest';
import { defaultData } from './document';
import { createTask } from './factories';
import { reconcileData } from './reconcile';

describe('reconcileData', () => {
  it('combines independent additions', () => {
    const first = createTask({ title: 'First' });
    const second = createTask({ title: 'Second' });
    const merged = reconcileData(
      defaultData,
      { ...defaultData, tasks: [first] },
      { ...defaultData, tasks: [second] },
    );

    expect(merged.tasks).toEqual([second, first]);
  });

  it('keeps edits to different fields of the same task', () => {
    const task = createTask();
    const base = { ...defaultData, tasks: [task] };
    const merged = reconcileData(
      base,
      { ...base, tasks: [{ ...task, title: 'New title' }] },
      { ...base, tasks: [{ ...task, note: 'New note' }] },
    );

    expect(merged.tasks).toEqual([
      { ...task, title: 'New title', note: 'New note' },
    ]);
  });

  it('keeps a conflicting note text in history and does not duplicate it on replay', () => {
    const task = createTask({ title: 'Shared' });
    const base = { ...defaultData, tasks: [task] };
    const first = { ...base, tasks: [{ ...task, note: 'First version' }] };
    const second = { ...base, tasks: [{ ...task, note: 'Second version' }] };
    const merged = reconcileData(base, first, second);

    expect(merged.tasks).toEqual([
      {
        ...task,
        note: 'First version',
        noteHistory: [{ title: 'Shared', note: 'Second version' }],
      },
    ]);
    expect(reconcileData(base, merged, second)).toEqual(merged);
  });

  it('keeps a concurrently edited note when the other tab deletes it', () => {
    const task = createTask();
    const base = { ...defaultData, tasks: [task] };
    const edited = { ...base, tasks: [{ ...task, note: 'New note' }] };

    expect(reconcileData(base, defaultData, edited)).toEqual(edited);
    expect(reconcileData(base, edited, defaultData)).toEqual(edited);
  });
});
