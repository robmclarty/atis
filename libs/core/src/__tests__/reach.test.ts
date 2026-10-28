import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import { identifyGroups } from '../groups.js';
import { movedNames } from '../map.js';
import type { Scan, ScanFileOf } from '../map.js';
import { identifyModules } from '../modules.js';
import type { ImportEdge, ScannedFile } from '../modules.js';
import { TESTS_GROUP, computeReach } from '../reach.js';
import type { DiffFile, ReachEdge, ReachInputs, ReachResult } from '../reach.js';
import { assertMap } from '../schema.js';
import type { ChangeKind, Hunk } from '../schema.js';
import { typed } from './scanned.js';

/** `'a > b'`: `a` imports `b`. */
function edges(...pairs: readonly string[]): ImportEdge[] {
  return pairs.map((pair) => {
    const [from = '', to = ''] = pair.split(' > ');
    return { from, to };
  });
}

function scan(paths: readonly string[]): ScannedFile[] {
  return paths.map((path) => ({ ...typed(path), loc: 10, exports: [] }));
}

function change(path: string, kind: ChangeKind = 'modified'): DiffFile {
  return { path, kind, added: 4, deleted: 1, hunks: [{ start: 10, count: 4 }] };
}

type Options = {
  readonly roots?: readonly string[];
  /** The base graph; the same as the head graph unless a test is about the difference. */
  readonly base?: readonly ReachEdge[];
  /** The names each changed file's change moved (D111). */
  readonly moved?: Readonly<Record<string, readonly string[]>>;
};

function inputsFor(
  paths: readonly string[],
  head: readonly ReachEdge[],
  changed: readonly DiffFile[],
  options: Options = {},
): ReachInputs {
  const roots = options.roots ?? [];
  const files = scan(paths);
  return {
    changed,
    modules: identifyModules(files, head, roots),
    groups: identifyGroups(files, DEFAULT_CONFIG.groups, roots),
    headEdges: head,
    baseEdges: options.base ?? head,
    ...(options.moved === undefined ? {} : { moved: new Map(Object.entries(options.moved)) }),
  };
}

/**
 * `'a > b: x, y'`: `a` imports `x` and `y` from `b`, `*` the whole module;
 * `'a >> b: x, y as z'`: `a` re-exports `x` and passes `y` on as `z`, and
 * `'a >> b: *'` re-exports every name (D75).
 */
function named(...lines: readonly string[]): ReachEdge[] {
  return lines.map((line) => {
    const [ends = '', list = ''] = line.split(': ');
    const passes = ends.includes(' >> ');
    const [from = '', to = ''] = ends.split(passes ? ' >> ' : ' > ');
    const pairs = list.split(', ').map((name) => {
      const [taken = '', as = taken] = name.split(' as ');
      return { name: taken, as };
    });
    return { from, to, names: pairs.map((pair) => pair.name), ...(passes ? { reexports: pairs } : {}) };
  });
}

/** `path → names` for the entries a moved name reached. */
function namesOf(result: ReachResult): Record<string, readonly string[]> {
  return Object.fromEntries(result.reach.flatMap((entry) => (entry.names === undefined ? [] : [[entry.path, entry.names]])));
}

/** `path → [hops, ...via]`: the whole reach in one readable object. */
function reachOf(result: ReachResult): Record<string, readonly (number | string)[]> {
  return Object.fromEntries(result.reach.map((entry) => [entry.path, [entry.hops, ...entry.via]]));
}

/** `path → cell id`, or `group <id>` for a changed file that is not terrain, with barrels marked. */
function placementOf(result: ReachResult): Record<string, string> {
  return Object.fromEntries(
    result.changed.map((file) => [
      file.path,
      `${file.cell ?? `group ${file.group ?? ''}`}${file.is_barrel ? ' (barrel)' : ''}`,
    ]),
  );
}

const CHAIN = ['src/index.ts', 'src/doctor.ts', 'src/pm/index.ts', 'src/pm/tools.ts', 'src/__tests__/tools.test.ts'];

