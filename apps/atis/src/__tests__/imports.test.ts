import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, beforeAll, expect, test } from 'vitest';

import { parseFallowEntryPoints, parseWorkspaceGlobs, scanImports } from '../sources/index.js';
import type { Scan, ScannedFile } from '../sources/index.js';

/**
 * The fixture tree is written from these strings into a `mkdtemp` directory, so
 * no `.ts` fixture is ever committed and neither the gate nor fallow ever sees
 * it (D42). It stands in for the `git archive` extraction the scan is handed.
 */
const WORKSPACE: Readonly<Record<string, string>> = {
  'pnpm-workspace.yaml': `packages:
  - 'apps/*'
  - 'libs/*'

allowBuilds:
  fallow: true
`,
  'package.json': `{ "name": "fixture", "private": true }\n`,
  'README.md': `# fixture\n`,
  'apps/cli/package.json': `{
  "name": "@scope/cli",
  "type": "module",
  "bin": { "cli": "./dist/cli.js" },
  "exports": { ".": { "source": "./src/index.ts", "default": "./dist/index.js" } }
}
`,
  'apps/cli/src/cli.ts': `import { run } from './index.js';

run({ verbose: false });
`,
  'apps/cli/src/index.ts': `import chalk from 'chalk';
import { helper } from './helpers/index.js';
import { greet as hello } from 'shared';
import type { Options } from './types.js';
import './polyfill.js';

export * from './types.js';

export function run(options: Options): string {
  return chalk(hello(helper(options)));
}

export async function load(): Promise<unknown> {
  return import('./lazy.js');
}
`,
  'apps/cli/src/helpers/index.ts': `export function helper(value: unknown): unknown {
  return value;
}
`,
  'apps/cli/src/types.ts': `export type Options = { readonly verbose: boolean };

export const DEFAULTS: Options = { verbose: false };
`,
  'apps/cli/src/polyfill.ts': `export const READY = true;\n`,
  'apps/cli/src/lazy.ts': `export const LAZY = 'lazy';\n`,
  'apps/cli/src/__tests__/index.test.ts': `import { run } from '../index.js';

run({ verbose: true });
`,
  'libs/shared/package.json': `{
  "name": "shared",
  "type": "module",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./harness": "./src/__tests__/harness.ts",
    "./styles": "./styles.css"
  }
}
`,
  'libs/shared/src/index.ts': `export { greet } from './greet.js';
export * as view from './view.js';
`,
  'libs/shared/src/greet.ts': `export function greet(value: unknown): string {
  return String(value);
}

export const HELLO = 'hello';
`,
  'libs/shared/src/view.tsx': `import { greet } from './greet.js';

export function View(): unknown {
  return <div className={greet('x')} />;
}
`,
  'libs/shared/src/__tests__/harness.ts': `import { greet } from '../greet.js';

export const sample = greet('sample');
`,
  'libs/shared/styles.css': `.view { color: red; }\n`,
};

/** A repo with no workspace file: the root package is the only member (D43). */
const FLAT: Readonly<Record<string, string>> = {
  'package.json': `{ "name": "flat", "type": "module", "main": "src/index.ts" }\n`,
  'src/index.ts': `import { value } from './lib/value.js';

export const app = value;
`,
  'src/lib/value.ts': `export const value = 1;\n`,
};

