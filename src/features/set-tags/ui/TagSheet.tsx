import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { TagIcon, TagSearch } from '@entities/tag';
import { useI18n } from '@shared/i18n';
import {
  addTag,
  changeData,
  createTag,
  tagTypeOrder,
  useData,
} from '@shared/storage';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';

type TagSheetProps = {
  value: string[];
  onChange: (tagIds: string[]) => void;
  onClose: () => void;
  extra?: ReactNode;
};

export function TagSheet({ value, onChange, onClose, extra }: TagSheetProps) {
  const { messages } = useI18n();
  const tags = useData((data) => data.tags);
  const [query, setQuery] = useState('');
  const tagIdSet = new Set(tags.map((tag) => tag.id));
  const selected = value.filter((id) => tagIdSet.has(id));
  const selectedSet = new Set(selected);
  const trimmed = query.trim();
  const exact = tags.find(
    (tag) => tag.name.toLowerCase() === trimmed.toLowerCase(),
  );

  function toggle(id: string) {
    onChange(
      selectedSet.has(id)
        ? selected.filter((current) => current !== id)
        : [...selected, id],
    );
  }

  function createFromQuery() {
    if (!trimmed) return;
    if (exact) {
      if (!selectedSet.has(exact.id)) onChange([...selected, exact.id]);
    } else {
      const tag = createTag({ name: trimmed });
      changeData((data) => addTag(data, tag));
      onChange([...selected, tag.id]);
    }
    setQuery('');
  }

  return (
    <Sheet label={messages.tags.title} onClose={onClose} size="half">
      <SheetHeader
        title={messages.tags.title}
        onBack={onClose}
        backLabel={messages.common.back}
        end={extra}
      />
      <SheetBody>
        <TagSearch
          label={messages.tags.search}
          value={query}
          onChange={setQuery}
          onSubmit={createFromQuery}
        />
        {tagTypeOrder.map((type) => {
          const shown = tags.filter(
            (tag) =>
              tag.type === type &&
              tag.name.toLowerCase().includes(trimmed.toLowerCase()),
          );
          if (!shown.length) return null;
          return (
            <div
              key={type}
              className="mt-2 pt-2 [&+div]:border-t [&+div]:border-line"
            >
              <p className="mx-3 my-1 text-sm font-semibold text-muted">
                {messages.tags.types[type]}
              </p>
              {shown.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selectedSet.has(tag.id)}
                  onClick={() => toggle(tag.id)}
                  className="flex min-h-13 w-full cursor-pointer items-center gap-4 rounded-xl px-3 text-left text-[17px] aria-checked:bg-glow focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
                >
                  <TagIcon tag={tag} />
                  <span className="flex-1">{tag.name}</span>
                  {selectedSet.has(tag.id) && (
                    <Check
                      className="size-[22px] text-focus-ring"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
          );
        })}
        {trimmed && !exact && (
          <button
            type="button"
            onClick={createFromQuery}
            className="flex min-h-13 w-full cursor-pointer items-center gap-4 rounded-xl px-3 text-left text-[17px]"
          >
            <Plus className="size-6 text-muted" aria-hidden="true" />
            {messages.tags.create(trimmed)}
          </button>
        )}
      </SheetBody>
    </Sheet>
  );
}
