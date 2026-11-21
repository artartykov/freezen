import * as Automerge from '@automerge/automerge/slim';
import {
  defaultData,
  FutureDataVersionError,
  parseData,
  UnsupportedDataError,
} from './document';
import type { AppData, NoteVersion } from './document';
import { sameDocumentValue } from './reconcile';

const schemaVersion = 1;
const schemaActor = '00000000000000000000000000000001';
const collections = [
  'tasks',
  'projects',
  'references',
  'referenceItems',
  'tags',
] as const;

type StoredValue =
  | null
  | boolean
  | number
  | Automerge.ImmutableString
  | StoredValue[]
  | StoredRecord;

type StoredRecord = { [key: string]: StoredValue | undefined };
type StoredCollection = Record<string, StoredRecord>;
type StoredDocument = {
  version: number;
  tasks: StoredCollection;
  projects: StoredCollection;
  references: StoredCollection;
  referenceItems: StoredCollection;
  tags: StoredCollection;
  settings: StoredRecord;
};

type Entry = AppData[(typeof collections)[number]][number];
export type DataDocument = Automerge.Doc<StoredDocument>;

let schema: DataDocument | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isStoredRecord(value: StoredValue | undefined): value is StoredRecord {
  return isRecord(value);
}

function encode(value: unknown): StoredValue {
  if (typeof value === 'string') return new Automerge.ImmutableString(value);
  if (value === null || typeof value === 'boolean' || typeof value === 'number')
    return value;
  if (Array.isArray(value)) return value.map(encode);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, field]) => field !== undefined)
        .map(([key, field]) => [key, encode(field)]),
    );
  }
  throw new UnsupportedDataError('unsupported field');
}

function textValue(value: StoredValue | undefined) {
  return value instanceof Automerge.ImmutableString ? value.val : '';
}

function recordKey(id: string) {
  return `id:${id}`;
}

function orderOf(entry: StoredRecord) {
  if (typeof entry.position !== 'number' || !Number.isFinite(entry.position))
    throw new UnsupportedDataError('invalid entry position');
  return entry.position;
}

function byPosition(
  left: [string, StoredRecord],
  right: [string, StoredRecord],
) {
  return (
    orderOf(left[1]) - orderOf(right[1]) ||
    (left[0] < right[0] ? -1 : Number(left[0] > right[0]))
  );
}

function readTags(tags: StoredRecord) {
  return Object.entries(tags)
    .filter((item): item is [string, number] => typeof item[1] === 'number')
    .sort(
      ([left, a], [right, b]) =>
        a - b || (left < right ? -1 : Number(left > right)),
    )
    .map(([key]) => key.slice(3));
}

function writeTags(target: StoredRecord, before: string[], after: string[]) {
  const ids = new Set(after);
  for (const id of before) {
    if (!ids.has(id)) delete target[recordKey(id)];
  }
  for (const [index, id] of after.entries()) {
    const name = recordKey(id);
    if (target[name] !== index) target[name] = index;
  }
}

function isTagIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string');
}

function writeFields(target: StoredRecord, before: object, after: object) {
  const previous = new Map<string, unknown>(Object.entries(before));
  for (const [key, value] of Object.entries(after) as [string, unknown][]) {
    const old = previous.get(key);
    previous.delete(key);
    if (sameDocumentValue(old, value)) continue;
    const field = target[key];
    if (value === undefined) delete target[key];
    else if (key === 'tagIds' && isTagIds(value)) {
      if (!isStoredRecord(field)) target[key] = {};
      writeTags(target[key] as StoredRecord, isTagIds(old) ? old : [], value);
    } else if (isStoredRecord(field) && isRecord(old) && isRecord(value)) {
      writeFields(field, old, value);
    } else {
      target[key] = encode(value);
    }
  }
  for (const key of previous.keys()) delete target[key];
}

function orderedPositions(
  target: StoredCollection,
  before: Entry[],
  after: Entry[],
) {
  const sequential = () => after.map((_, index) => index);
  const beforeIds = new Set(before.map(({ id }) => id));
  const afterIds = new Set(after.map(({ id }) => id));
  if (
    !sameDocumentValue(
      before.filter(({ id }) => afterIds.has(id)).map(({ id }) => id),
      after.filter(({ id }) => beforeIds.has(id)).map(({ id }) => id),
    )
  )
    return sequential();

  const positions = after.map(({ id }) => {
    const entry = target[recordKey(id)];
    return entry === undefined ? undefined : orderOf(entry);
  });
  let index = 0;
  while (index < positions.length) {
    if (positions[index] !== undefined) {
      index++;
      continue;
    }
    const start = index;
    while (index < positions.length && positions[index] === undefined) index++;
    const count = index - start;
    const lower = positions[start - 1];
    const upper = positions[index];
    const from = lower ?? (upper === undefined ? -1 : upper - count - 1);
    const step = upper === undefined ? 1 : (upper - from) / (count + 1);
    for (let offset = 0; offset < count; offset++)
      positions[start + offset] = from + step * (offset + 1);
  }
  const ranks = positions as number[];
  return ranks.every((rank, item) => item === 0 || rank > ranks[item - 1])
    ? ranks
    : sequential();
}

function writeCollection(
  target: StoredCollection,
  before: Entry[],
  after: Entry[],
) {
  if (before === after) return;
  const oldEntries = new Map(before.map((entry) => [entry.id, entry]));
  const positions = orderedPositions(target, before, after);
  for (const [index, entry] of after.entries()) {
    const key = recordKey(entry.id);
    const previous = oldEntries.get(entry.id);
    oldEntries.delete(entry.id);
    if (!Object.hasOwn(target, key)) target[key] = { conflictHistory: {} };

    const record = target[key];
    if (record.position !== positions[index])
      record.position = positions[index];
    if (previous !== entry) writeFields(record, previous ?? {}, entry);
  }
  for (const id of oldEntries.keys()) delete target[recordKey(id)];
}

