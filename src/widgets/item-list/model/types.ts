import type { Project, Reference, ReferenceItem, Task } from '@shared/storage';

export type TaskListItem = {
  kind: 'task';
  task: Task;
  subtitle?: string;
  context?: string;
};

export type ListItem =
  | TaskListItem
  | { kind: 'project'; project: Project; subtitle?: string }
  | { kind: 'reference'; reference: Reference }
  | { kind: 'item'; item: ReferenceItem; listName?: string };

export type ListGroup = {
  key: string;
  title?: string;
  projectId?: string;
  defaultCollapsed?: boolean;
  items: ListItem[];
  footer?: string;
};

export function itemKey(item: ListItem) {
  switch (item.kind) {
    case 'task':
      return `task:${item.task.id}`;
    case 'project':
      return `project:${item.project.id}`;
    case 'reference':
      return `reference:${item.reference.id}`;
    case 'item':
      return `item:${item.item.id}`;
  }
}
