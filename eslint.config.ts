import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// Flat config. During the JS/TS coexistence period: js.recommended applies to everything, TS-specific rules apply to *.ts only.
// Tampermonkey globals like GM_*/unsafeWindow are provided by globals.greasemonkey, browser DOM by globals.browser.
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'docs/**',
      // Generated file (single very long line of JSON), excluded from lint
      'src/subtitle/kanji-readings.ts',
    ],
  },
  {
    files: ['**/*.{js,mjs,ts}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.greasemonkey },
    },
    rules: {
      // Timer handles are often referenced in a closure before being assigned (e.g. toastOffer's dismiss); this is a legitimate let
      'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
      // Allow intentional discards prefixed with an underscore / a lone underscore (catch (_), placeholder parameters)
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Full-width space (U+3000), BOM (U+FEFF), etc. are legitimate in comments/regexes/templates that handle Japanese text
      'no-irregular-whitespace': [
        'error',
        { skipComments: true, skipRegExps: true, skipTemplates: true, skipStrings: true },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended],
    rules: {
      // The TS version of no-unused-vars also permits underscore discards
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Node environment: tests, build scripts, config
    files: ['test/**', 'scripts/**', '*.config.*'],
    languageOptions: { globals: { ...globals.node } },
  },
  // Disable formatting rules that conflict with Prettier (must go last)
  prettier,
);
