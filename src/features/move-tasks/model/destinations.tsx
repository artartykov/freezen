import { ProgressRing } from '@entities/project';
import { useI18n } from '@shared/i18n';
import { liveProjects, projectProgress, useData } from '@shared/storage';
import type { AppData, Destination, Task } from '@shared/storage';
import type { DestinationSection } from '@shared/ui/DestinationSheet';
import { PlaceIcon } from '@shared/ui/PlaceIcon';

export function destinationKey(task: Task): string {
  if (task.trashed) return 'trash';
  if (task.projectId) return `project:${task.projectId}`;
  if (task.starred) return 'focus';
  return task.state;
}

export function toDestination(key: string): Destination {
  if (key === 'inbox' || key === 'focus' || key === 'trash')
    return { kind: key };
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
    [
      'inbox',
      'focus',
      'next',
      'later',
      'scheduled',
      'someday',
      'waiting',
    ] as const
  ).filter(
    (place) =>
      (place !== 'later' || data.settings.showLater) &&
      (place !== 'waiting' || data.settings.showWaiting),
  );
}
