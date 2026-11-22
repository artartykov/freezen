import * as Automerge from '@automerge/automerge/slim';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  archiveTextConflicts,
  loadDataDocument,
  newDataDocument,
  readDataDocument,
  updateDataDocument,
} from './automerge';
import { defaultData } from './document';
import { createDocumentSync } from './documentSync';
import { createReference, createReferenceItem, createTask } from './factories';
import { convertReferenceToProject } from './mutations';
import { liveReferenceItems } from './queries';

beforeAll(async () => {
  const resolveModule = createRequire(import.meta.url);
  const wasm = await readFile(
    resolveModule.resolve('@automerge/automerge/automerge.wasm'),
  );
  await Automerge.initializeWasm(new Uint8Array(wasm));
});

describe('Automerge storage', () => {
  it('recovers a list for a concurrent addition after conversion to a project', () => {
    const reference = createReference({ name: 'Reading list', note: 'Links' });
    const existing = createReferenceItem({
      referenceId: reference.id,
      title: 'Existing link',
    });
    const item = createReferenceItem({
      referenceId: reference.id,
      title: 'New link',
    });
    const base = {
      ...defaultData,
      references: [reference],
      referenceItems: [existing],
    };
    const original = newDataDocument(base);
    const other = Automerge.clone(original);
    const converted = convertReferenceToProject(base, reference.id).data;
    const left = updateDataDocument(original, base, converted);
    expect(readDataDocument(left).references).toEqual([]);
    const right = updateDataDocument(other, base, {
      ...base,
      referenceItems: [existing, item],
    });
    const merged = loadDataDocument(
      Automerge.save(Automerge.merge(left, right)),
    );
    const data = readDataDocument(merged);
    expect(data.projects).toEqual(converted.projects);
    expect(data.tasks).toEqual(converted.tasks);
    expect(data.references).toEqual([reference]);
    expect(liveReferenceItems(data)).toEqual([item]);

    const edited = { ...reference, name: 'Recovered links' };
    const updated = updateDataDocument(merged, data, {
      ...data,
      references: [edited],
    });
    expect(readDataDocument(updated).references).toEqual([edited]);
  });

  it('archives a later note conflict while the original title still conflicts', () => {
    const task = createTask({ title: 'Original' });
    const base = { ...defaultData, tasks: [task] };
    const original = newDataDocument(base);
    const other = Automerge.clone(original);
    const left = updateDataDocument(original, base, {
      ...base,
      tasks: [{ ...task, title: 'Left title' }],
    });
    const right = updateDataDocument(other, base, {
      ...base,
      tasks: [{ ...task, title: 'Right title' }],
    });
    const first = archiveTextConflicts(
      Automerge.merge(Automerge.clone(left, Automerge.getActorId(left)), right),
    );
    const second = Automerge.clone(first, Automerge.getActorId(right));
    const shared = readDataDocument(first);
    const leftNote = updateDataDocument(first, shared, {
      ...shared,
      tasks: [{ ...shared.tasks[0], note: 'Left note' }],
    });
    const rightNote = updateDataDocument(second, shared, {
      ...shared,
      tasks: [{ ...shared.tasks[0], note: 'Right note' }],
    });
    const archived = archiveTextConflicts(Automerge.merge(leftNote, rightNote));
    expect(archiveTextConflicts(archived)).toBe(archived);
    const [result] = readDataDocument(archived).tasks;
    expect(result.noteHistory).toContainEqual({
      title: result.note === 'Left note' ? 'Right title' : 'Left title',
      note: result.note === 'Left note' ? 'Right note' : 'Left note',
    });
  });

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

describe('Automerge synchronization', () => {
  it('converges when one replica reconnects with only part of the shared history', () => {
    type Replica = {
      tasks: Record<string, { title: string; extra?: number }>;
    };
    const root = Automerge.change(
      Automerge.init<Replica>({ actor: 'aa' }),
      { time: 0 },
      (draft) => {
        draft.tasks = {};
      },
    );

    function addTask(actor: string, title: string) {
      const created = Automerge.change(
        Automerge.clone(root, actor),
        { time: 0 },
        (draft) => {
          draft.tasks[title] = { title };
        },
      );
      return Automerge.change(created, { time: 0 }, (draft) => {
        draft.tasks[title].extra = 364;
      });
    }

    const left = addTask('bb', 'x');
    const right = addTask('cc', 'y');
    function replica(initial: typeof root) {
      let document = initial;
      const current = () => document;
      return {
        current,
        sync: createDocumentSync({
          current,
          apply(next) {
            document = next;
          },
        }),
      };
    }

    const first = replica(Automerge.merge(Automerge.clone(left, 'bb'), right));
    const second = replica(right);
    type Peer = ReturnType<typeof replica>;
    const queue: { receiver: Peer; sender: Peer; message: Uint8Array }[] = [];
    function send(sender: Peer, receiver: Peer) {
      const message = sender.sync.generate();
      if (message) queue.push({ receiver, sender, message });
    }

    send(first, second);
    send(second, first);
    for (let round = 0; round < 25; round += 1) {
      const next = queue.shift();
      if (!next) break;
      next.receiver.sync.receive(next.message);
      send(next.receiver, next.sender);
    }

    expect(queue).toHaveLength(0);
    expect(Automerge.getHeads(second.current())).toEqual(
      Automerge.getHeads(first.current()),
    );
    expect(Object.keys(second.current().tasks).sort()).toEqual(['x', 'y']);
  });
});
