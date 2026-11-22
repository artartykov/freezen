import {
  CheckSquare,
  Flag,
  History,
  Share2,
  Square,
  Tag as TagShape,
} from 'lucide-react';
import { useState } from 'react';
import { setCompleted } from '@features/complete-task';
import { shareTasks } from '@features/import-export';
import { logSelected } from '@features/log-completed';
import { ManageTagsButton } from '@features/manage-tags';
import { WaitingContactSheet } from '@features/manage-tags';
import { MoveSheet } from '@features/move-tasks';
import { endSelection, useSelection } from '@features/select-tasks';
import { applyTaskDue, DateDialog } from '@features/set-due-date';
import { applyTaskTags, TagSheet } from '@features/set-tags';
import {
  clearTasksFromTrash,
  clearTrashEntries,
  RestoreTrashSheet,
  trashTasks,
} from '@features/trash-tasks';
import { useI18n } from '@shared/i18n';
import { useUiState } from '@shared/model';
import { trashContents, useData } from '@shared/storage';
import { SelectionBar } from './SelectionBar';

type BulkActionsProps = { trash?: boolean; logbook?: boolean };

export function BulkActions({
  trash = false,
  logbook = false,
}: BulkActionsProps) {
  const { messages } = useI18n();
  const ids = useSelection((state) => state.ids);
  const data = useData();
  const clearedTrash = useUiState((state) => state.clearedTrash);
  const [sheet, setSheet] = useState<'move' | 'tags' | 'due' | null>(null);
  const idSet = new Set(ids);
  const tasks = data.tasks.filter((task) => idSet.has(task.id));

  if (!ids.length) return null;

  if (trash && tasks.length !== ids.length) {
    const { projects, references, entries } = trashContents(data, clearedTrash);
    const keys = entries
      .filter(({ id }) => idSet.has(id))
      .map(({ key }) => key);
    const titles = [
      ...tasks.map(({ title }) => title),
      ...projects.filter(({ id }) => idSet.has(id)).map(({ name }) => name),
      ...references.filter(({ id }) => idSet.has(id)).map(({ name }) => name),
    ];

    return (
      <SelectionBar
        count={keys.length}
        label={messages.trash.selectedEntries}
        trashLabel={messages.editor.delete}
        onMove={() => setSheet('move')}
        onTrash={() => clearTrashEntries(keys, messages, endSelection)}
        menu={[
          {
            label: messages.selection.share,
            icon: <Share2 />,
            onSelect: () => shareTasks(titles),
          },
        ]}
      >
        {sheet === 'move' && (
          <RestoreTrashSheet
            ids={ids}
            onClose={() => setSheet(null)}
            onRestored={endSelection}
          />
        )}
      </SelectionBar>
    );
  }

  const commonTags = tasks.length
    ? tasks[0].tagIds.filter((tagId) =>
        tasks.every((task) => task.tagIds.includes(tagId)),
      )
    : [];
  const dues = new Set(tasks.map((task) => task.due));
  const commonDue = dues.size === 1 ? [...dues][0] : null;

  return (
    <SelectionBar
      count={ids.length}
      label={messages.selection.toolbar}
      trashLabel={trash ? messages.editor.delete : messages.editor.trash}
      onMove={() => setSheet('move')}
      onTrash={() =>
        trash
          ? clearTasksFromTrash(ids, messages, endSelection)
          : trashTasks(ids, messages, endSelection)
      }
      menu={[
        {
          label: messages.selection.complete,
          icon: <CheckSquare />,
          onSelect: () => {
            setCompleted(ids, true);
            endSelection();
          },
        },
        {
          label: messages.selection.incomplete,
          icon: <Square />,
          onSelect: () => {
            setCompleted(ids, false);
            endSelection();
          },
        },
        ...(logbook
          ? []
          : [
              {
                label: messages.selection.log,
                icon: <History />,
                onSelect: () => {
                  logSelected(ids);
                  endSelection();
                },
              },
            ]),
        'separator',
        {
          label: messages.selection.setTags,
          icon: <TagShape />,
          onSelect: () => setSheet('tags'),
        },
        {
          label: messages.selection.setDue,
          icon: <Flag />,
          onSelect: () => setSheet('due'),
        },
        'separator',
        {
          label: messages.selection.share,
          icon: <Share2 />,
          onSelect: () => shareTasks(tasks.map((task) => task.title)),
        },
      ]}
    >
      {sheet === 'move' && (
        <MoveSheet
          waitingContactPicker={WaitingContactSheet}
          taskIds={ids}
          onClose={() => setSheet(null)}
          onMoved={endSelection}
        />
      )}
      {sheet === 'tags' && (
        <TagSheet
          extra={<ManageTagsButton />}
          value={commonTags}
          onClose={() => setSheet(null)}
          onSave={(tagIds) => {
            applyTaskTags(ids, commonTags, tagIds);
            setSheet(null);
            endSelection();
          }}
        />
      )}
      {sheet === 'due' && (
        <DateDialog
          title={messages.calendar.dueDate}
          value={commonDue}
          onClose={() => setSheet(null)}
          onSave={(due) => {
            applyTaskDue(ids, due);
            setSheet(null);
            endSelection();
          }}
        />
      )}
    </SelectionBar>
  );
}
