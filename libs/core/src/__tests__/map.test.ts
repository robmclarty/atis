import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import { COVERAGE_UNNAMED } from '../evidence.js';
import type { CheckArtifacts, Dead, Health, Structure } from '../evidence.js';
import { buildMap } from '../map.js';
import type { BuildInputs, EntryPointLookup, FrameInputs } from '../map.js';
import type { ExportShapes } from '../notices.js';
import { assertMap } from '../schema.js';
import type { Instruments, Organelle } from '../schema.js';

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

test("the demo map's outside packages are the head's imports from terrain files, the one the change added marked, with no audit read (D170)", () => {
  const map = buildMap(inputsFor('demo'), DEFAULT_CONFIG);

  // `vitest` is a test's and the committed `dist/index.d.ts` is shore, so
  // neither counts; the security slot was skipped, so no package carries a
  // severity or a count of advisories (C2).
  expect(map.weather.dependencies).toEqual([
    { name: 'kleur', importers: 2 },
    { name: 'picomatch', importers: 2, change: 'added' },
    { name: 'semver', importers: 1 },
  ]);
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
    // One fallow measured both extractions (D98).
    structure: { base: { fallow: '3.22.0' }, head: { fallow: '3.22.0' } },
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
  // The base side the demo's fallow measured: the cognitive function the
  // doctor's edit eased, the deleted legacy file's threshold and clone family,
  // and the doctor's and the barrel's maintainability moving (D98).
  expect(map.weather.improvements).toEqual([
    { kind: 'clone-family', files: ['libs/core/src/pm/legacy.ts', 'libs/core/src/pm/slots.ts'] },
    { kind: 'dent', files: ['apps/cli/src/doctor.ts'], rule: 'cognitive' },
    { kind: 'dent', files: ['libs/core/src/pm/legacy.ts'], rule: 'cyclomatic' },
    { kind: 'threshold', files: ['apps/cli/src/doctor.ts'], rule: 'cognitive', function: 'runChecks' },
    { kind: 'threshold', files: ['libs/core/src/pm/legacy.ts'], rule: 'cyclomatic', function: 'resolveLegacy' },
  ]);
  expect(map.weather.health_delta).toEqual({
    maintainability: 1.9,
    files: [
      { path: 'apps/cli/src/doctor.ts', maintainability: 3.4 },
      { path: 'libs/core/src/pm/index.ts', maintainability: -1.5 },
    ],
  });
});

test('with no base side, improvements and the health delta are absent, never empty or zero (C2)', () => {
  const { structure: _measured, ...inputs } = inputsFor('demo');
  const unmeasured = { reason: 'no local fallow at node_modules/.bin/fallow' };

  for (const map of [
    buildMap(inputs, DEFAULT_CONFIG),
    buildMap({ ...inputs, structure: { base: unmeasured, head: unmeasured } }, DEFAULT_CONFIG),
  ]) {
    expect(() => assertMap(map)).not.toThrow();
    expect(map.weather).not.toHaveProperty('improvements');
    expect(map.weather).not.toHaveProperty('health_delta');
  }
  expect(buildMap({ ...inputs, structure: { base: unmeasured, head: unmeasured } }, DEFAULT_CONFIG).meta.instruments.structure).toEqual({
    base: unmeasured,
    head: unmeasured,
  });
});

