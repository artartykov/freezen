import { useI18n } from '@shared/i18n';
import { DestinationSheet } from '@shared/ui/DestinationSheet';
import { PlaceIcon } from '@shared/ui/PlaceIcon';
import { moveReferencesToTrash } from '../model/trash';

type MoveReferencesSheetProps = {
  referenceIds: string[];
  onClose: () => void;
  onMoved?: () => void;
};

export function MoveReferencesSheet({
  referenceIds,
  onClose,
  onMoved,
}: MoveReferencesSheetProps) {
  const { messages } = useI18n();

  return (
    <DestinationSheet
      title={messages.move.title}
      backLabel={messages.common.back}
      current={null}
      sections={[
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
      ]}
      onSelect={() => {
        moveReferencesToTrash(referenceIds);
        onClose();
        onMoved?.();
      }}
      onClose={onClose}
    />
  );
}
