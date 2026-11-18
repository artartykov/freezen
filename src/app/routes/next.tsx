import { createFileRoute } from '@tanstack/react-router';
import { NextPage } from '@pages/next';

export const Route = createFileRoute('/next')({ component: NextPage });
