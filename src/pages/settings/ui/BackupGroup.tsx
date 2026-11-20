import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useI18n } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import {
  getData,
  parseData,
  replaceData,
  serializeData,
  useSaveStatus,
} from '@shared/storage';
import { Row, SettingsGroup } from './SettingsParts';

export function BackupGroup() {
  const {
    messages: { storage: m },
  } = useI18n();
  const status = useSaveStatus((value) => value.kind);
  const input = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);
  const [reading, setReading] = useState(false);

  async function readBackup(field: HTMLInputElement) {
    const file = field.files?.[0];
    if (!file) return;
    setInvalid(false);
    setReading(true);
    try {
      const data = parseData(await file.text());
      if (field.isConnected)
        askConfirm({
          title: m.importBackup,
          text: m.replaceWarning,
          confirm: m.replaceBackup,
          danger: true,
          onConfirm: () => {
            if (useSaveStatus.getState().kind === 'saved') replaceData(data);
          },
        });
    } catch {
      setInvalid(true);
    } finally {
      field.value = '';
      setReading(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([serializeData(getData())], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'freezen-backup.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <SettingsGroup title={m.backup}>
      <Row
        icon={<Download />}
        hue="bg-next"
        title={m.exportBackup}
        onClick={download}
      />
      <Row
        icon={<Upload />}
        hue="bg-scheduled"
        title={m.importBackup}
        disabled={reading || status !== 'saved'}
        onClick={() => input.current?.click()}
      />
      <li className={invalid ? 'px-4 pb-4' : 'hidden'}>
        <input
          ref={input}
          hidden
          type="file"
          accept=".json,application/json"
          aria-label={m.chooseBackup}
          onChange={(event) => void readBackup(event.currentTarget)}
        />
        {invalid && <p role="alert">{m.invalidBackup}</p>}
      </li>
    </SettingsGroup>
  );
}
