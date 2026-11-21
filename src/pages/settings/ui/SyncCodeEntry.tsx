import { X } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useI18n } from '@shared/i18n';
import { cancelPairing, enterPairingCode, useSyncStore } from '@shared/sync';
import { Dialog, TextButton } from '@shared/ui/Dialog';
import { Modal } from '@shared/ui/Modal';

const slotIds = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
] as const;
const codeLength = slotIds.length;

export function SyncCodeEntry({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const text = messages.sync;
  const pairing = useSyncStore((state) => state.pairing);
  const [slots, setSlots] = useState<string[]>(() =>
    Array.from({ length: codeLength }, () => ''),
  );
  const latestSlots = useRef(slots);
  const fields = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => cancelPairing, []);

  function close() {
    cancelPairing();
    onClose();
  }

  function focusSlot(index: number) {
    const field = fields.current[index];
    field?.focus({ preventScroll: true });
    field?.select();
  }

  function applyInput(index: number, value: string) {
    const characters = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const start = characters.length === codeLength ? 0 : index;
    const next = [...latestSlots.current];
    if (!characters) next[start] = '';
    for (const [offset, character] of [
      ...characters.slice(0, codeLength - start),
    ].entries()) {
      next[start + offset] = character;
    }
    latestSlots.current = next;
    setSlots(next);
    const code = next.join('');
    if (code.length === codeLength) {
      void enterPairingCode(code);
    } else if (characters) {
      focusSlot(Math.min(start + characters.length, codeLength - 1));
    }
  }

  function handleKeys(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'Backspace' && !latestSlots.current[index] && index > 0) {
      event.preventDefault();
      applyInput(index - 1, '');
      focusSlot(index - 1);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusSlot(index - 1);
    } else if (event.key === 'ArrowRight' && index < codeLength - 1) {
      event.preventDefault();
      focusSlot(index + 1);
    }
  }

  const outcome = {
    connecting: text.connecting,
    waiting: text.waiting,
    paired: text.paired,
    rejected: text.rejected,
  };

  if (
    pairing === 'connecting' ||
    pairing === 'waiting' ||
    pairing === 'paired' ||
    pairing === 'rejected'
  ) {
    return (
      <Dialog
        title={text.connectingTitle}
        onClose={close}
        actions={
          <TextButton onClick={close}>
            {pairing === 'connecting' || pairing === 'waiting'
              ? messages.common.cancel
              : messages.common.close}
          </TextButton>
        }
      >
        <p className="mb-5 text-muted" role="status">
          {outcome[pairing]}
        </p>
      </Dialog>
    );
  }

  const errors = {
    'invalid-code': text.invalidCode,
    offline: text.noConnection,
    expired: text.expired,
    failed: text.failed,
    idle: '',
  };

  return (
    <Modal
      label={text.enterCode}
      onClose={close}
      closeLabel={messages.common.close}
    >
      <div className="absolute inset-x-0 bottom-[max(12px,env(safe-area-inset-bottom))] mx-auto flex max-h-[calc(100%-24px)] w-[calc(100%-24px)] max-w-[416px] flex-col">
        <div className="min-h-0 overflow-y-auto rounded-[28px] bg-card px-3.5 pt-2 pb-3.5 shadow-[0_12px_36px_rgba(0,0,0,.25)] motion-safe:animate-pop">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={messages.common.close}
              className="grid size-11 cursor-pointer place-items-center rounded-xl focus-visible:outline-2 focus-visible:outline-focus-ring"
              onClick={close}
            >
              <X className="size-6" aria-hidden="true" />
            </button>
            <h2 className="text-[22px] font-medium">{text.enterCode}</h2>
          </div>
          <div className="grid h-7 grid-cols-[auto_minmax(0,1fr)] items-center gap-1 text-[clamp(10px,3.4vw,12px)] leading-3.5">
            <span id="sync-code-label" className="text-muted">
              {text.codeFromDevice}
            </span>
            <span role="status" className="line-clamp-2 text-right text-danger">
              {slots.every(Boolean) ? errors[pairing] : ''}
            </span>
          </div>
          <div
            role="group"
            aria-labelledby="sync-code-label"
            className="mt-1 grid grid-cols-[repeat(4,minmax(0,1fr))_0.65rem_repeat(4,minmax(0,1fr))] items-center gap-1"
          >
            {slotIds.map((id, index) => (
              <Fragment key={id}>
                {index === codeLength / 2 && (
                  <span className="text-center text-muted" aria-hidden="true">
                    -
                  </span>
                )}
                <input
                  ref={(node) => {
                    fields.current[index] = node;
                  }}
                  type="text"
                  aria-label={text.codeCharacter(index + 1)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  data-autofocus={index === 0 || undefined}
                  value={slots[index]}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => applyInput(index, event.target.value)}
                  onPaste={(event) => {
                    event.preventDefault();
                    applyInput(index, event.clipboardData.getData('text'));
                  }}
                  onKeyDown={(event) => handleKeys(event, index)}
                  className="h-12 w-full min-w-0 rounded-xl border border-line text-center font-mono focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
                />
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
