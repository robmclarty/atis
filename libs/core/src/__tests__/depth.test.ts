import { expect, test } from 'vitest';

import { MAX_BANDS, bandOf, computeDepth } from '../depth.js';
import type { Depths } from '../depth.js';
import type { ImportEdge } from '../modules.js';

/** Edges from `a>b` shorthand, each file under `src/`. */
function edges(...pairs: readonly string[]): ImportEdge[] {
  return pairs.map((pair) => {
    const [from = '', to = ''] = pair.split('>');
    return { from: `src/${from}.ts`, to: `src/${to}.ts` };
  });
}

/** `name → depth` for the reachable files, `name → 'unreachable@band'` for the rest. */
function placement(depths: Depths): Record<string, number | string> {
  return Object.fromEntries(
    depths.files.map((file) => [
      file.path.replace(/^src\/(.*)\.ts$/, '$1'),
      file.reachable ? (file.depth ?? Number.NaN) : `unreachable@${String(file.band)}`,
    ]),
  );
}

function chain(length: number): ImportEdge[] {
  return Array.from({ length: length - 1 }, (_, index) => ({
    from: `src/f${String(index).padStart(5, '0')}.ts`,
    to: `src/f${String(index + 1).padStart(5, '0')}.ts`,
  }));
}

test('a chain descends one band per import, each band holding its own depth', () => {
  const depths = computeDepth(edges('a>b', 'b>c'), ['src/a.ts']);

  expect(depths).toEqual({
    files: [
      { path: 'src/a.ts', band: 0, reachable: true, depth: 0 },
      { path: 'src/b.ts', band: 1, reachable: true, depth: 1 },
      { path: 'src/c.ts', band: 2, reachable: true, depth: 2 },
    ],
    bands: [
      { index: 0, depth_min: 0, depth_max: 0 },
      { index: 1, depth_min: 1, depth_max: 1 },
      { index: 2, depth_min: 2, depth_max: 2 },
    ],
  });
});

test('a diamond takes its longer arm, and a shortcut edge does not lift the file', () => {
  const diamond = computeDepth(edges('a>b', 'a>c', 'b>d', 'c>e', 'e>d'), ['src/a.ts']);
  expect(placement(diamond)).toEqual({ a: 0, b: 1, c: 1, d: 3, e: 2 });

  const shortcut = computeDepth(edges('a>d', 'a>b', 'b>c', 'c>d'), ['src/a.ts']);
  expect(placement(shortcut)).toEqual({ a: 0, b: 1, c: 2, d: 3 });
});

test('a cycle collapses to one depth, reached by its longest way in', () => {
  const simple = computeDepth(edges('a>b', 'b>c', 'c>b', 'c>d'), ['src/a.ts']);
  expect(placement(simple)).toEqual({ a: 0, b: 1, c: 1, d: 2 });

  // x leads into the cycle one import later than a does, so the whole cycle sits under x.
  const late = computeDepth(edges('a>b', 'a>x', 'x>c', 'b>c', 'c>b', 'c>d'), ['src/a.ts']);
  expect(placement(late)).toEqual({ a: 0, b: 2, c: 2, d: 3, x: 1 });

  const threeWay = computeDepth(edges('a>b', 'b>c', 'c>e', 'e>b', 'e>f'), ['src/a.ts']);
  expect(placement(threeWay)).toEqual({ a: 0, b: 1, c: 1, e: 1, f: 2 });
});

test('an entry point inside a cycle holds the whole cycle at the top', () => {
  const depths = computeDepth(edges('a>b', 'b>a', 'b>c'), ['src/a.ts']);
  expect(placement(depths)).toEqual({ a: 0, b: 0, c: 1 });
});

test('an entry point another entry point imports sits below it', () => {
  const depths = computeDepth(edges('cli>index', 'index>doctor'), ['src/cli.ts', 'src/index.ts']);
  expect(placement(depths)).toEqual({ cli: 0, index: 1, doctor: 2 });
});

