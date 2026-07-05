import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// Flat config. JS 与 TS 共存期间:js.recommended 作用于全部,TS 专属规则仅作用于 *.ts。
// GM_*/unsafeWindow 等油猴全局由 globals.greasemonkey 提供,浏览器 DOM 由 globals.browser 提供。
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'docs/**',
      // 生成文件(单行超长 JSON),不参与 lint
      'src/kanji-readings.js',
      'src/kanji-readings.ts',
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
      // 定时器句柄常在闭包里先被引用、赋值在后(如 toastOffer 的 dismiss),这属合法 let
      'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
      // 允许下划线开头/单下划线的有意丢弃(catch (_)、占位参数)
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // 全角空格(U+3000)、BOM(U+FEFF)等在日文文本处理的注释/正则/模板里是合法的
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
      // TS 版 no-unused-vars 同样放行下划线丢弃
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
    // Node 环境:测试、构建脚本、配置
    files: ['test/**', 'scripts/**', 'vite.config.*', 'eslint.config.*'],
    languageOptions: { globals: { ...globals.node } },
  },
  // 关闭与 Prettier 冲突的格式化类规则(必须放最后)
  prettier,
);
