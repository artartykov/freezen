import { changeData, setTasksTags } from '@shared/storage';

export function applyTaskTags(
  ids: string[],
  before: string[],
  after: string[],
) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((id) => !beforeSet.has(id));
  const removed = before.filter((id) => !afterSet.has(id));
  changeData((data) => setTasksTags(data, ids, added, removed));
}