test('orphans sit in the deepest band, unreachable and without a depth (D26)', () => {
  const depths = computeDepth(edges('a>b', 'b>c', 'dead>b', 'dead>helper'), ['src/a.ts'], ['src/lonely.ts', 'src/c.ts']);

  expect(placement(depths)).toEqual({
    a: 0,
    b: 1,
    c: 2,
    dead: 'unreachable@2',
    helper: 'unreachable@2',
    lonely: 'unreachable@2',
  });
  expect(depths.files.find((file) => file.path === 'src/lonely.ts')).toStrictEqual({
    path: 'src/lonely.ts',
    band: 2,
    reachable: false,
  });
  expect(depths.bands).toHaveLength(3);
});

test('a depth-12 chain is capped at seven proportional bands', () => {
  const depths = computeDepth(chain(13), ['src/f00000.ts']);

  expect(depths.files.map((file) => file.band)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6]);
  expect(depths.bands).toEqual([
    { index: 0, depth_min: 0, depth_max: 1 },
    { index: 1, depth_min: 2, depth_max: 3 },
    { index: 2, depth_min: 4, depth_max: 5 },
    { index: 3, depth_min: 6, depth_max: 7 },
    { index: 4, depth_min: 8, depth_max: 9 },
    { index: 5, depth_min: 10, depth_max: 11 },
    { index: 6, depth_min: 12, depth_max: 12 },
  ]);
});

test('an orphan beside a deep chain joins the seventh band', () => {
  const depths = computeDepth(chain(13), ['src/f00000.ts'], ['src/orphan.ts']);
  expect(depths.files.at(-1)).toEqual({ path: 'src/orphan.ts', band: MAX_BANDS - 1, reachable: false });
});

test('bandOf keeps depths up to six and slices deeper graphs evenly', () => {
  expect([0, 3, 6].map((depth) => bandOf(depth, 6))).toEqual([0, 3, 6]);
  for (const maxDepth of [7, 12, 13, 20, 99]) {
    const bands = Array.from({ length: maxDepth + 1 }, (_, depth) => bandOf(depth, maxDepth));
    expect(new Set(bands)).toEqual(new Set([0, 1, 2, 3, 4, 5, 6]));
    expect(bands).toEqual(bands.toSorted((a, b) => a - b));
  }
});

test('tests are never entry points and never nodes (D4)', () => {
  const depths = computeDepth(
    [
      { from: 'src/__tests__/b.test.ts', to: 'src/b.ts' },
      { from: 'src/a.ts', to: 'src/c.ts' },
      { from: 'src/a.ts', to: 'README.md' },
    ],
    ['src/__tests__/b.test.ts', 'src/a.ts'],
    ['src/b.ts', 'src/b.spec.ts'],
  );
  expect(placement(depths)).toEqual({ a: 0, b: 'unreachable@1', c: 1 });
});

test('with no entry point every file is unreachable on one band, and no files means no bands', () => {
  const stranded = computeDepth(edges('a>b'), []);
  expect(stranded).toEqual({
    files: [
      { path: 'src/a.ts', band: 0, reachable: false },
      { path: 'src/b.ts', band: 0, reachable: false },
    ],
    bands: [{ index: 0, depth_min: 0, depth_max: 0 }],
  });
  expect(computeDepth([], [])).toEqual({ files: [], bands: [] });
});

test('input order, duplicate edges and self-imports change nothing (C3)', () => {
  const forward = edges('a>b', 'a>c', 'b>d', 'c>e', 'e>d', 'd>b', 'd>f');
  const shuffled = [...forward.toReversed(), ...edges('c>e', 'f>f')];
  expect(computeDepth(shuffled, ['src/a.ts'])).toEqual(computeDepth(forward, ['src/a.ts']));
});

test('an import chain deeper than the call stack still resolves', () => {
  const depths = computeDepth(chain(20_000), ['src/f00000.ts']);
  expect(depths.files.at(-1)).toEqual({ path: 'src/f19999.ts', band: 6, reachable: true, depth: 19_999 });
  expect(depths.bands).toHaveLength(MAX_BANDS);
});
