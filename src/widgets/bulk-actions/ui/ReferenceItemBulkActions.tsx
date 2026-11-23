import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { shareTasks } from '@features/import-export';
import { MoveReferenceItemsSheet, trashItems } from '@features/move-references';
import { endSelection, useSelection } from '@features/select-tasks';
import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { SelectionBar } from './SelectionBar';

export function ReferenceItemBulkActions() {
  const { messages } = useI18n();
  const ids = useSelection((state) => state.ids);
  const data = useData();
  const [moving, setMoving] = useState(false);

  if (!ids.length) return null;

  const idSet = new Set(ids);
  const titles = data.referenceItems
    .filter((item) => idSet.has(item.id))
    .map((item) => item.title || messages.reference.itemUntitled);

  return (
    <SelectionBar
      count={ids.length}
      label={messages.selection.itemsToolbar}
      trashLabel={messages.editor.trash}
      onMove={() => setMoving(true)}
      onTrash={() => trashItems(ids, messages, endSelection)}
      menu={[
        {
          label: messages.selection.share,
          icon: <Share2 />,
          onSelect: () => shareTasks(titles),
        },
      ]}
    >
      {moving && (
        <MoveReferenceItemsSheet
          itemIds={ids}
          onClose={() => setMoving(false)}
          onMoved={endSelection}
        />
      )}
    </SelectionBar>
  );
}
