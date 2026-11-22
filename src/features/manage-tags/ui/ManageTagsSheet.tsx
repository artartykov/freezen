import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { TagIcon, TagSearch } from '@entities/tag';
import { useI18n } from '@shared/i18n';
import { openTaskCountWithTag, tagTypeOrder, useData } from '@shared/storage';
import type { Tag } from '@shared/storage';
import { IconButton } from '@shared/ui/IconButton';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import { TagFormSheet } from './TagFormSheet';

type ManageTagsSheetProps = {
  onClose: () => void;
  contactsOnly?: boolean;
};

export function ManageTagsSheet({
  onClose,
  contactsOnly,
}: ManageTagsSheetProps) {
  const { messages } = useI18n();
  const tags = useData((data) => data.tags);
  const [form, setForm] = useState<Tag | { name: string } | null>(null);
  const [query, setQuery] = useState('');
  const title = contactsOnly
    ? messages.editor.manageContacts
    : messages.tags.manage;
  const newLabel = contactsOnly
    ? messages.editor.newContact
    : messages.tags.newTag;
  const normalized = query.trim().toLowerCase();
  const canCreate =
    normalized.length > 0 &&
    query.trim().length <= 40 &&
    !tags.some((tag) => tag.name.toLowerCase() === normalized);

  function createFromQuery() {
    if (canCreate) setForm({ name: query.trim() });
  }

  return (
    <Sheet
      label={title}
      onClose={onClose}
      size={contactsOnly ? 'full' : 'half'}
    >
      <SheetHeader
        title={title}
        onBack={onClose}
        backLabel={messages.common.back}
        end={
          <IconButton
            aria-label={newLabel}
            onClick={() => setForm({ name: '' })}
            className="mr-1"
          >
            <Plus aria-hidden="true" />
          </IconButton>
        }
      />
      <SheetBody>
        {contactsOnly && (
          <TagSearch
            label={messages.editor.searchContact}
            value={query}
            onChange={setQuery}
            onSubmit={createFromQuery}
          />
        )}
        {(contactsOnly ? (['contact'] as const) : tagTypeOrder).map((type) => {
          const shown = tags.filter(
            (tag) =>
              tag.type === type && tag.name.toLowerCase().includes(normalized),
          );
          if (!shown.length) return null;
          return (
            <div
              key={type}
              className="mt-2 pt-2 [&+div]:border-t [&+div]:border-line"
            >
              {!contactsOnly && (
                <p className="mx-3 my-1 text-sm font-semibold text-muted">
                  {messages.tags.types[type]}
                </p>
              )}
              {shown.map((tag) => (
                <TagRow key={tag.id} tag={tag} onOpen={() => setForm(tag)} />
              ))}
            </div>
          );
        })}
        {contactsOnly && canCreate && (
          <button
            type="button"
            onClick={createFromQuery}
            className="flex min-h-13 w-full cursor-pointer items-center gap-4 rounded-xl px-3 text-left text-[17px]"
          >
            <Plus className="size-6 text-muted" aria-hidden="true" />
            {messages.editor.createContact(query.trim())}
          </button>
        )}
      </SheetBody>
      {form && (
        <TagFormSheet
          tag={'id' in form ? form : undefined}
          contactsOnly={contactsOnly}
          initialName={form.name}
          onClose={() => setForm(null)}
        />
      )}
    </Sheet>
  );
}

function TagRow({ tag, onOpen }: { tag: Tag; onOpen: () => void }) {
  const count = useData((data) => openTaskCountWithTag(data, tag.id));

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-13 w-full cursor-pointer items-center gap-4 rounded-xl px-3 text-left text-[17px] focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
    >
      <TagIcon tag={tag} />
      <span className="min-w-0 flex-1 truncate">{tag.name}</span>
      <span className="flex-none text-muted">{count}</span>
      <ChevronRight
        className="size-5 flex-none text-muted"
        aria-hidden="true"
      />
    </button>
  );
}
