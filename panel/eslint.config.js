import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import unusedImports from 'eslint-plugin-unused-imports';
import ts from 'typescript-eslint';
import globals from 'globals';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    plugins: {
      'unused-imports': unusedImports
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  },
  // Frontend (browser)
  {
    files: ['frontend/src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  // Frontend (Svelte)
  {
    files: ['frontend/src/**/*.svelte'],
    languageOptions: {
      globals: {
        ...globals.browser
      },
      parserOptions: {
        parser: ts.parser
      }
    },
    rules: {
      'svelte/require-each-key': 'off',
      'svelte/prefer-writable-derived': 'off'
    }
  },
  // Backend (node)
  {
    files: ['backend/src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    ignores: ['**/node_modules/', '**/dist/', '**/.svelte-kit/', '**/public-dist/']
  }
);
