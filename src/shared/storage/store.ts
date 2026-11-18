import { create } from 'zustand';
import { defaultData } from './document';
import type { AppData } from './document';

export const useData = create<AppData>(() => defaultData);

export function getData() {
  return useData.getState();
}

export function changeData(change: (current: AppData) => AppData) {
  useData.setState(change(useData.getState()), true);
}

export function replaceData(data: AppData) {
  useData.setState(data, true);
}
