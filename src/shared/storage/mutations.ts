import { addDays, nextIsoDate, nextTimestamp, todayIso } from '@shared/lib';
import type {
  AppData,
  Project,
  ProjectState,
  Reference,
  ReferenceItem,
  Settings,
  Tag,
  Repeat,
  Task,
  TaskState,
} from './document';
import {
  createProject,
  createReference,
  createReferenceItem,
  createTask,
  newId,
} from './factories';
import { isInTrashedProject, liveReferences, projectTasks } from './queries';

export type Destination =
  | { kind: 'inbox' }
  | { kind: 'focus' }
  | {
      kind: 'state';
      state: Exclude<TaskState, 'inbox'>;
      waitingContactId?: string | null;
    }
  | { kind: 'project'; projectId: string }
  | { kind: 'trash' };

function now() {
  return new Date().toISOString();
}

function mapTasks(
  data: AppData,
  ids: string[],
  change: (task: Task) => Task,
): AppData {
  const idSet = new Set(ids);
  return {
    ...data,
    tasks: data.tasks.map((task) => (idSet.has(task.id) ? change(task) : task)),
  };
}

export function addTask(data: AppData, task: Task): AppData {
  const tasks =
    data.settings.newTasks === 'bottom'
      ? [...data.tasks, task]
      : [task, ...data.tasks];
  return { ...data, tasks };
}

export function updateTask(
  data: AppData,
  id: string,
  fields: Partial<Task>,
): AppData {
  return mapTasks(data, [id], (task) => ({ ...task, ...fields }));
}

function repeatTask(task: Task, repeat: Repeat, moment: Date): Task {
  const today = todayIso();
  return {
    ...task,
    id: newId(),
    due: task.due ? nextIsoDate(task.due, repeat, today) : null,
    start: task.start ? nextIsoDate(task.start, repeat, today) : null,
    remindAt: task.remindAt
      ? nextTimestamp(task.remindAt, repeat, moment)
      : null,
    completedAt: null,
    logged: false,
    trashed: false,
  };
}

function completeTasks(
  data: AppData,
  ids: string[],
  repeating: boolean,
): AppData {
  const logImmediately = data.settings.logCompleted === 'immediately';
  const idSet = new Set(ids);
  const moment = new Date();
  const completedAt = moment.toISOString();
  return {
    ...data,
    tasks: data.tasks.flatMap((task) => {
      if (!idSet.has(task.id)) return [task];
      const done: Task = {
        ...task,
        completedAt: task.completedAt ?? completedAt,
        logged: task.logged || (logImmediately && !task.trashed),
      };
      if (!repeating || !task.repeat || task.completedAt || task.trashed)
        return [done];
      return [done, repeatTask(task, task.repeat, moment)];
    }),
  };
}

export function setTasksCompleted(
  data: AppData,
  ids: string[],
  completed: boolean,
): AppData {
  if (completed) return completeTasks(data, ids, true);
  return mapTasks(data, ids, (task) => ({
    ...task,
    completedAt: null,
    logged: false,
  }));
}

export function setTasksStarred(
  data: AppData,
  ids: string[],
  starred: boolean,
): AppData {
  return mapTasks(data, ids, (task) => ({ ...task, starred }));
}

export function setTasksDue(
  data: AppData,
  ids: string[],
  due: string | null,
): AppData {
  return mapTasks(data, ids, (task) => ({ ...task, due }));
}

export function setTasksTags(
  data: AppData,
  ids: string[],
  added: string[],
  removed: string[],
): AppData {
  const removedSet = new Set(removed);
  return mapTasks(data, ids, (task) => ({
    ...task,
    tagIds: [
      ...new Set([
        ...task.tagIds.filter((id) => !removedSet.has(id)),
        ...added,
      ]),
    ],
  }));
}

export function moveTasks(
  data: AppData,
  ids: string[],
  destination: Destination,
): AppData {
  return mapTasks(data, ids, (current) => moveTask(current, destination));
}

