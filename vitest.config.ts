import { defineConfig } from 'vitest/config';

// 独立于 vite.config.js:单测不需要 vite-plugin-monkey 的 userscript 包装/入口转换。
// 站点适配器测试自行注入 globalThis.location/document 桩,故 node 环境即可(无需 jsdom)。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/subtitle/kanji-readings.*'],
    },
  },
});
