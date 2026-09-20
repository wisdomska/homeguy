import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const HEX_MESSAGE =
  'No hex colour literals in components. Every colour is a token in src/styles/tokens.css — ' +
  'use var(--clay-500) and friends. If the colour you need is not a token, it is not in the ' +
  'brand guide, and the answer is to decide it there rather than invent it here.';

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // ---- the token rule ----
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]',
          message: HEX_MESSAGE,
        },
        {
          selector: 'TemplateElement[value.raw=/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]',
          message: HEX_MESSAGE,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // The design export used <img> for one 192px thumbnail; next/image
      // would ship a loader we do not need for a fixed-size WebP.
      '@next/next/no-img-element': 'off',
    },
  },
  {
    // Tokens and the logo are where colour values are allowed to exist.
    files: ['src/components/Logo.tsx', 'src/core/tokens.ts', 'src/core/__tests__/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
