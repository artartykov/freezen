import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { shareTasks } from '@features/import-export';
import {
  MoveReferencesSheet,
  trashReferences,
} from '@features/move-references';
import { endSelection, useSelection } from '@features/select-tasks';
import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { SelectionBar } from './SelectionBar';

export function ReferenceBulkActions() {
  const { messages } = useI18n();
  const ids = useSelection((state) => state.ids);
  const data = useData();
  const [moving, setMoving] = useState(false);

  if (!ids.length) return null;

  const idSet = new Set(ids);
  const names = data.references
    .filter((reference) => idSet.has(reference.id))
    .map((reference) => reference.name || messages.reference.untitled);

  return (
    <SelectionBar
      count={ids.length}
      label={messages.selection.listsToolbar}
      trashLabel={messages.editor.trash}
      onMove={() => setMoving(true)}
      onTrash={() => trashReferences(ids, messages, endSelection)}
      menu={[
        {
          label: messages.selection.share,
          icon: <Share2 />,
          onSelect: () => shareTasks(names),
        },
      ]}
    >
      {moving && (
        <MoveReferencesSheet
          referenceIds={ids}
          onClose={() => setMoving(false)}
          onMoved={endSelection}
        />
      )}
    </SelectionBar>
  );
}
