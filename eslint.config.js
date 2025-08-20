import { defineConfig } from 'eslint/config'
import { readFileSync } from 'node:fs'
import tseslint from 'typescript-eslint'
import tsParser from '@typescript-eslint/parser'
import perfectionist from 'eslint-plugin-perfectionist'
import pluginImportX from 'eslint-plugin-import-x'

const ignoreList = readFileSync('.prettierignore', 'utf-8')
  .split('\n')
  .filter((line) => line.trim() && !line.startsWith('#'))

const typeScriptExtensions = ['.ts', '.tsx', '.cts', '.mts']

export default defineConfig(
  tseslint.config(
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
        perfectionist,
        'import-x': pluginImportX,
      },
      rules: {
        'perfectionist/sort-imports': 'error',
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
          { includeInternal: true },
        ],
      },
    }
  )
)
