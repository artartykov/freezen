import type { Tag } from '@shared/storage';
import { tagColors } from '../lib/colors';

export function TagIcon({ tag }: { tag: Tag }) {
  const shape = {
    area: 'rounded-[2px] bg-current',
    context: 'rounded-full bg-current',
    contact: 'rounded-full border-2 border-current',
  }[tag.type];

  return (
    <span
      className="inline-grid size-4 flex-none place-items-center self-center text-muted"
      style={tag.color === 'none' ? undefined : { color: tagColors[tag.color] }}
      aria-hidden="true"
    >
      <span className={`size-2.5 ${shape}`} />
    </span>
  );
}
