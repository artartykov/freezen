import { Check, EllipsisVertical, Plus, User, X } from 'lucide-react';
import { useState } from 'react';
import { TagIcon, TagSearch } from '@entities/tag';
import { useI18n } from '@shared/i18n';
import { addTag, changeData, createTag, useData } from '@shared/storage';
import { Menu } from '@shared/ui/Menu';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import { ManageTagsSheet } from './ManageTagsSheet';
import { TagFormSheet } from './TagFormSheet';

export function WaitingContactSheet({
  value,
  hasLegacyName,
  onSelect,
  onClose,
}: {
  value?: string | null;
  hasLegacyName?: boolean;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const { messages } = useI18n();
  const text = messages.editor;
  const tags = useData((data) => data.tags);
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<'new' | 'manage' | null>(null);
  const name = query.trim();
  const normalized = name.toLowerCase();
  const contacts = tags.filter(
    (tag) =>
      tag.type === 'contact' && tag.name.toLowerCase().includes(normalized),
  );
  const canCreate =
    name.length > 0 &&
    name.length <= 40 &&
    !tags.some((tag) => tag.name.toLowerCase() === normalized);

  function createFromQuery() {
    if (!canCreate) return;
    const contact = createTag({ name, type: 'contact' });
    changeData((data) => addTag(data, contact));
    onSelect(contact.id);
  }

  return (
    <Sheet label={text.waitingFor} onClose={onClose}>
      <SheetHeader
        title={text.waitingFor}
        onBack={onClose}
        backLabel={messages.common.cancel}
        backIcon={<X aria-hidden="true" />}
        end={
          <div className="relative">
            <Menu
              anchorToContainer
              label={text.manageContacts}
              trigger={<EllipsisVertical aria-hidden="true" />}
              entries={[
                {
                  label: text.newContact,
                  icon: <Plus aria-hidden="true" />,
                  onSelect: () => setPanel('new'),
                },
                {
                  label: text.manageContacts,
                  icon: <User aria-hidden="true" />,
                  onSelect: () => setPanel('manage'),
                },
              ]}
            />
          </div>
        }
      />
      <SheetBody>
        <TagSearch
          label={text.searchContact}
          value={query}
          onChange={setQuery}
          onSubmit={() => {
            const exact = contacts.find(
              (tag) => tag.name.toLowerCase() === normalized,
            );
            if (exact) onSelect(exact.id);
            else createFromQuery();
          }}
        />
        {contacts.map((tag) => (
          <button
            key={tag.id}
            type="button"
            role="checkbox"
            aria-checked={tag.id === value}
            onClick={() => onSelect(tag.id === value ? null : tag.id)}
            className="flex min-h-13 w-full cursor-pointer items-center gap-4 rounded-xl px-3 text-left text-[17px] aria-checked:bg-glow focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
          >
            <TagIcon tag={tag} />
            <span className="flex-1">{tag.name}</span>
            {tag.id === value && (
              <Check
                className="size-[22px] text-focus-ring"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
        {canCreate && (
          <button
            type="button"
            onClick={createFromQuery}
            className="flex min-h-13 w-full cursor-pointer items-center gap-4 rounded-xl px-3 text-left text-[17px]"
          >
            <Plus className="size-6 text-muted" aria-hidden="true" />
            {text.createContact(name)}
          </button>
        )}
        {hasLegacyName && !value && !name && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="flex min-h-13 w-full cursor-pointer items-center gap-4 rounded-xl px-3 text-left text-[17px]"
          >
            <X className="size-6 text-muted" aria-hidden="true" />
            {messages.editor.clear(text.contact)}
          </button>
        )}
      </SheetBody>
      {panel === 'new' && (
        <TagFormSheet
          contactsOnly
          initialName={name}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'manage' && (
        <ManageTagsSheet contactsOnly onClose={() => setPanel(null)} />
      )}
    </Sheet>
  );
}
