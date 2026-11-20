import type { AppData, NoteVersion } from './document';

export function sameDocumentValue(a: unknown, b: unknown) {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

type Entry = {
  id: string;
  note?: string;
  title?: string;
  name?: string;
  noteHistory?: NoteVersion[];
};

function textVersion(entry: Entry): NoteVersion {
  return { title: entry.title ?? entry.name ?? '', note: entry.note ?? '' };
}

function mergeFields<T extends object>(
  base: T | undefined,
  local: T,
  remote: T,
): T {
  const merged = { ...remote };
  for (const key of Object.keys(local) as (keyof T)[]) {
    if (!sameDocumentValue(local[key], base?.[key])) merged[key] = local[key];
  }
  return merged;
}

function mergeEntry<T extends Entry>(
  base: T | undefined,
  local: T | undefined,
  remote: T | undefined,
) {
  if (sameDocumentValue(local, base)) return remote;
  if (sameDocumentValue(remote, base) || sameDocumentValue(local, remote))
    return local;
  if (!local || !remote) return local ?? remote;

  const merged = mergeFields(base, local, remote);
  if (local.note === undefined || remote.note === undefined) return merged;

  const previous = textVersion(base ?? { id: local.id });
  const localText = textVersion(local);
  const remoteText = textVersion(remote);
  const main = textVersion(merged);
  const history = [...(local.noteHistory ?? []), ...(remote.noteHistory ?? [])];
  const conflict = (['title', 'note'] as const).some(
    (field) =>
      localText[field] !== remoteText[field] &&
      localText[field] !== previous[field] &&
      remoteText[field] !== previous[field],
  );
  if (conflict) history.push(remoteText, localText);
  const versions = [
    ...new Map(
      history.map((version) => [JSON.stringify(version), version]),
    ).values(),
  ].filter((version) => !sameDocumentValue(version, main));
  if (versions.length) merged.noteHistory = versions;
  else delete merged.noteHistory;
  return merged;
}

function mergeEntries<T extends Entry>(
  base: T[],
  local: T[],
  remote: T[],
): T[] {
  if (sameDocumentValue(local, base)) return remote;
  if (sameDocumentValue(remote, base) || sameDocumentValue(local, remote))
    return local;

  const baseById = new Map(base.map((entry) => [entry.id, entry]));
  const localById = new Map(local.map((entry) => [entry.id, entry]));
  const remoteById = new Map(remote.map((entry) => [entry.id, entry]));
  const originalOrder = base
    .filter((entry) => localById.has(entry.id))
    .map((entry) => entry.id);
  const localOrder = local
    .filter((entry) => baseById.has(entry.id))
    .map((entry) => entry.id);
  const ids = new Set(
    (sameDocumentValue(originalOrder, localOrder)
      ? [...remote, ...local]
      : [...local, ...remote]
    ).map((entry) => entry.id),
  );

  return [...ids].flatMap((id) => {
    const entry = mergeEntry(
      baseById.get(id),
      localById.get(id),
      remoteById.get(id),
    );
    return entry ? [entry] : [];
  });
}

export function reconcileData(
  base: AppData,
  local: AppData,
  remote: AppData,
): AppData {
  const projects = mergeEntries(base.projects, local.projects, remote.projects);
  const references = mergeEntries(
    base.references,
    local.references,
    remote.references,
  );
  const tasks = mergeEntries(base.tasks, local.tasks, remote.tasks);
  const referenceItems = mergeEntries(
    base.referenceItems,
    local.referenceItems,
    remote.referenceItems,
  );
  const projectIds = new Set(projects.map((project) => project.id));
  const referencesById = new Map(
    references.map((reference) => [reference.id, reference]),
  );

  for (const item of referenceItems) {
    if (referencesById.has(item.referenceId)) continue;
    const parent = [
      ...local.references,
      ...remote.references,
      ...base.references,
    ].find((reference) => reference.id === item.referenceId);
    if (parent) referencesById.set(parent.id, parent);
  }

  return {
    tasks: tasks.map((task) =>
      task.projectId && !projectIds.has(task.projectId)
        ? { ...task, projectId: null }
        : task,
    ),
    projects,
    references: [...referencesById.values()],
    referenceItems,
    tags: mergeEntries(base.tags, local.tags, remote.tags),
    settings: mergeFields(base.settings, local.settings, remote.settings),
  };
}
