import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import type { CheckArtifacts } from '../evidence.js';
import { buildMap } from '../map.js';
import type { BuildInputs, EntryPointLookup } from '../map.js';
import type { ExportShapes } from '../notices.js';
import { assertMap } from '../schema.js';
import type { Instruments } from '../schema.js';

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

  // The terraces the bands were quantised into are the strips the field is
  // drawn on, in the same order (D24); step 16 adds the membranes over them.
  expect(map.terrain.layout?.bands.map((band) => band.index)).toEqual([0, 1, 2, 3, 4, 5]);
  expect(map.meta.instruments).toEqual({
    mode: 'check',
    entry_points: 'fallow',
    fallow_schemas: { health: 9, dead: 9, dupes: 9 },
  });
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

test('a config `.ts` lands in the config shore, founding no cell and no empty root package (D57)', () => {
  // The demo root is a workspace member of its own, so before D57 a root
  // `vitest.config.ts` drew a `directory:.` cell with an empty `package:.`
  // beside it. It is scanned terrain like any `.ts`, but the shore claims it.
  const base = inputsFor('demo');
  const withConfig: BuildInputs = {
    ...base,
    base: { ...base.base, files: [...base.base.files, { path: 'vitest.config.ts', loc: 20, exports: [] }] },
    head: { ...base.head, files: [...base.head.files, { path: 'vitest.config.ts', loc: 20, exports: [] }] },
  };
  const map = buildMap(withConfig, DEFAULT_CONFIG);

  expect(() => assertMap(map)).not.toThrow();
  expect(map.terrain.groups.find((group) => group.id === 'config')?.files).toContain('vitest.config.ts');
  expect(map.terrain.cells.map((cell) => cell.id)).not.toContain('directory:.');
  expect(map.terrain.cells.map((cell) => cell.id)).not.toContain('package:.');
  expect(map.terrain.organelles.map((organelle) => organelle.id)).not.toContain('vitest.config.ts');
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

test('buildMap threads the stitches to the category, so a torn one makes the change IFR and a held one does not (D69)', () => {
  // The demo with its test file left out of the diff and its coverage clean:
  // the red `test` slot now names a file this change did not touch, the
  // `dead` slot names only untouched files, and nothing else reaches IFR.
  const inputs = inputsFor('demo');
  const check = inputs.check as Extract<CheckArtifacts, { mode: 'check' }>;
  const withStatus = (status: string): BuildInputs => ({
    ...inputs,
    diff: inputs.diff.filter((file) => !file.path.endsWith('pm.test.ts')),
    check: { ...check, coverage: [], test: { results: [{ path: 'libs/core/src/__tests__/pm.test.ts', status }] } },
  });

  const torn = buildMap(withStatus('failed'), DEFAULT_CONFIG);
  expect(torn.weather.changed.map((file) => file.path)).not.toContain('libs/core/src/__tests__/pm.test.ts');
  expect(torn.weather.evidence.stitches?.map((stitch) => stitch.status)).toEqual(['failed']);
  expect(torn.weather.checks.category).toBe('IFR');

  // The same red `test` slot with the stitch held names no file, so it is standing state; the escaped barrel is what is left.
  const held = buildMap(withStatus('passed'), DEFAULT_CONFIG);
  expect(held.weather.checks.slots.find((slot) => slot.name === 'test')).toEqual({ name: 'test', ok: false, skipped: false, scope: 'global' });
  expect(held.weather.checks.category).toBe('MVFR');
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
  // `pm.test.ts` failed and imports `pm/index.ts`, so the torn stitch puts the red `test` on it (D67).
  expect(notices[0]?.kind).toBe('red-check-slot');
  expect(notices[0]?.target).toBe('libs/core/src/pm/index.ts');
  expect(notices[1]?.kind).toBe('deleted-export');
  // The file that usually comes along and did not (CHID eq. 3).
  expect(weather.ghosts).toEqual([
    { path: 'libs/core/src/util/format.ts', with: ['libs/core/src/pm/index.ts'], rate: 0.6, support: 3 },
  ]);
});

const DEMO_BARREL = 'libs/core/src/pm/index.ts';

test("the demo barrel's interface notice names the name it added, and leaves the one it broke to deleted-export (D76)", () => {
  const { notices } = buildMap(inputsFor('demo'), DEFAULT_CONFIG);

  // `legacyResolve` went while `libs/core/src/index.ts` still takes it: that is deleted-export's row alone.
  expect(notices.find((notice) => notice.kind === 'deleted-export')?.why).toContain('`legacyResolve`');
  expect(notices.find((notice) => notice.kind === 'interface-change')?.why).toBe(
    'the interface of `libs/core/src/pm` changed (`resolveTool` added) and 2 files read it',
  );
});

test('buildMap compares the base shapes with the head shapes, so a body-only edit to the demo barrel raises no interface change (D76)', () => {
  const inputs = inputsFor('demo');
  const exports = inputs.base.files.find((file) => file.path === DEMO_BARREL)?.exports ?? [];
  const printed = Object.fromEntries(exports.map((name) => [name, `declare function ${name}(): void;`]));
  // Both scans export the base names with the shapes given; only the barrel is touched.
  const withBarrel = (scan: BuildInputs['base'], shapes: ExportShapes): BuildInputs['base'] => ({
    ...scan,
    files: scan.files.map((file) => (file.path === DEMO_BARREL ? { ...file, exports, shapes } : file)),
  });
  const kinds = (headShapes: ExportShapes): readonly string[] =>
    buildMap(
      { ...inputs, base: withBarrel(inputs.base, printed), head: withBarrel(inputs.head, headShapes) },
      DEFAULT_CONFIG,
    )
      .notices.filter((notice) => notice.target === DEMO_BARREL)
      .map((notice) => notice.kind);

  expect(kinds(printed)).not.toContain('interface-change');
  expect(kinds({ ...printed, listSlots: 'declare function listSlots(root: string): void;' })).toContain('interface-change');
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
  // The rename repo has no fallow of its own, so its entry points came from the manifests, and the map says so (C2).
  expect(map.meta.instruments).toEqual({
    mode: 'git-only',
    reason: '.check/ is absent',
    entry_points: 'manifests',
    entry_points_reason: 'no local fallow at node_modules/.bin/fallow',
  });
});

function failed(reason: string): EntryPointLookup {
  return { source: 'manifests', reason };
}

test('the entry points read fallow only when both scans did, and name the side that did not (D22, C2)', () => {
  const inputs = inputsFor('demo');
  const instruments = (base: EntryPointLookup, head: EntryPointLookup): Instruments => {
    const map = buildMap(
      { ...inputs, base: { ...inputs.base, entry_points: base }, head: { ...inputs.head, entry_points: head } },
      DEFAULT_CONFIG,
    );
    expect(() => assertMap(map)).not.toThrow();
    return map.meta.instruments;
  };

  expect(instruments({ source: 'fallow' }, { source: 'fallow' })).toMatchObject({ entry_points: 'fallow' });
  expect(instruments({ source: 'fallow' }, { source: 'fallow' }).entry_points_reason).toBeUndefined();
  expect(instruments(failed('fallow list exited 2: bad config'), { source: 'fallow' })).toMatchObject({
    entry_points: 'manifests',
    entry_points_reason: 'base: fallow list exited 2: bad config',
  });
  expect(instruments(failed('no local fallow at node_modules/.bin/fallow'), failed('no local fallow at node_modules/.bin/fallow'))).toMatchObject({
    entry_points: 'manifests',
    entry_points_reason: 'no local fallow at node_modules/.bin/fallow',
  });
  expect(instruments(failed('fallow list timed out after 60 s'), failed('fallow list exited 2: bad config'))).toMatchObject({
    entry_points: 'manifests',
    entry_points_reason: 'base: fallow list timed out after 60 s; head: fallow list exited 2: bad config',
  });
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
