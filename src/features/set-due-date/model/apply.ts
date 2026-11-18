import { changeData, setTasksDue } from '@shared/storage';

export function applyTaskDue(ids: string[], due: string | null) {
  changeData((data) => setTasksDue(data, ids, due));
}
