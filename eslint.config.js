import config from 'eslint-config-xo';
import {defineConfig} from 'eslint/config';

// eslint.config.js
export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        document: "readonly",
        window: "readonly",
        L: "readonly",
      },
    },
  },
];
