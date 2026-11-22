import { ProgressRing } from '@entities/project';
import { useI18n } from '@shared/i18n';
import { liveProjects, projectProgress, useData } from '@shared/storage';
import type { AppData, Destination, Task } from '@shared/storage';
import type { DestinationSection } from '@shared/ui/DestinationSheet';
import { PlaceIcon } from '@shared/ui/PlaceIcon';

export function destinationKey(task: Task): string {
  if (task.trashed) return 'trash';
  if (task.projectId) return `project:${task.projectId}`;
  return task.state;
}

export function currentTaskDestinations(
  tasks: Task[],
  pendingWaiting: boolean,
) {
  const keys = new Set(tasks.map(destinationKey));
  const current = keys.size === 1 ? [...keys][0] : null;
  if (!current?.startsWith('project:')) {
    return { current: pendingWaiting ? 'waiting' : current };
  }

  const states = new Set(tasks.map((task) => task.state));
  return {
    current,
    additionalCurrent: pendingWaiting
      ? 'waiting'
      : states.size === 1
        ? [...states][0]
        : null,
  };
}

export function toDestination(key: string): Destination {
  if (key === 'inbox' || key === 'trash') return { kind: key };
  if (key.startsWith('project:'))
    return { kind: 'project', projectId: key.slice(8) };
  return { kind: 'state', state: key as Exclude<Task['state'], 'inbox'> };
}

export function useTaskDestinations(allowTrash = false) {
  const { messages } = useI18n();
  const data = useData();
  const projects = liveProjects(data).filter((project) => !project.completedAt);

  function label(key: string) {
    if (key.startsWith('project:')) {
      return (
        data.projects.find((project) => project.id === key.slice(8))?.name ?? ''
      );
    }
    return messages.places[key as keyof typeof messages.places].title;
  }

  const sections: DestinationSection[] = [
    {
      key: 'places',
      destinations: placeKeys(data).map((place) => ({
        key: place,
        label: label(place),
        icon: <PlaceIcon place={place} />,
      })),
    },
  ];
  if (projects.length > 0) {
    sections.push({
      key: 'projects',
      title: messages.move.projects,
      destinations: projects.map((project) => ({
        key: `project:${project.id}`,
        label: project.name,
        icon: (
          <ProgressRing
            progress={projectProgress(data, project)}
            done={false}
          />
        ),
      })),
    });
  }
  if (allowTrash) {
    sections.push({
      key: 'trash',
      destinations: [
        {
          key: 'trash',
          label: label('trash'),
          icon: <PlaceIcon place="trash" />,
        },
      ],
    });
  }

  return sections;
}

function placeKeys(data: AppData) {
  return (
    ['inbox', 'next', 'later', 'scheduled', 'someday', 'waiting'] as const
  ).filter(
    (place) =>
      (place !== 'later' || data.settings.showLater) &&
      (place !== 'waiting' || data.settings.showWaiting),
  );
}
