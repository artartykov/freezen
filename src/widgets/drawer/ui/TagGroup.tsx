import { ChevronDown } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useI18n } from '@shared/i18n';
import { orderTagsByType, useData } from '@shared/storage';
import { chipLinkClass } from '@shared/ui/Chip';

export function TagGroup({ onPick }: { onPick: () => void }) {
  const { messages } = useI18n();
  const tags = useData((data) => data.tags);
  const [open, setOpen] = useState(true);

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
          aria-label={messages.drawer.tagsList}
          className="flex flex-wrap gap-2 px-6 pt-1.5 pb-3"
        >
          <Link
            to="/tag/$tagId"
            params={{ tagId: 'all' }}
            onClick={onPick}
            className={chipLinkClass}
          >
            {messages.filters.all}
          </Link>
          {orderTagsByType(tags).map((tag) => (
            <Link
              key={tag.id}
              to="/tag/$tagId"
              params={{ tagId: tag.id }}
              onClick={onPick}
              className={chipLinkClass}
            >
              {tag.name}
            </Link>
          ))}
          {tags.length > 0 && (
            <Link
              to="/tag/$tagId"
              params={{ tagId: 'none' }}
              aria-label={messages.filters.noTags}
              onClick={onPick}
              className={chipLinkClass}
            >
              —
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
