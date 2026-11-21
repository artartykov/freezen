import { Check } from 'lucide-react';
import { toDataURL } from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@shared/i18n';
import {
  approvePairing,
  cancelInvitation,
  rejectPairing,
  startInvitation,
  useSyncStore,
} from '@shared/sync';
import { Dialog, TextButton } from '@shared/ui/Dialog';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';

export function SyncInvitation({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const text = messages.sync;
  const invitation = useSyncStore((state) => state.invitation);
  const request = useSyncStore((state) => state.request);
  const invitationError = useSyncStore((state) => state.invitationError);
  const [approving, setApproving] = useState(false);
  const completed = useRef(false);

  useEffect(() => {
    void startInvitation();
    return () => {
      if (!completed.current) cancelInvitation();
    };
  }, []);

  const errors = {
    expired: text.expired,
    offline: text.noConnection,
    failed: text.failed,
  };

  return (
    <>
      <Sheet label={text.pairingCode} onClose={onClose}>
        <SheetHeader
          title={text.pairingCode}
          onBack={onClose}
          backLabel={messages.common.back}
        />
        <SheetBody>
          {invitationError ? (
            <div className="mt-6 text-center">
              <p role="status" className="text-muted">
                {errors[invitationError]}
              </p>
              <TextButton
                onClick={() => {
                  setApproving(false);
                  void startInvitation();
                }}
              >
                {text.newCode}
              </TextButton>
            </div>
          ) : invitation ? (
            <InvitationCode
              key={invitation.expiresAt}
              code={invitation.code}
              expiresAt={invitation.expiresAt}
            />
          ) : (
            <p role="status" className="mt-6 text-center text-muted">
              {text.preparing}
            </p>
          )}
        </SheetBody>
      </Sheet>
      {request && (
        <Dialog
          title={text.connectTitle(request.name)}
          text={text.connectText}
          onClose={() => {
            if (!approving) rejectPairing(request.id);
          }}
          actions={
            <>
              <TextButton
                disabled={approving}
                onClick={() => rejectPairing(request.id)}
              >
                {text.decline}
              </TextButton>
              <TextButton
                disabled={approving}
                onClick={() => {
                  setApproving(true);
                  void approvePairing(request.id).then((approved) => {
                    setApproving(false);
                    if (!approved) return;
                    completed.current = true;
                    onClose();
                  });
                }}
              >
                {approving ? text.connecting : text.connect}
              </TextButton>
            </>
          }
        />
      )}
    </>
  );
}

function secondsUntil(expiresAt: number) {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

function InvitationCode({
  code,
  expiresAt,
}: {
  code: string;
  expiresAt: number;
}) {
  const { messages } = useI18n();
  const text = messages.sync;
  const raw = code.replace('-', '');
  const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
  const [source, setSource] = useState('');
  const [remaining, setRemaining] = useState(() => secondsUntil(expiresAt));
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, '0');

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(secondsUntil(expiresAt));
    }, 250);
    return () => window.clearInterval(interval);
  }, [expiresAt]);
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed'>();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void toDataURL(formatted, { width: 208, margin: 4 })
      .then((url) => {
        if (active) setSource(url);
      })
      .catch(() => {});
    return () => {
      active = false;
      window.clearTimeout(timer.current);
    };
  }, [formatted]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(formatted);
      window.clearTimeout(timer.current);
      setCopyStatus('copied');
      timer.current = window.setTimeout(() => setCopyStatus(undefined), 1500);
    } catch {
      window.clearTimeout(timer.current);
      setCopyStatus('failed');
    }
  }

  return (
    <div className="text-center">
      <p className="mx-2 mt-2 mb-4 text-sm text-muted">
        {text.enterOnOtherDevice}
      </p>
      <p role="timer" className="mb-2 text-sm text-muted tabular-nums">
        {text.codeExpiresIn(`${minutes}:${seconds}`)}
      </p>
      <div className="mx-auto grid size-52 max-w-full place-items-center overflow-hidden rounded-xl bg-white">
        {source && (
          <img src={source} alt={text.pairingCode} width={208} height={208} />
        )}
      </div>
      <output
        aria-label={text.pairingCode}
        className="mt-3 block font-mono text-[22px] font-medium tracking-[.12em]"
      >
        {formatted}
      </output>
      <button
        type="button"
        className="mt-2 inline-grid min-h-11 cursor-pointer grid-cols-[1rem_auto_1rem] items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-focus-ring focus-visible:outline-2 focus-visible:outline-focus-ring"
        onClick={() => void copyCode()}
      >
        <Check
          className={`size-4 ${copyStatus === 'copied' ? 'opacity-100' : 'opacity-0 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out'}`}
          aria-hidden="true"
        />
        {text.copyCode}
      </button>
      <p
        role="status"
        className={copyStatus === 'failed' ? 'text-sm text-danger' : 'sr-only'}
      >
        {copyStatus === 'copied'
          ? text.copied
          : copyStatus === 'failed'
            ? text.copyFailed
            : ''}
      </p>
    </div>
  );
}
