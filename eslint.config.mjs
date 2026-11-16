import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import prettier from 'eslint-config-prettier/flat';
import noComments from './scripts/no-comments.mjs';

export default defineConfig([
  globalIgnores(['dist/**', 'node_modules/**', 'src-tauri/**', '**/target/**']),
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,mts,cts,jsx}'],
    linterOptions: { noInlineConfig: true },
    plugins: {
      local: { rules: { 'no-comments': noComments } },
    },
    rules: { 'local/no-comments': 'error' },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx,mts}'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.{ts,mts}', 'e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  prettier,
]);
