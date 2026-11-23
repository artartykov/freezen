import { ProgressRing } from '@entities/project';
import { useI18n } from '@shared/i18n';
import {
  changeData,
  liveProjects,
  liveReferences,
  moveReferenceItems,
  projectProgress,
  useData,
} from '@shared/storage';
import type { ReferenceItemDestination } from '@shared/storage';
import { DestinationSheet } from '@shared/ui/DestinationSheet';
import type { DestinationSection } from '@shared/ui/DestinationSheet';
import { PlaceIcon } from '@shared/ui/PlaceIcon';

type MoveReferenceItemsSheetProps = {
  itemIds: string[];
  onClose: () => void;
  onMoved?: () => void;
};

export function MoveReferenceItemsSheet({
  itemIds,
  onClose,
  onMoved,
}: MoveReferenceItemsSheetProps) {
  const { messages } = useI18n();
  const data = useData();
  const ids = new Set(itemIds);
  const sourceIds = new Set(
    data.referenceItems
      .filter((item) => ids.has(item.id))
      .map((item) => item.referenceId),
  );
  const projects = liveProjects(data).filter((project) => !project.completedAt);
  const sections: DestinationSection[] = [
    {
      key: 'places',
      destinations: [
        {
          key: 'inbox',
          label: messages.places.inbox.title,
          icon: <PlaceIcon place="inbox" />,
        },
      ],
    },
  ];
  if (projects.length > 0) {
    sections.push({
      key: 'projects',
      title: messages.move.projects,
      destinations: projects.map((project) => ({
        key: `project:${project.id}`,
        label: project.name || messages.project.untitled,
        icon: (
          <ProgressRing
            progress={projectProgress(data, project)}
            done={false}
          />
        ),
      })),
    });
  }
  sections.push(
    {
      key: 'references',
      title: messages.places.references.title,
      destinations: liveReferences(data).map((reference) => ({
        key: `reference:${reference.id}`,
        label: reference.name || messages.reference.untitled,
        icon: <PlaceIcon place="references" />,
      })),
    },
    {
      key: 'trash',
      destinations: [
        {
          key: 'trash',
          label: messages.places.trash.title,
          icon: <PlaceIcon place="trash" />,
        },
      ],
    },
  );
  const sourceId = sourceIds.size === 1 ? [...sourceIds][0] : null;

  return (
    <DestinationSheet
      title={messages.move.title}
      backLabel={messages.common.back}
      current={sourceId ? `reference:${sourceId}` : null}
      sections={sections}
      onSelect={(key) => {
        const destination = toDestination(key);
        changeData((current) =>
          moveReferenceItems(current, itemIds, destination),
        );
        onClose();
        onMoved?.();
      }}
      onClose={onClose}
    />
  );
}

function toDestination(key: string): ReferenceItemDestination {
  if (key === 'inbox' || key === 'trash') return { kind: key };
  if (key.startsWith('project:'))
    return { kind: 'project', projectId: key.slice('project:'.length) };
  return { kind: 'reference', referenceId: key.slice('reference:'.length) };
}
