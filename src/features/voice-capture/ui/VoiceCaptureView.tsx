import { ArrowUp, Pause, RotateCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TaskCheck, TaskRow } from '@entities/task';
import { useI18n } from '@shared/i18n';
import { todayIso } from '@shared/lib';
import type { Task } from '@shared/storage';
import { EmptyState } from '@shared/ui/EmptyState';
import { SheetBody, SheetHeader } from '@shared/ui/Sheet';
import { LevelHistory } from './LevelHistory';

const barButton =
  'grid size-16 flex-none cursor-pointer place-items-center rounded-[22px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring [&_svg]:size-7';

const toggleDelayMillis = 500;

export type VoiceCapturePhase = 'listening' | 'paused';

function RecordToggle({
  phase,
  pauseLabel,
  recordLabel,
  onPause,
  onResume,
}: {
  phase: VoiceCapturePhase;
  pauseLabel: string;
  recordLabel: string;
  onPause: () => void;
  onResume: () => void;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setArmed(true), toggleDelayMillis);
    return () => clearTimeout(timer);
  }, []);

  if (phase === 'paused') {
    return (
      <button
        type="button"
        aria-label={recordLabel}
        onClick={armed ? onResume : undefined}
        className={`${barButton} bg-glow text-ink`}
      >
        <RotateCw aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={pauseLabel}
      onClick={armed ? onPause : undefined}
      className={`${barButton} bg-glow text-ink`}
    >
      <Pause strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}

type VoiceCaptureViewProps = {
  phase: VoiceCapturePhase;
  text: string;
  levels: number[];
  tasks: Task[];
  failed: boolean;
  error: string | null;
  onPause: () => void;
  onResume: () => void;
  onSave: () => void;
  onClose: () => void;
  onRemove: (id: string) => void;
};

export function VoiceCaptureView({
  phase,
  text,
  levels,
  tasks,
  failed,
  error,
  onPause,
  onResume,
  onSave,
  onClose,
  onRemove,
}: VoiceCaptureViewProps) {
  const { messages } = useI18n();
  const m = messages.capture;
  const today = todayIso();
  const reviewing = phase === 'paused';

  return (
    <>
      <SheetHeader title={m.title} onBack={onClose} backLabel={m.discard} />
      <SheetBody>
        {tasks.length === 0 ? (
          <EmptyState text={m.empty} centered={false} />
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
                  <button
                    type="button"
                    aria-label={m.remove}
                    onClick={() => onRemove(task.id)}
                    className="grid size-11 flex-none cursor-pointer place-items-center rounded-xl text-muted"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
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
        {error && (
          <p role="alert" className="text-center text-sm text-danger">
            {error}
          </p>
        )}
        {reviewing && (
          <p className="text-center text-[17px] font-medium">{m.paused}</p>
        )}
        <div
          aria-live="polite"
          className={`flex h-12 items-center justify-end overflow-hidden text-[17px] leading-6 [mask-image:linear-gradient(to_right,transparent,black_2.5rem)] ${reviewing ? 'text-muted' : 'text-ink'}`}
        >
          <span className="flex-none whitespace-nowrap">
            {text || (reviewing ? '' : m.listening)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <RecordToggle
            key={phase === 'paused' ? 'record' : 'pause'}
            phase={phase}
            pauseLabel={m.pause}
            recordLabel={m.record}
            onPause={onPause}
            onResume={onResume}
          />
          <div
            className={`min-w-0 flex-1 motion-safe:transition-opacity ${reviewing ? 'opacity-40' : ''}`}
          >
            <LevelHistory levels={levels} label={m.level} />
          </div>
          <button
            type="button"
            aria-label={m.save(tasks.length)}
            disabled={tasks.length === 0}
            onClick={onSave}
            className={`${barButton} bg-accent text-accent-ink disabled:cursor-default disabled:opacity-40`}
          >
            <ArrowUp strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}
