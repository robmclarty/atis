import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import type { CheckArtifacts } from '../evidence.js';
import { buildMap } from '../map.js';
import type { BuildInputs } from '../map.js';
import { assertMap } from '../schema.js';

/**
 * The fixtures are committed JSON rather than a built object, so the golden is
 * a file a human can read beside the map a renderer will draw. Reading them
 * with `node:fs` is fine here: C1 keeps Node out of the code core ships, and a
 * test is not shipped (Rob, 2026-09-17). Nothing the package exports reaches
 * for Node.
 *
 * The golden is `serialize(blankClock(buildMap(inputs)))`, so a deliberate
 * change to the assembly is landed by writing that string back over
 * `fixtures/demo/map.json` and reading the diff before committing it.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', 'fixtures');

function inputsFor(name: string): BuildInputs {
  return JSON.parse(readFileSync(join(FIXTURES, name, 'inputs.json'), 'utf8')) as BuildInputs;
}

/** The bytes the CLI writes: two-space JSON with a trailing newline. */
function serialize(map: unknown): string {
  return `${JSON.stringify(map, null, 2)}\n`;
}

/** The done-when's blanking: the clock is the one field two runs may differ in (C3). */
function blankClock(map: ReturnType<typeof buildMap>): unknown {
  return { ...map, meta: { ...map.meta, generated_at: '' } };
}

test('the demo fixture builds a map that passes assertMap and matches the golden byte for byte', () => {
  const built = buildMap(inputsFor('demo'), DEFAULT_CONFIG);
  expect(() => assertMap(built)).not.toThrow();
  expect(serialize(blankClock(built))).toBe(readFileSync(join(FIXTURES, 'demo', 'map.json'), 'utf8'));
});

test('two runs over one input set produce the same bytes', () => {
  const inputs = inputsFor('demo');
  expect(serialize(buildMap(inputs, DEFAULT_CONFIG))).toBe(serialize(buildMap(inputs, DEFAULT_CONFIG)));
});

test('the demo map reads its terrain from the base and its weather from the head', () => {
  const map = buildMap(inputsFor('demo'), DEFAULT_CONFIG);

  // The deleted file keeps the place only the base knows (D32), and the added
  // one gets a place of its own (D39).
  const organelles = map.terrain.organelles.map((organelle) => organelle.id);
  expect(organelles).toContain('libs/core/src/pm/legacy.ts');
  expect(organelles).toContain('libs/core/src/pm/tools.ts');

  // Depth is the longest path from any entry point, so `libs/core`'s own
  // barrel sits two terraces down: the CLI reaches it through the doctor.
  const bandOf = new Map(map.terrain.organelles.map((organelle) => [organelle.id, organelle.band]));
  expect(bandOf.get('apps/cli/src/index.ts')).toBe(0);
  expect(bandOf.get('libs/core/src/index.ts')).toBe(2);
  expect(bandOf.get('libs/core/src/pm/index.ts')).toBe(3);
  expect(bandOf.get('libs/core/src/util/format.ts')).toBe(5);
  expect(map.terrain.bands.map((band) => band.index)).toEqual([0, 1, 2, 3, 4, 5]);

  // The one import this change introduced across a membrane is the only
  // new-cross-module line, and the cycle `.check/` found is drawn both ways.
  expect(map.terrain.edges_exceptional).toEqual([
    { from: 'libs/core/src/pm/tools.ts', to: 'libs/core/src/util/format.ts', kind: 'new-cross-module' },
    { from: 'libs/core/src/util/format.ts', to: 'libs/core/src/util/text.ts', kind: 'cycle' },
    { from: 'libs/core/src/util/text.ts', to: 'libs/core/src/util/format.ts', kind: 'cycle' },
  ]);

  expect(map.terrain.layout).toBeUndefined();
  expect(map.meta.instruments).toEqual({ mode: 'check', fallow_schemas: { health: 9, dead: 9, dupes: 9 } });
});

