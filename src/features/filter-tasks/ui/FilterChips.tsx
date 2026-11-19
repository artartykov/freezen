import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { Chip } from '@shared/ui/Chip';
import type { Filterable, TaskFilter } from '../model/filter';
import { EffortChip } from './EffortChip';

type FilterChipsProps = {
  items: Filterable[];
  filter: TaskFilter;
  onChange: (filter: TaskFilter) => void;
  hiddenTagId?: string;
};

export function FilterChips({
  items,
  filter,
  onChange,
  hiddenTagId,
}: FilterChipsProps) {
  const { messages } = useI18n();
  const tags = useData((data) => data.tags);
  const used = new Set(items.flatMap((item) => item.tagIds));
  const hasDue = items.some((item) => item.due);
  const hasMinutes =
    items.some((item) => item.minutes) || filter.minutes !== null;
  const hasEnergy = items.some((item) => item.energy) || filter.energy !== null;
  const shown = tags.filter(
    (tag) =>
      tag.id !== hiddenTagId && (used.has(tag.id) || tag.id === filter.tagId),
  );

  return (
    <div
      role="group"
      aria-label={messages.filters.label}
      className="mt-5 mb-4 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]"
    >
      <Chip
        pressed={!filter.due && filter.tagId === null}
        onClick={() => onChange({ ...filter, due: false, tagId: null })}
      >
        {messages.filters.all}
      </Chip>
      {hasDue && (
        <Chip
          pressed={filter.due}
          onClick={() => onChange({ ...filter, due: !filter.due })}
        >
          {messages.filters.due}
        </Chip>
      )}
      {hasMinutes && (
        <EffortChip
          kind="minutes"
          availableValues={new Set(items.map((item) => item.minutes || 'none'))}
          filter={filter}
          onChange={onChange}
        />
      )}
      {hasEnergy && (
        <EffortChip
          kind="energy"
          availableValues={new Set(items.map((item) => item.energy ?? 'none'))}
          filter={filter}
          onChange={onChange}
        />
      )}
      {shown.map((tag) => (
        <Chip
          key={tag.id}
          pressed={filter.tagId === tag.id}
          onClick={() =>
            onChange({
              ...filter,
              tagId: filter.tagId === tag.id ? null : tag.id,
            })
          }
        >
          {tag.name}
        </Chip>
      ))}
      {shown.length > 0 && !hiddenTagId && (
        <Chip
          pressed={filter.tagId === 'none'}
          aria-label={messages.filters.noTags}
          onClick={() =>
            onChange({
              ...filter,
              tagId: filter.tagId === 'none' ? null : 'none',
            })
          }
        >
          —
        </Chip>
      )}
    </div>
  );
}
