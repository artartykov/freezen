import { useI18n } from '@shared/i18n';
import { Sheet } from '@shared/ui/Sheet';
import { VoiceCaptureView } from './VoiceCaptureView';
import {
  closeCapture,
  pauseCapture,
  removeDraft,
  resumeCapture,
  saveCapture,
  useCapture,
} from '../model/capture';

export function VoiceCaptureHost() {
  const { messages } = useI18n();
  const { phase, text, levels, tasks, failed, error, trace } = useCapture();

  if (phase === 'closed') return null;

  return (
    <Sheet label={messages.capture.title} onClose={closeCapture} size="full">
      <VoiceCaptureView
        phase={phase}
        text={text}
        levels={levels}
        tasks={tasks}
        failed={failed}
        error={error}
        trace={trace}
        onPause={() => void pauseCapture()}
        onResume={() => void resumeCapture()}
        onSave={saveCapture}
        onClose={closeCapture}
        onRemove={removeDraft}
      />
    </Sheet>
  );
}
