import { createFileRoute } from '@tanstack/react-router';
import { SearchPage } from '@pages/search';

type SearchParams = { q?: string };

export const Route = createFileRoute('/search')({
  validateSearch: (search: Record<string, unknown>): SearchParams =>
    typeof search.q === 'string' && search.q ? { q: search.q } : {},
  component: function SearchRoute() {
    const { q } = Route.useSearch();
    const navigate = Route.useNavigate();
    return (
      <SearchPage
        query={q ?? ''}
        onQueryChange={(query) =>
          void navigate({
            search: (previous) => ({ ...previous, q: query || undefined }),
            replace: true,
          })
        }
      />
    );
  },
});
