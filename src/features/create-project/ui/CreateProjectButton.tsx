import { Plus } from 'lucide-react';
import { Fab } from '@shared/ui/Fab';
import { useCreateProject } from '../model/useCreateProject';

export function CreateProjectButton({ label }: { label: string }) {
  const createProject = useCreateProject();

  return (
    <Fab aria-label={label} onClick={createProject}>
      <Plus strokeWidth={2.5} aria-hidden="true" />
    </Fab>
  );
}
