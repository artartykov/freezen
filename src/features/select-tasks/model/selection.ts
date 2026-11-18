import { create } from 'zustand';

export const useSelection = create<{ ids: string[] }>(() => ({ ids: [] }));

export function startSelection(id: string) {
  useSelection.setState({ ids: [id] });
}

export function toggleSelection(id: string) {
  useSelection.setState(({ ids }) => ({
    ids: ids.includes(id)
      ? ids.filter((current) => current !== id)
      : [...ids, id],
  }));
}

export function endSelection() {
  useSelection.setState({ ids: [] });
}
