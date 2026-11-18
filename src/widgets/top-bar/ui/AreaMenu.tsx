import { ChevronDown, LayoutGrid, SquareDashed } from 'lucide-react';
import { TagIcon } from '@entities/tag';
import { useI18n } from '@shared/i18n';
import { useUiState } from '@shared/model';
import { currentArea, unassignedArea, useData } from '@shared/storage';
import { Menu } from '@shared/ui/Menu';

export function AreaMenu() {
  const { messages } = useI18n();
  const data = useData();
  const { area, setArea } = useUiState();
  const active = currentArea(data, area);
  const areas = data.tags.filter((tag) => tag.type === 'area');
  const activeTag = areas.find((tag) => tag.id === active);
  let label = messages.areas.all;
  if (active === unassignedArea) label = messages.areas.unassigned;
  else if (activeTag) label = activeTag.name;

  return (
    <Menu
      label={active ? messages.areas.current(label) : messages.areas.all}
      trigger={
        <>
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3 flex-none" aria-hidden="true" />
        </>
      }
      triggerClassName={`inline-flex min-h-9 max-w-47 cursor-pointer items-center gap-2 rounded-full px-3.5 text-[15px] leading-none font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
        active ? 'bg-ink text-surface' : ''
      }`}
      entries={[
        {
          label: messages.areas.all,
          icon: <LayoutGrid />,
          checked: !active,
          onSelect: () => setArea(null),
        },
        ...(areas.length ? (['separator'] as const) : []),
        ...areas.map((tag) => ({
          label: tag.name,
          icon: <TagIcon tag={tag} />,
          checked: active === tag.id,
          onSelect: () => setArea(tag.id),
        })),
        'separator',
        {
          label: messages.areas.unassigned,
          icon: <SquareDashed />,
          checked: active === unassignedArea,
          onSelect: () => setArea(unassignedArea),
        },
      ]}
    />
  );
}
