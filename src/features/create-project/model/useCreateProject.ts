import { useOverlay } from '@shared/model';

export function useCreateProject() {
  const overlay = useOverlay();
  return () => overlay.openEditor({ kind: 'new-project' });
}
