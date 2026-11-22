import { defineConfig } from 'vitest/config';

/**
 * The test files that launch a browser and judge its frames. They wait up to
 * ninety seconds for a page to draw, and timed out, a different case each
 * time, when the rest of the suite was loading every core beside them. So
 * they run as a group of their own once the other files are done, where the
 * only load on the machine is each other.
 */
const BROWSER = ['apps/web/src/__tests__/world.test.ts', 'apps/web/src/__tests__/select.test.ts', 'apps/atis/src/__tests__/png.test.ts'];

const EXCLUDE = ['**/node_modules/**', '**/dist/**'];

export default defineConfig({
  // Workspace packages resolve to their TypeScript source under the `source`
  // export condition, so tests never need a build; Node takes `default` (dist/)
  // at runtime. Vite reads the node-side list from `ssr.resolve`, so the
  // condition goes there too, ahead of Vite's own server defaults.
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source', 'module', 'node', 'development|production'] } },
  test: {
    // Two groups, the second started when the first has finished: everything that runs in Node, then the browser's files. Each names its own files, since a project that extends this config adds to a list it finds here and never replaces it.
    projects: [
      { extends: true, test: { name: 'node', include: ['**/src/**/*.{test,spec}.{ts,tsx}', '**/test/**/*.{test,spec}.ts'], exclude: [...EXCLUDE, ...BROWSER], sequence: { groupOrder: 0 } } },
      { extends: true, test: { name: 'browser', include: BROWSER, exclude: EXCLUDE, sequence: { groupOrder: 1 } } },
    ],
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
