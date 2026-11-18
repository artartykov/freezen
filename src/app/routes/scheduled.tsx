import { createFileRoute } from '@tanstack/react-router';
import { ScheduledPage } from '@pages/scheduled';

export const Route = createFileRoute('/scheduled')({
  component: ScheduledPage,
});
