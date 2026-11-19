import { KeyRound, Mic, Sparkles } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import {
  canEnableAi,
  findAiModel,
  isPostProcessingAvailable,
  setAiEnabled,
  useData,
  voiceFormsTasks,
} from '@shared/storage';
import { Switch } from '@shared/ui/Switch';
import { changeAi } from '../model/apply';
import { aiModelLabel } from '../model/aiModelLabel';
import type { SettingsSheet } from '../model/sheet';
import { Row, SettingsGroup } from './SettingsParts';

export function AiGroup({
  onOpen,
}: {
  onOpen: (sheet: SettingsSheet) => void;
}) {
  const { messages } = useI18n();
  const ai = useData((data) => data.settings.ai);
  const m = messages.settings.ai;
  const canEnable = canEnableAi(ai);
  const model = findAiModel(ai.postProcessingModel);
  const postProcessing = voiceFormsTasks(ai.voice)
    ? m.byVoice
    : model
      ? aiModelLabel(model, m.providerNames)
      : m.notSet;

  return (
    <SettingsGroup title={m.title}>
      <Row
        icon={<KeyRound />}
        hue="bg-scheduled"
        title={m.providers}
        value={
          ai.providers.length > 0
            ? ai.providers
                .map((provider) => m.providerNames[provider])
                .join(', ')
            : m.notSet
        }
        onClick={() => onOpen('aiProvider')}
      />
      <Row
        icon={<Mic />}
        hue="bg-next"
        title={m.voiceRecognition}
        value={ai.voice ? m.voiceNames[ai.voice] : m.notSet}
        onClick={() => onOpen('aiVoice')}
      />
      <Row
        icon={<Sparkles />}
        hue="bg-someday"
        title={m.postProcessing}
        value={postProcessing}
        disabled={!isPostProcessingAvailable(ai)}
        onClick={() => onOpen('aiPostProcessing')}
      />
      <li className="px-2">
        <Switch
          label={m.enable}
          checked={ai.enabled}
          disabled={!canEnable}
          onChange={(enabled) =>
            changeAi((current) => setAiEnabled(current, enabled))
          }
        />
        {!canEnable && (
          <p className="px-2 pb-3 text-sm text-muted">{m.enableHint}</p>
        )}
      </li>
    </SettingsGroup>
  );
}
