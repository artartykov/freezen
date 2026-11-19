import { X } from 'lucide-react';
import { TaskCheck, TaskRow } from '@entities/task';
import { useI18n } from '@shared/i18n';
import { todayIso } from '@shared/lib';
import { Button } from '@shared/ui/Button';
import { EmptyState } from '@shared/ui/EmptyState';
import { SaveButton } from '@shared/ui/SaveButton';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import {
  closeCapture,
  removeDraft,
  saveCapture,
  stopCapture,
  useCapture,
} from '../model/voiceCapture';

function LevelBar({ level, label }: { level: number; label: string }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={level}
      className="h-3 w-full overflow-hidden rounded-full bg-line"
    >
      <div
        className="h-full rounded-full bg-accent motion-safe:transition-[width] motion-safe:duration-150"
        style={{ width: `${Math.round(level * 100)}%` }}
      />
    </div>
  );
}

export function VoiceCaptureHost() {
  const { messages } = useI18n();
  const m = messages.capture;
  const { phase, text, level, tasks, failed, error } = useCapture();
  const today = todayIso();

  if (phase === 'closed') return null;

  const reviewing = phase === 'review';

  return (
    <Sheet label={m.title} onClose={closeCapture} size="full">
      <SheetHeader
        title={m.title}
        onBack={closeCapture}
        backLabel={m.discard}
        end={
          reviewing && tasks.length > 0 ? (
            <SaveButton onClick={saveCapture}>
              {m.save(tasks.length)}
            </SaveButton>
          ) : undefined
        }
      />
      <SheetBody>
        {tasks.length === 0 ? (
          <EmptyState text={error ? m.error : m.empty} centered={false} />
        ) : (
          <ul className="m-0 list-none overflow-hidden rounded-[22px] bg-card p-0 py-1">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                onOpen={() => undefined}
                leading={
                  <span
                    className="grid size-11 flex-none place-items-center"
                    aria-hidden="true"
                  >
                    <TaskCheck done={false} />
                  </span>
                }
                trailing={
                  reviewing ? (
                    <button
                      type="button"
                      aria-label={m.remove}
                      onClick={() => removeDraft(task.id)}
                      className="grid size-11 flex-none cursor-pointer place-items-center rounded-xl text-muted"
                    >
                      <X className="size-5" aria-hidden="true" />
                    </button>
                  ) : null
                }
              />
            ))}
          </ul>
        )}
        {failed && reviewing && (
          <p className="mt-3 px-2 text-sm text-muted">{m.fallback}</p>
        )}
      </SheetBody>
      <div className="flex flex-col gap-3 px-4 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <p
          aria-live="polite"
          className="min-h-12 text-[17px] leading-6 text-ink"
        >
          {text || (phase === 'finishing' ? m.finishing : m.listening)}
        </p>
        <LevelBar level={level} label={m.level} />
        {phase === 'listening' && (
          <Button onClick={() => void stopCapture()}>{m.stop}</Button>
        )}
      </div>
    </Sheet>
  );
}
