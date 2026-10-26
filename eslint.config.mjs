import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["app.js"],
    ...js.configs.recommended,
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        L: "readonly",
        Papa: "readonly"
      }
    }
  }
];