test('a chain of three cells costs one hop per membrane, naming the interface each one was entered by', () => {
  const result = computeReach(
    inputsFor(
      CHAIN,
      edges(
        'src/index.ts > src/doctor.ts',
        'src/doctor.ts > src/pm/index.ts',
        'src/pm/index.ts > src/pm/tools.ts',
        'src/__tests__/tools.test.ts > src/pm/tools.ts',
      ),
      [change('src/pm/tools.ts')],
    ),
  );

  expect(reachOf(result)).toEqual({
    // The changed file and its barrel share the innermost cell, so the step between them is free.
    'src/pm/tools.ts': [0],
    'src/pm/index.ts': [0],
    // Out through the barrel of `src/pm`, then out of `doctor.ts`, which has no barrel of its own.
    'src/doctor.ts': [1, 'src/pm/index.ts'],
    'src/index.ts': [2, 'src/pm/index.ts', 'src/doctor.ts'],
  });
  // The test that imports the change is evidence, never reach (D4).
  expect(result.reach.map((entry) => entry.path)).not.toContain('src/__tests__/tools.test.ts');
  expect(result.edges_exceptional).toEqual([]);
});

test('a change the barrel does not re-export, imported only in-cell, reaches no other cell', () => {
  const result = computeReach(
    inputsFor(
      ['src/index.ts', 'src/doctor.ts', 'src/pm/index.ts', 'src/pm/client.ts', 'src/pm/tools.ts', 'src/pm/probe.ts'],
      edges(
        'src/index.ts > src/doctor.ts',
        'src/doctor.ts > src/pm/index.ts',
        // The barrel re-exports `client.ts` alone; `tools.ts` is reached only by an internal leaf.
        'src/pm/index.ts > src/pm/client.ts',
        'src/pm/probe.ts > src/pm/tools.ts',
      ),
      [change('src/pm/tools.ts')],
    ),
  );

  expect(reachOf(result)).toEqual({ 'src/pm/tools.ts': [0], 'src/pm/probe.ts': [0] });
  expect([...new Set(result.reach.map((entry) => entry.cell))]).toEqual(['folder:src/pm']);
});

test('a deleted file reaches the consumers only the base graph still knows', () => {
  const files = ['src/index.ts', 'src/doctor.ts', 'src/legacy.ts'];
  // The head graph lost the import along with the file it pointed at.
  const head = edges('src/index.ts > src/doctor.ts');
  const base = edges('src/index.ts > src/doctor.ts', 'src/doctor.ts > src/legacy.ts');

  const deleted = computeReach(inputsFor(files, head, [change('src/legacy.ts', 'deleted')], { base }));
  expect(reachOf(deleted)).toEqual({
    'src/legacy.ts': [0],
    'src/doctor.ts': [1, 'src/legacy.ts'],
    'src/index.ts': [2, 'src/legacy.ts', 'src/doctor.ts'],
  });

  // The same file merely modified walks the head graph, where nothing imports it any more.
  const modified = computeReach(inputsFor(files, head, [change('src/legacy.ts')], { base }));
  expect(reachOf(modified)).toEqual({ 'src/legacy.ts': [0] });
});

test('a new cross-cell import is exceptional; an old one whose names were edited is not', () => {
  const base = edges('src/index.ts > src/doctor.ts', 'src/doctor.ts > src/pm/index.ts');
  const result = computeReach(
    inputsFor(
      ['src/index.ts', 'src/doctor.ts', 'src/pm/index.ts', 'src/pm/tools.ts', 'src/util.ts'],
      [
        ...base,
        ...edges(
          'src/doctor.ts > src/util.ts',
          // New, but inside one cell: a membrane has to be crossed for an edge to be exceptional.
          'src/pm/index.ts > src/pm/tools.ts',
        ),
      ],
      [change('src/doctor.ts')],
      { base },
    ),
  );

  expect(result.edges_exceptional).toEqual([
    { from: 'src/doctor.ts', to: 'src/util.ts', kind: 'new-cross-module' },
  ]);
});

