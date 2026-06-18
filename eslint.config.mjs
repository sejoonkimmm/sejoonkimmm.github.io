import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Real bugs (unused vars, unescaped entities, hooks deps, a11y) still
      // fail the build. `any` in the markdown renderers is flagged but does
      // not block; type it out incrementally.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
export default eslintConfig;
