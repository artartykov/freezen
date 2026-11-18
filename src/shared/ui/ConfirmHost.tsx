import { closeConfirm, useConfirm } from '@shared/model';
import { Dialog, TextButton } from './Dialog';

export function ConfirmHost({ cancelLabel }: { cancelLabel: string }) {
  const request = useConfirm((state) => state.request);
  if (!request) return null;

  return (
    <Dialog
      key={request.title}
      title={request.title}
      text={request.text}
      onClose={closeConfirm}
      actions={
        <>
          {request.cancel !== '' && (
            <TextButton onClick={closeConfirm}>
              {request.cancel ?? cancelLabel}
            </TextButton>
          )}
          <TextButton
            danger={request.danger}
            onClick={() => {
              closeConfirm();
              request.onConfirm();
            }}
          >
            {request.confirm}
          </TextButton>
        </>
      }
    />
  );
}