test('a cell with no barrel is entered by the file that was imported', () => {
  const result = computeReach(
    inputsFor(
      ['src/index.ts', 'src/doctor.ts', 'scripts/gen.ts', 'scripts/lib.ts'],
      edges('src/index.ts > src/doctor.ts', 'src/doctor.ts > scripts/lib.ts', 'scripts/gen.ts > scripts/lib.ts'),
      [change('scripts/lib.ts')],
    ),
  );

  expect(result.reach.map((entry) => entry.cell)).toContain('directory:scripts');
  expect(reachOf(result)).toEqual({
    'scripts/lib.ts': [0],
    'scripts/gen.ts': [0],
    // No barrel to name, so the crossing records the imported file, which is on the cell's interface anyway.
    'src/doctor.ts': [1, 'scripts/lib.ts'],
    'src/index.ts': [2, 'scripts/lib.ts', 'src/doctor.ts'],
  });
});

test('an import that reaches past a barrel crosses by the file it actually took', () => {
  const result = computeReach(
    inputsFor(
      ['src/index.ts', 'src/doctor.ts', 'src/pm/index.ts', 'src/pm/tools.ts'],
      // `doctor.ts` reaches past the barrel of `src/pm` and imports `tools.ts` directly.
      edges('src/index.ts > src/doctor.ts', 'src/doctor.ts > src/pm/tools.ts'),
      [change('src/pm/tools.ts')],
    ),
  );

  // The barrel is neither reached nor named: the change escapes through `tools.ts` itself,
  // which is the interface this importer reads, and the barrel it went around is not (§5.2).
  expect(reachOf(result)).toEqual({
    'src/pm/tools.ts': [0],
    'src/doctor.ts': [1, 'src/pm/tools.ts'],
    'src/index.ts': [2, 'src/pm/tools.ts', 'src/doctor.ts'],
  });
});

test('a package contour costs no hop of its own', () => {
  const result = computeReach(
    inputsFor(
      ['libs/core/src/index.ts', 'libs/core/src/depth.ts', 'apps/atis/src/index.ts', 'apps/atis/src/cli.ts'],
      edges(
        'libs/core/src/index.ts > libs/core/src/depth.ts',
        'apps/atis/src/cli.ts > libs/core/src/index.ts',
        'apps/atis/src/index.ts > apps/atis/src/cli.ts',
      ),
      [change('libs/core/src/depth.ts')],
      { roots: ['libs/core', 'apps/atis'] },
    ),
  );

  expect(reachOf(result)).toEqual({
    'libs/core/src/depth.ts': [0],
    'libs/core/src/index.ts': [1, 'libs/core/src/depth.ts'],
    // This edge leaves the `libs/core` contour and enters the `apps/atis` one on its way into
    // `cli.ts`, and still costs the single hop that leaving a folder module costs (D45).
    'apps/atis/src/cli.ts': [2, 'libs/core/src/depth.ts', 'libs/core/src/index.ts'],
    'apps/atis/src/index.ts': [3, 'libs/core/src/depth.ts', 'libs/core/src/index.ts', 'apps/atis/src/cli.ts'],
  });
});

test('a file two paths reach carries the shorter hop count', () => {
  const result = computeReach(
    inputsFor(
      ['src/index.ts', 'src/doctor.ts', 'src/pm/index.ts', 'src/pm/tools.ts'],
      edges(
        'src/index.ts > src/pm/index.ts',
        'src/index.ts > src/doctor.ts',
        'src/doctor.ts > src/pm/index.ts',
        'src/pm/index.ts > src/pm/tools.ts',
      ),
      [change('src/pm/tools.ts')],
    ),
  );

  // Two ways up to the barrel: the direct import, and the longer one through `doctor.ts`.
  expect(reachOf(result)['src/index.ts']).toEqual([1, 'src/pm/index.ts']);
});

