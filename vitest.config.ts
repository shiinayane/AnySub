import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts: unit tests don't need vite-plugin-monkey's userscript wrapping/entry transformation.
// Site-adapter tests inject their own globalThis.location/document stubs, so the node environment is enough (no jsdom needed).
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