function checkedVersion(version: unknown) {
  if (typeof version === 'number' && version > schemaVersion)
    throw new FutureDataVersionError(`schema ${version}`);
  if (version !== schemaVersion)
    throw new UnsupportedDataError('invalid Automerge schema');
}

function readCollection(collection: StoredCollection) {
  if (!isRecord(collection)) throw new UnsupportedDataError('invalid entries');
  const entries = Object.entries(collection);
  for (const [key, entry] of entries) {
    if (!isRecord(entry) || recordKey(textValue(entry.id)) !== key)
      throw new UnsupportedDataError('invalid entry id');
    orderOf(entry);
  }
  return entries.sort(byPosition).map(([, entry]) => {
    const { conflictHistory, ...fields } = entry;
    delete fields.position;
    const tagIds = isStoredRecord(fields.tagIds)
      ? readTags(fields.tagIds)
      : fields.tagIds;
    if (!isStoredRecord(conflictHistory))
      throw new UnsupportedDataError('invalid text history');
    const history = [
      ...(Array.isArray(fields.noteHistory) ? fields.noteHistory : []),
      ...Object.values(conflictHistory),
    ];
    const title = textValue(fields.title ?? fields.name);
    const note = textValue(fields.note);
    const versions = [
      ...new Map(
        history.map((version) => [JSON.stringify(version), version]),
      ).values(),
    ].filter(
      (version) =>
        !isStoredRecord(version) ||
        textValue(version.title) !== title ||
        textValue(version.note) !== note,
    );
    return {
      ...fields,
      tagIds,
      noteHistory: versions.length ? versions : fields.noteHistory,
    };
  });
}

export function readDataDocument(doc: DataDocument) {
  const versions = Automerge.getConflicts(doc, 'version');
  for (const version of Object.values(versions ?? {})) checkedVersion(version);
  checkedVersion(doc.version);
  if (!isRecord(doc.settings))
    throw new UnsupportedDataError('invalid settings');
  const data = parseData(
    JSON.stringify({
      version: 1,
      tasks: readCollection(doc.tasks),
      projects: readCollection(doc.projects),
      references: readCollection(doc.references),
      referenceItems: readCollection(doc.referenceItems),
      tags: readCollection(doc.tags),
      settings: doc.settings,
    }),
  );
  const projectIds = new Set(data.projects.map(({ id }) => id));
  return {
    ...data,
    tasks: data.tasks.map((task) =>
      task.projectId && !projectIds.has(task.projectId)
        ? { ...task, projectId: null }
        : task,
    ),
  };
}

export function updateDataDocument(
  doc: DataDocument,
  before: AppData,
  after: AppData,
) {
  return Automerge.change(doc, (draft) => {
    for (const key of collections)
      writeCollection(draft[key], before[key], after[key]);
    if (before.settings !== after.settings)
      writeFields(draft.settings, before.settings, after.settings);
  });
}

export function newDataDocument(data: AppData) {
  schema ??= Automerge.change(
    Automerge.init<StoredDocument>(schemaActor),
    { time: 0 },
    (draft) => {
      draft.version = schemaVersion;
      for (const key of collections) draft[key] = {};
      draft.settings = encode(defaultData.settings) as StoredRecord;
    },
  );
  return updateDataDocument(Automerge.clone(schema), defaultData, data);
}

function conflictValues(entry: StoredRecord, key: string) {
  return Object.entries(Automerge.getConflicts(entry, key) ?? {}).filter(
    (pair): pair is [string, string] => typeof pair[1] === 'string',
  );
}

type TextArchive = {
  collection: (typeof collections)[number];
  key: string;
  versions: [string, NoteVersion][];
};

function textArchive(entry: StoredRecord, titleKey: string) {
  const byActor = new Map<string, { id: string; version: NoteVersion }>();
  for (const [field, key] of [
    ['title', titleKey],
    ['note', 'note'],
  ] as const) {
    for (const [operation, value] of conflictValues(entry, key)) {
      const actor = operation.slice(operation.indexOf('@') + 1);
      const current = byActor.get(actor) ?? {
        id: operation,
        version: {
          title: textValue(entry[titleKey]),
          note: textValue(entry.note),
        },
      };
      current.version[field] = value;
      byActor.set(actor, current);
    }
  }
  const history = entry.conflictHistory;
  return [...byActor.values()]
    .filter(({ id }) => !isStoredRecord(history) || !Object.hasOwn(history, id))
    .map(({ id, version }): [string, NoteVersion] => [id, version]);
}

export function archiveTextConflicts(doc: DataDocument) {
  const archives: TextArchive[] = [];
  for (const collection of collections) {
    for (const [key, entry] of Object.entries(doc[collection])) {
      if (entry.note === undefined) continue;
      const versions = textArchive(
        entry,
        entry.name === undefined ? 'title' : 'name',
      );
      if (versions.length) archives.push({ collection, key, versions });
    }
  }
  if (!archives.length) return doc;
  return Automerge.change(doc, (draft) => {
    for (const { collection, key, versions } of archives) {
      const history = draft[collection][key].conflictHistory as StoredRecord;
      for (const [id, version] of versions) history[id] = encode(version);
    }
  });
}

export function loadDataDocument(bytes: Uint8Array) {
  let doc;
  try {
    doc = Automerge.load<StoredDocument>(bytes);
  } catch {
    throw new UnsupportedDataError('invalid Automerge document');
  }
  readDataDocument(doc);
  return doc;
}
