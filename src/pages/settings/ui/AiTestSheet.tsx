import { useState } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '@shared/i18n';
import { passAiTest, useData } from '@shared/storage';
import type { AiTest } from '@shared/storage';
import { Button } from '@shared/ui/Button';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import { changeAi } from '../model/apply';
import type { AlertOption } from '../model/alerts';
import { CheckOptions } from './CheckOptions';

type AiTestSheetProps = {
  title: string;
  test: AiTest;
  options: AlertOption<string>[];
  value: string | null;
  onSelect: (value: string) => void;
  canTest: boolean;
  runTest: () => Promise<boolean>;
  onClose: () => void;
  children?: ReactNode;
};

export function AiTestSheet({
  title,
  test,
  options,
  value,
  onSelect,
  canTest,
  runTest,
  onClose,
  children,
}: AiTestSheetProps) {
  const { messages } = useI18n();
  const m = messages.settings.ai;
  const passed = useData((data) => data.settings.ai.passed[test]);
  const [status, setStatus] = useState<'idle' | 'testing' | 'failed'>('idle');

  async function run() {
    setStatus('testing');
    const ok = await runTest();
    if (ok) changeAi((ai) => passAiTest(ai, test));
    setStatus(ok ? 'idle' : 'failed');
  }

  const result =
    status === 'testing'
      ? m.testing
      : status === 'failed'
        ? m.failed
        : passed
          ? m.passed
          : '';

  return (
    <Sheet label={title} onClose={onClose}>
      <SheetHeader
        title={title}
        onBack={onClose}
        backLabel={messages.common.back}
      />
      <SheetBody>
        <CheckOptions
          label={title}
          options={options}
          value={value ?? ''}
          onChange={(next) => {
            setStatus('idle');
            onSelect(next);
          }}
        />
        {children}
        <div className="mt-6 flex flex-col gap-3 px-2">
          <Button
            disabled={!canTest || status === 'testing'}
            onClick={() => void run()}
          >
            {m.test}
          </Button>
          <p role="status" className="min-h-6 text-[15px] text-muted">
            {result}
          </p>
        </div>
      </SheetBody>
    </Sheet>
  );
}