test('each changed file lands on its cell or in one shore group, sorted, with its barrels marked', () => {
  const result = computeReach(
    inputsFor(
      [...CHAIN, 'AGENTS.md', 'docs/spike.md', 'package.json', 'notes.xyz'],
      edges('src/pm/index.ts > src/pm/tools.ts'),
      [
        change('package.json'),
        change('src/pm/index.ts'),
        change('notes.xyz', 'added'),
        change('src/index.ts'),
        change('docs/spike.md', 'added'),
        { ...change('src/pm/tools.ts', 'renamed'), from: 'src/pm/old-tools.ts' },
        change('AGENTS.md'),
        change('src/__tests__/tools.test.ts'),
      ],
    ),
  );

  expect(placementOf(result)).toEqual({
    'AGENTS.md': 'group prompts',
    'docs/spike.md': 'group docs',
    // Not terrain and not shore: a changed test is evidence, grouped by what it is (D4, D48).
    'src/__tests__/tools.test.ts': `group ${TESTS_GROUP}`,
    // The residual group stays loud rather than absorbent, so the table grows instead of the dump.
    'notes.xyz': 'group other',
    'package.json': 'group deps',
    'src/index.ts': 'package:. (barrel)',
    'src/pm/index.ts': 'folder:src/pm (barrel)',
    'src/pm/tools.ts': 'folder:src/pm',
  });
  const paths = result.changed.map((file) => file.path);
  expect(paths).toEqual(paths.toSorted());
  expect(result.changed.find((file) => file.kind === 'renamed')?.from).toBe('src/pm/old-tools.ts');
});

const BARREL = ['src/index.ts', 'src/doctor.ts', 'src/report.ts', 'src/pm/index.ts', 'src/pm/tools.ts', 'src/pm/slots.ts', 'src/__tests__/doctor.test.ts'];

test('a moved name reaches the files that take it, through the barrel that re-exports it, and no file the barrel serves another name (D111)', () => {
  const result = computeReach(
    inputsFor(
      BARREL,
      named(
        'src/pm/index.ts >> src/pm/tools.ts: resolveTool',
        'src/pm/index.ts >> src/pm/slots.ts: listSlots',
        'src/doctor.ts > src/pm/index.ts: resolveTool',
        'src/report.ts > src/pm/index.ts: listSlots',
        'src/index.ts > src/doctor.ts: runDoctor',
        'src/__tests__/doctor.test.ts > src/pm/index.ts: resolveTool',
      ),
      [change('src/pm/tools.ts')],
      { moved: { 'src/pm/tools.ts': ['resolveTool'] } },
    ),
  );

  // The file-level reach still glows on everything that imports the barrel, and beyond it (D111).
  expect(reachOf(result)).toEqual({
    'src/pm/tools.ts': [0],
    'src/pm/index.ts': [0],
    'src/doctor.ts': [1, 'src/pm/index.ts'],
    'src/report.ts': [1, 'src/pm/index.ts'],
    'src/index.ts': [2, 'src/pm/index.ts', 'src/doctor.ts'],
  });
  // By name, only the barrel that passes it on and the file that takes it; never the file that takes another
  // name, the file past the importer, or the test, which is evidence (D4).
  expect(namesOf(result)).toEqual({ 'src/pm/index.ts': ['resolveTool'], 'src/doctor.ts': ['resolveTool'] });
});

