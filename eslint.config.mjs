import js from '@eslint/js';
import globals from 'globals';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: true,
    jsx: false,
  }),
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js, '@stylistic': stylistic },
    extends: ['js/recommended'],
    ignores: ['examples/**/*.js'],
    languageOptions: {
      globals: {
        L: 'readonly',
        bb: 'readonly',
        d3: 'readonly',
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['off'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
      '@stylistic/max-len': ['off'],
      '@stylistic/max-statements-per-line': ['off'],
      '@stylistic/operator-linebreak': ['error', 'after', { 'overrides': { '?': 'ignore', ':': 'ignore' } }],
      '@stylistic/quote-props': ['error', 'consistent'],
      '@stylistic/quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': 'always' }],
    },
  },
]);

// export default {
//   extends: ['eslint:recommended', 'google'],
//   parserOptions: {
//     ecmaVersion: 'latest',
//     sourceType: 'module',
//   },
//   env: {
//     browser: true,
//   },
//   ignorePatterns: ['examples/**/*.js'],
//   globals: {
//     L: 'readonly',
//   },
//   rules: {
//     'object-curly-spacing': 'off',
//     'max-len': 'off',
//   },
// };
