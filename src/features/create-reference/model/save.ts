import { addReference, changeData, updateReference } from '@shared/storage';
import type { Reference } from '@shared/storage';

export function saveNewReference(reference: Reference, untitled: string) {
  const saved = { ...reference, name: reference.name.trim() || untitled };
  changeData((data) => {
    const existing = data.references.find((entry) => entry.id === saved.id);
    return existing
      ? updateReference(data, saved.id, {
          ...saved,
          noteHistory: existing.noteHistory,
        })
      : addReference(data, saved);
  });
  return saved.id;
}
