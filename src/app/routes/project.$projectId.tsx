import { createFileRoute } from '@tanstack/react-router';
import { ProjectPage } from '@pages/project';

export const Route = createFileRoute('/project/$projectId')({
  component: function ProjectRoute() {
    const { projectId } = Route.useParams();
    return <ProjectPage projectId={projectId} />;
  },
});