test('a name passed on under another is followed under it, a star re-export passes every name, and a namespace import takes them all (D75, D111)', () => {
  const result = computeReach(
    inputsFor(
      BARREL,
      named(
        'src/pm/index.ts >> src/pm/tools.ts: resolveTool as tool',
        'src/pm/index.ts >> src/pm/slots.ts: *',
        'src/doctor.ts > src/pm/index.ts: tool',
        'src/report.ts > src/pm/index.ts: *',
        'src/index.ts > src/pm/slots.ts: orderSlots',
      ),
      [change('src/pm/tools.ts'), change('src/pm/slots.ts')],
      { moved: { 'src/pm/tools.ts': ['resolveTool', 'toolName'], 'src/pm/slots.ts': ['listSlots'] } },
    ),
  );
  expect(namesOf(result)).toEqual({
    // Each name as the file it was imported from exports it: the barrel takes `resolveTool` and `listSlots` from their files.
    'src/pm/index.ts': ['listSlots', 'resolveTool'],
    // `doctor.ts` takes `tool` from the barrel; `toolName` was never passed on, so it reaches no one.
    'src/doctor.ts': ['tool'],
    'src/report.ts': ['listSlots', 'tool'],
  });
});

test("a deleted file's names reach the files the base graph has take them, and an edge whose names were never read carries none (D39, C2)", () => {
  const files = ['src/index.ts', 'src/doctor.ts', 'src/legacy.ts', 'src/util.ts'];
  const base = named('src/doctor.ts > src/legacy.ts: legacyResolve', 'src/index.ts > src/doctor.ts: runDoctor');
  const head: ReachEdge[] = [...named('src/index.ts > src/doctor.ts: runDoctor'), { from: 'src/util.ts', to: 'src/doctor.ts' }];
  const result = computeReach(
    inputsFor(files, head, [change('src/legacy.ts', 'deleted'), change('src/doctor.ts')], { base, moved: { 'src/legacy.ts': ['legacyResolve'], 'src/doctor.ts': ['runDoctor'] } }),
  );
  expect(namesOf(result)).toEqual({ 'src/doctor.ts': ['legacyResolve'], 'src/index.ts': ['runDoctor'] });
  expect(result.reach.find((entry) => entry.path === 'src/util.ts')).toEqual({ path: 'src/util.ts', cell: 'single:src/util.ts', hops: 1, via: ['src/doctor.ts'] });
});

/** A scanned file with the names it exports, their shapes where read, its functions as `name@line+lines`, and its code as `start-end` spans. */
function scanned(path: string, exports: readonly string[], options: { readonly shapes?: Readonly<Record<string, string | null>>; readonly functions?: readonly string[]; readonly code?: readonly string[] } = {}): ScanFileOf {
  return {
    ...typed(path),
    loc: 100,
    exports,
    ...(options.shapes === undefined ? {} : { shapes: options.shapes }),
    ...(options.functions === undefined
      ? {}
      : {
          functions: options.functions.map((fn) => {
            const [name = '', at = ''] = fn.split('@');
            const [line = '0', count = '0'] = at.split('+');
            return { name, line: Number(line), line_count: Number(count) };
          }),
        }),
    ...(options.code === undefined
      ? {}
      : {
          code: options.code.map((span) => {
            const [start = '0', end = start] = span.split('-');
            return { start: Number(start), end: Number(end) };
          }),
        }),
  };
}

function scanOf(files: readonly ScanFileOf[]): Scan {
  return { files, edges: [], members: [], entry_points: { source: 'manifests', reason: 'a test' } };
}

/** One changed file with its head-side hunks as `start+count`. */
function hunked(path: string, kind: ChangeKind, ...hunks: readonly string[]): DiffFile {
  return {
    path,
    kind,
    added: 1,
    deleted: 1,
    hunks: hunks.map((hunk): Hunk => {
      const [start = '0', count = '0'] = hunk.split('+');
      return { start: Number(start), count: Number(count) };
    }),
  };
}

