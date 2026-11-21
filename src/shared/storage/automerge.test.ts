import * as Automerge from '@automerge/automerge/slim';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  loadDataDocument,
  newDataDocument,
  readDataDocument,
  updateDataDocument,
} from './automerge';
import { defaultData } from './document';
import { createTask } from './factories';

beforeAll(async () => {
  const resolveModule = createRequire(import.meta.url);
  const wasm = await readFile(
    resolveModule.resolve('@automerge/automerge/automerge.wasm'),
  );
  await Automerge.initializeWasm(new Uint8Array(wasm));
});

describe('Automerge storage', () => {
  it('keeps both documents when independent installations first pair', () => {
    const first = createTask({ title: 'First device' });
    const second = createTask({ title: 'Second device' });
    const left = newDataDocument({ ...defaultData, tasks: [first] });
    const right = newDataDocument({ ...defaultData, tasks: [second] });
    const doc = loadDataDocument(Automerge.save(Automerge.merge(left, right)));
    expect(new Set(readDataDocument(doc).tasks.map(({ id }) => id))).toEqual(
      new Set([first.id, second.id]),
    );
  });

  it('keeps a reorder and a concurrent addition', () => {
    const first = createTask({ title: 'First' });
    const second = createTask({ title: 'Second' });
    const third = createTask({ title: 'Added elsewhere' });
    const base = { ...defaultData, tasks: [first, second] };
    const original = newDataDocument(base);
    const other = Automerge.clone(original);
    const left = updateDataDocument(original, base, {
      ...base,
      tasks: [second, first],
    });
    const right = updateDataDocument(other, base, {
      ...base,
      tasks: [first, second, third],
    });
    expect(readDataDocument(Automerge.merge(left, right)).tasks).toEqual([
      second,
      first,
      third,
    ]);
  });

  it('keeps a deletion when the deleted record is edited concurrently', () => {
    const task = createTask({ title: 'Delete me' });
    const base = { ...defaultData, tasks: [task] };
    const original = newDataDocument(base);
    const other = Automerge.clone(original);
    const left = updateDataDocument(original, base, {
      ...base,
      tasks: [],
    });
    const right = updateDataDocument(other, base, {
      ...base,
      tasks: [{ ...task, title: 'Edited elsewhere' }],
    });
    expect(readDataDocument(Automerge.merge(left, right)).tasks).toEqual([]);
  });
});
