import { createFileRoute } from '@tanstack/react-router';
import { LaterPage } from '@pages/later';

export const Route = createFileRoute('/later')({ component: LaterPage });
