import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GroupMode = 'unified' | 'project' | 'state' | 'sequential';

export type Theme = 'light' | 'dark' | 'system';

export type RecentEntry = {
  kind: 'place' | 'project' | 'reference' | 'task';
  id: string;
};

type UiState = {
  onboardingCompleted: boolean;
  lastUpdatePrompt: string | null;
  setLastUpdatePrompt: (version: string) => void;
  lastPath: string;
  groupBy: Record<string, GroupMode>;
  showNotes: boolean;
  showTags: boolean;
  collapsed: Record<string, boolean>;
  area: string | null;
  setArea: (area: string | null) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  largeText: boolean;
  setLargeText: (largeText: boolean) => void;
  wrap: boolean;
  setWrap: (wrap: boolean) => void;
  showEffort: boolean;
  setShowEffort: (showEffort: boolean) => void;
  sort: Record<'projects' | 'references', 'manual' | 'alpha'>;
  setSort: (list: 'projects' | 'references', order: 'manual' | 'alpha') => void;
  actionOrder: string[];
  setActionOrder: (order: string[]) => void;
  recent: RecentEntry[];
  addRecent: (entry: RecentEntry) => void;
  completeOnboarding: () => void;
  setLastPath: (path: string) => void;
  setGroupBy: (page: string, mode: GroupMode) => void;
  setShowNotes: (show: boolean) => void;
  setShowTags: (show: boolean) => void;
  toggleCollapsed: (key: string) => void;
};

export const useUiState = create<UiState>()(
  persist(
    (set) => ({
      onboardingCompleted: false,
      lastUpdatePrompt: null,
      setLastUpdatePrompt: (lastUpdatePrompt) => set({ lastUpdatePrompt }),
      lastPath: '/focus',
      groupBy: { next: 'project' },
      showNotes: false,
      showTags: false,
      collapsed: {},
      area: null,
      setArea: (area) => set({ area }),
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      largeText: false,
      setLargeText: (largeText) => set({ largeText }),
      wrap: true,
      setWrap: (wrap) => set({ wrap }),
      showEffort: false,
      setShowEffort: (showEffort) => set({ showEffort }),
      sort: { projects: 'manual', references: 'manual' },
      setSort: (list, order) =>
        set((state) => ({ sort: { ...state.sort, [list]: order } })),
      actionOrder: [],
      setActionOrder: (actionOrder) => set({ actionOrder }),
      recent: [],
      addRecent: (entry) =>
        set((state) => ({
          recent: [
            entry,
            ...state.recent.filter(
              (current) =>
                current.kind !== entry.kind || current.id !== entry.id,
            ),
          ].slice(0, 8),
        })),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      setLastPath: (lastPath) => set({ lastPath }),
      setGroupBy: (page, mode) =>
        set((state) => ({ groupBy: { ...state.groupBy, [page]: mode } })),
      setShowNotes: (showNotes) => set({ showNotes }),
      setShowTags: (showTags) => set({ showTags }),
      toggleCollapsed: (key) =>
        set((state) => ({
          collapsed: { ...state.collapsed, [key]: !state.collapsed[key] },
        })),
    }),
    { name: 'freezen-ui', version: 1 },
  ),
);
