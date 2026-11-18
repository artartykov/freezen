import {
  changeData,
  reorderProjects,
  reorderReferenceItems,
  reorderReferences,
  reorderTasks,
} from '@shared/storage';

export function commitTaskOrder(ids: string[]) {
  changeData((data) => reorderTasks(data, ids));
}

export function commitProjectOrder(ids: string[]) {
  changeData((data) => reorderProjects(data, ids));
}

export function commitReferenceOrder(ids: string[]) {
  changeData((data) => reorderReferences(data, ids));
}

export function commitReferenceItemOrder(ids: string[]) {
  changeData((data) => reorderReferenceItems(data, ids));
}
