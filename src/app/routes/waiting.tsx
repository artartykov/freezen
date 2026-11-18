import { createFileRoute } from '@tanstack/react-router';
import { WaitingPage } from '@pages/waiting';

export const Route = createFileRoute('/waiting')({ component: WaitingPage });
