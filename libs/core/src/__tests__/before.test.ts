import { expect, test } from 'vitest';

import { reachFrom } from '../before.js';
import { DEFAULT_CONFIG } from '../config.js';
import type { Commit } from '../history.js';
import { standingModules } from '../map.js';
import type { Scan } from '../map.js';
import { computeReach } from '../reach.js';
import { REACH_KIND, REACH_SCHEMA_VERSION, assertReachAnswer } from '../schema.js';
import type { ReachAnswer } from '../schema.js';
import { typed } from './scanned.js';

const HEAD = '9f3c2a1000000000000000000000000000000000';

/** A scan built by hand: every path with the kind the TypeScript producer gives it, and `'a > b'` for `a` imports `b`. */
function scanOf(paths: readonly string[], imports: readonly string[], extra: Partial<Scan> = {}): Scan {
  return {
    files: paths.map((path) => ({ ...typed(path), loc: 10, exports: [] })),
    edges: imports.map((pair) => {
      const [from = '', to = ''] = pair.split(' > ');
      return { from, to, names: ['*'] };
    }),
    members: [{ name: 'demo', dir: '.', entry: [] }],
    entry_points: { source: 'manifests', reason: 'a hand-built scan' },
    ...extra,
  };
}

/** One commit touching `paths`, newest first by `index`. */
function commit(index: number, paths: readonly string[]): Commit {
  return { sha: String(index).padStart(40, '0'), time: 1_000 - index, subject: 'feat: a step', files: paths.map((path) => ({ path, added: 1, deleted: 0 })) };
}

const LIMITER = 'src/lib/limiter.ts';
const PATHS = [LIMITER, 'src/lib/window.ts', 'src/server.ts', 'src/config.ts', 'src/__tests__/limiter.test.ts', 'docs/notes.md'];
const IMPORTS = [`src/lib/window.ts > ${LIMITER}`, `src/server.ts > ${LIMITER}`, `src/__tests__/limiter.test.ts > ${LIMITER}`];
const SCAN = scanOf(PATHS, IMPORTS);

/** Six commits touch the limiter: the config rides four, the test three, the notes two. */
const LOG: readonly Commit[] = [
  commit(1, [LIMITER]),
  commit(2, [LIMITER]),
  commit(3, [LIMITER, 'src/config.ts']),
  commit(4, [LIMITER, 'src/config.ts', 'src/__tests__/limiter.test.ts', 'docs/notes.md']),
  commit(5, [LIMITER, 'src/config.ts', 'src/__tests__/limiter.test.ts']),
  commit(6, PATHS),
];

function serialize(answer: ReachAnswer): string {
  return `${JSON.stringify(answer, null, 2)}\n`;
}

test('a file with two importers across one module boundary reaches both, at 0 and 1 hops, as a map of a diff that modifies it does', () => {
  const answer = reachFrom([LIMITER], SCAN, [], { head: HEAD });
  const imported = answer.reach.filter((entry) => entry.by === 'import');

  expect(imported).toEqual([
    { path: 'src/lib/window.ts', by: 'import', hops: 0, via: [] },
    { path: 'src/server.ts', by: 'import', hops: 1, via: [LIMITER] },
  ]);

  // What a map run walks for the same file modified: `computeReach` over the head's own graph, the changed file left out.
  const { modules, groups } = standingModules(SCAN, DEFAULT_CONFIG);
  const mapped = computeReach({ changed: [{ path: LIMITER, kind: 'modified', added: 3, deleted: 1, hunks: [{ start: 1, count: 3 }] }], modules, groups, headEdges: SCAN.edges, baseEdges: SCAN.edges });
  expect(imported.map(({ path, hops, via }) => ({ path, hops, via }))).toEqual(
    mapped.reach.filter((entry) => entry.path !== LIMITER).map(({ path, hops, via }) => ({ path, hops, via })),
  );
});

test('a pair that co-changed in four of six commits is reached by cochange at rate 0.67 and support 4, and a pair below the ghost thresholds is left out', () => {
  const answer = reachFrom([LIMITER], SCAN, LOG, { head: HEAD });
  const habit = answer.reach.filter((entry) => entry.by === 'cochange');

  expect(habit).toEqual([
    // A test is never a cell (D4), so it is reached by habit alone: three of six, on both thresholds.
    { path: 'src/__tests__/limiter.test.ts', by: 'cochange', rate: 0.5, support: 3, with: LIMITER },
    { path: 'src/config.ts', by: 'cochange', rate: 0.67, support: 4, with: LIMITER },
  ]);
  expect(answer.reach.some((entry) => entry.path === 'docs/notes.md')).toBe(false);
  expect(answer.reach.filter((entry) => entry.path === 'src/__tests__/limiter.test.ts').map((entry) => entry.by)).toEqual(['cochange']);
});

