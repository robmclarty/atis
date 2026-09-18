import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import { identifyGroups } from '../groups.js';
import { identifyModules } from '../modules.js';
import type { ImportEdge, ScannedFile } from '../modules.js';
import { TESTS_GROUP, computeReach } from '../reach.js';
import type { DiffFile, ReachInputs, ReachResult } from '../reach.js';
import type { ChangeKind } from '../schema.js';

/** `'a > b'`: `a` imports `b`. */
function edges(...pairs: readonly string[]): ImportEdge[] {
  return pairs.map((pair) => {
    const [from = '', to = ''] = pair.split(' > ');
    return { from, to };
  });
}

function scan(paths: readonly string[]): ScannedFile[] {
  return paths.map((path) => ({ path, loc: 10, exports: [] }));
}

function change(path: string, kind: ChangeKind = 'modified'): DiffFile {
  return { path, kind, added: 4, deleted: 1, hunks: [{ start: 10, count: 4 }] };
}

type Options = {
  readonly roots?: readonly string[];
  /** The base graph; the same as the head graph unless a test is about the difference. */
  readonly base?: readonly ImportEdge[];
};

function inputsFor(
  paths: readonly string[],
  head: readonly ImportEdge[],
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
  };
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
