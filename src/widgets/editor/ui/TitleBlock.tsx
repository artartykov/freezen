import type { ReactNode } from 'react';
import { useI18n } from '@shared/i18n';
import type { NoteVersion } from '@shared/storage';
import { AutoTextarea } from '@shared/ui/AutoTextarea';

type TitleBlockProps = {
  mark: ReactNode;
  end?: ReactNode;
  title: string;
  note: string;
  history?: NoteVersion[];
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
  history,
  placeholder,
  autoFocus,
  onTitle,
  onNote,
}: TitleBlockProps) {
  const { messages } = useI18n();

  return (
    <>
      <div className="flex items-start gap-0.5 pr-2.5 pl-3.5">
        <div className="mt-1">{mark}</div>
        <AutoTextarea
          aria-label={messages.editor.title}
          placeholder={placeholder}
          data-autofocus={autoFocus || undefined}
          value={title}
          onChange={(event) => onTitle(event.target.value.replace(/\n/g, ' '))}
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
        value={note}
        onChange={(event) => onNote(event.target.value)}
        className="mx-4 mt-2 mb-3 ml-16.5 min-h-24 w-[calc(100%-82px)] p-1.5 text-lg leading-[26px]"
      />
      {!!history?.length && (
        <details className="mx-5 mb-4">
          <summary className="cursor-pointer text-sm text-muted">
            {messages.storage.history}
          </summary>
          {history.map((version) => (
            <article
              key={JSON.stringify(version)}
              className="mt-3 rounded border border-line p-3"
            >
              <h3 className="font-medium">{version.title}</h3>
              <p className="whitespace-pre-wrap">{version.note}</p>
            </article>
          ))}
        </details>
      )}
    </>
  );
}