test('the answer names its own version and kind, sorts by path then by, and passes its assert', () => {
  // The window file imports the limiter and rides every commit with it, so it is reached both ways.
  const log = LOG.map((entry) => ({ ...entry, files: [...entry.files.filter((file) => file.path !== 'src/lib/window.ts'), { path: 'src/lib/window.ts', added: 1, deleted: 0 }] }));
  const answer = reachFrom([LIMITER], SCAN, log, { head: HEAD });

  expect(answer.schema_version).toBe(REACH_SCHEMA_VERSION);
  expect(answer.kind).toBe(REACH_KIND);
  expect(REACH_KIND).toBe('atis.reach');
  expect(answer.head).toBe(HEAD);
  expect(answer.paths).toEqual([LIMITER]);
  expect(answer.new).toEqual([]);
  expect(answer.muted).toEqual([]);
  expect(answer.reach.map((entry) => `${entry.path} ${entry.by}`)).toEqual([
    'src/__tests__/limiter.test.ts cochange',
    'src/config.ts cochange',
    'src/lib/window.ts cochange',
    'src/lib/window.ts import',
    'src/server.ts import',
  ]);
  expect(() => assertReachAnswer(JSON.parse(serialize(answer)))).not.toThrow();
});

test('two runs over one scan and one log print the same bytes, whatever order the paths, the files and the commits come in', () => {
  const first = serialize(reachFrom([LIMITER, 'src/config.ts'], SCAN, LOG, { head: HEAD }));
  const shuffled = { ...SCAN, files: SCAN.files.toReversed(), edges: SCAN.edges.toReversed() };
  expect(serialize(reachFrom([LIMITER, 'src/config.ts'], SCAN, LOG, { head: HEAD }))).toBe(first);
  expect(serialize(reachFrom([LIMITER, 'src/config.ts'], shuffled, LOG.toReversed(), { head: HEAD }))).toBe(first);
});

test('the named files are the seam, never their own reach, and a path named twice is asked once', () => {
  const answer = reachFrom([LIMITER, 'src/config.ts', LIMITER], SCAN, LOG, { head: HEAD });
  expect(answer.paths).toEqual([LIMITER, 'src/config.ts']);
  expect(answer.reach.map((entry) => entry.path)).not.toContain(LIMITER);
  expect(answer.reach.map((entry) => entry.path)).not.toContain('src/config.ts');
});

test('a dir/ stands for the files under it at the head, with or without its slash, and . for the whole repository', () => {
  const slashed = reachFrom(['src/lib/'], SCAN, LOG, { head: HEAD });
  expect(slashed.paths).toEqual(['src/lib/']);
  expect(slashed.new).toEqual([]);
  // Both files of the folder are the seam, so only what lies outside it is reached.
  expect(slashed.reach.map((entry) => entry.path)).toEqual(['src/__tests__/limiter.test.ts', 'src/config.ts', 'src/server.ts']);
  expect(reachFrom(['src/lib'], SCAN, LOG, { head: HEAD }).reach).toEqual(slashed.reach);

  const whole = reachFrom(['.'], SCAN, LOG, { head: HEAD });
  expect(whole.new).toEqual([]);
  expect(whole.reach).toEqual([]);
});

test('a path that names nothing at the head is new, with no reach of its own, and a run of new paths alone answers empty', () => {
  const mixed = reachFrom(['src/lib/cap.ts', LIMITER], SCAN, LOG, { head: HEAD });
  expect(mixed.new).toEqual(['src/lib/cap.ts']);
  expect(mixed.reach).toEqual(reachFrom([LIMITER], SCAN, LOG, { head: HEAD }).reach);

  const fresh = reachFrom(['src/new/b.ts', 'src/new/a.ts', 'src/newer/'], SCAN, LOG, { head: HEAD });
  expect(fresh.paths).toEqual(['src/new/b.ts', 'src/new/a.ts', 'src/newer/']);
  expect(fresh.new).toEqual(['src/new/a.ts', 'src/new/b.ts', 'src/newer/']);
  expect(fresh.reach).toEqual([]);
  expect(fresh.muted).toEqual([]);
  expect(() => assertReachAnswer(fresh)).not.toThrow();
});

test('a muted co-change half says why in words and reads no commit; the import half answers as it did', () => {
  const answer = reachFrom([LIMITER], SCAN, LOG, { head: HEAD, cochange_muted: 'the clone is shallow, so history reads 6 commits' });
  expect(answer.muted).toEqual(['cochange: the clone is shallow, so history reads 6 commits']);
  expect(answer.reach.every((entry) => entry.by === 'import')).toBe(true);
  expect(answer.reach).toEqual(reachFrom([LIMITER], SCAN, [], { head: HEAD }).reach);
});

