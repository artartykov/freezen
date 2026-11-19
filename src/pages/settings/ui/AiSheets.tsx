import { Check, ChevronDown, Radio } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '@shared/i18n';
import {
  testAiPostProcessing,
  testAiProvider,
  testAiVoice,
} from '@shared/platform';
import {
  aiPostProcessingModels,
  aiProviders,
  aiVoices,
  verifyAiPostProcessing,
  verifyAiProvider,
  verifyAiVoice,
  useData,
} from '@shared/storage';
import type { AiProvider } from '@shared/storage';
import { changeAi } from '../model/apply';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';

function ProviderRow({ provider }: { provider: AiProvider }) {
  const { messages } = useI18n();
  const m = messages.settings.ai;
  const verified = useData((data) =>
    data.settings.ai.providers.includes(provider),
  );
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [failure, setFailure] = useState('');
  const name = m.providerNames[provider];

  async function check() {
    setTesting(true);
    setFailure('');
    try {
      await testAiProvider(key);
      changeAi((ai) =>
        verifyAiProvider(ai, provider, key.trim() !== '' && verified),
      );
      setKey('');
      setOpen(false);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setTesting(false);
    }
  }

  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-2 text-left text-[17px] focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
      >
        <span className="grid size-6 flex-none place-items-center">
          {verified && (
            <Check
              aria-label={m.verified}
              strokeWidth={2.4}
              className="size-[22px] text-focus-ring"
            />
          )}
        </span>
        <span className="flex-1">{name}</span>
        <ChevronDown
          aria-hidden="true"
          className={`size-5 text-muted motion-safe:transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-2 px-2 pb-3">
          <div className="flex items-center gap-2">
            <label className="flex min-h-13 min-w-0 flex-1 items-center rounded-2xl bg-surface px-4 focus-within:shadow-[0_0_0_3px_var(--focus-ring)]">
              <input
                type="password"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder={verified ? m.keySet : m.key}
                aria-label={`${name}: ${m.key}`}
                autoComplete="off"
                className="min-w-0 flex-1 border-0 bg-transparent text-[17px] outline-0"
              />
            </label>
            <button
              type="button"
              aria-label={m.check}
              disabled={testing || (key.trim() === '' && !verified)}
              onClick={() => void check()}
              className="grid size-13 flex-none cursor-pointer place-items-center rounded-2xl bg-accent text-accent-ink disabled:cursor-default disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring [&_svg]:size-6"
            >
              <Radio aria-hidden="true" />
            </button>
          </div>
          {failure && (
            <p role="alert" className="px-2 text-sm break-words text-danger">
              {failure}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function AiProviderSheet({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();

  return (
    <Sheet label={messages.settings.ai.providers} onClose={onClose}>
      <SheetHeader
        title={messages.settings.ai.providers}
        onBack={onClose}
        backLabel={messages.common.back}
      />
      <SheetBody>
        <ul className="m-0 list-none p-0">
          {aiProviders.map((provider) => (
            <ProviderRow key={provider} provider={provider} />
          ))}
        </ul>
      </SheetBody>
    </Sheet>
  );
}

function CheckRow({
  label,
  verified,
  checkLabel,
  onCheck,
}: {
  label: string;
  verified: boolean;
  checkLabel: string;
  onCheck: () => Promise<void>;
}) {
  const { messages } = useI18n();
  const [testing, setTesting] = useState(false);
  const [failure, setFailure] = useState('');

  async function check() {
    setTesting(true);
    setFailure('');
    try {
      await onCheck();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setTesting(false);
    }
  }

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="flex min-h-16 items-center gap-3 px-2 text-[17px]">
        <span className="grid size-6 flex-none place-items-center">
          {verified && (
            <Check
              aria-label={messages.settings.ai.verified}
              strokeWidth={2.4}
              className="size-[22px] text-focus-ring"
            />
          )}
        </span>
        <span className="min-w-0 flex-1 break-words">{label}</span>
        <button
          type="button"
          aria-label={checkLabel}
          disabled={testing}
          onClick={() => void check()}
          className="grid size-13 flex-none cursor-pointer place-items-center rounded-2xl bg-accent text-accent-ink disabled:cursor-default disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring [&_svg]:size-6"
        >
          <Radio aria-hidden="true" />
        </button>
      </div>
      {failure && (
        <p role="alert" className="px-2 pb-3 text-sm break-words text-danger">
          {failure}
        </p>
      )}
    </li>
  );
}

function CheckListSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { messages } = useI18n();

  return (
    <Sheet label={title} onClose={onClose}>
      <SheetHeader
        title={title}
        onBack={onClose}
        backLabel={messages.common.back}
      />
      <SheetBody>
        <ul className="m-0 list-none p-0">{children}</ul>
      </SheetBody>
    </Sheet>
  );
}

export function AiVoiceSheet({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const m = messages.settings.ai;
  const ai = useData((data) => data.settings.ai);

  return (
    <CheckListSheet title={m.voiceRecognition} onClose={onClose}>
      {aiVoices.map((voice) => (
        <CheckRow
          key={voice}
          label={m.voiceNames[voice]}
          verified={ai.voice === voice && ai.passed.voice}
          checkLabel={m.checkVoice}
          onCheck={async () => {
            await testAiVoice();
            changeAi((current) => verifyAiVoice(current, voice));
          }}
        />
      ))}
    </CheckListSheet>
  );
}

export function AiPostProcessingSheet({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const m = messages.settings.ai;
  const ai = useData((data) => data.settings.ai);

  return (
    <CheckListSheet title={m.postProcessing} onClose={onClose}>
      {aiPostProcessingModels.map((model) => (
        <CheckRow
          key={model}
          label={model}
          verified={
            ai.postProcessingModel === model && ai.passed.postProcessing
          }
          checkLabel={m.checkModel}
          onCheck={async () => {
            await testAiPostProcessing(model);
            changeAi((current) => verifyAiPostProcessing(current, model));
          }}
        />
      ))}
    </CheckListSheet>
  );
}
