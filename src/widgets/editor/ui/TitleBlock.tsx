import type { ReactNode } from 'react';
import { useI18n } from '@shared/i18n';
import { AutoTextarea } from '@shared/ui/AutoTextarea';
import { useText } from '../model/useText';

type TitleBlockProps = {
  mark: ReactNode;
  end?: ReactNode;
  title: string;
  note: string;
  placeholder: string;
  autoFocus: boolean;
  onTitle: (title: string) => void;
  onNote: (note: string) => void;
};

export function TitleBlock({
  mark,
  end,
  title,
  note,
  placeholder,
  autoFocus,
  onTitle,
  onNote,
}: TitleBlockProps) {
  const { messages } = useI18n();
  const titleField = useText(title, onTitle);
  const noteField = useText(note, onNote);

  return (
    <>
      <div className="flex items-start gap-0.5 pr-2.5 pl-3.5">
        <div className="mt-1">{mark}</div>
        <AutoTextarea
          aria-label={messages.editor.title}
          placeholder={placeholder}
          data-autofocus={autoFocus || undefined}
          value={titleField.value}
          onChange={(event) =>
            titleField.onChange(event.target.value.replace(/\n/g, ' '))
          }
          onBlur={titleField.onBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault();
          }}
          className="min-w-0 flex-1 px-1.5 py-[7px] text-[26px] leading-8 font-medium"
        />
        {end && <div className="mt-1">{end}</div>}
      </div>
      <AutoTextarea
        aria-label={messages.editor.notes}
        placeholder={messages.editor.notes}
        value={noteField.value}
        onChange={(event) => noteField.onChange(event.target.value)}
        onBlur={noteField.onBlur}
        className="mx-4 mt-2 mb-3 ml-16.5 min-h-24 w-[calc(100%-82px)] p-1.5 text-lg leading-[26px]"
      />
    </>
  );
}
