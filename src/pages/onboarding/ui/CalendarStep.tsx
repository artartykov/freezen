import { CalendarDays } from 'lucide-react';
import type { resolveI18n } from '@shared/i18n';
import { PermissionPrompt } from './PermissionPrompt';

type CalendarStepProps = {
  copy: ReturnType<typeof resolveI18n>['messages']['onboarding']['calendar'];
  skip: string;
  continueLabel: string;
  permissionStatus: ReturnType<
    typeof resolveI18n
  >['messages']['onboarding']['permissionStatus'];
  onContinue: () => void;
};

export function CalendarStep({
  copy,
  skip,
  continueLabel,
  permissionStatus,
  onContinue,
}: CalendarStepProps) {
  return (
    <PermissionPrompt
      {...copy}
      skip={skip}
      continueLabel={continueLabel}
      permission="calendar"
      permissionStatus={permissionStatus}
      icon={
        <CalendarDays
          className="mb-2 size-[123px] shrink-0 text-accent"
          aria-hidden="true"
        />
      }
      preview={{ ...copy.preview, icon: '10' }}
      onContinue={onContinue}
    />
  );
}
