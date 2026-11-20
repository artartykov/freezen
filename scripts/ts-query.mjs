import { createRequire } from 'node:module';
import path from 'node:path';
import { runLspQuery } from './lsp-query.mjs';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);

async function diagnostics(lsp, file, root) {
  const items = [];
  for (const command of [
    'syntacticDiagnosticsSync',
    'semanticDiagnosticsSync',
  ]) {
    const response = await lsp.request('workspace/executeCommand', {
      command: 'typescript.tsserverRequest',
      arguments: [command, { file, includeLinePosition: true }],
    });
    if (!response?.body)
      throw new Error(
        response?.message ?? 'TypeScript diagnostics unavailable',
      );
    items.push(...response.body);
  }
  const relative = path.relative(root, file);
  const lines = items.map(
    ({ startLocation: { line, offset }, code, message }) =>
      `${relative}:${line}:${offset}  TS${code}: ${message}`,
  );
  return [...lines, items.length + ' diagnostic(s)'].join('\n');
}

await runLspQuery({
  entry: import.meta.filename,
  root,
  workspace: root,
  server: {
    executable: 'npx',
    args: ['--yes', 'typescript-language-server', '--stdio'],
    shell: process.platform === 'win32',
  },
  initialize: () => ({
    capabilities: {},
    initializationOptions: {
      preferences: { disableSuggestions: true },
      tsserver: {
        path: require.resolve('typescript/lib/tsserver.js'),
        useSyntaxServer: 'never',
      },
    },
  }),
  symbolFile: path.join(root, 'src/app/App.tsx'),
  languageId: (file) =>
    file.endsWith('.tsx') ? 'typescriptreact' : 'typescript',
  hookExtension: /\.(ts|tsx|mts|cts)$/,
  diagnostics,
});
