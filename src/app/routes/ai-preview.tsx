import { createFileRoute } from '@tanstack/react-router';
import { AiPreviewPage } from '@pages/ai-preview';

export const Route = createFileRoute('/ai-preview')({
  component: AiPreviewPage,
});
