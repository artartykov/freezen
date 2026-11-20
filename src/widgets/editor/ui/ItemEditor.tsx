import { Share2, Trash2 } from 'lucide-react';
import { ReferenceItemMark } from '@entities/reference';
import {
  clearTaskDraft,
  isTaskDraftChanged,
  saveTaskDraft,
  updateTaskDraft,
} from '@features/create-task';
import { shareText } from '@features/import-export';
import { useI18n } from '@shared/i18n';
import { askConfirm, useOverlay } from '@shared/model';
import {
  changeData,
  deleteReferenceItems,
  findReference,
  restoreReferenceItems,
  trashReferenceItems,
  updateReferenceItem,
  useData,
} from '@shared/storage';
import type { ReferenceItem } from '@shared/storage';
import { PlaceIcon } from '@shared/ui/PlaceIcon';
import { ActionBarButton, EditorSheet, TrashedActions } from './EditorSheet';
import { Properties } from './Properties';
import { TitleBlock } from './TitleBlock';

export function ItemEditor({
  item,
  isNew,
}: {
  item: ReferenceItem;
  isNew: boolean;
}) {
  const { messages } = useI18n();
  const overlay = useOverlay();
  const data = useData();
  const reference = findReference(data, item.referenceId);

  function change(fields: Partial<ReferenceItem>) {
    if (isNew) updateTaskDraft({ kind: 'item', item: { ...item, ...fields } });
    else changeData((current) => updateReferenceItem(current, item.id, fields));
  }

  function discard() {
    clearTaskDraft();
    overlay.close();
  }

  function close() {
    if (!isNew) {
      overlay.close();
      return;
    }
    if (!isTaskDraftChanged({ kind: 'item', item })) {
      discard();
      return;
    }
    askConfirm({
      title: messages.editor.discardTitle,
      confirm: messages.editor.discard,
      danger: true,
      onConfirm: discard,
    });
  }

  function trash() {
    if (isNew) {
      close();
      return;
    }
    askConfirm({
      title: messages.editor.trashTitle,
      confirm: messages.editor.trash,
      danger: true,
      onConfirm: () => {
        overlay.close();
        changeData((current) => trashReferenceItems(current, [item.id]));
      },
    });
  }

  function restore() {
    overlay.close();
    changeData((current) => restoreReferenceItems(current, [item.id]));
  }

  function deleteForever() {
    askConfirm({
      title: messages.editor.deleteTitle,
      text: messages.editor.deleteText,
      confirm: messages.editor.delete,
      danger: true,
      onConfirm: () => {
        changeData((current) => deleteReferenceItems(current, [item.id]));
        overlay.close();
      },
    });
  }

  return (
    <EditorSheet
      label={messages.reference.itemUntitled}
      isNew={isNew}
      onClose={close}
      onSave={() => {
        saveTaskDraft(
          { kind: 'item', item },
          {
            task: messages.task.untitled,
            item: messages.reference.itemUntitled,
          },
        );
        return () => {
          clearTaskDraft();
          overlay.close();
        };
      }}
      menu={
        isNew
          ? []
          : [
              {
                label: messages.editor.share,
                icon: <Share2 />,
                onSelect: () =>
                  shareText(
                    item.note ? `${item.title}\n${item.note}` : item.title,
                  ),
              },
            ]
      }
      actions={
        item.trashed ? (
          <TrashedActions onRestore={restore} onDelete={deleteForever} />
        ) : (
          <ActionBarButton onClick={trash}>
            <Trash2 aria-hidden="true" />
            {messages.editor.trash}
          </ActionBarButton>
        )
      }
    >
      <TitleBlock
        key={item.id}
        mark={<ReferenceItemMark />}
        title={item.title}
        note={item.note}
        history={item.noteHistory}
        placeholder={messages.reference.itemUntitled}
        autoFocus={isNew}
        onTitle={(title) => change({ title })}
        onNote={(note) => change({ note })}
      />
      {reference && (
        <div className="flex min-h-14 items-center gap-4 border-t border-line pl-4 text-lg">
          <PlaceIcon place="references" />
          {reference.name || messages.reference.untitled}
        </div>
      )}
      <Properties
        names={['tags']}
        values={{ ...item, due: null }}
        onChange={(values) => change({ tagIds: values.tagIds })}
      />
    </EditorSheet>
  );
}
