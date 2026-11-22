import type { Tag } from '@shared/storage';
import { TagIcon } from './TagIcon';

export function TagPill({
  tag,
  size = 'compact',
}: {
  tag: Tag;
  size?: 'compact' | 'regular';
}) {
  const corners = tag.type === 'area' ? 'rounded-sm' : 'rounded-md';

  return (
    <span
      className={`inline-flex max-w-full items-baseline gap-1 border border-line py-0.5 pr-2 pl-1.5 font-medium text-muted ${size === 'regular' ? 'text-base' : 'text-sm'} ${corners}`}
    >
      <TagIcon tag={tag} />
      <span className="min-w-0 wrap-anywhere">{tag.name}</span>
    </span>
  );
}
