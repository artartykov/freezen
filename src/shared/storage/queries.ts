import { dayOfTimestamp } from '@shared/lib';
import type {
  AppData,
  Project,
  ProjectState,
  Task,
  TaskState,
} from './document';

const inactiveStates: ProjectState[] = [
  'later',
  'scheduled',
  'someday',
  'waiting',
];

export function isLogged(task: Task, data: AppData, today: string) {
  if (task.logged) return true;
  if (!task.completedAt || data.settings.logCompleted !== 'daily') return false;
  return dayOfTimestamp(task.completedAt) < today;
}

export function isProjectLogged(
  project: Project,
  data: AppData,
  today: string,
) {
  if (project.logged) return true;
  if (!project.completedAt || data.settings.logCompleted !== 'daily')
    return false;
  return dayOfTimestamp(project.completedAt) < today;
}

export function isDueLocked(task: Task, today: string) {
  return !!task.due && task.due <= today && !task.trashed && !task.completedAt;
}

export function isInFocus(task: Task, today: string) {
  return task.starred || isDueLocked(task, today);
}

export function isLive(task: Task, data: AppData, today: string) {
  return (
    !task.trashed &&
    !isInTrashedProject(data, task) &&
    !isLogged(task, data, today)
  );
}

export function findProject(data: AppData, id: string | null) {
  return id ? data.projects.find((project) => project.id === id) : undefined;
}

export function liveProjects(data: AppData) {
  return data.projects.filter((project) => !project.trashed);
}

export function trashedProjects(data: AppData) {
  return data.projects.filter((project) => project.trashed);
}

export function isInTrashedProject(data: AppData, task: Task) {
  return !!findProject(data, task.projectId)?.trashed;
}

export function findReference(data: AppData, id: string | null) {
  return id
    ? data.references.find((reference) => reference.id === id)
    : undefined;
}

export function isInactiveProject(data: AppData, id: string | null) {
  const project = findProject(data, id);
  return !!project && inactiveStates.includes(project.state);
}

export function projectTasks(data: AppData, projectId: string) {
  return data.tasks.filter(
    (task) => task.projectId === projectId && !task.trashed,
  );
}

export function projectProgress(data: AppData, project: Project) {
  if (project.completedAt) return 100;
  const tasks = projectTasks(data, project.id);
  if (!tasks.length) return 0;
  const done = tasks.filter((task) => task.completedAt).length;
  return Math.round((done / tasks.length) * 100);
}

export function openTaskCount(data: AppData, projectId: string) {
  return projectTasks(data, projectId).filter((task) => !task.completedAt)
    .length;
}

function firstOpenTask(data: AppData, projectId: string, today: string) {
  return data.tasks.find(
    (task) =>
      task.projectId === projectId &&
      !task.completedAt &&
      isLive(task, data, today),
  );
}

export function stateTasks(data: AppData, state: TaskState, today: string) {
  return data.tasks.filter((task) => {
    if (task.state !== state || !isLive(task, data, today)) return false;
    if (isInactiveProject(data, task.projectId)) return false;
    if (state === 'next' && task.projectId && !task.completedAt) {
      const project = findProject(data, task.projectId);
      if (project?.sequential) {
        return firstOpenTask(data, task.projectId, today)?.id === task.id;
      }
    }
    return true;
  });
}

export function focusTasks(data: AppData, today: string) {
  return data.tasks.filter(
    (task) => isInFocus(task, today) && isLive(task, data, today),
  );
}

export function focusProjects(data: AppData, today: string) {
  return liveProjects(data).filter(
    (project) => project.starred && !isProjectLogged(project, data, today),
  );
}

export function focusCount(
  data: AppData,
  today: string,
  visible: (entity: {
    tagIds: string[];
    projectId?: string | null;
  }) => boolean = () => true,
) {
  return (
    focusTasks(data, today).filter((task) => !task.completedAt && visible(task))
      .length +
    focusProjects(data, today).filter(
      (project) => !project.completedAt && visible(project),
    ).length +
    liveReferences(data).filter(
      (reference) => reference.starred && visible(reference),
    ).length
  );
}