test('a change moves every name of a file it adds or deletes, and the names a modified file added, removed or reshaped, or whose function a hunk meets (D111, D76)', () => {
  const base = scanOf([
    scanned('src/legacy.ts', ['legacyResolve']),
    scanned('src/pm/index.ts', ['legacyResolve', 'listSlots', 'resolveSlot', 'version'], { shapes: { listSlots: '() => string[]', resolveSlot: '(name: string) => Slot', version: 'string' } }),
  ]);
  const head = scanOf([
    scanned('src/pm/tools.ts', ['resolveTool', 'toolName']),
    scanned('src/pm/index.ts', ['listSlots', 'resolveSlot', 'resolveTool', 'version'], {
      shapes: { listSlots: '() => readonly string[]', resolveSlot: '(name: string) => Slot', version: 'string' },
      functions: ['resolveSlot@10+12', 'listSlots@30+6'],
      code: ['1-3', '10-21', '30-35', '40'],
    }),
  ]);
  const moved = movedNames(base, head, [
    hunked('src/pm/tools.ts', 'added', '1+40'),
    hunked('src/legacy.ts', 'deleted'),
    // A hunk inside `resolveSlot` and the added re-export at line 2; `listSlots` reshaped, `legacyResolve` removed.
    hunked('src/pm/index.ts', 'modified', '2+1', '14+2'),
  ]);
  expect(Object.fromEntries(moved)).toEqual({
    'src/legacy.ts': ['legacyResolve'],
    'src/pm/index.ts': ['legacyResolve', 'listSlots', 'resolveSlot', 'resolveTool'],
    'src/pm/tools.ts': ['resolveTool', 'toolName'],
  });
});

test('a change it cannot hold to a name moves every name the file exports, and one that meets no code moves none (D111, C2)', () => {
  const exports = ['main', 'runDoctor'];
  const was = scanOf([scanned('src/doctor.ts', exports, { shapes: { main: '() => void', runDoctor: '() => void' } })]);
  const is = (code?: readonly string[]): Scan =>
    scanOf([scanned('src/doctor.ts', exports, { shapes: { main: '() => void', runDoctor: '() => void' }, functions: ['main@3+5', 'runDoctor@10+40', 'checkSlot@20+8', 'report@60+20'], ...(code === undefined ? {} : { code }) })]);
  const code = ['1', '3-7', '10-49', '55', '60-79'];
  const of = (head: Scan, ...hunks: readonly string[]): readonly string[] | undefined => movedNames(was, head, [hunked('src/doctor.ts', 'modified', ...hunks)]).get('src/doctor.ts');

  // Inside `runDoctor`, a callback nested in it included: the one name.
  expect(of(is(code), '22+2')).toEqual(['runDoctor']);
  // A helper no export holds, which any of them may call: every name.
  expect(of(is(code), '22+2', '65+3')).toEqual(exports);
  // A module-level statement while no name moved: every name.
  expect(of(is(code), '55+1')).toEqual(exports);
  // A deletion inside `main`, which wrote no line: the name it sits in.
  expect(of(is(code), '5+0')).toEqual(['main']);
  // Comments alone: none.
  expect(of(is(code), '52+2')).toBeUndefined();
  // A scan that read no statements cannot say a hunk met none: every name (C2).
  expect(of(is(), '52+2')).toEqual(exports);
});

test("a map's guard takes the names on a reach entry only sorted, unique and present, never an empty list (D111, C2)", () => {
  const demo = JSON.parse(readFileSync(new URL('../../fixtures/demo/map.json', import.meta.url), 'utf8')) as { weather: { reach: { names?: readonly unknown[] }[] } };
  const carried = demo.weather.reach.findIndex((entry) => entry.names !== undefined);
  expect(carried).toBeGreaterThanOrEqual(0);
  const withNames = (names: readonly unknown[]): unknown => ({ ...demo, weather: { ...demo.weather, reach: demo.weather.reach.map((entry, at) => (at === carried ? { ...entry, names } : entry)) } });
  expect(() => assertMap(withNames(['a', 'b']))).not.toThrow();
  expect(() => assertMap(withNames([]))).toThrow(/at least one name/);
  expect(() => assertMap(withNames(['b', 'a']))).toThrow(/sorted and unique/);
  expect(() => assertMap(withNames(['a', 'a']))).toThrow(/sorted and unique/);
  expect(() => assertMap(withNames([1]))).toThrow();
});
