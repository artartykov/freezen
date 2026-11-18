import { createFileRoute, redirect } from '@tanstack/react-router';
import { useUiState } from '@shared/model';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { lastPath } = useUiState.getState();
    redirect({
      href: lastPath === '/' ? '/focus' : lastPath,
      replace: true,
      throw: true,
    });
  },
});
