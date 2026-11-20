import { Link, Navigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { VoiceCaptureView } from '@features/voice-capture';
import type { VoiceCapturePhase } from '@features/voice-capture';
import { createTask } from '@shared/storage';
import { Chip } from '@shared/ui/Chip';
import { SheetHandle } from '@shared/ui/Sheet';

type Scenario = {
  name: string;
  phase: VoiceCapturePhase;
  text: string;
  tasks: string[];
  failed: boolean;
  error: string | null;
};

const scenarios: Scenario[] = [
  {
    name: 'Listening, nothing yet',
    phase: 'listening',
    text: '',
    tasks: [],
    failed: false,
    error: null,
  },
  {
    name: 'Listening, tasks forming',
    phase: 'listening',
    text: 'Call Ivan tomorrow and buy milk and',
    tasks: ['Call Ivan tomorrow', 'Buy milk'],
    failed: false,
    error: null,
  },
  {
    name: 'Paused',
    phase: 'paused',
    text: 'Call Ivan tomorrow and buy milk and send the report on Wednesday',
    tasks: ['Call Ivan tomorrow', 'Buy milk', 'Send the report on Wednesday'],
    failed: false,
    error: null,
  },
  {
    name: 'Paused, parsing failed',
    phase: 'paused',
    text: 'Call Ivan tomorrow and buy milk',
    tasks: ['Call Ivan tomorrow and buy milk'],
    failed: true,
    error: 'HTTP 401 Unauthorized: No auth credentials found',
  },
  {
    name: 'Error: no microphone access',
    phase: 'paused',
    text: '',
    tasks: [],
    failed: false,
    error: 'Microphone permission denied',
  },
];

const historyLength = 64;
const historyTickMillis = 90;

function nextLevel(previous: number) {
  const speaking = Math.random() > 0.18;
  const target = speaking ? 0.25 + Math.random() * 0.75 : Math.random() * 0.08;
  return previous * 0.4 + target * 0.6;
}

export function AiPreviewPage() {
  const [index, setIndex] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [history, setHistory] = useState<number[]>(() =>
    Array.from({ length: historyLength }, () => 0),
  );

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setHistory((current) => [
        ...current.slice(1),
        nextLevel(current[current.length - 1] ?? 0),
      ]);
    }, historyTickMillis);
    return () => clearInterval(timer);
  }, [playing]);

  if (!import.meta.env.DEV) return <Navigate to="/focus" replace />;

  const scenario = scenarios[index] ?? scenarios[0];
  const tasks = scenario.tasks.map((title) => createTask({ title }));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-4 px-4 py-6">
      <h1 className="text-[26px] font-medium">AI preview</h1>
      <p className="text-sm text-muted">
        Development only. Pick a state of the voice window. Listening shows
        Pause, paused shows Record.
      </p>
      <div role="group" aria-label="State" className="flex flex-wrap gap-2">
        {scenarios.map((item, position) => (
          <Chip
            key={item.name}
            pressed={position === index}
            onClick={() => setIndex(position)}
          >
            {item.name}
          </Chip>
        ))}
      </div>
      <div role="group" aria-label="Sound" className="flex gap-2">
        <Chip pressed={playing} onClick={() => setPlaying(!playing)}>
          {playing ? 'Pause sound' : 'Play sound'}
        </Chip>
        <Chip pressed={false} onClick={() => setHistory(history.map(() => 0))}>
          Clear sound
        </Chip>
      </div>
      <div className="flex h-[640px] flex-col overflow-hidden rounded-[22px] bg-surface shadow-[0_8px_30px_rgba(0,0,0,.18)]">
        <SheetHandle />
        <VoiceCaptureView
          phase={scenario.phase}
          text={scenario.text}
          levels={history}
          tasks={tasks}
          failed={scenario.failed}
          error={scenario.error}
          onPause={() => undefined}
          onResume={() => undefined}
          onSave={() => undefined}
          onClose={() => undefined}
          onRemove={() => undefined}
        />
      </div>
      <Link to="/settings" className="text-sm text-focus-ring underline">
        Settings, AI section
      </Link>
    </main>
  );
}