test('the demo map places every changed file on one cell or one group', () => {
  const map = buildMap(inputsFor('demo'), DEFAULT_CONFIG);
  const placed = new Map(map.terrain.groups.map((group) => [group.id, group.files]));

  for (const file of map.weather.changed) {
    expect(file.cell === undefined).not.toBe(file.group === undefined);
  }
  expect(map.weather.changed.find((file) => file.path === 'notes.xyz')?.group).toBe('other');
  expect(map.weather.changed.find((file) => file.path === 'package.json')?.group).toBe('deps');
  // A test is evidence, so it is never shore, but a changed one still names a group (D4, D48).
  expect(map.weather.changed.find((file) => file.path.endsWith('pm.test.ts'))?.group).toBe('tests');
  expect(placed.get('tests')).toEqual(['libs/core/src/__tests__/pm.test.ts']);
  expect(map.terrain.groups.at(-1)?.id).toBe('other');

  // The changed barrel is the interface this change moves.
  expect(map.weather.changed.find((file) => file.path === 'libs/core/src/pm/index.ts')?.is_barrel).toBe(true);
});

test('the demo map carries the evidence the check run produced and nothing it did not', () => {
  const map = buildMap(inputsFor('demo'), DEFAULT_CONFIG);

  expect(map.weather.checks.category).toBe('IFR');
  expect(map.weather.evidence.patch_coverage).toContainEqual({
    path: 'libs/core/src/pm/index.ts',
    changed_executable: 9,
    covered: 4,
    uncovered_lines: [8, 9, 25, 28, 31],
  });
  // A deleted file is stitched through the base graph, where its tests still live (D39).
  expect(map.weather.evidence.stitches).toEqual([
    {
      test: 'libs/core/src/__tests__/pm.test.ts',
      targets: ['libs/core/src/pm/index.ts', 'libs/core/src/pm/legacy.ts', 'libs/core/src/pm/tools.ts'],
      status: 'failed',
    },
  ]);
  // The security slot was skipped, so nothing anywhere claims it passed (C2).
  expect(map.weather.checks.slots.find((slot) => slot.name === 'security')).toEqual({
    name: 'security',
    ok: true,
    skipped: true,
    scope: 'global',
  });
  expect(map.weather.improvements).toEqual([]);
});

test('the demo map dents the cells that break a rule and marks the clone family', () => {
  const map = buildMap(inputsFor('demo'), DEFAULT_CONFIG);
  const cells = new Map(map.terrain.cells.map((cell) => [cell.id, cell]));
  const organelles = new Map(map.terrain.organelles.map((organelle) => [organelle.id, organelle]));

  // One compound `exceeded` is two rules, so the count of dents is the count of rules.
  expect(organelles.get('libs/core/src/pm/tools.ts')?.dents).toEqual(['crap', 'cyclomatic']);
  expect(organelles.get('libs/core/src/util/format.ts')?.dents).toEqual(['cycle']);
  expect(cells.get('directory:libs/core/src/util')?.dents).toEqual(['cycle']);
  expect(cells.get('folder:libs/core/src/pm')?.dents).toEqual(['crap', 'cyclomatic']);

  expect(organelles.get('libs/core/src/pm/slots.ts')?.clone_family).toBe('family-1');
  expect(organelles.get('libs/core/src/pm/tools.ts')?.clone_family).toBe('family-1');
  expect(organelles.get('libs/core/src/util/text.ts')?.clone_family).toBeUndefined();

  // A package cell is a contour around all of its descendants (D45).
  expect(cells.get('package:libs/core')?.organelles).toEqual(['libs/core/src/index.ts']);
  expect(cells.get('package:libs/core')?.fan_in).toBe(1);
  expect(cells.get('folder:libs/core/src/pm')?.fan_in).toBe(2);
  expect(cells.get('folder:libs/core/src/pm')?.function_count).toBe(18);
});