test("the demo's doctor.ts, which its coverage report leaves out, is unmeasured, and a report from another checkout is muted (D80, D122)", () => {
  const inputs = inputsFor('demo');
  const map = buildMap(inputs, DEFAULT_CONFIG);
  expect(map.weather.evidence.unmeasured).toEqual(['apps/cli/src/doctor.ts']);
  expect(map.meta.instruments.muted).toBeUndefined();

  // The same report with its keys relative to some other checkout names none of this tree's files.
  const check = inputs.check as Extract<CheckArtifacts, { mode: 'check' }>;
  const elsewhere = (check.coverage ?? []).map((file) => ({ ...file, path: `../elsewhere/${file.path}` }));
  const muted = buildMap({ ...inputs, check: { ...check, coverage: elsewhere } }, DEFAULT_CONFIG);
  expect(muted.meta.instruments.muted).toEqual([COVERAGE_UNNAMED]);
  expect(muted.weather.evidence.patch_coverage).toBeUndefined();
  expect(muted.weather.evidence.unmeasured).toBeUndefined();
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

test('every organelle the history window saw carries its stability, and one it never saw carries none (D149)', () => {
  const inputs = inputsFor('demo');
  const unseen = 'libs/core/src/util/text.ts';
  const commits = inputs.commits.map((commit) => ({ ...commit, files: commit.files.filter((file) => file.path !== unseen) }));
  const map = buildMap({ ...inputs, commits }, DEFAULT_CONFIG);
  const organelles = new Map(map.terrain.organelles.map((organelle) => [organelle.id, organelle]));

  expect(organelles.get(unseen)?.stability).toBeUndefined();
  for (const organelle of map.terrain.organelles.filter((each) => each.id !== unseen)) {
    expect(organelle.stability, organelle.id).toBeDefined();
  }
  // A changed file keeps its own age and churn as they were, and its stability reads the same numbers.
  const doctor = organelles.get('apps/cli/src/doctor.ts');
  expect(doctor?.stability).toEqual({ age_days: doctor?.age_days, churn_ratio: doctor?.churn_ratio });
  // An untouched file gains no history field of a changed file's, so the SVG, which hatches by those, draws it as before.
  expect(organelles.get('libs/core/src/index.ts')).not.toHaveProperty('churn_ratio');
});

test("the demo map ties each file to its cell on the head graph, with the test's edges left out and the deleted file given none (D157)", () => {
  const map = buildMap(inputsFor('demo'), DEFAULT_CONFIG);
  const ties = new Map(map.terrain.organelles.map((organelle) => [organelle.id, organelle.ties]));

  // pm's barrel reads its two siblings and is read by the CLI and the package barrel; the test that imports it ties nothing.
  expect(ties.get('libs/core/src/pm/index.ts')).toEqual({ inside: 2, outside: 2 });
  // A file whose every edge leaves its cell.
  expect(ties.get('apps/cli/src/doctor.ts')).toEqual({ inside: 0, outside: 3 });
  // text.ts and format.ts import each other: two edges, both inside.
  expect(ties.get('libs/core/src/util/text.ts')).toEqual({ inside: 2, outside: 0 });
  // The deleted file stays on the base terrain with no head edges to count, so it carries no key.
  const legacy = map.terrain.organelles.find((organelle) => organelle.id === 'libs/core/src/pm/legacy.ts');
  expect(legacy).toBeDefined();
  expect(legacy).not.toHaveProperty('ties');
});

test("the demo map ties each file to its package beside its cell, so a single-file module is held by its package's siblings (D167)", () => {
  const map = buildMap(inputsFor('demo'), DEFAULT_CONFIG);
  const ties = new Map(map.terrain.organelles.map((organelle) => [organelle.id, organelle.package_ties]));

  // doctor.ts is alone in its cell, but the CLI's barrel reads it from inside its package; its two imports leave for libs/core.
  expect(ties.get('apps/cli/src/doctor.ts')).toEqual({ inside: 1, outside: 2 });
  // The barrel's cell is the package itself, and its one tie is to doctor.ts beside it.
  expect(ties.get('apps/cli/src/index.ts')).toEqual({ inside: 1, outside: 0 });
  // pm's barrel is held by its package's barrel and its siblings, and read by the CLI from outside.
  expect(ties.get('libs/core/src/pm/index.ts')).toEqual({ inside: 3, outside: 1 });
  // format.ts reaches out of its directory cell to pm, but never out of libs/core.
  expect(ties.get('libs/core/src/util/format.ts')).toEqual({ inside: 4, outside: 0 });
  const legacy = map.terrain.organelles.find((organelle) => organelle.id === 'libs/core/src/pm/legacy.ts');
  expect(legacy).not.toHaveProperty('package_ties');
});

test('assertMap accepts package ties and refuses a count that is negative or fractional (D85)', () => {
  const map = buildMap(inputsFor('demo'), DEFAULT_CONFIG);
  const withPackageTies = (package_ties: unknown): unknown => ({
    ...map,
    terrain: { ...map.terrain, organelles: map.terrain.organelles.map((organelle) => ({ ...organelle, package_ties })) },
  });
  expect(() => assertMap(withPackageTies({ inside: 0, outside: 0 }))).not.toThrow();
  expect(() => assertMap(withPackageTies({ inside: -1, outside: 0 }))).toThrow(/package_ties\.inside/);
  expect(() => assertMap(withPackageTies({ inside: 1, outside: 0.5 }))).toThrow(/package_ties\.outside/);
});

test("the demo map's wiring is every head import edge with a changed file at either end, the test's included and the deleted file's none (step 41)", () => {
  const map = buildMap(inputsFor('demo'), DEFAULT_CONFIG);
  expect(map.weather.wiring).toEqual([
    // The modified doctor reads the package barrel and the pm barrel, and the CLI's entry reads the doctor.
    { from: 'apps/cli/src/doctor.ts', to: 'libs/core/src/index.ts' },
    { from: 'apps/cli/src/doctor.ts', to: 'libs/core/src/pm/index.ts' },
    { from: 'apps/cli/src/index.ts', to: 'apps/cli/src/doctor.ts' },
    // The modified test reads the barrel and the added file, as any importer does.
    { from: 'libs/core/src/__tests__/pm.test.ts', to: 'libs/core/src/pm/index.ts' },
    { from: 'libs/core/src/__tests__/pm.test.ts', to: 'libs/core/src/pm/tools.ts' },
    { from: 'libs/core/src/index.ts', to: 'libs/core/src/pm/index.ts' },
    { from: 'libs/core/src/pm/index.ts', to: 'libs/core/src/pm/slots.ts' },
    { from: 'libs/core/src/pm/index.ts', to: 'libs/core/src/pm/tools.ts' },
    { from: 'libs/core/src/pm/tools.ts', to: 'libs/core/src/util/format.ts' },
  ]);
  // Neither end of slots.ts → format.ts, nor of the util cycle, changed, and the deleted legacy.ts has no edge on the head graph.
  expect(map.weather.wiring?.some((edge) => edge.from === 'libs/core/src/pm/slots.ts')).toBe(false);
  expect(map.weather.wiring?.some((edge) => edge.from === 'libs/core/src/util/format.ts' || edge.from === 'libs/core/src/util/text.ts')).toBe(false);
  expect(map.weather.wiring?.some((edge) => edge.from === 'libs/core/src/pm/legacy.ts' || edge.to === 'libs/core/src/pm/legacy.ts')).toBe(false);
});

test('the wiring keeps an edge once, drops a self-import, and drops an end the map does not place', () => {
  const inputs = inputsFor('demo');
  const edges = [
    ...inputs.head.edges,
    { from: 'libs/core/src/pm/tools.ts', to: 'libs/core/src/util/format.ts', names: ['formatSlot'] },
    { from: 'libs/core/src/pm/tools.ts', to: 'libs/core/src/pm/tools.ts', names: [] },
    { from: 'libs/core/src/pm/tools.ts', to: 'node_modules/left-pad/index.js', names: [] },
  ];
  const map = buildMap({ ...inputs, head: { ...inputs.head, edges } }, DEFAULT_CONFIG);
  expect(map.weather.wiring?.filter((edge) => edge.from === 'libs/core/src/pm/tools.ts')).toEqual([{ from: 'libs/core/src/pm/tools.ts', to: 'libs/core/src/util/format.ts' }]);
});

test("each demo cell carries the names its interface exports at head: a folder's barrel, a single-file module's own, and a directory's entrance (D162)", () => {
  const map = buildMap(inputsFor('demo'), DEFAULT_CONFIG);
  const cells = new Map(map.terrain.cells.map((cell) => [cell.id, cell] as const));
  // The pm barrel at head: the change dropped legacyResolve and added resolveTool, and the count stays the terrain's.
  expect(cells.get('folder:libs/core/src/pm')?.exports).toEqual(['listSlots', 'resolveSlot', 'resolveTool']);
  expect(cells.get('folder:libs/core/src/pm')?.interface_size).toBe(3);
  expect(cells.get('single:apps/cli/src/doctor.ts')?.exports).toEqual(['runDoctor']);
  // The util directory is entered through format.ts alone; text.ts is read only from inside it.
  expect(cells.get('directory:libs/core/src/util')?.exports).toEqual(['formatSlot']);
  expect(cells.get('package:libs/core')?.exports).toEqual(['legacyResolve', 'listSlots', 'resolveSlot']);
});

test('a cell whose interface files the head scan never read carries no export names, rather than none at all (C2)', () => {
  const inputs = inputsFor('demo');
  const head = { ...inputs.head, files: inputs.head.files.filter((file) => file.path !== 'apps/cli/src/doctor.ts') };
  const map = buildMap({ ...inputs, head }, DEFAULT_CONFIG);
  const doctor = map.terrain.cells.find((cell) => cell.id === 'single:apps/cli/src/doctor.ts');
  expect(doctor).toBeDefined();
  expect(doctor).not.toHaveProperty('exports');
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

test("the demo barrel's interface notice names the name it added, and leaves the one it broke to deleted-export (D76, D81)", () => {
  const { notices } = buildMap(inputsFor('demo'), DEFAULT_CONFIG);

  // `legacyResolve` went while `libs/core/src/index.ts` still takes it: that is deleted-export's row alone,
  // so all the interface itself shows is a name added, which is new surface and nothing broken.
  expect(notices.find((notice) => notice.kind === 'deleted-export')?.why).toContain('`legacyResolve`');
  expect(notices.map((notice) => notice.kind)).not.toContain('interface-change');
  expect(notices.find((notice) => notice.kind === 'interface-added')?.why).toBe(
    // The demo's scans print no shapes, so the two names the barrel kept are named as uncompared (D123).
    'the interface of `libs/core/src/pm` grew (`resolveTool` added) and 2 files read it; the shape of `listSlots` and `resolveSlot` could not be compared',
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

test('buildMap reads the public names off both scans, so a name the base published reads the demo barrel as public (D75)', () => {
  const inputs = inputsFor('demo');
  const entry = 'libs/core/src/index.ts';
  // Only the base scan publishes `@demo/core` and marks its entry's `export { … } from` the barrel.
  const base: BuildInputs['base'] = {
    ...inputs.base,
    edges: inputs.base.edges.map((edge) =>
      edge.from === entry && edge.to === DEMO_BARREL
        ? { ...edge, reexports: edge.names.map((name) => ({ name, as: name })) }
        : edge,
    ),
    members: inputs.base.members.map((member) =>
      member.name === '@demo/core' ? { ...member, published: true, surface: [entry] } : member,
    ),
  };
  const notice = buildMap({ ...inputs, base }, DEFAULT_CONFIG).notices.find((found) => found.kind === 'interface-added');

  expect(notice?.why).toBe(
    'the interface of `libs/core/src/pm` grew (`resolveTool` added) and 2 files read it and `@demo/core` publishes `legacyResolve`, `listSlots` and `resolveSlot`; the shape of `listSlots` and `resolveSlot` could not be compared',
  );
  expect(notice?.inputs['public_names']).toBe(3);
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
  const { structure: _measured, ...inputs } = inputsFor('demo');
  const check = inputs.check as Extract<CheckArtifacts, { mode: 'check' }>;
  const dead: Dead = {
    circular_dependencies: [],
    re_export_cycles: [],
    boundary_violations: [{ from_path: 'apps/cli/src/doctor.ts', to_path: 'libs/core/src/pm/index.ts', from_zone: 'apps', to_zone: 'libs' }],
    unused_exports: [],
  };
  const map = buildMap({ ...inputs, check: { ...check, dead } }, DEFAULT_CONFIG);

  expect(map.terrain.edges_exceptional).toContainEqual({
    from: 'apps/cli/src/doctor.ts',
    to: 'libs/core/src/pm/index.ts',
    kind: 'boundary',
  });
  expect(map.terrain.organelles.find((organelle) => organelle.id === 'apps/cli/src/doctor.ts')?.dents).toEqual(['boundary']);
  // With no base side, the head-only rule holds it to the changed file it names (D140).
  expect(map.weather.checks.category).toBe('LIFR');

  // With one, it is the change's only where the base had no such violation (D98).
  const measured = inputsFor('demo').structure;
  const side = (at: 'base' | 'head', violations: Dead): Structure => ({ ...(measured?.[at] as Extract<Structure, { fallow: string }>), dead: violations });
  const clean: Dead = { ...dead, boundary_violations: [] };
  const introduced = buildMap({ ...inputs, check: { ...check, dead }, structure: { base: side('base', clean), head: side('head', dead) } }, DEFAULT_CONFIG);
  expect(introduced.weather.checks.category).toBe('LIFR');
  expect(introduced.notices.find((notice) => notice.kind === 'cycle-or-boundary')?.why).toBe('a cycle or boundary violation this change introduced, absent at the base');
  const standing = buildMap({ ...inputs, check: { ...check, dead }, structure: { base: side('base', dead), head: side('head', dead) } }, DEFAULT_CONFIG);
  expect(standing.weather.checks.category).toBe('IFR');
  expect(standing.notices.map((notice) => notice.kind)).not.toContain('cycle-or-boundary');
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

/** The demo change as the last commit of a range: the head side's inputs, read at it (D100). */
function headFrame(inputs: BuildInputs, commit: string, subject: string): FrameInputs {
  const { head, diff, deps_added, commits, head_time, check, structure } = inputs;
  return { commit, subject, head, diff, deps_added, commits, head_time, check, ...(structure === undefined ? {} : { structure }) };
}

test('a range writes one frame per commit over the one terrain, the last the map\'s own weather and notices (D100)', () => {
  const inputs = inputsFor('demo');
  // The first commit touched the README alone, and is not the checked-out HEAD, so it reads git-only (D135).
  const readme = inputs.diff.filter((file) => file.path === 'README.md');
  const first: FrameInputs = {
    ...headFrame({ ...inputs, head: inputs.base, diff: readme, deps_added: [] }, 'a'.repeat(40), 'docs: say what the doctor does'),
    check: { mode: 'git-only', reason: 'the commit is not the checked-out HEAD' },
  };
  const last = headFrame(inputs, 'b'.repeat(40), 'feat(cli): run the doctor');
  const plain = buildMap(inputs, DEFAULT_CONFIG);
  const map = buildMap({ ...inputs, frames: [first, last] }, DEFAULT_CONFIG);

  expect(() => assertMap(map)).not.toThrow();
  // The frames move nothing: the terrain, the weather and the notices are the map's without them.
  expect(map.terrain).toEqual(plain.terrain);
  expect(map.weather).toEqual(plain.weather);
  expect(map.notices).toEqual(plain.notices);

  const frames = map.sequence?.frames ?? [];
  expect(frames.map((frame) => [frame.commit, frame.subject])).toEqual([
    ['a'.repeat(40), 'docs: say what the doctor does'],
    ['b'.repeat(40), 'feat(cli): run the doctor'],
  ]);
  expect(frames[1]?.weather).toEqual(map.weather);
  expect(frames[1]?.notices).toEqual(map.notices);
  expect(frames[1]?.unplaced).toBeUndefined();

  // The first frame is its own commit's weather: the README alone, with no evidence, since no .check/ describes it.
  expect(frames[0]?.weather.changed.map((file) => file.path)).toEqual(['README.md']);
  expect(frames[0]?.weather.evidence).toEqual({});
  expect(frames[0]?.weather.checks.category).toBe('NOINST');
  expect(frames[0]?.weather.checks.reason).toBe('the commit is not the checked-out HEAD');
});

test('a file only an earlier commit had keeps its changed entry, is named unplaced, and draws no wiring the terrain cannot place (D100, C2)', () => {
  const inputs = inputsFor('demo');
  const gone = 'libs/core/src/pm/gone.ts';
  const tools = inputs.head.files.find((file) => file.path === 'libs/core/src/pm/tools.ts');
  if (tools === undefined) throw new Error('the demo head has no tools.ts');
  const head = {
    ...inputs.head,
    files: [...inputs.head.files, { ...tools, path: gone }].toSorted((a, b) => (a.path < b.path ? -1 : 1)),
    edges: [...inputs.head.edges, { from: gone, to: 'libs/core/src/util/format.ts', names: ['format'], line: 1 }],
  };
  const diff = [...inputs.diff, { path: gone, kind: 'added' as const, added: 96, deleted: 0, hunks: [{ start: 1, count: 96 }] }].toSorted((a, b) => (a.path < b.path ? -1 : 1));
  const earlier = headFrame({ ...inputs, head, diff }, 'c'.repeat(40), 'feat: a helper the next commit folds away');
  const map = buildMap({ ...inputs, frames: [earlier, headFrame(inputs, 'd'.repeat(40), 'refactor: fold the helper into tools')] }, DEFAULT_CONFIG);

  expect(() => assertMap(map)).not.toThrow();
  const [frame] = map.sequence?.frames ?? [];
  expect(frame?.unplaced).toEqual([gone]);
  expect(frame?.weather.changed.find((file) => file.path === gone)?.kind).toBe('added');
  expect(frame?.weather.wiring?.some((edge) => edge.from === gone || edge.to === gone)).toBe(false);
  expect(map.terrain.organelles.some((organelle) => organelle.id === gone)).toBe(false);
});

const TOOLS = 'libs/core/src/pm/tools.ts';

/** The demo with fallow's health findings swapped for `findings`, its other channels as they were. */
function withFindings(findings: Health['findings']): BuildInputs {
  const inputs = inputsFor('demo');
  const { check } = inputs;
  if (check.mode !== 'check' || check.health === undefined) throw new Error("the demo's .check/ holds health.json");
  return { ...inputs, check: { ...check, health: { ...check.health, findings } } };
}

function functionsOf(map: ReturnType<typeof buildMap>, path: string): Organelle['functions'] {
  return map.terrain.organelles.find((organelle) => organelle.path === path)?.functions;
}

test("each file carries the functions the head scan read, each with the thresholds fallow found it break, and a deleted file none (D102)", () => {
  const map = buildMap(inputsFor('demo'), DEFAULT_CONFIG);

  // The one finding, on `resolveTool`'s first line, joins it; a compound `exceeded` is split one rule per threshold.
  expect(functionsOf(map, TOOLS)).toEqual([
    { name: 'localBin', line: 4, line_count: 30, breaches: [] },
    { name: 'resolveTool', line: 41, line_count: 38, breaches: ['crap', 'cyclomatic'] },
    { name: 'toolName', line: 82, line_count: 10, breaches: [] },
  ]);
  // A barrel the scan read no function in carries an empty list, and the deleted file nothing at all (C2).
  expect(functionsOf(map, 'libs/core/src/index.ts')).toEqual([]);
  expect(functionsOf(map, 'libs/core/src/pm/legacy.ts')).toBeUndefined();
});

test('a finding joins the function of its name whose lines hold it, and one the scan bound to no name stands as a function of its own (D102)', () => {
  const map = buildMap(
    withFindings([
      { path: TOOLS, exceeded: 'cognitive', line: 10, line_count: 3, name: 'localBin' },
      { path: TOOLS, exceeded: 'both', line: 50, line_count: 12, name: '<arrow>' },
      { path: TOOLS, exceeded: 'crap', line: 50, line_count: 12, name: '<arrow>' },
    ]),
    DEFAULT_CONFIG,
  );

  expect(functionsOf(map, TOOLS)).toEqual([
    { name: 'localBin', line: 4, line_count: 30, breaches: ['cognitive'] },
    { name: 'resolveTool', line: 41, line_count: 38, breaches: [] },
    { name: '<arrow>', line: 50, line_count: 12, breaches: ['cognitive', 'crap', 'cyclomatic'] },
    { name: 'toolName', line: 82, line_count: 10, breaches: [] },
  ]);
});

test('with no health.json read, a function carries no breaches, since none were looked for (C2)', () => {
  const map = buildMap({ ...inputsFor('demo'), check: { mode: 'git-only', reason: '.check/ is absent' } }, DEFAULT_CONFIG);

  expect(functionsOf(map, TOOLS)).toEqual([
    { name: 'localBin', line: 4, line_count: 30 },
    { name: 'resolveTool', line: 41, line_count: 38 },
    { name: 'toolName', line: 82, line_count: 10 },
  ]);
  expect(() => assertMap(map)).not.toThrow();
});

test('assertMap refuses a function out of line order or spanning no line', () => {
  const map = buildMap(inputsFor('demo'), DEFAULT_CONFIG);
  const swap = (functions: unknown): unknown => ({
    ...map,
    terrain: { ...map.terrain, organelles: map.terrain.organelles.map((organelle) => (organelle.path === TOOLS ? { ...organelle, functions } : organelle)) },
  });
  expect(() => assertMap(swap([{ name: 'b', line: 9, line_count: 1 }, { name: 'a', line: 2, line_count: 1 }]))).toThrow(/sorted by line/);
  expect(() => assertMap(swap([{ name: 'a', line: 2, line_count: 0 }]))).toThrow(/at least one line/);
});
