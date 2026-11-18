import { useLocation, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useI18n } from '@shared/i18n';

export function BackToSearch() {
  const { messages } = useI18n();
  const router = useRouter();
  const fromSearch = useLocation({
    select: (location) => location.state.fromSearch === true,
  });

  if (!fromSearch) return null;

  return (
    <button
      type="button"
      aria-label={messages.search.backLabel}
      onClick={() => router.history.back()}
      className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full pr-3.5 pl-2 text-[15px] font-medium focus-visible:outline-3 focus-visible:outline-focus-ring"
    >
      <ChevronLeft className="size-[22px]" aria-hidden="true" />
      {messages.search.back}
    </button>
  );
}
