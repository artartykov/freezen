import type { AppData, Project, Settings } from './document';
import { defaultData } from './document';
import { createProject, createTag, createTask } from './factories';
import { todayIso } from '@shared/lib';

export type TutorialMessages = {
  project: { name: string; note: string };
  welcome: { title: string; note: string };
  tasks: { title: string; note: string }[];
  tags: string[];
};

export function createTutorialData(
  tutorial: TutorialMessages,
  language: Settings['language'],
): AppData {
  const project = createProject(tutorial.project);
  return {
    ...defaultData,
    settings: { ...defaultData.settings, language },
    projects: [project],
    tags: tutorial.tags.map((name) => createTag({ name })),
    tasks: [
      createTask({
        ...tutorial.welcome,
        state: 'next',
        starred: true,
        due: todayIso(),
      }),
      ...tutorial.tasks.map((task) =>
        createTask({ ...task, state: 'next', projectId: project.id }),
      ),
    ],
  };
}

export function addTutorialProject(
  data: AppData,
  project: Project,
  tasks: TutorialMessages['tasks'],
): AppData {
  return {
    ...data,
    projects: [...data.projects, project],
    tasks: [
      ...data.tasks,
      ...tasks.map((task) =>
        createTask({ ...task, state: 'next', projectId: project.id }),
      ),
    ],
  };
}
