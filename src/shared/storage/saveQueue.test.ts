import { describe, expect, it, vi } from 'vitest';
import { createSaveQueue } from './saveQueue';

function createControlledSave() {
  const calls: { data: string; finish: () => void; fail: () => void }[] = [];
  const save = vi.fn(
    (data: string) =>
      new Promise<void>((resolve, reject) => {
        calls.push({
          data,
          finish: resolve,
          fail: () => reject(new Error('disk full')),
        });
      }),
  );

  return { save, calls };
}

describe('createSaveQueue', () => {
  it('saves immediately', () => {
    const { save } = createControlledSave();
    const queue = createSaveQueue(save, vi.fn());

    queue.enqueue('a');

    expect(save).toHaveBeenCalledWith('a');
  });

  it('runs one save at a time and then writes only the latest state', async () => {
    const { save, calls } = createControlledSave();
    const queue = createSaveQueue(save, vi.fn());

    queue.enqueue('a');
    queue.enqueue('b');
    queue.enqueue('c');
    expect(calls.map((call) => call.data)).toEqual(['a']);

    calls[0].finish();
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].data).toBe('c');

    calls[1].finish();
    await queue.settled();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('reports a failed save and keeps saving later changes', async () => {
    const { save, calls } = createControlledSave();
    const onError = vi.fn();
    const queue = createSaveQueue(save, onError);

    queue.enqueue('a');
    queue.enqueue('b');
    calls[0].fail();
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    calls[1].finish();
    await queue.settled();

    expect(onError).toHaveBeenCalledOnce();
    expect(calls[1].data).toBe('b');
  });

  it('starts a new save after the queue becomes idle', async () => {
    const { save, calls } = createControlledSave();
    const queue = createSaveQueue(save, vi.fn());

    queue.enqueue('a');
    calls[0].finish();
    await queue.settled();
    queue.enqueue('b');

    expect(calls.map((call) => call.data)).toEqual(['a', 'b']);
  });

  it('keeps saving after a save throws synchronously', async () => {
    const save = vi.fn((data: string) => {
      if (data === 'a') throw new Error('sync failure');
      return Promise.resolve();
    });
    const onError = vi.fn();
    const queue = createSaveQueue(save, onError);

    queue.enqueue('a');
    await queue.settled();
    queue.enqueue('b');
    await queue.settled();

    expect(onError).toHaveBeenCalledOnce();
    expect(save).toHaveBeenLastCalledWith('b');
  });

  it('keeps saving the latest state after the error handler throws', async () => {
    const { save, calls } = createControlledSave();
    const queue = createSaveQueue(save, () => {
      throw new Error('reporter failed');
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    queue.enqueue('a');
    queue.enqueue('b');
    calls[0].fail();
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    calls[1].finish();
    await queue.settled();

    expect(calls[1].data).toBe('b');
    expect(console.error).toHaveBeenCalledOnce();
  });
});
