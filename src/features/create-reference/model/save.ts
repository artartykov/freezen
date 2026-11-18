import { addReference, changeData } from '@shared/storage';
import type { Reference } from '@shared/storage';

export function saveNewReference(reference: Reference, untitled: string) {
  const saved = { ...reference, name: reference.name.trim() || untitled };
  changeData((data) => addReference(data, saved));
  return saved.id;
}
