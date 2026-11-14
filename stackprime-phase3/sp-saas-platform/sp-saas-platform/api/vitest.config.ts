import { defineConfig } from 'vitest/config';

export default defineConfig({
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'node',
    setupFiles: ['test/setup.ts'],
    testTimeout: 60_000,
    fileParallelism: false, // tests share one database
  },
});
