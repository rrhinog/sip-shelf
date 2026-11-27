import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // ADR 0002: only the storage module touches the database.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/storage/**'],
    rules: {
      'no-restricted-imports': ['error', { paths: [{ name: 'dexie', message: 'Use the Shelf from src/storage/shelf.ts (ADR 0002).' }] }],
      'no-restricted-globals': ['error', { name: 'indexedDB', message: 'Use the Shelf from src/storage/shelf.ts (ADR 0002).' }],
    },
  },
);
