import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { buildMap, findPublicNames } from 'core';
import type { MapJson } from 'core';
import { afterAll, expect, test } from 'vitest';

import { scanImports } from '../sources/index.js';
import type { Scan, ScannedFile } from '../sources/index.js';

/**
 * JavaScript as terrain (D184): the TypeScript producer reads `.js`, `.jsx`,
 * `.mjs` and `.cjs` files, ES modules and CommonJS alike, without running
 * them. Each tree is written from these strings into a `mkdtemp` directory, so
 * no JavaScript fixture is ever committed (D42).
 */

/** A published ES-module package: a barrel, a JSX component, an `.mjs` module, a test, a tool's config and a committed build. */
const ESM: Readonly<Record<string, string>> = {
  'package.json': `{ "name": "esm-demo", "type": "module", "exports": { ".": "./src/index.js" } }\n`,
  'src/index.js': `export { area } from './shapes.js';
export * from './colors.mjs';
export { default as Button } from './Button.jsx';
`,
  'src/shapes.js': `import { square } from './math/index.js';

export function area(width, height) {
  return width * height;
}

export const UNIT = square(1);
`,
  'src/math/index.js': `export function square(value) {\n  return value * value;\n}\n`,
  'src/colors.mjs': `import chalk from 'chalk';

const where = './lazy.js';

export const RED = chalk('#f00');
export const load = () => import('./lazy.js');
export const later = () => import(where);
`,
  'src/lazy.js': `export default 'lazy';\n`,
  'src/Button.jsx': `export default function Button({ label }) {\n  return <button>{label}</button>;\n}\n`,
  'src/__tests__/shapes.test.js': `import { area } from '../shapes.js';\n\narea(2, 3);\n`,
  'vite.config.js': `export default { test: {} };\n`,
  'dist/index.js': `export const built = 1;\n`,
};

/** A published CommonJS package: `require()` in each of its shapes, and `module.exports` and `exports.<name>` writing its names. */
const CJS: Readonly<Record<string, string>> = {
  'package.json': `{ "name": "cjs-demo", "main": "lib/index.js" }\n`,
  'lib/index.js': `'use strict';
const { area, perimeter: around } = require('./shapes');
const colors = require('./colors.cjs');

module.exports = { area, around, colors, version: '1.0.0', ...require('./extra') };
`,
  'lib/shapes.js': `const path = require('node:path');
const lodash = require('lodash');

exports.area = function (width, height) {
  return width * height;
};

exports.perimeter = (width, height) => 2 * (width + height);

module.exports.unit = lodash.identity(path.sep.length);
`,
  'lib/colors.cjs': `module.exports = require('./palette.js');\n`,
  'lib/palette.js': `module.exports = { RED: '#f00', BLUE: '#00f' };\n`,
  'lib/extra.js': `exports['extra'] = true;\n`,
  'lib/plugins.js': `const where = './shapes';
const later = \`./palette\`;

module.exports = function load(name) {
  return [require(where), require(later), require('./' + name)];
};
`,
  'lib/side.js': `require('./palette.js');\n\nconst { RED } = require('./palette.js');\n\nmodule.exports = require('./palette.js').BLUE;\n`,
  'test/shapes.test.js': `const { area } = require('../lib/shapes');\n\narea(1, 2);\n`,
  'eslint.config.cjs': `module.exports = [];\n`,
};

