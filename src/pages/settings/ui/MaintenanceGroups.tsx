import { useNavigate } from '@tanstack/react-router';
import { BookOpen, Download, Info, ListPlus, Star } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { askConfirm, checkForAppUpdates, useAppUpdates } from '@shared/model';
import { addTutorialProject, changeData, createProject } from '@shared/storage';
import { version } from '../../../../package.json';
import { Row, SettingsGroup } from './SettingsParts';

export function MaintenanceGroups({ onAbout }: { onAbout: () => void }) {
  const { messages } = useI18n();
  const navigate = useNavigate();
  const supported = useAppUpdates((state) => state.supported);
  const activity = useAppUpdates((state) => state.activity);
  const m = messages.settings;

  return (
    <>
      <SettingsGroup title={m.support}>
        <Row
          icon={<BookOpen />}
          hue="bg-scheduled"
          title={m.quickGuide}
          disabled
        />
        <Row
          icon={<ListPlus />}
          hue="bg-waiting"
          title={m.tutorial}
          onClick={() =>
            askConfirm({
              title: m.tutorial,
              text: m.tutorialText,
              confirm: messages.common.ok,
              onConfirm: () => {
                const project = createProject(messages.tutorial.project);
                changeData((data) =>
                  addTutorialProject(data, project, messages.tutorial.tasks),
                );
                void navigate({
                  to: '/project/$projectId',
                  params: { projectId: project.id },
                });
              },
            })
          }
        />
      </SettingsGroup>
      <SettingsGroup title="FreeZen">
        <Row
          icon={<Info />}
          hue="bg-someday"
          title={m.about}
          value={m.versionShort(version)}
          onClick={onAbout}
        />
        {supported && (
          <Row
            icon={<Download />}
            hue="bg-scheduled"
            title={messages.appUpdates.check}
            value={
              activity === 'checking' ? messages.appUpdates.checking : undefined
            }
            disabled={activity !== null}
            onClick={() => void checkForAppUpdates(messages)}
          />
        )}
        <Row
          icon={<Star />}
          hue="bg-star"
          title={m.rate}
          value={m.rateHint}
          disabled
        />
      </SettingsGroup>
    </>
  );
}