export function moveTask(current: Task, destination: Destination): Task {
  const task: Task =
    current.logged || current.trashed
      ? {
          ...current,
          logged: false,
          trashed: false,
          completedAt: current.logged ? null : current.completedAt,
        }
      : current;
  switch (destination.kind) {
    case 'trash':
      return { ...current, trashed: true, starred: false };
    case 'inbox':
      return { ...task, state: 'inbox', projectId: null, starred: false };
    case 'focus':
      return {
        ...task,
        starred: true,
        state: task.state === 'inbox' ? 'next' : task.state,
      };
    case 'project':
      return {
        ...task,
        projectId: destination.projectId,
        starred: false,
        state: task.state === 'inbox' ? 'next' : task.state,
      };
    case 'state':
      return {
        ...task,
        state: destination.state,
        ...(destination.state === 'waiting' &&
        destination.waitingContactId !== undefined
          ? { waitingContactId: destination.waitingContactId, waitingFor: '' }
          : {}),
        starred: false,
        start:
          destination.state === 'scheduled'
            ? (task.start ?? addDays(todayIso(), 1))
            : task.start,
      };
  }
}

export function deleteTasks(data: AppData, ids: string[]): AppData {
  const idSet = new Set(ids);
  return {
    ...data,
    tasks: data.tasks.filter((task) => !idSet.has(task.id)),
  };
}

export function emptyTrash(data: AppData): AppData {
  const trashedProjectIds = new Set(
    data.projects
      .filter((project) => project.trashed)
      .map((project) => project.id),
  );
  const trashedListIds = new Set(
    data.references
      .filter((reference) => reference.trashed)
      .map((reference) => reference.id),
  );
  return {
    ...data,
    tasks: data.tasks.filter(
      (task) =>
        !task.trashed &&
        !(task.projectId && trashedProjectIds.has(task.projectId)),
    ),
    projects: data.projects.filter((project) => !project.trashed),
    references: data.references.filter((reference) => !reference.trashed),
    referenceItems: data.referenceItems.filter(
      (item) => !item.trashed && !trashedListIds.has(item.referenceId),
    ),
  };
}

export function logTasks(data: AppData, ids: string[]): AppData {
  return mapTasks(data, ids, (task) =>
    task.completedAt ? { ...task, logged: true } : task,
  );
}

export function logAllCompleted(data: AppData): AppData {
  return {
    ...data,
    tasks: data.tasks.map((task) =>
      task.completedAt && !task.trashed && !isInTrashedProject(data, task)
        ? { ...task, logged: true }
        : task,
    ),
    projects: data.projects.map((project) =>
      project.completedAt && !project.trashed
        ? { ...project, logged: true }
        : project,
    ),
  };
}

export function restoreTask(data: AppData, id: string): AppData {
  return mapTasks(data, [id], (task) => ({
    ...task,
    completedAt: null,
    logged: false,
    state: 'inbox',
    projectId: null,
  }));
}

export function addProject(data: AppData, project: Project): AppData {
  return { ...data, projects: [...data.projects, project] };
}

export function updateProject(
  data: AppData,
  id: string,
  fields: Partial<Project>,
): AppData {
  return {
    ...data,
    projects: data.projects.map((project) =>
      project.id === id ? { ...project, ...fields } : project,
    ),
  };
}

export function setProjectCompleted(
  data: AppData,
  id: string,
  completed: boolean,
): AppData {
  const logImmediately = data.settings.logCompleted === 'immediately';
  const ids = projectTasks(data, id)
    .filter((task) => (completed ? !task.completedAt : true))
    .map((task) => task.id);
  const withTasks = completed ? completeTasks(data, ids, false) : data;
  return updateProject(withTasks, id, {
    completedAt: completed ? now() : null,
    logged: completed && logImmediately,
  });
}

export function trashProject(data: AppData, id: string): AppData {
  return updateProject(data, id, { trashed: true, starred: false });
}

export function restoreProject(data: AppData, id: string): AppData {
  return updateProject(data, id, { trashed: false });
}

export function deleteProject(data: AppData, id: string): AppData {
  return {
    ...data,
    projects: data.projects.filter((project) => project.id !== id),
    tasks: data.tasks.filter((task) => task.projectId !== id),
  };
}

export function addReference(data: AppData, reference: Reference): AppData {
  return { ...data, references: [...data.references, reference] };
}

