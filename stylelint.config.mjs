export default {
  'extends': 'stylelint-config-standard',
  'plugins': [
    '@stylistic/stylelint-plugin',
  ],
  'rules': {
    'declaration-empty-line-before': null,
    'declaration-block-no-redundant-longhand-properties': null,
    '@stylistic/color-hex-case': 'lower',
    '@stylistic/number-leading-zero': 'always',
    '@stylistic/unit-case': 'lower',
  },
};