export function inactiveProjects(
  data: AppData,
  state: ProjectState,
  today: string,
) {
  return liveProjects(data).filter(
    (project) =>
      project.state === state &&
      !project.completedAt &&
      !isProjectLogged(project, data, today),
  );
}

export function activeProjects(data: AppData, today: string) {
  return liveProjects(data).filter(
    (project) => !isProjectLogged(project, data, today),
  );
}

export function logbookTasks(data: AppData, today: string) {
  return data.tasks.filter(
    (task) =>
      !task.trashed &&
      !isInTrashedProject(data, task) &&
      isLogged(task, data, today),
  );
}

export function logbookProjects(data: AppData, today: string) {
  return liveProjects(data).filter((project) =>
    isProjectLogged(project, data, today),
  );
}

export function trashedTasks(data: AppData) {
  return data.tasks.filter(
    (task) => task.trashed && !isInTrashedProject(data, task),
  );
}

export function liveReferences(data: AppData) {
  return data.references.filter((reference) => !reference.trashed);
}

export function trashedReferences(data: AppData) {
  return data.references.filter((reference) => reference.trashed);
}

function liveReferenceIds(data: AppData) {
  return new Set(liveReferences(data).map((reference) => reference.id));
}

export function liveReferenceItems(data: AppData) {
  const listIds = liveReferenceIds(data);
  return data.referenceItems.filter(
    (item) => !item.trashed && listIds.has(item.referenceId),
  );
}

export function trashedReferenceItems(data: AppData) {
  const listIds = liveReferenceIds(data);
  return data.referenceItems.filter(
    (item) => item.trashed && listIds.has(item.referenceId),
  );
}

export function trashCount(data: AppData) {
  return (
    trashedTasks(data).length +
    trashedProjects(data).length +
    trashedReferences(data).length +
    trashedReferenceItems(data).length
  );
}

export function referenceItems(data: AppData, referenceId: string) {
  return data.referenceItems.filter(
    (item) => item.referenceId === referenceId && !item.trashed,
  );
}

function matches(words: string[], ...fields: string[]) {
  const haystack = fields.join('\n').toLowerCase();
  return words.every((word) => haystack.includes(word));
}

export function searchWords(query: string) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function tagNames(data: AppData, tagIds: string[]) {
  const idSet = new Set(tagIds);
  return data.tags.filter((tag) => idSet.has(tag.id)).map((tag) => tag.name);
}

export function searchData(data: AppData, query: string, today: string) {
  const words = searchWords(query);
  if (!words.length) {
    return { tasks: [], projects: [], references: [], items: [] };
  }
  return {
    tasks: data.tasks.filter(
      (task) =>
        isLive(task, data, today) &&
        matches(
          words,
          task.title,
          task.note,
          task.waitingFor,
          ...tagNames(data, task.tagIds),
        ),
    ),
    projects: activeProjects(data, today).filter((project) =>
      matches(
        words,
        project.name,
        project.note,
        ...tagNames(data, project.tagIds),
      ),
    ),
    references: liveReferences(data).filter((reference) =>
      matches(
        words,
        reference.name,
        reference.note,
        ...tagNames(data, reference.tagIds),
      ),
    ),
    items: liveReferenceItems(data).filter((item) =>
      matches(words, item.title, item.note, ...tagNames(data, item.tagIds)),
    ),
  };
}

export function openTaskCountWithTag(data: AppData, tagId: string) {
  return data.tasks.filter(
    (task) =>
      !task.completedAt &&
      !task.trashed &&
      !isInTrashedProject(data, task) &&
      task.tagIds.includes(tagId),
  ).length;
}

export function tagUsageCount(data: AppData, tagId: string) {
  return [
    ...data.tasks,
    ...data.projects,
    ...data.references,
    ...data.referenceItems,
  ].filter((entry) => entry.tagIds.includes(tagId)).length;
}

export function isFirstAction(task: Task, data: AppData, today: string) {
  if (!task.projectId) return true;
  if (task.completedAt) return false;
  return firstOpenTask(data, task.projectId, today)?.id === task.id;
}
