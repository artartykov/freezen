import path from 'node:path';
import { runLspQuery } from './lsp-query.mjs';

const root = path.resolve(import.meta.dirname, '..');
const workspaceTimeout = 180_000;

async function diagnostics(lsp, file, root, textDocument) {
  const { items } = await lsp.request('textDocument/diagnostic', {
    textDocument,
  });
  const relative = path.relative(root, file);
  const lines = items.map(({ range: { start }, code, message }) => {
    const at = `${relative}:${start.line + 1}:${start.character + 1}`;
    return `${at}  ${code ?? 'rust-analyzer'}: ${message}`;
  });
  return [...lines, items.length + ' diagnostic(s)'].join('\n');
}

async function ready(lsp) {
  const status = await lsp.waitForNotification(
    'experimental/serverStatus',
    ({ quiescent }) => quiescent,
    workspaceTimeout,
  );
  if (status.health === 'error') {
    throw new Error(
      status.message ?? 'rust-analyzer could not load the workspace',
    );
  }
}

await runLspQuery({
  entry: import.meta.filename,
  root,
  workspace: path.join(root, 'src-tauri'),
  server: { executable: 'rust-analyzer' },
  initialize: () => ({
    capabilities: {
      experimental: { serverStatusNotification: true },
      textDocument: { diagnostic: {} },
    },
    initializationOptions: {
      checkOnSave: false,
      files: { watcher: 'server' },
    },
  }),
  ready,
  daemonTimeout: workspaceTimeout + 120_000,
  symbolOptions: { searchScope: 'workspace', searchKind: 'allSymbols' },
  languageId: () => 'rust',
  hookExtension: /\.rs$/,
  diagnostics,
});
