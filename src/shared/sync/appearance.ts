import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TagColor } from '@shared/storage';

export type DeviceIcon = 'phone' | 'tablet' | 'browser' | 'desktop';

export type DeviceAppearance = {
  name?: string;
  icon?: DeviceIcon;
  color?: TagColor;
};

type AppearanceState = {
  byId: Record<string, DeviceAppearance>;
  update: (id: string, changes: DeviceAppearance) => void;
  forget: (id: string) => void;
};

export const useDeviceAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      byId: {},
      update: (id, changes) =>
        set((state) => ({
          byId: { ...state.byId, [id]: { ...state.byId[id], ...changes } },
        })),
      forget: (id) =>
        set((state) => {
          const byId = { ...state.byId };
          delete byId[id];
          return { byId };
        }),
    }),
    { name: 'freezen-sync-appearance' },
  ),
);
