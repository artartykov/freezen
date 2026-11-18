import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import type { ProjectState } from '@shared/storage';
import { DestinationSheet } from '@shared/ui/DestinationSheet';
import type { DestinationSection } from '@shared/ui/DestinationSheet';
import { PlaceIcon } from '@shared/ui/PlaceIcon';
import { moveProjects } from '../model/move';
import { moveProjectsToTrash } from '../model/trash';

const states: ProjectState[] = [
  'next',
  'later',
  'scheduled',
  'someday',
  'waiting',
];

type ProjectPlaceSheetProps = {
  current: ProjectState | null;
  onSave: (state: ProjectState) => void;
  onTrash?: () => void;
  onClose: () => void;
};

export function ProjectPlaceSheet({
  current,
  onSave,
  onTrash,
  onClose,
}: ProjectPlaceSheetProps) {
  const { messages } = useI18n();
  const data = useData();
  const shown = states.filter(
    (state) =>
      (state !== 'later' || data.settings.showLater) &&
      (state !== 'waiting' || data.settings.showWaiting),
  );

  function select(choice: string) {
    const state = shown.find((candidate) => candidate === choice);
    if (state) onSave(state);
    else onTrash?.();
  }

  const sections: DestinationSection[] = [
    {
      key: 'places',
      destinations: shown.map((state) => ({
        key: state,
        label: messages.places[state].title,
        icon: <PlaceIcon place={state} />,
      })),
    },
  ];
  if (onTrash) {
    sections.push({
      key: 'trash',
      destinations: [
        {
          key: 'trash',
          label: messages.places.trash.title,
          icon: <PlaceIcon place="trash" />,
        },
      ],
    });
  }

  return (
    <DestinationSheet
      title={messages.move.title}
      backLabel={messages.common.back}
      current={current}
      sections={sections}
      onSelect={select}
      onClose={onClose}
    />
  );
}

type MoveProjectsSheetProps = {
  projectIds: string[];
  onClose: () => void;
  onMoved?: () => void;
  allowTrash?: boolean;
};

export function MoveProjectsSheet({
  projectIds,
  onClose,
  onMoved,
  allowTrash = true,
}: MoveProjectsSheetProps) {
  const data = useData();
  const idSet = new Set(projectIds);
  const current = new Set(
    data.projects
      .filter((project) => idSet.has(project.id))
      .map((project) => project.state),
  );

  function done() {
    onClose();
    onMoved?.();
  }

  return (
    <ProjectPlaceSheet
      current={current.size === 1 ? [...current][0] : null}
      onSave={(state) => {
        moveProjects(projectIds, state);
        done();
      }}
      onTrash={
        allowTrash
          ? () => {
              moveProjectsToTrash(projectIds);
              done();
            }
          : undefined
      }
      onClose={onClose}
    />
  );
}
