import { ProgressRing } from '@entities/project';
import { useI18n } from '@shared/i18n';
import { useUiState } from '@shared/model';
import {
  changeData,
  liveProjects,
  moveTasks,
  projectProgress,
  useData,
  assignArea,
} from '@shared/storage';
import type { AppData, Destination, Task } from '@shared/storage';
import { DestinationSheet } from '@shared/ui/DestinationSheet';
import type { DestinationSection } from '@shared/ui/DestinationSheet';
import { PlaceIcon } from '@shared/ui/PlaceIcon';

type TaskPlaceSheetProps = {
  tasks: Task[];
  onSelect: (destination: Destination) => void;
  onClose: () => void;
  allowTrash?: boolean;
};

type MoveSheetProps = {
  taskIds: string[];
  onClose: () => void;
  onMoved?: () => void;
  allowTrash?: boolean;
};

function destinationKey(task: Task): string {
  if (task.trashed) return 'trash';
  if (task.projectId) return `project:${task.projectId}`;
  if (task.starred) return 'focus';
  return task.state;
}

function toDestination(key: string): Destination {
  if (key === 'inbox' || key === 'focus' || key === 'trash')
    return { kind: key };
  if (key.startsWith('project:'))
    return { kind: 'project', projectId: key.slice(8) };
  return { kind: 'state', state: key as Exclude<Task['state'], 'inbox'> };
}

export function MoveSheet({
  taskIds,
  onClose,
  onMoved,
  allowTrash = true,
}: MoveSheetProps) {
  const data = useData();
  const area = useUiState((state) => state.area);
  const idSet = new Set(taskIds);

  function move(destination: Destination) {
    changeData((state) => {
      const fromInbox = state.tasks
        .filter((task) => idSet.has(task.id) && task.state === 'inbox')
        .map((task) => task.id);
      return assignArea(
        moveTasks(state, taskIds, destination),
        fromInbox,
        area,
      );
    });
    onClose();
    onMoved?.();
  }

  return (
    <TaskPlaceSheet
      tasks={data.tasks.filter((task) => idSet.has(task.id))}
      allowTrash={allowTrash}
      onSelect={move}
      onClose={onClose}
    />
  );
}

export function TaskPlaceSheet({
  tasks,
  onSelect,
  onClose,
  allowTrash = true,
}: TaskPlaceSheetProps) {
  const { messages } = useI18n();
  const data = useData();
  const keys = new Set(tasks.map(destinationKey));
  const current = keys.size === 1 ? [...keys][0] : null;
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

  return (
    <DestinationSheet
      title={messages.move.title}
      backLabel={messages.common.back}
      sections={sections}
      current={current}
      onSelect={(key) => onSelect(toDestination(key))}
      onClose={onClose}
    />
  );
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
