import { useState } from 'react';
import { TagIcon } from '@entities/tag';
import { useI18n } from '@shared/i18n';
import type { Messages } from '@shared/i18n';
import {
  addTag,
  changeData,
  createTag,
  tagTypeOrder,
  updateTag,
  useData,
} from '@shared/storage';
import type { Tag, TagColor, TagType } from '@shared/storage';
import { OptionList } from '@shared/ui/OptionList';
import { SaveButton } from '@shared/ui/SaveButton';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import { ColorSwatches } from './ColorSwatches';
import { DeleteTagButton } from './DeleteTagButton';

type TagFormSheetProps = {
  tag?: Tag;
  contactsOnly?: boolean;
  initialName?: string;
  onClose: () => void;
};

export function TagFormSheet({
  tag,
  contactsOnly,
  initialName = '',
  onClose,
}: TagFormSheetProps) {
  const { messages } = useI18n();
  const tags = useData((data) => data.tags);
  const [name, setName] = useState(tag?.name ?? initialName);
  const [type, setType] = useState<TagType>(
    tag?.type ?? (contactsOnly ? 'contact' : 'context'),
  );
  const [color, setColor] = useState<TagColor>(tag?.color ?? 'none');
  const trimmed = name.trim();
  const duplicate =
    trimmed !== '' &&
    tags.some(
      (other) =>
        other.id !== tag?.id &&
        other.name.toLowerCase() === trimmed.toLowerCase(),
    );
  const changed =
    !tag || trimmed !== tag.name || type !== tag.type || color !== tag.color;
  const canSave = trimmed !== '' && !duplicate && changed;
  const title = tagFormTitle(messages, Boolean(contactsOnly), Boolean(tag));

  function save() {
    if (!canSave) return;
    const fields = { name: trimmed, type, color };
    changeData((data) =>
      tag ? updateTag(data, tag.id, fields) : addTag(data, createTag(fields)),
    );
    onClose();
  }

  return (
    <Sheet label={title} onClose={onClose}>
      <SheetHeader
        title={title}
        onBack={onClose}
        backLabel={messages.common.back}
        end={
          <SaveButton disabled={!canSave} onClick={save}>
            {messages.common.save}
          </SaveButton>
        }
      />
      <SheetBody>
        <input
          data-autofocus={!tag || undefined}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              save();
            }
          }}
          placeholder={messages.tags.name}
          aria-label={messages.tags.nameLabel}
          maxLength={40}
          autoComplete="off"
          className="mt-2 mb-1 block min-h-13 w-full rounded-[14px] border-0 bg-surface px-4 text-[17px] outline-0 focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]"
        />
        {duplicate && (
          <p role="alert" className="mx-2 mt-1 text-sm text-danger">
            {messages.tags.exists}
          </p>
        )}
        {!contactsOnly && (
          <>
            <p className="mx-2 mt-5.5 mb-1.5 font-medium text-muted">
              {messages.tags.type}
            </p>
            <OptionList
              label={messages.tags.type}
              value={type}
              onChange={setType}
              options={tagTypeOrder.map((option) => ({
                value: option,
                label: messages.tags.typeNames[option],
                icon: (
                  <TagIcon
                    tag={{ id: '', name: trimmed, type: option, color }}
                  />
                ),
              }))}
            />
          </>
        )}
        <p className="mx-2 mt-5.5 mb-1.5 font-medium text-muted">
          {messages.tags.color}
        </p>
        <ColorSwatches value={color} onChange={setColor} />
        {tag && (
          <DeleteTagButton
            tag={tag}
            contact={contactsOnly}
            onDeleted={onClose}
          />
        )}
      </SheetBody>
    </Sheet>
  );
}

function tagFormTitle(messages: Messages, contact: boolean, editing: boolean) {
  if (contact) {
    return editing ? messages.editor.editContact : messages.editor.newContact;
  }
  return editing ? messages.tags.editTag : messages.tags.newTag;
}
