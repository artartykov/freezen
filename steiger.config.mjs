import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    files: ['./src/features/**'],
    rules: { 'fsd/excessive-slicing': 'off' },
  },
]);
