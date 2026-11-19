import { createFileRoute } from '@tanstack/react-router';
import { TagPage } from '@pages/tag';

export const Route = createFileRoute('/tag/$tagId')({
  component: function TagRoute() {
    const { tagId } = Route.useParams();
    return <TagPage tagId={tagId} />;
  },
});
