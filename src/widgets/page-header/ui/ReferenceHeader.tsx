import { ReferenceMark } from '@entities/reference';
import { TagPill } from '@entities/tag';
import { StarReferenceButton } from '@features/star-reference';
import { useI18n } from '@shared/i18n';
import { useOverlay } from '@shared/model';
import { tagsByIds, useData } from '@shared/storage';
import type { Reference } from '@shared/storage';
import { HeaderCard } from './HeaderCard';

export function ReferenceHeader({ reference }: { reference: Reference }) {
  const { messages } = useI18n();
  const overlay = useOverlay();
  const tags = tagsByIds(useData(), reference.tagIds);

  return (
    <HeaderCard
      mark={<ReferenceMark />}
      title={reference.name || messages.reference.untitled}
      note={reference.note}
      editLabel={messages.reference.edit}
      end={<StarReferenceButton reference={reference} />}
      onEdit={() => overlay.openEditor({ kind: 'reference', id: reference.id })}
      meta={
        tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted">
            {tags.map((tag) => (
              <TagPill key={tag.id} tag={tag} />
            ))}
          </div>
        )
      }
    />
  );
}
