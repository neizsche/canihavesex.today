import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Pure-logic tests run under Node. Component tests can opt into jsdom
    // per-file with `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
