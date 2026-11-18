import { Link } from '@tanstack/react-router';
import type { ComponentProps, ReactNode } from 'react';
import { useI18n } from '@shared/i18n';
import { PlaceIcon } from '@shared/ui/PlaceIcon';
import type { Place } from '@shared/ui/PlaceIcon';

export const itemClass =
  'flex min-h-12 w-full cursor-pointer items-center gap-4 px-6 text-left text-[17px] aria-[current=page]:bg-glow focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring';

type ListPlace = Exclude<Place, 'search' | 'settings'>;

type PlaceLinkProps = Omit<ComponentProps<'li'>, 'children'> & {
  place: ListPlace;
  onNavigate: () => void;
  extra?: ReactNode;
};

export function PlaceLink({
  place,
  onNavigate,
  extra,
  className = '',
  ...rest
}: PlaceLinkProps) {
  const { messages } = useI18n();

  return (
    <li
      {...rest}
      className={`bg-card select-none [-webkit-touch-callout:none] ${className}`}
    >
      <Link
        to={`/${place}`}
        onClick={onNavigate}
        draggable={false}
        className={itemClass}
      >
        <PlaceIcon place={place} />
        {messages.places[place].title}
        {extra}
      </Link>
    </li>
  );
}