function writeTree(root: string, tree: Readonly<Record<string, string>>): string {
  for (const [path, content] of Object.entries(tree)) {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return root;
}

function fileIn(scan: Scan, path: string): ScannedFile {
  const found = scan.files.find((file) => file.path === path);
  if (found === undefined) throw new Error(`no file ${path} in the scan`);
  return found;
}

let workspace: string;
let flat: string;
let scan: Scan;

beforeAll(() => {
  workspace = writeTree(mkdtempSync(join(tmpdir(), 'atis-scan-')), WORKSPACE);
  flat = writeTree(mkdtempSync(join(tmpdir(), 'atis-flat-')), FLAT);
  scan = scanImports(workspace);
});

afterAll(() => {
  rmSync(workspace, { recursive: true, force: true });
  rmSync(flat, { recursive: true, force: true });
});

test('every tracked file is listed, classified and sorted, whether it is parsed or not', () => {
  expect(scan.files.map((file) => [file.path, file.kind])).toEqual([
    ['README.md', 'other'],
    ['apps/cli/package.json', 'other'],
    ['apps/cli/src/__tests__/index.test.ts', 'test'],
    ['apps/cli/src/cli.ts', 'source'],
    ['apps/cli/src/helpers/index.ts', 'source'],
    ['apps/cli/src/index.ts', 'source'],
    ['apps/cli/src/lazy.ts', 'source'],
    ['apps/cli/src/polyfill.ts', 'source'],
    ['apps/cli/src/types.ts', 'source'],
    ['libs/shared/package.json', 'other'],
    ['libs/shared/src/__tests__/harness.ts', 'test'],
    ['libs/shared/src/greet.ts', 'source'],
    ['libs/shared/src/index.ts', 'source'],
    ['libs/shared/src/view.tsx', 'source'],
    ['libs/shared/styles.css', 'other'],
    ['package.json', 'other'],
    ['pnpm-workspace.yaml', 'other'],
  ]);
  expect(fileIn(scan, 'libs/shared/src/greet.ts').loc).toBe(4);
  expect(fileIn(scan, 'README.md')).toEqual({ path: 'README.md', loc: 0, kind: 'other', exports: [] });
});

test('exports are the names a file declares, with `export * from` passing the target on', () => {
  expect(fileIn(scan, 'apps/cli/src/types.ts').exports).toEqual(['DEFAULTS', 'Options']);
  expect(fileIn(scan, 'apps/cli/src/index.ts').exports).toEqual(['DEFAULTS', 'Options', 'load', 'run']);
  expect(fileIn(scan, 'libs/shared/src/index.ts').exports).toEqual(['greet', 'view']);
  expect(fileIn(scan, 'libs/shared/src/view.tsx').exports).toEqual(['View']);
});

test('every specifier resolves the way NodeNext would, and npm packages are dropped', () => {
  expect(scan.edges).toEqual([
    { from: 'apps/cli/src/__tests__/index.test.ts', to: 'apps/cli/src/index.ts', names: ['run'], line: 1 },
    { from: 'apps/cli/src/cli.ts', to: 'apps/cli/src/index.ts', names: ['run'], line: 1 },
    { from: 'apps/cli/src/index.ts', to: 'apps/cli/src/helpers/index.ts', names: ['helper'], line: 2 },
    { from: 'apps/cli/src/index.ts', to: 'libs/shared/src/index.ts', names: ['greet'], line: 3 },
    { from: 'apps/cli/src/index.ts', to: 'apps/cli/src/types.ts', names: ['Options'], line: 4 },
    { from: 'apps/cli/src/index.ts', to: 'apps/cli/src/polyfill.ts', names: [], line: 5 },
    { from: 'apps/cli/src/index.ts', to: 'apps/cli/src/types.ts', names: ['*'], line: 7 },
    { from: 'apps/cli/src/index.ts', to: 'apps/cli/src/lazy.ts', names: [], line: 14 },
    { from: 'libs/shared/src/__tests__/harness.ts', to: 'libs/shared/src/greet.ts', names: ['greet'], line: 1 },
    { from: 'libs/shared/src/index.ts', to: 'libs/shared/src/greet.ts', names: ['greet'], line: 1 },
    { from: 'libs/shared/src/index.ts', to: 'libs/shared/src/view.tsx', names: ['*'], line: 2 },
    { from: 'libs/shared/src/view.tsx', to: 'libs/shared/src/greet.ts', names: ['greet'], line: 1 },
  ]);
});

test('members come from the workspace globs, entries from bin, main and exports', () => {
  expect(scan.members).toEqual([
    { name: 'fixture', dir: '.', entry: [] },
    { name: '@scope/cli', dir: 'apps/cli', entry: ['apps/cli/src/cli.ts', 'apps/cli/src/index.ts'] },
    { name: 'shared', dir: 'libs/shared', entry: ['libs/shared/src/index.ts'] },
  ]);
});

test('without a workspace file the root package stands alone', () => {
  const rootOnly = scanImports(flat);
  expect(rootOnly.members).toEqual([{ name: 'flat', dir: '.', entry: ['src/index.ts'] }]);
  expect(rootOnly.edges).toEqual([{ from: 'src/index.ts', to: 'src/lib/value.ts', names: ['value'], line: 1 }]);
});

test('the same tree scans the same way twice', () => {
  expect(scanImports(workspace)).toEqual(scan);
});

test('parseWorkspaceGlobs reads the block list, the flow list and exclusions', () => {
  expect(parseWorkspaceGlobs(WORKSPACE['pnpm-workspace.yaml'] ?? '')).toEqual(['apps/*', 'libs/*']);
  expect(parseWorkspaceGlobs("packages:\n  - packages/**\n  - '!**/__fixtures__/**'\n")).toEqual([
    'packages/**',
    '!**/__fixtures__/**',
  ]);
  expect(parseWorkspaceGlobs(`packages: ['apps/*', "libs/*"]\n`)).toEqual(['apps/*', 'libs/*']);
  expect(parseWorkspaceGlobs('onlyBuiltDependencies:\n  - fallow\n')).toEqual([]);
});

test('parseFallowEntryPoints collapses the ./ segments fallow leaves in workspace paths', () => {
  const stdout = JSON.stringify({
    entry_point_count: 4,
    entry_points: [
      { path: 'libs/core/./src/index.ts', source: 'package.json main' },
      { path: 'apps/atis/src/cli.ts', source: 'manual entry' },
      { path: 'apps/atis/src/cli.ts', source: 'package.json main' },
      { path: 'apps/atis/tsconfig.json', source: 'typescript' },
    ],
  });
  expect(parseFallowEntryPoints(stdout)).toEqual([
    'apps/atis/src/cli.ts',
    'apps/atis/tsconfig.json',
    'libs/core/src/index.ts',
  ]);
  expect(() => parseFallowEntryPoints('{"ok":true}')).toThrow(/entry_points/);
});
