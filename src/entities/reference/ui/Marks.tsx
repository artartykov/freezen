import { Bookmark } from 'lucide-react';

export function ReferenceMark() {
  return (
    <span
      className="grid size-11 flex-none place-items-center text-someday"
      aria-hidden="true"
    >
      <Bookmark className="size-[22px]" />
    </span>
  );
}

export function ReferenceItemMark() {
  return (
    <span
      className="grid size-11 flex-none place-items-center"
      aria-hidden="true"
    >
      <i className="size-5 rounded-[4px] bg-muted opacity-45" />
    </span>
  );
}