export function updateReference(
  data: AppData,
  id: string,
  fields: Partial<Reference>,
): AppData {
  return {
    ...data,
    references: data.references.map((reference) =>
      reference.id === id ? { ...reference, ...fields } : reference,
    ),
  };
}

export function trashReference(data: AppData, id: string): AppData {
  return updateReference(data, id, { trashed: true, starred: false });
}

export function restoreReference(data: AppData, id: string): AppData {
  return updateReference(data, id, { trashed: false });
}

export function deleteReference(data: AppData, id: string): AppData {
  return {
    ...data,
    references: data.references.filter((reference) => reference.id !== id),
    referenceItems: data.referenceItems.filter(
      (item) => item.referenceId !== id,
    ),
  };
}

export function addReferenceItem(data: AppData, item: ReferenceItem): AppData {
  return { ...data, referenceItems: [...data.referenceItems, item] };
}

export function updateReferenceItem(
  data: AppData,
  id: string,
  fields: Partial<ReferenceItem>,
): AppData {
  return {
    ...data,
    referenceItems: data.referenceItems.map((item) =>
      item.id === id ? { ...item, ...fields } : item,
    ),
  };
}

function mapReferenceItems(
  data: AppData,
  ids: string[],
  change: (item: ReferenceItem) => ReferenceItem,
): AppData {
  const idSet = new Set(ids);
  return {
    ...data,
    referenceItems: data.referenceItems.map((item) =>
      idSet.has(item.id) ? change(item) : item,
    ),
  };
}

export function trashReferenceItems(data: AppData, ids: string[]): AppData {
  return mapReferenceItems(data, ids, (item) => ({
    ...item,
    trashed: true,
    starred: false,
  }));
}

export function restoreReferenceItems(data: AppData, ids: string[]): AppData {
  return mapReferenceItems(data, ids, (item) => ({ ...item, trashed: false }));
}

export function deleteReferenceItems(data: AppData, ids: string[]): AppData {
  const idSet = new Set(ids);
  return {
    ...data,
    referenceItems: data.referenceItems.filter((item) => !idSet.has(item.id)),
  };
}

