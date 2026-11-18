import { Tag as TagShape, User, Square } from 'lucide-react';
import type { Tag } from '@shared/storage';
import { tagColors } from '../lib/colors';

export function TagIcon({ tag }: { tag: Tag }) {
  const color = tag.color === 'none' ? undefined : tagColors[tag.color];
  const className = 'size-6 flex-none text-muted';
  const style = color ? { color } : undefined;

  if (tag.type === 'area')
    return (
      <Square
        className={className}
        style={style}
        fill="currentColor"
        aria-hidden="true"
      />
    );
  if (tag.type === 'contact')
    return <User className={className} style={style} aria-hidden="true" />;
  return <TagShape className={className} style={style} aria-hidden="true" />;
}
