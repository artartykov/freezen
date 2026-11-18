import { Plus } from 'lucide-react';
import { Fab } from '@shared/ui/Fab';
import { useCreateReference } from '../model/useCreateReference';

export function CreateReferenceButton({ label }: { label: string }) {
  const createReference = useCreateReference();

  return (
    <Fab aria-label={label} onClick={createReference}>
      <Plus strokeWidth={2.5} aria-hidden="true" />
    </Fab>
  );
}