export function addTag(data: AppData, tag: Tag): AppData {
  return {
    ...data,
    tags: [...data.tags, tag].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function updateTag(
  data: AppData,
  id: string,
  fields: Partial<Tag>,
): AppData {
  return {
    ...data,
    tasks:
      fields.type && fields.type !== 'contact'
        ? data.tasks.map((task) =>
            task.waitingContactId === id
              ? { ...task, waitingContactId: null }
              : task,
          )
        : data.tasks,
    tags: data.tags
      .map((tag) => (tag.id === id ? { ...tag, ...fields } : tag))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function deleteTag(data: AppData, id: string): AppData {
  const without = (tagIds: string[]) => tagIds.filter((tagId) => tagId !== id);
  return {
    ...data,
    tags: data.tags.filter((tag) => tag.id !== id),
    tasks: data.tasks.map((task) => ({
      ...task,
      tagIds: without(task.tagIds),
      ...(task.waitingContactId === id ? { waitingContactId: null } : {}),
    })),
    projects: data.projects.map((project) => ({
      ...project,
      tagIds: without(project.tagIds),
    })),
    references: data.references.map((reference) => ({
      ...reference,
      tagIds: without(reference.tagIds),
    })),
    referenceItems: data.referenceItems.map((item) => ({
      ...item,
      tagIds: without(item.tagIds),
    })),
  };
}

function reorder<T extends { id: string }>(
  list: T[],
  orderedIds: string[],
): T[] {
  const byId = new Map(list.map((entry) => [entry.id, entry]));
  const moved = orderedIds
    .map((id) => byId.get(id))
    .filter((entry): entry is T => !!entry);
  const movedIds = new Set(moved.map((entry) => entry.id));
  let next = 0;
  return list.map((entry) => (movedIds.has(entry.id) ? moved[next++] : entry));
}

export function reorderTasks(data: AppData, orderedIds: string[]): AppData {
  return { ...data, tasks: reorder(data.tasks, orderedIds) };
}

export function reorderProjects(data: AppData, orderedIds: string[]): AppData {
  return { ...data, projects: reorder(data.projects, orderedIds) };
}

export function reorderReferences(
  data: AppData,
  orderedIds: string[],
): AppData {
  return { ...data, references: reorder(data.references, orderedIds) };
}

export function reorderReferenceItems(
  data: AppData,
  orderedIds: string[],
): AppData {
  return { ...data, referenceItems: reorder(data.referenceItems, orderedIds) };
}

export function convertTaskToProject(data: AppData, taskId: string) {
  const task = data.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return { data, projectId: null };
  const project = createProject({
    name: task.title,
    note: task.note,
    noteHistory: task.noteHistory,
    tagIds: task.tagIds,
    due: task.due,
  });
  return {
    data: addProject(deleteTasks(data, [taskId]), project),
    projectId: project.id,
  };
}

export function convertProjectToReference(data: AppData, projectId: string) {
  const project = data.projects.find((candidate) => candidate.id === projectId);
  if (!project) return { data, referenceId: null };
  const reference = createReference({
    name: project.name,
    note: project.note,
    noteHistory: project.noteHistory,
    tagIds: project.tagIds,
    starred: project.starred,
    trashed: project.trashed,
  });
  const items = projectTasks(data, projectId).map((task) =>
    createReferenceItem({
      referenceId: reference.id,
      title: task.title,
      note: task.note,
      noteHistory: task.noteHistory,
      tagIds: task.tagIds,
    }),
  );
  const withoutProject: AppData = {
    ...data,
    projects: data.projects.filter((candidate) => candidate.id !== projectId),
    tasks: data.tasks.flatMap((task) => {
      if (task.projectId !== projectId) return [task];
      return task.trashed ? [{ ...task, projectId: null }] : [];
    }),
  };
  return {
    data: {
      ...addReference(withoutProject, reference),
      referenceItems: [...withoutProject.referenceItems, ...items],
    },
    referenceId: reference.id,
  };
}

export function convertReferenceToProject(
  data: AppData,
  referenceId: string,
  state: ProjectState = 'next',
) {
  const reference = data.references.find(
    (candidate) => candidate.id === referenceId,
  );
  if (!reference) return { data, projectId: null };
  const project = createProject({
    name: reference.name,
    note: reference.note,
    noteHistory: reference.noteHistory,
    tagIds: reference.tagIds,
    starred: reference.starred,
    trashed: reference.trashed,
    state,
  });
  const tasks = data.referenceItems
    .filter((item) => item.referenceId === referenceId)
    .map((item) =>
      createTask({
        title: item.title,
        note: item.note,
        noteHistory: item.noteHistory,
        tagIds: item.tagIds,
        state: 'next',
        projectId: project.id,
        trashed: item.trashed,
      }),
    );
  const withoutReference = deleteReference(data, referenceId);
  return {
    data: {
      ...addProject(withoutReference, project),
      tasks: [...withoutReference.tasks, ...tasks],
    },
    projectId: project.id,
  };
}

export function updateSettings(
  data: AppData,
  fields: Partial<Settings>,
): AppData {
  return { ...data, settings: { ...data.settings, ...fields } };
}

export function disableLater(data: AppData): AppData {
  return updateSettings(
    {
      ...data,
      tasks: data.tasks.map((task) =>
        task.state === 'later' ? { ...task, state: 'someday' } : task,
      ),
      projects: data.projects.map((project) =>
        project.state === 'later' ? { ...project, state: 'someday' } : project,
      ),
    },
    { showLater: false },
  );
}

export function disableWaiting(data: AppData): AppData {
  return updateSettings(
    {
      ...data,
      tasks: data.tasks.map((task) =>
        task.state === 'waiting' ? { ...task, state: 'next' } : task,
      ),
      projects: data.projects.map((project) =>
        project.state === 'waiting' ? { ...project, state: 'next' } : project,
      ),
    },
    { showWaiting: false },
  );
}

export function disableReference(data: AppData): AppData {
  const converted = liveReferences(data).reduce(
    (current, reference) =>
      convertReferenceToProject(current, reference.id, 'someday').data,
    data,
  );
  return updateSettings(converted, { showReference: false });
}
