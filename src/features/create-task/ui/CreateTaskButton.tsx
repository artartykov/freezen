import { Plus } from 'lucide-react';
import { useOverlay } from '@shared/model';
import { Fab } from '@shared/ui/Fab';
import { startTaskDraft } from '../model/draft';
import type { DraftDefaults } from '../model/draft';

export function CreateTaskButton({
  defaults = {},
  label,
}: {
  defaults?: DraftDefaults;
  label: string;
}) {
  const overlay = useOverlay();

  return (
    <Fab
      aria-label={label}
      onClick={() => {
        startTaskDraft(defaults);
        overlay.openEditor({ kind: 'new-task' });
      }}
    >
      <Plus strokeWidth={2.5} aria-hidden="true" />
    </Fab>
  );
}
