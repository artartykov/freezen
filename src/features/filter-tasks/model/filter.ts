import { create } from 'zustand';
import { useUiState } from '@shared/model';
import { isInArea, useData } from '@shared/storage';
import type { Energy } from '@shared/storage';

export type TaskFilter = {
  due: boolean;
  tagId: string | null;
  minutes: number | 'none' | null;
  energy: Energy | 'none' | null;
};

export const noFilter: TaskFilter = {
  due: false,
  tagId: null,
  minutes: null,
  energy: null,
};

export type Filterable = {
  due?: string | null;
  tagIds: string[];
  minutes?: number | null;
  energy?: Energy | null;
  projectId?: string | null;
};

function passesTag(item: Filterable, tagId: string | null) {
  if (tagId === 'none') return item.tagIds.length === 0;
  return !tagId || item.tagIds.includes(tagId);
}

function passesMinutes(item: Filterable, minutes: TaskFilter['minutes']) {
  if (minutes === 'none') return !item.minutes;
  return minutes === null || (!!item.minutes && item.minutes <= minutes);
}

function passesEnergy(item: Filterable, energy: TaskFilter['energy']) {
  if (energy === 'none') return !item.energy;
  return energy === null || item.energy === energy;
}

export function passesFilter(item: Filterable, filter: TaskFilter) {
  if (filter.due && !item.due) return false;
  return (
    passesTag(item, filter.tagId) &&
    passesMinutes(item, filter.minutes) &&
    passesEnergy(item, filter.energy)
  );
}

export function isFiltering(filter: TaskFilter) {
  return (
    filter.due ||
    filter.tagId !== null ||
    filter.minutes !== null ||
    filter.energy !== null
  );
}

export const useFilterStore = create<{ filter: TaskFilter }>(() => ({
  filter: noFilter,
}));

export function setListFilter(filter: TaskFilter) {
  useFilterStore.setState({ filter });
}

export function resetListFilter() {
  useFilterStore.setState({ filter: noFilter });
}

export function setTagFilter(tagId: string | null) {
  useFilterStore.setState(({ filter }) => ({
    filter:
      tagId === null
        ? { ...filter, due: false, tagId: null }
        : { ...filter, tagId },
  }));
}

export function useListFilter({ areas }: { areas: boolean }) {
  const filter = useFilterStore((state) => state.filter);
  const data = useData();
  const area = useUiState((state) => state.area);

  return {
    filter,
    setFilter: setListFilter,
    passes: (item: Filterable) =>
      passesFilter(item, filter) && (!areas || isInArea(data, item, area)),
  };
}
