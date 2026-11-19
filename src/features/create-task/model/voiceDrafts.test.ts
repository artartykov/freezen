import { describe, expect, it } from 'vitest';
import { draftTasks, fallbackTasks } from './voiceDrafts';

describe('draftTasks', () => {
  it('creates Inbox tasks from parsed tasks', () => {
    const [task] = draftTasks([
      { title: ' Call Ivan ', due: '2026-11-20', minutes: 15, energy: 'low' },
    ]);
    expect(task).toMatchObject({
      title: 'Call Ivan',
      state: 'inbox',
      due: '2026-11-20',
      minutes: 15,
      energy: 'low',
    });
  });

  it('drops tasks without a title', () => {
    expect(
      draftTasks([{ title: '  ', due: null, minutes: null, energy: null }]),
    ).toEqual([]);
  });

  it('ignores a due date that is not an ISO date', () => {
    const [task] = draftTasks([
      { title: 'Report', due: 'Wednesday', minutes: null, energy: null },
    ]);
    expect(task?.due).toBeNull();
  });
});

describe('fallbackTasks', () => {
  it('keeps the recognized text as one Inbox task', () => {
    const [task] = fallbackTasks(' buy milk ');
    expect(task).toMatchObject({ title: 'buy milk', state: 'inbox' });
  });

  it('creates nothing from empty text', () => {
    expect(fallbackTasks('   ')).toEqual([]);
  });
});
