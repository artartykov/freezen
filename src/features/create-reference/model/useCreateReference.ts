import { useOverlay } from '@shared/model';

export function useCreateReference() {
  const overlay = useOverlay();
  return () => overlay.openEditor({ kind: 'new-reference' });
}
