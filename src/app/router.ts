import { createRouter } from '@tanstack/react-router';
import { resetListFilter } from '@features/filter-tasks';
import { endSelection } from '@features/select-tasks';
import { useUiState } from '@shared/model';
import type { RecentEntry } from '@shared/model';
import { routeTree } from './routeTree.gen';

function recentEntry(pathname: string): RecentEntry | null {
  const [, first, id] = pathname.split('/');
  if (first === 'project' && id) return { kind: 'project', id };
  if (first === 'reference' && id) return { kind: 'reference', id };
  if (!first || ['search', 'settings', 'tag'].includes(first)) return null;
  return { kind: 'place', id: first };
}

export const router = createRouter({ routeTree, scrollRestoration: true });

router.subscribe('onResolved', ({ toLocation, pathChanged }) => {
  if (toLocation.pathname !== '/') {
    useUiState.getState().setLastPath(toLocation.pathname);
  }
  const recent = recentEntry(toLocation.pathname);
  if (recent) useUiState.getState().addRecent(recent);
  if (pathChanged) {
    endSelection();
    resetListFilter();
  }
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
  interface HistoryState {
    fromSearch?: boolean;
  }
}
