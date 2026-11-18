import { createFileRoute } from '@tanstack/react-router';
import { ReferencePage } from '@pages/reference';

export const Route = createFileRoute('/reference/$referenceId')({
  component: function ReferenceRoute() {
    const { referenceId } = Route.useParams();
    return <ReferencePage referenceId={referenceId} />;
  },
});
