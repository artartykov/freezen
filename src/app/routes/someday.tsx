import { createFileRoute } from '@tanstack/react-router';
import { SomedayPage } from '@pages/someday';

export const Route = createFileRoute('/someday')({ component: SomedayPage });
