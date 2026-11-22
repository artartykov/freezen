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
    let previous = oldEntries.get(entry.id);
    oldEntries.delete(entry.id);
    if (!Object.hasOwn(target, key)) {
      target[key] = { conflictHistory: {} };
      previous = undefined;
    }

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

function mergedTagTarget(key: string, entry: StoredRecord) {
  const target = textValue(entry.mergedInto);
  return target && recordKey(target) < key ? target : undefined;
}

function readCollection(collection: StoredCollection, hideMergedTags = false) {
  if (!isRecord(collection)) throw new UnsupportedDataError('invalid entries');
  const entries = Object.entries(collection);
  for (const [key, entry] of entries) {
    if (!isRecord(entry) || recordKey(textValue(entry.id)) !== key)
      throw new UnsupportedDataError('invalid entry id');
    orderOf(entry);
  }
  const visible = hideMergedTags
    ? entries.filter(([key, entry]) => !mergedTagTarget(key, entry))
    : entries;
  return visible.sort(byPosition).map(([, entry]) => {
    const { conflictHistory, ...fields } = entry;
    delete fields.position;
    delete fields.mergedInto;
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
  const references = readCollection(doc.references);
  const referenceItems = readCollection(doc.referenceItems);
  const recoveredReferences = recoverReferences(doc);
  const data = parseData(
    JSON.stringify({
      version: 1,
      tasks: readCollection(doc.tasks),
      projects: readCollection(doc.projects),
      references: [...references, ...readCollection(recoveredReferences)],
      referenceItems,
      tags: readCollection(doc.tags, true),
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

function recoverReferences(doc: DataDocument): StoredCollection {
  const missing = new Set(
    Object.values(doc.referenceItems)
      .map((item) => recordKey(textValue(item.referenceId)))
      .filter((key) => !Object.hasOwn(doc.references, key)),
  );
  if (!missing.size) return {};

  const collection = Automerge.getObjectId(doc.references);
  const deletions = Automerge.getAllChanges(doc)
    .map(Automerge.decodeChange)
    .filter(({ ops }) =>
      ops.some(
        ({ action, obj, key }) =>
          action === 'del' && obj === collection && missing.has(key),
      ),
    )
    .sort((a, b) => b.startOp - a.startOp || a.hash.localeCompare(b.hash));
  const recovered: StoredCollection = {};
  for (const { ops, deps } of deletions) {
    const before = Automerge.view(doc, deps);
    for (const { action, obj, key } of ops) {
      if (action !== 'del' || obj !== collection || !missing.has(key)) continue;
      const parent = before.references[key];
      if (parent === undefined) continue;
      recovered[key] = parent;
      missing.delete(key);
    }
    if (!missing.size) break;
  }
  return recovered;
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

export function mergeDuplicateTags(doc: DataDocument, data: AppData) {
  const tagsByName = new Map<string, string>();
  const aliases = new Map<string, string>();
  for (const [key, entry] of Object.entries(doc.tags)) {
    const target = mergedTagTarget(key, entry);
    if (target !== undefined) aliases.set(key.slice(3), target);
  }

  const duplicates = new Map<string, string>();
  const tagsById = new Map(data.tags.map((tag) => [tag.id, tag]));
  const ordered = [...data.tags].sort((a, b) =>
    a.id < b.id ? -1 : Number(a.id > b.id),
  );
  for (const { id, name: tagName } of ordered) {
    const name = tagName.trim().toLowerCase();
    const target = tagsByName.get(name);
    if (target === undefined) tagsByName.set(name, id);
    else {
      duplicates.set(id, target);
      aliases.set(id, target);
    }
  }
  if (!aliases.size) return doc;

  function resolveTagId(id: string) {
    let target = id;
    for (
      let next = aliases.get(target);
      next !== undefined;
      next = aliases.get(target)
    )
      target = next;
    return target === id || tagsById.has(target) ? target : null;
  }

  function remapTags<T extends { tagIds: string[] }>(entry: T): T {
    if (!entry.tagIds.some((id) => aliases.has(id))) return entry;
    const tagIds = entry.tagIds.map(resolveTagId).filter((id) => id !== null);
    return { ...entry, tagIds: [...new Set(tagIds)] };
  }

  function remapEntries<T>(entries: T[], remap: (entry: T) => T) {
    const mapped = entries.map(remap);
    return mapped.some((entry, index) => entry !== entries[index])
      ? mapped
      : entries;
  }

  const updated = updateDataDocument(doc, data, {
    ...data,
    tasks: remapEntries(data.tasks, (task) => {
      const entry = remapTags(task);
      if (!entry.waitingContactId || !aliases.has(entry.waitingContactId))
        return entry;
      const id = resolveTagId(entry.waitingContactId);
      const tag = id === null ? undefined : tagsById.get(id);
      if (tag?.type === 'contact') return { ...entry, waitingContactId: id };
      return {
        ...entry,
        waitingContactId: null,
        waitingFor: tag?.name ?? entry.waitingFor,
      };
    }),
    projects: remapEntries(data.projects, remapTags),
    references: remapEntries(data.references, remapTags),
    referenceItems: remapEntries(data.referenceItems, remapTags),
  });
  if (!duplicates.size) return updated;
  return Automerge.change(updated, (draft) => {
    for (const [id, target] of duplicates) {
      draft.tags[recordKey(id)].mergedInto = encode(target);
    }
  });
}

export function newDataDocument(data: AppData) {
  schema ??= Automerge.change(
    Automerge.init<StoredDocument>(schemaActor),
    { time: 0 },
    (draft) => {
      draft.version = schemaVersion;
      for (const key of collections) draft[key] = {};
      const settings = encode(defaultData.settings) as StoredRecord;
      delete settings.trashRetention;
      draft.settings = settings;
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
  const byActor = new Map<
    string,
    { operations: string[]; version: NoteVersion }
  >();
  for (const [field, key] of [
    ['title', titleKey],
    ['note', 'note'],
  ] as const) {
    for (const [operation, value] of conflictValues(entry, key)) {
      const actor = operation.slice(operation.indexOf('@') + 1);
      const current = byActor.get(actor) ?? {
        operations: [],
        version: {
          title: textValue(entry[titleKey]),
          note: textValue(entry.note),
        },
      };
      current.operations.push(operation);
      current.version[field] = value;
      byActor.set(actor, current);
    }
  }
  const history = entry.conflictHistory;
  return [...byActor.values()]
    .map(({ operations, version }): [string, NoteVersion] => [
      operations.join(':'),
      version,
    ])
    .filter(([id]) => !isStoredRecord(history) || !Object.hasOwn(history, id));
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
