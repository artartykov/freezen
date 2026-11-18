import type { AppData } from './document';

export const unassignedArea = '__none';

type Tagged = { tagIds: string[]; projectId?: string | null };

export function areaTagIds(data: AppData, entity: Tagged) {
  const areaIds = new Set(
    data.tags.filter((tag) => tag.type === 'area').map((tag) => tag.id),
  );
  const own = entity.tagIds.filter((id) => areaIds.has(id));
  if (own.length || !entity.projectId) return own;
  const project = data.projects.find(
    (candidate) => candidate.id === entity.projectId,
  );
  return project ? project.tagIds.filter((id) => areaIds.has(id)) : [];
}

export function currentArea(data: AppData, area: string | null) {
  if (area === unassignedArea) return area;
  return data.tags.some((tag) => tag.id === area && tag.type === 'area')
    ? area
    : null;
}

export function isInArea(data: AppData, entity: Tagged, area: string | null) {
  const active = currentArea(data, area);
  if (!active) return true;
  const tags = areaTagIds(data, entity);
  if (active === unassignedArea) return tags.length === 0;
  return (
    tags.includes(active) ||
    (data.settings.areaIncludeUnassigned && tags.length === 0)
  );
}

export function assignArea(
  data: AppData,
  taskIds: string[],
  area: string | null,
): AppData {
  const active = currentArea(data, area);
  if (!data.settings.areaAssign || !active || active === unassignedArea)
    return data;
  const ids = new Set(taskIds);
  return {
    ...data,
    tasks: data.tasks.map((task) =>
      ids.has(task.id) &&
      task.state !== 'inbox' &&
      !task.trashed &&
      !areaTagIds(data, task).length
        ? { ...task, tagIds: [...task.tagIds, active] }
        : task,
    ),
  };
}
