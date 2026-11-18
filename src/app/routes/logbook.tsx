import { createFileRoute } from '@tanstack/react-router';
import { LogbookPage } from '@pages/logbook';

export const Route = createFileRoute('/logbook')({ component: LogbookPage });
