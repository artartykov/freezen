import { createFileRoute } from '@tanstack/react-router';
import { ReferencesPage } from '@pages/references';

export const Route = createFileRoute('/references')({
  component: ReferencesPage,
});
