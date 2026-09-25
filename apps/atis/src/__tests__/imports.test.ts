import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { identifyModules } from 'core';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { parseFallowEntryPoints, parseManifestWorkspaces, parseWorkspaceGlobs, scanImports } from '../sources/index.js';
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

/**
 * An npm or bun repo (D64): `workspaces` is an array, `./` prefixes and all,
 * and a `!` glob drops a member the way it would in `pnpm-workspace.yaml`.
 */
const NPM: Readonly<Record<string, string>> = {
  'package.json': `{ "name": "npm-root", "private": true, "workspaces": ["./packages/*", "!packages/legacy"] }\n`,
  'packages/a/package.json': `{ "name": "@npm/a", "main": "src/index.ts" }\n`,
  'packages/a/src/index.ts': `export const a = 1;\n`,
  'packages/b/package.json': `{ "name": "@npm/b", "exports": { ".": "./src/index.ts" } }\n`,
  'packages/b/src/index.ts': `import { a } from '@npm/a';
import { legacy } from '@npm/legacy';

export const b = a + legacy;
`,
  'packages/legacy/package.json': `{ "name": "@npm/legacy", "main": "src/index.ts" }\n`,
  'packages/legacy/src/index.ts': `export const legacy = 0;\n`,
};

/** The `apps/*` and `libs/*` members a yarn repo and a two-manifest repo share. */
const APPS_AND_LIBS: Readonly<Record<string, string>> = {
  'apps/web/package.json': `{ "name": "web", "main": "src/index.ts" }\n`,
  'apps/web/src/index.ts': `import { util } from 'util-lib';

export const web = util;
`,
  'libs/util/package.json': `{ "name": "util-lib" }\n`,
  'libs/util/src/index.ts': `export const util = 1;\n`,
};

/** A yarn repo: `workspaces` is an object whose `packages` holds the globs. */
const YARN: Readonly<Record<string, string>> = {
  'package.json': `{
  "name": "yarn-root",
  "private": true,
  "workspaces": { "packages": ["apps/*", "libs/*"], "nohoist": ["**/react"] }
}
`,
  ...APPS_AND_LIBS,
};

/** Both manifests: pnpm never reads `workspaces`, so `pnpm-workspace.yaml` wins. */
const BOTH: Readonly<Record<string, string>> = {
  'pnpm-workspace.yaml': `packages:\n  - 'libs/*'\n`,
  'package.json': `{ "name": "both", "private": true, "workspaces": ["apps/*", "libs/*"] }\n`,
  ...APPS_AND_LIBS,
};

function writeTree(root: string, tree: Readonly<Record<string, string>>): string {
  for (const [path, content] of Object.entries(tree)) {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return root;
}

const scratch: string[] = [];

/** Write a tree into its own `mkdtemp` directory and scan it; `afterAll` removes it. */
function scanTree(tree: Readonly<Record<string, string>>): Scan {
  const dir = writeTree(mkdtempSync(join(tmpdir(), 'atis-tree-')), tree);
  scratch.push(dir);
  return scanImports(dir);
}

function packageCells(found: Scan): readonly string[] {
  const roots = found.members.map((member) => member.dir);
  return identifyModules(found.files, found.edges, roots)
    .cells.filter((cell) => cell.kind === 'package')
    .map((cell) => cell.path);
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
  for (const dir of [workspace, flat, ...scratch]) rmSync(dir, { recursive: true, force: true });
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

test('without a workspace file or a workspaces field the root package stands alone', () => {
  const rootOnly = scanImports(flat);
  expect(rootOnly.members).toEqual([{ name: 'flat', dir: '.', entry: ['src/index.ts'] }]);
  expect(rootOnly.edges).toEqual([{ from: 'src/index.ts', to: 'src/lib/value.ts', names: ['value'], line: 1 }]);
});

test('the workspaces array npm and bun write names the members, exclusions and all', () => {
  const npm = scanTree(NPM);
  expect(npm.members).toEqual([
    { name: 'npm-root', dir: '.', entry: [] },
    { name: '@npm/a', dir: 'packages/a', entry: ['packages/a/src/index.ts'] },
    { name: '@npm/b', dir: 'packages/b', entry: ['packages/b/src/index.ts'] },
  ]);
  expect(npm.edges).toEqual([
    { from: 'packages/b/src/index.ts', to: 'packages/a/src/index.ts', names: ['a'], line: 1 },
  ]);
  // The excluded `legacy` is no member, so its files fall to the root package.
  expect(packageCells(npm)).toEqual(['.', 'packages/a', 'packages/b']);
});

test("yarn's workspaces object names the members through its packages", () => {
  const yarn = scanTree(YARN);
  expect(yarn.members).toEqual([
    { name: 'yarn-root', dir: '.', entry: [] },
    { name: 'web', dir: 'apps/web', entry: ['apps/web/src/index.ts'] },
    { name: 'util-lib', dir: 'libs/util', entry: [] },
  ]);
  expect(yarn.edges).toEqual([
    { from: 'apps/web/src/index.ts', to: 'libs/util/src/index.ts', names: ['util'], line: 1 },
  ]);
  expect(packageCells(yarn)).toEqual(['apps/web', 'libs/util']);
});

test('pnpm-workspace.yaml wins when a workspaces field sits beside it', () => {
  const both = scanTree(BOTH);
  expect(both.members.map((member) => member.dir)).toEqual(['.', 'libs/util']);
  // `apps/web` is a member only in the ignored `workspaces`, so it stays in the root package.
  expect(packageCells(both)).toEqual(['.', 'libs/util']);
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

test('parseManifestWorkspaces reads the array, the yarn object and exclusions', () => {
  expect(parseManifestWorkspaces('{ "workspaces": ["packages/*", "!packages/legacy"] }')).toEqual([
    'packages/*',
    '!packages/legacy',
  ]);
  expect(parseManifestWorkspaces('{ "workspaces": { "packages": ["apps/*"], "nohoist": ["**/react"] } }')).toEqual([
    'apps/*',
  ]);
  expect(parseManifestWorkspaces('{ "workspaces": { "nohoist": ["**/react"] } }')).toEqual([]);
  expect(parseManifestWorkspaces('{ "name": "flat" }')).toEqual([]);
  expect(parseManifestWorkspaces('{ "name": ')).toEqual([]);
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