const scratch: string[] = [];

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** Write a tree into its own `mkdtemp` directory and scan it; `afterAll` removes it. */
function scanTree(tree: Readonly<Record<string, string>>): Scan {
  const root = mkdtempSync(join(tmpdir(), 'atis-javascript-'));
  scratch.push(root);
  for (const [path, content] of Object.entries(tree)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return scanImports(root);
}

function fileIn(scan: Scan, path: string): ScannedFile {
  const found = scan.files.find((file) => file.path === path);
  if (found === undefined) throw new Error(`no file ${path} in the scan`);
  return found;
}

/** The map of a change from `base` to `head` that modified `path`, with no history and no `.check/`. */
function changeMap(base: Scan, head: Scan, path: string): MapJson {
  return buildMap({
    meta: { repo: 'fixture', base: 'main', head: 'head', merge_base: 'base', generated_at: '' },
    base,
    head,
    diff: [{ path, kind: 'modified', added: 1, deleted: 1, hunks: [{ start: 4, count: 1 }] }],
    deps_added: [],
    commits: [],
    head_time: 0,
    check: { mode: 'git-only', reason: '.check/ is absent' },
  });
}

test('the producer reads .js, .jsx and .mjs as source or test, and marks an index.js its directory\'s barrel (D4, D184)', () => {
  const scan = scanTree(ESM);
  expect(scan.files.map((file) => [file.path, file.kind, file.barrel ?? false])).toEqual([
    // A barrel by its name, which the shore's build row then takes (D84).
    ['dist/index.js', 'source', true],
    ['package.json', 'other', false],
    ['src/Button.jsx', 'source', false],
    ['src/__tests__/shapes.test.js', 'test', false],
    ['src/colors.mjs', 'source', false],
    ['src/index.js', 'source', true],
    ['src/lazy.js', 'source', false],
    ['src/math/index.js', 'source', true],
    ['src/shapes.js', 'source', false],
    ['vite.config.js', 'source', false],
  ]);
  expect(fileIn(scan, 'src/shapes.js')).toMatchObject({ loc: 5, code: [{ start: 3, end: 5 }, { start: 7, end: 7 }], packages: [] });
  expect(fileIn(scan, 'src/colors.mjs').packages).toEqual(['chalk']);
  expect(fileIn(scan, 'src/Button.jsx').functions).toEqual([{ name: 'Button', line: 1, line_count: 3 }]);
});

test('ES imports and exports in JavaScript become edges and exports, and a non-literal import() is left out (D184)', () => {
  const scan = scanTree(ESM);
  expect(scan.edges.map((edge) => [edge.from, edge.to, edge.names, edge.line, edge.reexports])).toEqual([
    ['src/__tests__/shapes.test.js', 'src/shapes.js', ['area'], 1, undefined],
    ['src/colors.mjs', 'src/lazy.js', [], 6, undefined],
    ['src/index.js', 'src/shapes.js', ['area'], 1, [{ name: 'area', as: 'area' }]],
    ['src/index.js', 'src/colors.mjs', ['*'], 2, [{ name: '*', as: '*' }]],
    ['src/index.js', 'src/Button.jsx', ['default'], 3, [{ name: 'default', as: 'Button' }]],
    ['src/shapes.js', 'src/math/index.js', ['square'], 1, undefined],
  ]);
  // The star passes on every name the `.mjs` module declares.
  expect(fileIn(scan, 'src/index.js').exports).toEqual(['Button', 'RED', 'area', 'later', 'load']);
  expect(Object.fromEntries(findPublicNames([scan]))).toEqual({
    'src/index.js': { names: ['Button', 'RED', 'area', 'later', 'load'], members: ['esm-demo'] },
    'src/shapes.js': { names: ['area'], members: ['esm-demo'] },
    'src/colors.mjs': { names: ['RED', 'later', 'load'], members: ['esm-demo'] },
    'src/Button.jsx': { names: ['default'], members: ['esm-demo'] },
  });
});

test("every name a JavaScript file exports reads as uncompared, a star's included, never as unchanged (C2, D184)", () => {
  const scan = scanTree(ESM);
  expect(fileIn(scan, 'src/shapes.js')).toMatchObject({ shapes: { UNIT: null, area: null }, inferred: [] });
  expect(fileIn(scan, 'src/index.js').shapes).toEqual({ Button: null, RED: null, area: null, later: null, load: null });
});

test('build output and a tool config stay on the shore, and the rest of the JavaScript is terrain (D57, D84, D184)', () => {
  const scan = scanTree(ESM);
  const { terrain } = changeMap(scan, scan, 'src/shapes.js');
  expect(terrain.organelles.map((organelle) => organelle.path)).toEqual([
    'src/Button.jsx',
    'src/colors.mjs',
    'src/index.js',
    'src/lazy.js',
    'src/math/index.js',
    'src/shapes.js',
  ]);
  expect(terrain.groups.find((group) => group.id === 'build')?.files).toEqual(['dist/index.js']);
  expect(terrain.groups.find((group) => group.id === 'config')?.files).toEqual(['vite.config.js']);
});

test('a literal require() becomes an edge taking the names it reads, and one with any other specifier is left out (D184)', () => {
  const scan = scanTree(CJS);
  expect(scan.edges.filter((edge) => edge.from !== 'lib/index.js').map((edge) => [edge.from, edge.to, edge.names, edge.line, edge.reexports])).toEqual([
    ['lib/colors.cjs', 'lib/palette.js', ['*'], 1, [{ name: '*', as: '*' }]],
    // A call on a line of its own takes nothing; a destructuring takes its keys; a property read takes the property.
    ['lib/side.js', 'lib/palette.js', [], 1, undefined],
    ['lib/side.js', 'lib/palette.js', ['RED'], 3, undefined],
    ['lib/side.js', 'lib/palette.js', ['BLUE'], 5, [{ name: 'BLUE', as: 'default' }]],
    ['test/shapes.test.js', 'lib/shapes.js', ['area'], 1, undefined],
  ]);
  // `lib/plugins.js` requires a variable, a template and a sum: none is a literal, so none is an edge.
  expect(fileIn(scan, 'lib/plugins.js')).toMatchObject({ exports: ['default'], packages: [] });
  expect(fileIn(scan, 'lib/shapes.js').packages).toEqual(['lodash']);
});

test('module.exports and exports.<name> give a file its names, and a required value written to them is passed on (D75, D184)', () => {
  const scan = scanTree(CJS);
  expect(scan.edges.filter((edge) => edge.from === 'lib/index.js').map((edge) => [edge.to, edge.names, edge.line, edge.reexports])).toEqual([
    ['lib/shapes.js', ['area', 'perimeter'], 2, [{ name: 'area', as: 'area' }, { name: 'perimeter', as: 'around' }]],
    ['lib/colors.cjs', ['*'], 3, [{ name: '*', as: 'colors' }]],
    ['lib/extra.js', ['*'], 5, [{ name: '*', as: '*' }]],
  ]);
  expect(Object.fromEntries(scan.files.filter((file) => file.kind === 'source').map((file) => [file.path, file.exports]))).toEqual({
    'eslint.config.cjs': ['default'],
    'lib/colors.cjs': ['BLUE', 'RED'],
    'lib/extra.js': ['extra'],
    // The spread of `./extra` passes `extra` on, as `export *` would.
    'lib/index.js': ['area', 'around', 'colors', 'extra', 'version'],
    'lib/palette.js': ['BLUE', 'RED'],
    'lib/plugins.js': ['default'],
    'lib/shapes.js': ['area', 'perimeter', 'unit'],
    'lib/side.js': ['default'],
  });
  expect(fileIn(scan, 'lib/index.js').barrel).toBe(true);
  // A function written to `exports.area` is `area`, so a change inside it is held to that name (D111).
  expect(fileIn(scan, 'lib/shapes.js').functions).toEqual([
    { name: 'area', line: 4, line_count: 3 },
    { name: 'perimeter', line: 8, line_count: 1 },
  ]);
  expect(scan.members).toEqual([{ name: 'cjs-demo', dir: '.', entry: ['lib/index.js'], published: true, surface: ['lib/index.js'] }]);
  expect(Object.fromEntries(findPublicNames([scan]))).toEqual({
    'lib/index.js': { names: ['area', 'around', 'colors', 'extra', 'version'], members: ['cjs-demo'] },
    'lib/shapes.js': { names: ['area', 'perimeter'], members: ['cjs-demo'] },
    'lib/colors.cjs': { names: ['BLUE', 'RED'], members: ['cjs-demo'] },
    'lib/palette.js': { names: ['BLUE', 'RED'], members: ['cjs-demo'] },
    'lib/extra.js': { names: ['extra'], members: ['cjs-demo'] },
  });
});

test('a JavaScript interface notice weighs names added and removed, and an edit to a kept name is uncompared, never reshaped (D81, D184)', () => {
  const base = scanTree(CJS);
  const shapes = CJS['lib/shapes.js'] ?? '';
  const changed = (text: string): readonly (readonly [string, string])[] =>
    changeMap(base, scanTree({ ...CJS, 'lib/shapes.js': text }), 'lib/shapes.js').notices.map((notice) => [notice.kind, notice.why]);

  // A new parameter on a kept name: nothing proves a reader broke, so the name reads uncompared.
  expect(changed(shapes.replace('function (width, height)', 'function (width, height, depth)'))).toEqual([
    [
      'interface-uncompared',
      'the interface of `lib` was touched and `cjs-demo` publishes `area` and `perimeter`; the shape of `area`, `perimeter` and `unit` could not be compared',
    ],
  ]);
  expect(changed(`${shapes}\nexports.volume = (width, height, depth) => width * height * depth;\n`)).toEqual([
    [
      'interface-added',
      'the interface of `lib` grew (`volume` added) and `cjs-demo` publishes `area` and `perimeter`; the shape of `area`, `perimeter` and `unit` could not be compared',
    ],
  ]);
  expect(changed(shapes.replace('module.exports.unit', 'const unit'))).toEqual([
    ['interface-change', 'the interface of `lib` changed (`unit` removed) and `cjs-demo` publishes `area` and `perimeter`'],
  ]);
});

test('TypeScript beside its JavaScript twin keeps the barrel and the import, and a tree of TypeScript alone reaches no JavaScript (D45, D184)', () => {
  const twins = scanTree({
    'package.json': `{ "name": "twins", "type": "module" }\n`,
    'src/index.ts': `export { run } from './run.js';\n`,
    'src/index.js': `export { run } from './run.js';\n`,
    'src/run.ts': `export function run(): number {\n  return 1;\n}\n`,
    'src/run.js': `export function run() {\n  return 1;\n}\n`,
    'src/lib/index.js': `module.exports = require('../run.js');\n`,
  });
  expect(twins.files.filter((file) => file.barrel === true).map((file) => file.path)).toEqual(['src/index.ts', 'src/lib/index.js']);
  expect(twins.edges.map((edge) => [edge.from, edge.to])).toEqual([
    ['src/index.js', 'src/run.ts'],
    ['src/index.ts', 'src/run.ts'],
    ['src/lib/index.js', 'src/run.ts'],
  ]);
});
