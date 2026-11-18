import { formatDate } from '@shared/i18n';
import type { Messages } from '@shared/i18n';
import { addDays, dayOfTimestamp } from '@shared/lib';
import type { GroupMode } from '@shared/model';
import { findProject } from '@shared/storage';
import type { AppData, Task, TaskState } from '@shared/storage';
import type { ListGroup, ListItem } from './types';

const states: TaskState[] = [
  'inbox',
  'next',
  'later',
  'scheduled',
  'someday',
  'waiting',
];

export type BuildContext = {
  data: AppData;
  messages: Messages;
  locale: string;
  today: string;
};

export function taskItem(
  task: Task,
  context: BuildContext,
  withProject = false,
): ListItem {
  const { data, messages, locale, today } = context;
  let subtitle: string | undefined;
  if (task.logged) {
    subtitle = messages.task.completedOn(
      formatDate(
        task.completedAt ? dayOfTimestamp(task.completedAt) : today,
        locale,
      ),
    );
  } else if (!task.completedAt && task.state === 'scheduled') {
    subtitle = messages.task.scheduledFor(
      formatDate(task.start ?? addDays(today, 1), locale),
    );
  } else if (!task.completedAt && task.state === 'waiting') {
    subtitle = messages.task.waitingFor(
      task.waitingFor || messages.task.someone,
    );
  }
  const project = withProject ? findProject(data, task.projectId) : undefined;
  return { kind: 'task', task, subtitle, context: project?.name };
}

export function splitDone(tasks: Task[], data: AppData, always = false) {
  if (!always && data.settings.onCompletion !== 'move')
    return { open: tasks, done: [] };
  return {
    open: tasks.filter((task) => !task.completedAt),
    done: tasks
      .filter((task) => task.completedAt)
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
  };
}

export function groupTasks(
  key: string,
  tasks: Task[],
  mode: GroupMode,
  context: BuildContext,
  options: { nextUp?: boolean; withProject?: boolean } = {},
): ListGroup[] {
  const { data, messages } = context;
  const item = (task: Task) => taskItem(task, context, options.withProject);

  if (mode === 'project') {
    const projectIds = new Set(
      tasks.map((task) => task.projectId).filter((id): id is string => !!id),
    );
    return [
      {
        key: `${key}:none`,
        items: tasks.filter((task) => !task.projectId).map(item),
      },
      ...data.projects
        .filter((project) => projectIds.has(project.id))
        .map((project) => ({
          key: `${key}:project:${project.id}`,
          title: project.name || messages.project.untitled,
          projectId: project.id,
          items: tasks
            .filter((task) => task.projectId === project.id)
            .map(item),
        })),
    ];
  }

  if (mode === 'sequential') {
    return [
      {
        key: `${key}:standalone`,
        title: messages.view.standalone,
        items: tasks.filter((task) => !task.projectId).map(item),
      },
      {
        key: `${key}:projectActions`,
        title: messages.view.projectActions,
        items: tasks
          .filter((task) => task.projectId)
          .map((task) => taskItem(task, context, true)),
      },
    ];
  }

  if (mode === 'state') {
    return states.map((state) => ({
      key: `${key}:state:${state}`,
      title:
        state === 'next' && options.nextUp
          ? messages.list.nextUp
          : messages.places[state].title,
      items: tasks.filter((task) => task.state === state).map(item),
    }));
  }

  return [{ key, items: tasks.map(item) }];
}
