import globals from "globals";
import pluginJs from "@eslint/js";


export default [
  {languageOptions: { 
    globals: {
    ...globals.browser,
    mapboxgl: 'readonly',
    MapboxGeocoder: 'readonly',
  },
  },},
  pluginJs.configs.recommended,
];