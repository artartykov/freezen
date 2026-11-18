import { createRootRoute } from '@tanstack/react-router';
import { RootLayout } from '../layout/RootLayout';

type RootSearch = { edit?: string; find?: boolean };

export const Route = createRootRoute({
  validateSearch: (search: Record<string, unknown>): RootSearch => ({
    ...(typeof search.edit === 'string' ? { edit: search.edit } : {}),
    ...(search.find === true ? { find: true } : {}),
  }),
  component: RootLayout,
});
