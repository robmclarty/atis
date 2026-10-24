import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Workspace packages resolve to their TypeScript source under the `source`
  // export condition, so tests never need a build; Node takes `default` (dist/)
  // at runtime. Vite reads the node-side list from `ssr.resolve`, so the
  // condition goes there too, ahead of Vite's own server defaults.
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source', 'module', 'node', 'development|production'] } },
  test: {
    include: ['**/src/**/*.{test,spec}.{ts,tsx}', '**/test/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: ['**/src/**/*.{ts,tsx}'],
      exclude: [
        '**/src/**/*.{test,spec}.{ts,tsx}',
        '**/src/**/*.d.ts',
        // Entries a test cannot load in-process: the CLI's bin runs as a child,
        // and the world's GPU code runs only in a browser, judged by its frames.
        '**/src/cli.ts',
        'apps/web/src/world/**',
        '**/node_modules/**',
        '**/dist/**',
      ],
      reporter: ['text', 'json-summary', 'json'],
      reportsDirectory: '.check/coverage',
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