test('the demo map ranks the six notices the budget holds', () => {
  const { notices, weather } = buildMap(inputsFor('demo'), DEFAULT_CONFIG);

  expect(notices).toHaveLength(6);
  expect(notices.map((notice) => notice.tier)).toEqual([
    'primary',
    'secondary',
    'secondary',
    'tertiary',
    'tertiary',
    'tertiary',
  ]);
  expect(notices[0]?.kind).toBe('deleted-export');
  expect(notices[0]?.target).toBe('libs/core/src/pm/index.ts');
  // The file that usually comes along and did not (CHID eq. 3).
  expect(weather.ghosts).toEqual([
    { path: 'libs/core/src/util/format.ts', with: ['libs/core/src/pm/index.ts'], rate: 0.6, support: 3 },
  ]);
});

test('a rename comes out keyed by the head path with `from` set', () => {
  const map = buildMap(inputsFor('rename'), DEFAULT_CONFIG);
  expect(() => assertMap(map)).not.toThrow();

  const ids = map.terrain.organelles.map((organelle) => organelle.id);
  expect(ids).toEqual(['src/index.ts', 'src/new-name.ts']);
  expect(ids).not.toContain('src/old-name.ts');

  expect(map.weather.changed).toEqual([
    {
      path: 'src/new-name.ts',
      kind: 'renamed',
      from: 'src/old-name.ts',
      cell: 'single:src/new-name.ts',
      is_barrel: false,
      added: 4,
      deleted: 2,
      hunks: [{ start: 3, count: 4 }],
    },
  ]);

  // The base graph is rekeyed too, so the one import is not read as a new one.
  expect(map.terrain.edges_exceptional).toEqual([]);
  expect(map.terrain.cells.map((cell) => cell.id)).toEqual(['package:.', 'single:src/new-name.ts']);

  // And the history the old name earned belongs to the new one.
  const renamed = map.terrain.organelles.find((organelle) => organelle.id === 'src/new-name.ts');
  expect(renamed?.bugfix_rate).toBe(0.5);
  expect(renamed?.age_days).toBe(377);

  expect(map.weather.checks).toEqual({ category: 'NOINST', checks_run: 0, reason: '.check/ is absent', slots: [] });
  expect(map.meta.instruments).toEqual({ mode: 'git-only', reason: '.check/ is absent' });
});

/** A boundary violation on a file this change touched: the rung §5.3 calls LIFR. */
test('a boundary violation is drawn as a line and lands the map in LIFR', () => {
  const inputs = inputsFor('demo');
  const check = inputs.check as Extract<CheckArtifacts, { mode: 'check' }>;
  const map = buildMap(
    {
      ...inputs,
      check: {
        ...check,
        dead: {
          circular_dependencies: [],
          re_export_cycles: [],
          boundary_violations: [
            { from_path: 'apps/cli/src/doctor.ts', to_path: 'libs/core/src/pm/index.ts', from_zone: 'apps', to_zone: 'libs' },
          ],
          unused_exports: [],
        },
      },
    },
    DEFAULT_CONFIG,
  );

  expect(map.terrain.edges_exceptional).toContainEqual({
    from: 'apps/cli/src/doctor.ts',
    to: 'libs/core/src/pm/index.ts',
    kind: 'boundary',
  });
  expect(map.terrain.organelles.find((organelle) => organelle.id === 'apps/cli/src/doctor.ts')?.dents).toEqual(['boundary']);
  expect(map.weather.checks.category).toBe('LIFR');
});

test('a git-only read fakes no channel at all', () => {
  const inputs = inputsFor('demo');
  const map = buildMap({ ...inputs, check: { mode: 'git-only', reason: '.check/ is empty' } }, DEFAULT_CONFIG);

  expect(() => assertMap(map)).not.toThrow();
  expect(map.weather.evidence).toEqual({});
  expect(map.weather.checks).toEqual({ category: 'NOINST', checks_run: 0, reason: '.check/ is empty', slots: [] });
  expect(map.terrain.cells.every((cell) => cell.dents.length === 0)).toBe(true);
  expect(map.terrain.organelles.every((organelle) => organelle.function_count === undefined)).toBe(true);
  // The graph is atis's own, so fan-in survives a missing `.check/` (D52).
  expect(map.terrain.cells.find((cell) => cell.id === 'folder:libs/core/src/pm')?.fan_in).toBe(2);
});
