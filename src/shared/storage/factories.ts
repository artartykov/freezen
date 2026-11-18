import type { Project, Reference, ReferenceItem, Tag, Task } from './document';

export function newId() {
  return crypto.randomUUID();
}

export function createTask(fields: Partial<Task> = {}): Task {
  return {
    id: newId(),
    title: '',
    note: '',
    state: 'inbox',
    starred: false,
    projectId: null,
    tagIds: [],
    due: null,
    start: null,
    waitingFor: '',
    minutes: null,
    energy: null,
    remindAt: null,
    repeat: null,
    completedAt: null,
    logged: false,
    trashed: false,
    ...fields,
  };
}

export function createProject(fields: Partial<Project> = {}): Project {
  return {
    id: newId(),
    name: '',
    note: '',
    state: 'next',
    sequential: false,
    starred: false,
    tagIds: [],
    due: null,
    completedAt: null,
    logged: false,
    trashed: false,
    ...fields,
  };
}

export function createReference(fields: Partial<Reference> = {}): Reference {
  return {
    id: newId(),
    name: '',
    note: '',
    starred: false,
    tagIds: [],
    trashed: false,
    ...fields,
  };
}

export function createReferenceItem(
  fields: Partial<ReferenceItem> & { referenceId: string },
): ReferenceItem {
  return {
    id: newId(),
    title: '',
    note: '',
    starred: false,
    tagIds: [],
    trashed: false,
    ...fields,
  };
}

export function createTag(fields: Partial<Tag> & { name: string }): Tag {
  return { id: newId(), type: 'context', color: 'none', ...fields };
}
