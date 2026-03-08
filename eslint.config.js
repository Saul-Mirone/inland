import tsParser from '@typescript-eslint/parser'
import pluginImportX from 'eslint-plugin-import-x'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

import oxfmtrc from './.oxfmtrc.json' with { type: 'json' }

const ignoreList = oxfmtrc.ignorePatterns

const typeScriptExtensions = ['.ts', '.tsx', '.cts', '.mts']

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
      '@typescript-eslint': tseslint.plugin,
      'import-x': pluginImportX,
    },
    rules: {
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          ignoreVoid: false,
          ignoreIIFE: false,
        },
      ],
      '@typescript-eslint/await-thenable': 'error',
      'import-x/no-extraneous-dependencies': [
        'error',
        { includeInternal: true, whitelist: ['@inland/frontend'] },
      ],
    },
  }
)
