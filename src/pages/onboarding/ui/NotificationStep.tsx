import { Bell } from 'lucide-react';
import type { resolveI18n } from '@shared/i18n';
import { Logo } from '@shared/ui/Logo';
import { PermissionPrompt } from './PermissionPrompt';

type NotificationStepProps = {
  copy: ReturnType<
    typeof resolveI18n
  >['messages']['onboarding']['notifications'];
  skip: string;
  onContinue: () => void;
};

export function NotificationStep({
  copy,
  skip,
  onContinue,
}: NotificationStepProps) {
  return (
    <PermissionPrompt
      {...copy}
      skip={skip}
      icon={
        <Bell
          className="mb-2 size-[123px] shrink-0 text-accent"
          aria-hidden="true"
        />
      }
      preview={{
        ...copy.preview,
        icon: <Logo className="size-7 fill-accent-ink" />,
      }}
      onContinue={onContinue}
    />
  );
}
