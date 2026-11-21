import { useBlocker } from '@tanstack/react-router';
import { ArrowUp, AudioLines, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  clearTaskDraft,
  isTaskDraftChanged,
  resetTaskDraft,
  saveTaskDraft,
  updateTaskDraft,
} from '@features/create-task';
import { useI18n } from '@shared/i18n';
import { useOverlay } from '@shared/model';
import { changeData, deleteTasks, waitForSave } from '@shared/storage';
import type { Task } from '@shared/storage';
import { AutoTextarea } from '@shared/ui/AutoTextarea';
import { Dialog, TextButton } from '@shared/ui/Dialog';
import { Modal } from '@shared/ui/Modal';
import { SaveFeedback } from '@shared/ui/SaveFeedback';
import { useComposerFocus } from '../model/useComposerFocus';
import { useDescriptionDrag } from '../model/useDescriptionDrag';
import { ComposerToolbar } from './ComposerToolbar';
import { SaveErrorDialog } from './SaveErrorDialog';

export function TaskComposer({ task }: { task: Task }) {
  const { messages } = useI18n();
  const text = messages.composer;
  const overlay = useOverlay();
  const title = useRef<HTMLTextAreaElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const lastInput = useRef<HTMLTextAreaElement>(null);
  const discardPanel = useRef<HTMLDivElement>(null);
  const { capture, restore, clear: clearFocus } = useComposerFocus(area);
  const allowLeave = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const submitted = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const { expanded, panel, reset, handle } = useDescriptionDrag(
    Boolean(task.note.trim() || task.starred),
  );
  const changed = isTaskDraftChanged({ kind: 'task', task });
  const hasContent = Boolean(task.title || changed);
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      !allowLeave.current &&
      (hasContent || submitted.current !== null) &&
      (current.pathname !== next.pathname ||
        current.search.edit !== next.search.edit),
    withResolver: true,
    enableBeforeUnload: false,
  });

  useEffect(() => () => pending.current?.abort(), []);

  function change(fields: Partial<Task>) {
    if (pending.current) return;
    updateTaskDraft({ kind: 'task', task: { ...task, ...fields } });
  }

  function focusTitle() {
    title.current?.focus({ preventScroll: true });
  }

  async function send() {
    if (!task.title.trim() || pending.current) return;
    clearFocus();
    const attempt = new AbortController();
    pending.current = attempt;
    submitted.current = task.id;
    setSaving(true);
    setErrorDismissed(false);
    try {
      saveTaskDraft(
        { kind: 'task', task },
        { task: messages.task.untitled, item: messages.reference.itemUntitled },
      );
      if (!(await waitForSave(attempt.signal)) || attempt.signal.aborted)
        return;
      submitted.current = null;
      focusTitle();
      resetTaskDraft();
      reset();
      area.current
        ?.querySelector('[data-composer-track]')
        ?.scrollTo({ left: 0 });
    } finally {
      pending.current = null;
      setSaving(false);
    }
  }

  function dismissError() {
    setErrorDismissed(true);
    pending.current?.abort();
    requestAnimationFrame(focusTitle);
  }

  function requestClose() {
    if (hasContent || submitted.current) {
      setConfirmClose(true);
      return;
    }
    clearTaskDraft();
    overlay.close();
  }

  function escape() {
    const menu = area.current?.querySelector<HTMLElement>(
      '[data-composer-menu]:popover-open',
    );
    if (menu) menu.hidePopover();
    else requestClose();
  }

  function discard() {
    pending.current?.abort();
    allowLeave.current = true;
    const id = submitted.current;
    if (id) changeData((data) => deleteTasks(data, [id]));
    clearTaskDraft();
    if (blocker.status === 'blocked') blocker.proceed();
    else overlay.close();
  }

  function keepDraft() {
    discardPanel.current?.closest('dialog')?.close();
    if (blocker.status === 'blocked') blocker.reset();
    setConfirmClose(false);
    const input = lastInput.current;
    if (input?.isConnected && !input.closest('[inert]'))
      input.focus({ preventScroll: true });
    else focusTitle();
  }

  return (
    <>
      <Modal
        label={messages.editor.toDo}
        onClose={requestClose}
        onEscape={escape}
        closeLabel={messages.common.close}
      >
        <div className="absolute inset-x-0 bottom-[max(12px,env(safe-area-inset-bottom))] mx-auto flex max-h-[calc(100%-24px)] w-[calc(100%-24px)] max-w-[416px] flex-col">
          <SaveFeedback className="absolute right-0 bottom-full mb-2 rounded-lg border border-line bg-card px-3 py-2 text-sm shadow-lg" />
          <div
            ref={area}
            data-task-composer
            onPointerDownCapture={capture}
            onFocusCapture={({ target }) => {
              if (target instanceof HTMLTextAreaElement)
                lastInput.current = target;
            }}
            className="min-h-0 overflow-y-auto rounded-[28px] bg-card px-3.5 pb-3.5 shadow-[0_12px_36px_rgba(0,0,0,.25)]"
          >
            <button
              type="button"
              {...handle}
              aria-label={expanded ? text.hideNotes : text.showNotes}
              aria-expanded={expanded}
              disabled={saving}
              className="-mx-3.5 grid h-6 w-[calc(100%+28px)] touch-none cursor-grab place-items-center active:cursor-grabbing focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
            >
              <span
                className="h-1 w-6 rounded-full bg-muted/40"
                aria-hidden="true"
              />
            </button>
            <div className="flex items-start gap-1">
              <AutoTextarea
                ref={title}
                data-autofocus
                aria-label={messages.task.untitled}
                placeholder={messages.task.untitled}
                value={task.title}
                aria-readonly={saving}
                onBeforeInput={(event) => {
                  if (pending.current) event.preventDefault();
                }}
                onChange={(event) =>
                  change({ title: event.target.value.replace(/\n/g, ' ') })
                }
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || event.nativeEvent.isComposing)
                    return;
                  event.preventDefault();
                  void send();
                }}
                className="min-w-0 flex-1 px-0.5 py-2 text-[22px] leading-7 font-medium"
              />
              {expanded && (
                <button
                  type="button"
                  aria-label={
                    task.starred
                      ? messages.task.removeFromFocus
                      : messages.task.addToFocus
                  }
                  data-composer-action
                  aria-pressed={task.starred}
                  disabled={saving}
                  onClick={() => {
                    change({ starred: !task.starred });
                    restore();
                  }}
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-muted aria-pressed:text-star aria-pressed:[&_svg]:fill-current focus-visible:outline-2 focus-visible:outline-focus-ring"
                >
                  <Star aria-hidden="true" className="size-6" />
                </button>
              )}
            </div>
            <div
              ref={panel}
              inert={!expanded}
              data-expanded={expanded || undefined}
              className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out data-expanded:grid-rows-[1fr] data-dragging:transition-none motion-reduce:transition-none"
            >
              <div className="min-h-0 overflow-hidden">
                <AutoTextarea
                  aria-label={messages.editor.notes}
                  placeholder={messages.editor.notes}
                  value={task.note}
                  aria-readonly={saving}
                  onBeforeInput={(event) => {
                    if (pending.current) event.preventDefault();
                  }}
                  onChange={(event) => change({ note: event.target.value })}
                  className="my-1 min-h-14 w-full px-0.5 py-1 text-base leading-6"
                />
              </div>
            </div>
            <ComposerToolbar
              task={task}
              onChange={change}
              saving={saving}
              restoreFocus={restore}
            >
              <button
                type="button"
                data-composer-action
                onClick={() => void send()}
                aria-label={hasContent ? text.send : text.voice}
                disabled={saving || !task.title.trim()}
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[15px] bg-accent text-accent-ink disabled:cursor-default disabled:bg-surface disabled:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring [&_svg]:size-6"
              >
                {hasContent ? (
                  <ArrowUp aria-hidden="true" />
                ) : (
                  <AudioLines aria-hidden="true" />
                )}
              </button>
            </ComposerToolbar>
          </div>
        </div>
      </Modal>
      <SaveErrorDialog
        onClose={dismissError}
        dismissed={errorDismissed}
        onResolved={focusTitle}
      />
      {(confirmClose || blocker.status === 'blocked') && (
        <Dialog
          title={messages.editor.discardTitle}
          panelRef={discardPanel}
          onClose={keepDraft}
          suppressFocus
          actions={
            <>
              <TextButton onClick={keepDraft}>
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
