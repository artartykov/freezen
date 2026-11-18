import { useNavigate } from '@tanstack/react-router';
import { CircleArrowOutUpRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ReferenceMark } from '@entities/reference';
import { saveNewReference } from '@features/create-reference';
import {
  deleteReferenceForever,
  restoreReferenceFromTrash,
} from '@features/move-references';
import { useI18n } from '@shared/i18n';
import { isDraftChanged } from '@shared/lib';
import { askConfirm, useOverlay } from '@shared/model';
import {
  changeData,
  convertReferenceToProject,
  getData,
  trashReference,
  updateReference,
  useData,
} from '@shared/storage';
import type { Reference } from '@shared/storage';
import { ActionBarButton, EditorSheet, TrashedActions } from './EditorSheet';
import { Properties } from './Properties';
import { TitleBlock } from './TitleBlock';

export function ReferenceEditor({
  reference: initial,
  isNew,
}: {
  reference: Reference;
  isNew: boolean;
}) {
  const { messages } = useI18n();
  const overlay = useOverlay();
  const navigate = useNavigate();
  const data = useData();
  const [start] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const reference = isNew
    ? draft
    : (data.references.find((candidate) => candidate.id === initial.id) ??
      initial);

  function change(fields: Partial<Reference>) {
    if (isNew) setDraft({ ...draft, ...fields });
    else
      changeData((current) => updateReference(current, reference.id, fields));
  }

  function save() {
    const referenceId = saveNewReference(draft, messages.reference.untitled);
    void navigate({
      to: '/reference/$referenceId',
      params: { referenceId },
      replace: true,
    });
  }

  function close() {
    if (isNew && isDraftChanged(draft, start, 'name')) {
      askConfirm({
        title: messages.editor.discardTitle,
        confirm: messages.editor.discard,
        danger: true,
        onConfirm: overlay.close,
      });
      return;
    }
    overlay.close();
  }

  return (
    <EditorSheet
      label={messages.reference.edit}
      isNew={isNew}
      onClose={close}
      onSave={save}
      menu={
        isNew || reference.trashed
          ? []
          : [
              {
                label: messages.editor.convertToProject,
                icon: <CircleArrowOutUpRight />,
                onSelect: () =>
                  askConfirm({
                    title: messages.editor.convertReferenceTitle,
                    text: messages.editor.convertReferenceText,
                    confirm: messages.editor.convertToProject,
                    onConfirm: () => {
                      const result = convertReferenceToProject(
                        getData(),
                        reference.id,
                      );
                      changeData(() => result.data);
                      if (result.projectId) {
                        void navigate({
                          to: '/project/$projectId',
                          params: { projectId: result.projectId },
                          replace: true,
                        });
                      }
                    },
                  }),
              },
            ]
      }
      actions={
        reference.trashed ? (
          <TrashedActions
            onRestore={() => {
              restoreReferenceFromTrash(reference.id);
              overlay.close();
            }}
            onDelete={() =>
              deleteReferenceForever(reference.id, messages, overlay.close)
            }
          />
        ) : (
          <ActionBarButton
            onClick={() => {
              if (isNew) {
                close();
                return;
              }
              askConfirm({
                title: messages.editor.trashTitle,
                text: messages.editor.trashReferenceText,
                confirm: messages.editor.trash,
                danger: true,
                onConfirm: () => {
                  void navigate({ to: '/focus', replace: true });
                  changeData((current) =>
                    trashReference(current, reference.id),
                  );
                },
              });
            }}
          >
            <Trash2 aria-hidden="true" />
            {messages.editor.trash}
          </ActionBarButton>
        )
      }
    >
      <TitleBlock
        key={reference.id}
        mark={<ReferenceMark />}
        title={reference.name}
        note={reference.note}
        placeholder={messages.reference.untitled}
        autoFocus={isNew}
        onTitle={(name) => change({ name })}
        onNote={(note) => change({ note })}
      />
      <div className="border-t border-line" />
      <Properties
        names={['tags']}
        values={{ ...reference, due: null }}
        onChange={(values) => change({ tagIds: values.tagIds })}
      />
    </EditorSheet>
  );
}
