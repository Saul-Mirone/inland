import tsParser from '@typescript-eslint/parser';
import pluginImportX from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';

import oxfmtrc from './.oxfmtrc.json' with { type: 'json' };

const ignoreList = oxfmtrc.ignorePatterns;

const typeScriptExtensions = ['.ts', '.tsx', '.cts', '.mts'];

export default defineConfig(
  {
    ignores: ignoreList,
  },
  {
    settings: {
      react: {
        version: 'detect',
      },
      'import-x/parsers': {
        '@typescript-eslint/parser': typeScriptExtensions,
      },
      'import-x/resolver': {
        typescript: true,
      },
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      parserOptions: {
        project: './tsconfig.eslint.json',
      },
    },
  },
  {
    files: [...typeScriptExtensions].map((ext) => `**/*${ext}`),
    plugins: {
      'import-x': pluginImportX,
    },
    rules: {
      'import-x/no-extraneous-dependencies': [
        'error',
        { includeInternal: true, whitelist: ['@inland/frontend'] },
      ],
    },
  },
  {
    files: ['packages/frontend/src/**/*.tsx'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/config': 'error',
      'react-hooks/error-boundaries': 'error',
      'react-hooks/component-hook-factories': 'error',
      'react-hooks/gating': 'error',
      'react-hooks/globals': 'error',
      'react-hooks/immutability': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
      'react-hooks/purity': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/set-state-in-render': 'error',
      'react-hooks/static-components': 'error',
      'react-hooks/unsupported-syntax': 'error',
      'react-hooks/use-memo': 'error',
      'react-hooks/incompatible-library': 'error',
    },
  }
);
