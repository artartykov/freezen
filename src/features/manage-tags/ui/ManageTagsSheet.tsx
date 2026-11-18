import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { TagIcon } from '@entities/tag';
import { useI18n } from '@shared/i18n';
import { openTaskCountWithTag, useData } from '@shared/storage';
import type { Tag, TagType } from '@shared/storage';
import { IconButton } from '@shared/ui/IconButton';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import { TagFormSheet } from './TagFormSheet';

type ManageTagsSheetProps = {
  onClose: () => void;
};

const types: TagType[] = ['area', 'context', 'contact'];

export function ManageTagsSheet({ onClose }: ManageTagsSheetProps) {
  const { messages } = useI18n();
  const tags = useData((data) => data.tags);
  const [form, setForm] = useState<Tag | 'new' | null>(null);

  return (
    <Sheet label={messages.tags.manage} onClose={onClose}>
      <SheetHeader
        title={messages.tags.manage}
        onBack={onClose}
        backLabel={messages.common.back}
        end={
          <IconButton
            aria-label={messages.tags.newTag}
            onClick={() => setForm('new')}
            className="mr-1"
          >
            <Plus aria-hidden="true" />
          </IconButton>
        }
      />
      <SheetBody>
        {types.map((type) => {
          const shown = tags.filter((tag) => tag.type === type);
          if (!shown.length) return null;
          return (
            <div key={type}>
              <p className="mx-3 mt-2.5 mb-1 text-[13px] font-medium tracking-[.08em] text-muted uppercase">
                {messages.tags.types[type]}
              </p>
              {shown.map((tag) => (
                <TagRow key={tag.id} tag={tag} onOpen={() => setForm(tag)} />
              ))}
            </div>
          );
        })}
      </SheetBody>
      {form && (
        <TagFormSheet
          tag={form === 'new' ? undefined : form}
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
