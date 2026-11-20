import { Trash2 } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import { changeData, deleteTag, getData, tagUsageCount } from '@shared/storage';
import type { Tag } from '@shared/storage';

type DeleteTagButtonProps = {
  tag: Tag;
  contact?: boolean;
  onDeleted: () => void;
};

export function DeleteTagButton({
  tag,
  contact,
  onDeleted,
}: DeleteTagButtonProps) {
  const { messages } = useI18n();

  function confirmDelete() {
    const count = tagUsageCount(getData(), tag.id);
    askConfirm({
      title: contact
        ? messages.editor.deleteContact
        : messages.tags.deleteTitle,
      text: count
        ? messages.tags.deleteUsed(tag.name, count)
        : messages.tags.deleteUnused(tag.name),
      confirm: messages.editor.delete,
      danger: true,
      onConfirm: () => {
        changeData((data) => deleteTag(data, tag.id));
        onDeleted();
      },
    });
  }

  return (
    <button
      type="button"
      onClick={confirmDelete}
      className="mt-4.5 flex min-h-13 w-full cursor-pointer items-center gap-4 rounded-xl px-3 text-left text-[17px] font-medium text-danger focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
    >
      <Trash2 className="size-6" aria-hidden="true" />
      {contact ? messages.editor.delete : messages.tags.delete}
    </button>
  );
}
