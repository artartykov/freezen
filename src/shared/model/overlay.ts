import { useNavigate, useRouter } from '@tanstack/react-router';
import { useUiState } from './uiState';

export type EditTarget =
  | { kind: 'task' | 'project' | 'reference' | 'item'; id: string }
  | { kind: 'new-task' | 'new-project' | 'new-reference' };

export function encodeEditTarget(target: EditTarget) {
  return 'id' in target ? `${target.kind}:${target.id}` : target.kind;
}

export function decodeEditTarget(value: string | undefined): EditTarget | null {
  if (!value) return null;
  if (
    value === 'new-task' ||
    value === 'new-project' ||
    value === 'new-reference'
  ) {
    return { kind: value };
  }
  const [kind, id] = value.split(':');
  if (!id) return null;
  if (
    kind === 'task' ||
    kind === 'project' ||
    kind === 'reference' ||
    kind === 'item'
  ) {
    return { kind, id };
  }
  return null;
}

export function useOverlay() {
  const navigate = useNavigate();
  const router = useRouter();

  return {
    openEditor: (target: EditTarget) => {
      if (target.kind === 'task') {
        useUiState.getState().addRecent({ kind: 'task', id: target.id });
      }
      void navigate({
        to: '.',
        search: (previous) => ({ ...previous, edit: encodeEditTarget(target) }),
      });
    },
    openQuickFind: () => {
      void navigate({
        to: '.',
        search: (previous) => ({ ...previous, find: true }),
      });
    },
    close: () => {
      if (router.history.canGoBack()) {
        router.history.back();
        return;
      }
      void navigate({
        to: '.',
        search: (previous) => ({
          ...previous,
          edit: undefined,
          find: undefined,
        }),
        replace: true,
      });
    },
  };
}
