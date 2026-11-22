import { Flag } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { dueOffset } from '../lib/due';

export function DueBadge({ due, today }: { due: string; today: string }) {
  const { messages } = useI18n();
  const offset = dueOffset(due, today);
  let label = messages.task.dueToday;
  if (offset > 0) label = messages.task.daysLeft(offset);
  if (offset < 0) label = messages.task.daysLate(-offset);

  return (
    <span
      className={`inline-flex items-center shrink-0 gap-1 whitespace-nowrap text-xs ${
        offset <= 0 ? 'text-danger' : 'text-muted'
      }`}
    >
      <Flag className="size-3.5" fill="currentColor" aria-hidden="true" />
      {label}
    </span>
  );
}
