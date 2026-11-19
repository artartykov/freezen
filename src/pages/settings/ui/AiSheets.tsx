import { useI18n } from '@shared/i18n';
import { setAiKey, useAiKey } from '@shared/model';
import {
  testAiPostProcessing,
  testAiProvider,
  testAiVoice,
} from '@shared/platform';
import {
  aiPostProcessingModels,
  aiProviders,
  aiVoices,
  changeAiKey,
  selectAiPostProcessingModel,
  selectAiProvider,
  selectAiVoice,
  useData,
} from '@shared/storage';
import type { AiProvider, AiVoice } from '@shared/storage';
import { changeAi } from '../model/apply';
import { AiTestSheet } from './AiTestSheet';

export function AiProviderSheet({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const m = messages.settings.ai;
  const provider = useData((data) => data.settings.ai.provider);
  const key = useAiKey((state) => state.key);

  return (
    <AiTestSheet
      title={m.providers}
      test="provider"
      options={aiProviders.map((value) => ({
        value,
        label: m.providerNames[value],
      }))}
      value={provider}
      onSelect={(value) =>
        changeAi((ai) => selectAiProvider(ai, value as AiProvider))
      }
      canTest={provider !== null && key !== ''}
      runTest={() => testAiProvider(key)}
      onClose={onClose}
    >
      <label className="mt-4 flex min-h-13 items-center rounded-2xl bg-surface px-4 focus-within:shadow-[0_0_0_3px_var(--focus-ring)]">
        <input
          type="password"
          value={key}
          onChange={(event) => {
            setAiKey(event.target.value);
            changeAi(changeAiKey);
          }}
          placeholder={m.key}
          aria-label={m.key}
          autoComplete="off"
          className="min-w-0 flex-1 border-0 bg-transparent text-[17px] outline-0"
        />
      </label>
    </AiTestSheet>
  );
}

export function AiVoiceSheet({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const m = messages.settings.ai;
  const voice = useData((data) => data.settings.ai.voice);

  return (
    <AiTestSheet
      title={m.voiceRecognition}
      test="voice"
      options={aiVoices.map((value) => ({
        value,
        label: m.voiceNames[value],
      }))}
      value={voice}
      onSelect={(value) =>
        changeAi((ai) => selectAiVoice(ai, value as AiVoice))
      }
      canTest={voice !== null}
      runTest={testAiVoice}
      onClose={onClose}
    />
  );
}

export function AiPostProcessingSheet({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const m = messages.settings.ai;
  const model = useData((data) => data.settings.ai.postProcessingModel);

  return (
    <AiTestSheet
      title={m.postProcessing}
      test="postProcessing"
      options={aiPostProcessingModels.map((value) => ({ value, label: value }))}
      value={model}
      onSelect={(value) =>
        changeAi((ai) => selectAiPostProcessingModel(ai, value))
      }
      canTest={model !== null}
      runTest={() => testAiPostProcessing(model ?? '')}
      onClose={onClose}
    />
  );
}
