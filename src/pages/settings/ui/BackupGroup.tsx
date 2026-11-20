import { Download, Upload } from 'lucide-react';
import { useState } from 'react';
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
  const { messages } = useI18n();
  const m = messages.storage;
  const status = useSaveStatus((value) => value.kind);
  const [mode, setMode] = useState<'export' | 'import' | null>(null);
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);

  function restore() {
    let data;
    try {
      data = parseData(text);
    } catch {
      setInvalid(true);
      return;
    }
    askConfirm({
      title: m.importBackup,
      text: m.replaceWarning,
      confirm: m.replaceBackup,
      danger: true,
      onConfirm: () => {
        if (useSaveStatus.getState().kind !== 'saved') return;
        replaceData(data);
        setMode(null);
        setText('');
      },
    });
  }

  async function readBackup(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    setText('');
    setInvalid(false);
    try {
      const contents = await file.text();
      if (input.isConnected && input.files?.[0] === file) setText(contents);
    } catch {
      if (input.isConnected && input.files?.[0] === file) setInvalid(true);
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([text], { type: 'application/json' }),
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
        onClick={() => {
          setText(serializeData(getData()));
          setMode('export');
        }}
      />
      <Row
        icon={<Upload />}
        hue="bg-scheduled"
        title={m.importBackup}
        disabled={status !== 'saved'}
        onClick={() => {
          setText('');
          setInvalid(false);
          setMode('import');
        }}
      />
      {mode && (
        <li className="space-y-2 px-4 pb-4">
          {mode === 'import' && (
            <input
              type="file"
              accept=".json,application/json"
              aria-label={m.chooseBackup}
              className="w-full"
              onChange={(event) => void readBackup(event.currentTarget)}
            />
          )}
          <textarea
            aria-label={m.backupJson}
            className="min-h-24 w-full rounded border border-line p-2 font-mono"
            value={text}
            readOnly={mode === 'export'}
            onChange={(event) => {
              setText(event.target.value);
              setInvalid(false);
            }}
            onFocus={(event) => {
              if (mode === 'export') event.currentTarget.select();
            }}
          />
          {invalid && mode === 'import' && (
            <p role="alert">{m.invalidBackup}</p>
          )}
          <div className="flex gap-4">
            {mode === 'export' ? (
              <button
                type="button"
                className="cursor-pointer underline"
                onClick={download}
              >
                {m.downloadBackup}
              </button>
            ) : (
              <button
                type="button"
                className="cursor-pointer underline disabled:opacity-50"
                disabled={status !== 'saved' || !text.trim()}
                onClick={restore}
              >
                {m.importBackup}
              </button>
            )}
            <button
              type="button"
              className="cursor-pointer underline"
              onClick={() => {
                setMode(null);
                setText('');
              }}
            >
              {messages.common.close}
            </button>
          </div>
        </li>
      )}
    </SettingsGroup>
  );
}
