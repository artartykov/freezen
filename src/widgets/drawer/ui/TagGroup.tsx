import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { setTagFilter, useFilterStore } from '@features/filter-tasks';
import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { Chip } from '@shared/ui/Chip';

export function TagGroup({ onPick }: { onPick: () => void }) {
  const { messages } = useI18n();
  const tags = useData((data) => data.tags);
  const tagId = useFilterStore((state) => state.filter.tagId);
  const [open, setOpen] = useState(true);

  function pick(id: string | null) {
    setTagFilter(id);
    onPick();
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-12 w-full cursor-pointer items-center gap-4 px-6 text-left text-[17px] focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
      >
        {messages.drawer.tags}
        <ChevronDown
          className={`ml-auto size-5 text-muted motion-safe:transition-transform ${open ? '' : '-rotate-90'}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          role="group"
          aria-label={messages.drawer.filterByTag}
          className="flex flex-wrap gap-2 px-6 pt-1.5 pb-3"
        >
          <Chip pressed={false} onClick={() => pick(null)}>
            {messages.filters.all}
          </Chip>
          {tags.map((tag) => (
            <Chip
              key={tag.id}
              pressed={tagId === tag.id}
              onClick={() => pick(tag.id)}
            >
              {tag.name}
            </Chip>
          ))}
          {tags.length > 0 && (
            <Chip
              pressed={tagId === 'none'}
              aria-label={messages.filters.noTags}
              onClick={() => pick('none')}
            >
              —
            </Chip>
          )}
        </div>
      )}
    </div>
  );
}
