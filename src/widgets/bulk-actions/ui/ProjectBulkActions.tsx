import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { shareTasks } from '@features/import-export';
import { MoveProjectsSheet, trashProjects } from '@features/move-projects';
import { endSelection, useSelection } from '@features/select-tasks';
import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { SelectionBar } from './SelectionBar';

export function ProjectBulkActions() {
  const { messages } = useI18n();
  const ids = useSelection((state) => state.ids);
  const data = useData();
  const [moving, setMoving] = useState(false);

  if (!ids.length) return null;

  const idSet = new Set(ids);
  const names = data.projects
    .filter((project) => idSet.has(project.id))
    .map((project) => project.name || messages.project.untitled);

  return (
    <SelectionBar
      count={ids.length}
      label={messages.selection.projectsToolbar}
      trashLabel={messages.editor.trash}
      onMove={() => setMoving(true)}
      onTrash={() => trashProjects(ids, messages, endSelection)}
      menu={[
        {
          label: messages.selection.share,
          icon: <Share2 />,
          onSelect: () => shareTasks(names),
        },
      ]}
    >
      {moving && (
        <MoveProjectsSheet
          projectIds={ids}
          onClose={() => setMoving(false)}
          onMoved={endSelection}
        />
      )}
    </SelectionBar>
  );
}
