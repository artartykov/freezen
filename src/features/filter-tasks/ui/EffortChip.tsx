import { ChevronDown } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import type { Energy } from '@shared/storage';
import { Menu } from '@shared/ui/Menu';
import type { MenuEntry } from '@shared/ui/Menu';
import type { TaskFilter } from '../model/filter';

const energyOptions: Energy[] = ['low', 'medium', 'high'];

type EffortChipProps = {
  filter: TaskFilter;
  onChange: (filter: TaskFilter) => void;
} & (
  | { kind: 'minutes'; availableValues: ReadonlySet<number | 'none'> }
  | { kind: 'energy'; availableValues: ReadonlySet<Energy | 'none'> }
);

export function EffortChip(props: EffortChipProps) {
  const { kind, filter, onChange, availableValues } = props;
  const { messages } = useI18n();
  const value = filter[kind];
  const pick = (next: TaskFilter[typeof kind]) =>
    onChange({ ...filter, [kind]: value === next ? null : next });

  const options: MenuEntry[] =
    kind === 'minutes'
      ? [...availableValues]
          .filter((minutes) => minutes !== 'none')
          .sort((a, b) => a - b)
          .map((minutes) => ({
            label: messages.filters.timeAtMost(minutes),
            checked: value === minutes,
            onSelect: () => pick(minutes),
          }))
      : energyOptions
          .filter((energy) => availableValues.has(energy))
          .map((energy) => ({
            label: messages.editor.energyLevels[energy],
            checked: value === energy,
            onSelect: () => pick(energy),
          }));

  if (availableValues.has('none')) {
    options.push({
      label: messages.filters.notSpecified,
      checked: value === 'none',
      onSelect: () => pick('none'),
    });
  }
  const entries: MenuEntry[] = [
    {
      label: messages.filters.showAll,
      checked: value === null,
      onSelect: () => onChange({ ...filter, [kind]: null }),
    },
    ...options,
  ];

  const menuLabel =
    kind === 'minutes' ? messages.filters.time : messages.filters.energy;
  let label = menuLabel;
  if (value === 'none') label = messages.filters.notSpecified;
  else if (typeof value === 'number')
    label = messages.filters.timeAtMostShort(value);
  else if (value) label = messages.editor.energyShort[value];

  return (
    <Menu
      label={menuLabel}
      placement="below-start"
      trigger={
        <>
          {label}
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </>
      }
      triggerClassName={`inline-flex min-h-7 flex-none cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3 text-sm font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
        value === null
          ? 'border-line bg-card'
          : 'border-accent bg-accent text-accent-ink'
      }`}
      entries={entries}
    />
  );
}
