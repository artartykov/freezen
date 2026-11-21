import { useI18n } from '@shared/i18n';
import { confirmEmptyTrash } from '../model/trash';

export function EmptyTrashButton({ keys }: { keys: string[] }) {
  const { messages } = useI18n();
  if (!keys.length) return null;

  return (
    <button
      type="button"
      onClick={() => confirmEmptyTrash(messages, keys)}
      className="h-14 min-w-47 cursor-pointer rounded-[18px] bg-accent px-6 text-[17px] font-medium text-accent-ink shadow-[0_6px_18px_rgba(0,0,0,.22)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
    >
      {messages.trash.empty(keys.length)}
    </button>
  );
}
