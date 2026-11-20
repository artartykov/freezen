import { useBlocker } from '@tanstack/react-router';
import { ArchiveRestore, MoreHorizontal, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '@shared/i18n';
import { waitForSave } from '@shared/storage';
import { useKeyboardOpen } from '@shared/lib';
import {
  ActionBar,
  ActionBarButton,
  ActionBarSeparator,
} from '@shared/ui/ActionBar';
import { Dialog, TextButton } from '@shared/ui/Dialog';
import { Menu } from '@shared/ui/Menu';
import type { MenuEntry } from '@shared/ui/Menu';
import { SaveFeedback } from '@shared/ui/SaveFeedback';
import { SaveButton } from '@shared/ui/SaveButton';
import { Sheet, SheetHeader } from '@shared/ui/Sheet';
import { SaveErrorDialog } from './SaveErrorDialog';

type EditorSheetProps = {
  label: string;
  isNew: boolean;
  onClose: () => void;
  onSave: () => () => void;
  draftChanged?: boolean;
  onDiscard: (submitted: boolean) => void;
  actions: ReactNode;
  menu: MenuEntry[];
  children: ReactNode;
};

export function EditorSheet({
  label,
  isNew,
  onClose,
  onSave,
  draftChanged,
  onDiscard,
  actions,
  menu,
  children,
}: EditorSheetProps) {
  const { messages } = useI18n();
  const keyboardOpen = useKeyboardOpen();
  const allowLeave = useRef(false);
  const submitted = useRef(false);
  const editorFields = useRef<HTMLFieldSetElement>(null);
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      isNew &&
      !!draftChanged &&
      !allowLeave.current &&
      (current.pathname !== next.pathname ||
        current.search.edit !== next.search.edit),
    withResolver: true,
    enableBeforeUnload: false,
  });
  const saveAttempt = useRef<AbortController | null>(null);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    function preventRepeatedEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && event.repeat) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener('keydown', preventRepeatedEscape, {
      capture: true,
    });
    return () => {
      window.removeEventListener('keydown', preventRepeatedEscape, {
        capture: true,
      });
      saveAttempt.current?.abort();
    };
  }, []);

  async function save() {
    if (saveAttempt.current) return;
    const attempt = new AbortController();
    saveAttempt.current = attempt;
    setSaving(true);
    setDismissed(false);
    try {
      const finish = onSave();
      submitted.current = true;
      if ((await waitForSave(attempt.signal)) && !attempt.signal.aborted) {
        allowLeave.current = true;
        finish();
      }
    } finally {
      saveAttempt.current = null;
      setSaving(false);
    }
  }

  function dismissError() {
    setDismissed(true);
    saveAttempt.current?.abort();
    requestAnimationFrame(() => {
      editorFields.current
        ?.querySelector<HTMLElement>('textarea')
        ?.focus({ preventScroll: true });
    });
  }

  function requestClose() {
    if (isNew && draftChanged) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  function cancelDiscard() {
    if (blocker.status === 'blocked') blocker.reset();
    setConfirmClose(false);
  }

  function discard() {
    allowLeave.current = true;
    onDiscard(submitted.current);
    if (blocker.status === 'blocked') blocker.proceed();
    else onClose();
  }

  return (
    <>
      <Sheet label={label} onClose={requestClose} size="full">
        <SheetHeader
          onBack={requestClose}
          backLabel={isNew ? messages.common.close : messages.common.back}
          backIcon={
            isNew ? <X className="size-6" aria-hidden="true" /> : undefined
          }
          end={
            isNew && (
              <SaveButton disabled={saving} onClick={() => void save()}>
                {messages.common.save}
              </SaveButton>
            )
          }
        />
        <SaveFeedback className="absolute right-3 bottom-3 z-10 rounded-lg border border-line bg-surface p-3 shadow-lg" />
        <div
          className={`min-h-0 flex-1 overflow-y-auto pb-32 ${keyboardOpen ? 'scroll-pb-4' : 'scroll-pb-32'}`}
        >
          <fieldset ref={editorFields} disabled={saving} className="min-w-0">
            {children}
          </fieldset>
        </div>
        {!keyboardOpen && !saving && (
          <ActionBar label={label}>
            {actions}
            {menu.length > 0 && (
              <>
                <ActionBarSeparator />
                <Menu
                  label={messages.editor.moreActions}
                  trigger={<MoreHorizontal />}
                  entries={menu}
                  placement="above"
                  triggerClassName="flex min-h-12 min-w-13 cursor-pointer items-center justify-center rounded-full px-4 text-focus-ring [&_svg]:size-6"
                />
              </>
            )}
          </ActionBar>
        )}
      </Sheet>
      <SaveErrorDialog onClose={dismissError} dismissed={dismissed} />
      {(confirmClose || blocker.status === 'blocked') && (
        <Dialog
          title={messages.editor.discardTitle}
          onClose={cancelDiscard}
          actions={
            <>
              <TextButton autoFocus onClick={cancelDiscard}>
                {messages.common.cancel}
              </TextButton>
              <TextButton danger onClick={discard}>
                {messages.editor.discard}
              </TextButton>
            </>
          }
        />
      )}
    </>
  );
}

export function TrashedActions({
  onRestore,
  onDelete,
}: {
  onRestore: () => void;
  onDelete: () => void;
}) {
  const { messages } = useI18n();

  return (
    <>
      <ActionBarButton onClick={onRestore}>
        <ArchiveRestore aria-hidden="true" />
        {messages.editor.restore}
      </ActionBarButton>
      <ActionBarSeparator />
      <ActionBarButton onClick={onDelete}>
        <Trash2 aria-hidden="true" />
        {messages.editor.delete}
      </ActionBarButton>
    </>
  );
}

export { ActionBarButton, ActionBarSeparator };
