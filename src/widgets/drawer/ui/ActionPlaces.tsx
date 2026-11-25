import { useReorder } from '@features/reorder';
import { useUiState } from '@shared/model';
import { useData } from '@shared/storage';
import { Count } from './Count';
import { PlaceLink } from './PlaceLink';

const actionPlaces = [
  'focus',
  'next',
  'later',
  'scheduled',
  'someday',
  'waiting',
] as const;

type ActionPlace = (typeof actionPlaces)[number];

function ordered(order: string[]) {
  const rank = new Map(order.map((key, index) => [key, index]));
  return [...actionPlaces].sort(
    (a, b) =>
      (rank.get(a) ?? actionPlaces.indexOf(a) + 100) -
      (rank.get(b) ?? actionPlaces.indexOf(b) + 100),
  );
}

export function ActionPlaces({
  countOf,
  onNavigate,
}: {
  countOf: (place: string) => number;
  onNavigate?: () => void;
}) {
  const settings = useData((data) => data.settings);
  const { actionOrder, setActionOrder } = useUiState();
  const all = ordered(actionOrder);
  const shown = all.filter(
    (place) =>
      (place !== 'later' || settings.showLater) &&
      (place !== 'waiting' || settings.showWaiting),
  );
  const order = useReorder(shown, (ids) => {
    const placed = new Set(ids);
    setActionOrder([...ids, ...all.filter((place) => !placed.has(place))]);
  });

  return (
    <ul className="m-0 list-none p-0">
      {shown.map((place: ActionPlace) => (
        <PlaceLink
          key={place}
          place={place}
          onNavigate={onNavigate}
          {...order.itemProps(place)}
          extra={<Count value={countOf(place)} />}
        />
      ))}
    </ul>
  );
}
