import { Star } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { changeData, updateReference } from '@shared/storage';
import type { Reference } from '@shared/storage';

export function StarReferenceButton({ reference }: { reference: Reference }) {
  const { messages } = useI18n();

  return (
    <button
      type="button"
      aria-label={
        reference.starred
          ? messages.project.removeStar
          : messages.project.addStar
      }
      aria-pressed={reference.starred}
      onClick={(event) => {
        event.stopPropagation();
        changeData((data) =>
          updateReference(data, reference.id, { starred: !reference.starred }),
        );
      }}
      className="group grid size-11 flex-none cursor-pointer place-items-center rounded-xl text-muted aria-pressed:text-star focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <Star
        className="size-[22px] group-aria-pressed:fill-current"
        strokeWidth={1.8}
        aria-hidden="true"
      />
    </button>
  );
}