test('a named file in a language no producer reads has no import reach, and muted names the language; a producer that left files unread is named too', () => {
  const scan = scanOf([...PATHS, 'native/fast.rs', 'native/slow.rs', 'Makefile'], IMPORTS, { unread: [{ producer: 'go', reason: 'no go on the PATH' }] });
  const answer = reachFrom(['native/', 'Makefile', 'docs/notes.md', LIMITER], scan, [], { head: HEAD });
  expect(answer.muted).toEqual([
    'import: atis reads no imports from files with no extension, so Makefile has no import reach',
    'import: atis reads no imports from .md files, so docs/notes.md has no import reach',
    'import: atis reads no imports from .rs files, so 2 named files have no import reach',
    'import: the go producer left its files unread: no go on the PATH',
  ]);
  // The limiter is still read, so its ring is whole.
  expect(answer.reach.map((entry) => entry.path)).toEqual(['src/lib/window.ts', 'src/server.ts']);
});

test('a file two named files move with is listed once, from the one it moves with most', () => {
  const log = [
    commit(1, ['src/a.ts', 'src/shared.ts']),
    commit(2, ['src/a.ts', 'src/shared.ts']),
    commit(3, ['src/a.ts', 'src/shared.ts']),
    commit(4, ['src/a.ts', 'src/b.ts', 'src/shared.ts']),
    commit(5, ['src/b.ts', 'src/shared.ts']),
    commit(6, ['src/b.ts', 'src/shared.ts']),
    commit(7, ['src/b.ts']),
    // A file that moved with `a` every time but no longer stands at the head is no part of the ring.
    commit(8, ['src/a.ts', 'src/gone.ts']),
  ];
  const answer = reachFrom(['src/a.ts', 'src/b.ts'], scanOf(['src/a.ts', 'src/b.ts', 'src/shared.ts'], []), log, { head: HEAD });
  expect(answer.reach).toEqual([{ path: 'src/shared.ts', by: 'cochange', rate: 0.8, support: 4, with: 'src/a.ts' }]);
});

test('assertReachAnswer refuses an answer of another kind or version, an entry out of order and a via that is not one interface a hop', () => {
  const good = reachFrom([LIMITER], SCAN, LOG, { head: HEAD });
  expect(assertReachAnswer(good)).toBe(good);
  expect(() => assertReachAnswer(null)).toThrow('invalid reach answer at $: expected an object');
  expect(() => assertReachAnswer({ ...good, kind: 'atis.reach/1' })).toThrow('$.kind');
  expect(() => assertReachAnswer({ ...good, schema_version: 2 })).toThrow('$.schema_version');
  expect(() => assertReachAnswer({ ...good, head: '' })).toThrow('$.head');
  expect(() => assertReachAnswer({ ...good, paths: 'src' })).toThrow('$.paths');
  expect(() => assertReachAnswer({ ...good, new: [1] })).toThrow('$.new[0]');
  expect(() => assertReachAnswer({ ...good, muted: undefined })).toThrow('$.muted');
  expect(() => assertReachAnswer({ ...good, reach: {} })).toThrow('$.reach');
  expect(() => assertReachAnswer({ ...good, reach: good.reach.toReversed() })).toThrow('sorted by path, then by');
  expect(() => assertReachAnswer({ ...good, reach: [null] })).toThrow('$.reach[0]: expected an object');
  expect(() => assertReachAnswer({ ...good, reach: [{ path: '', by: 'import', hops: 0, via: [] }] })).toThrow('$.reach[0].path');
  expect(() => assertReachAnswer({ ...good, reach: [{ path: 'a.ts', by: 'guess' }] })).toThrow('$.reach[0].by');
  expect(() => assertReachAnswer({ ...good, reach: [{ path: 'a.ts', by: 'import', hops: 1, via: [] }] })).toThrow('one interface for each hop');
  expect(() => assertReachAnswer({ ...good, reach: [{ path: 'a.ts', by: 'import', hops: 0.5, via: [] }] })).toThrow('$.reach[0].hops');
  expect(() => assertReachAnswer({ ...good, reach: [{ path: 'a.ts', by: 'cochange', rate: 1.2, support: 3, with: 'b.ts' }] })).toThrow('$.reach[0].rate');
  expect(() => assertReachAnswer({ ...good, reach: [{ path: 'a.ts', by: 'cochange', rate: 0.6, support: 0, with: 'b.ts' }] })).toThrow('$.reach[0].support');
  expect(() => assertReachAnswer({ ...good, reach: [{ path: 'a.ts', by: 'cochange', rate: 0.6, support: 3, with: '' }] })).toThrow('$.reach[0].with');
});
