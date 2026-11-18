import { Check } from 'lucide-react';
import { tagColors } from '@entities/tag';
import { useI18n } from '@shared/i18n';
import type { TagColor } from '@shared/storage';

type ColorSwatchesProps = {
  value: TagColor;
  onChange: (color: TagColor) => void;
};

const colors: TagColor[] = [
  'none',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
];

export function ColorSwatches({ value, onChange }: ColorSwatchesProps) {
  const { messages } = useI18n();

  return (
    <div
      role="radiogroup"
      aria-label={messages.tags.color}
      className="flex flex-wrap gap-4 px-2 pt-1.5 pb-2"
    >
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={color === value}
          aria-label={messages.tags.colors[color]}
          onClick={() => onChange(color)}
          style={{ background: tagColors[color] }}
          className={`group grid size-12 cursor-pointer place-items-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring ${
            color === 'none'
              ? 'text-muted shadow-[inset_0_0_0_1.5px_var(--line)] aria-checked:shadow-[inset_0_0_0_3px_var(--ink)]'
              : 'text-white'
          }`}
        >
          <Check
            className="invisible size-[26px] stroke-[2.6] group-aria-checked:visible"
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}
