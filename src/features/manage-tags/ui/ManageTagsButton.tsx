import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@shared/i18n';
import { IconButton } from '@shared/ui/IconButton';
import { ManageTagsSheet } from './ManageTagsSheet';

export function ManageTagsButton() {
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton
        aria-label={messages.tags.manage}
        onClick={() => setOpen(true)}
      >
        <Settings2 aria-hidden="true" />
      </IconButton>
      {open && <ManageTagsSheet onClose={() => setOpen(false)} />}
    </>
  );
}
