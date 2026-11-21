import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { ApprovedBlock, MapJson } from 'core';
import { expect, test } from 'vitest';

import { NO_APPROVED_SHAPE, counted, departuresIn, inspect } from '../inspector.js';
import type { Fact, FileModel, Inspected, ModuleModel } from '../inspector.js';
import { selectedOf } from '../nav.js';
import type { Selected } from '../nav.js';

/**
 * The inspector's models of a selection (D208 (side-panels)): a module's
 * facts, files, exports and departures and a file's facts, change and
 * functions, read from the demo map, with every fact the map did not measure
 * carried as its reason and never as a number (C2).
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const DEMO = assertMap(JSON.parse(readFileSync(join(ROOT, 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

/** Every committed fixture map that reads under the current contract, by its name, read once. */
const COMMITTED: readonly (readonly [string, MapJson])[] = readdirSync(join(ROOT, 'fixtures')).flatMap((name) => {
  const path = join(ROOT, 'fixtures', name, 'map.json');
  if (!existsSync(path)) return [];
  try {
    return [[name, assertMap(JSON.parse(readFileSync(path, 'utf8')))] as const];
  } catch {
    return [];
  }
});

const PM = 'folder:libs/core/src/pm';
const CORE = 'package:libs/core';
const TOOLS = 'libs/core/src/pm/tools.ts';
const DOCTOR = 'apps/cli/src/doctor.ts';
const LEGACY = 'libs/core/src/pm/legacy.ts';
const SLOTS = 'libs/core/src/pm/slots.ts';

/** The demo with no `.check/` trusted, as the HUD's test strips it: git-only instruments, no slot and no evidence. */
const unchecked = (): MapJson => ({
  ...DEMO,
  meta: { ...DEMO.meta, instruments: { mode: 'git-only', reason: 'no .check/' } },
  weather: { ...DEMO.weather, checks: { category: 'NOINST', checks_run: 0, slots: [] }, evidence: {} },
});

/** The selection a target names in a map, which a test here always expects to be one. */
const pick = (map: MapJson, target: string): Selected => {
  const selected = selectedOf(map, target);
  if (selected === undefined) throw new Error(`the map holds no ${target}`);
  return selected;
};

const moduleAt = (map: MapJson, target: string): ModuleModel => {
  const model = inspect(map, pick(map, target));
  if (model.kind !== 'module') throw new Error(`${target} is no module`);
  return model;
};

const fileAt = (map: MapJson, target: string): FileModel => {
  const model = inspect(map, pick(map, target));
  if (model.kind !== 'file') throw new Error(`${target} is no file`);
  return model;
};

/** A model's facts by their labels: the value, or the reason under `muted`. */
const factsOf = (model: { readonly facts: readonly Fact[] }): Readonly<Record<string, Fact>> => Object.fromEntries(model.facts.map((fact) => [fact.label, fact] as const));

test('with nothing selected, and for a selection the map no longer holds, the inspector shows the map view', () => {
  const map: Inspected = { kind: 'map' };
  expect(inspect(DEMO, undefined)).toEqual(map);
  expect(inspect(DEMO, { kind: 'cell', cell: 'folder:src/gone' })).toEqual(map);
  expect(inspect(DEMO, { kind: 'organelle', path: 'src/gone.ts', cell: PM })).toEqual(map);
});

test("a module is its way down from the map, its facts as the map counts them, and the selection its rows' clicks set", () => {
  const pm = moduleAt(DEMO, PM);
  expect(pm.noun).toBe('module');
  expect(pm.path).toBe('libs/core/src/pm');
  expect(pm.selected).toEqual({ kind: 'cell', cell: PM });
  expect(pm.trail).toEqual([{ words: 'map' }, { words: 'libs/core', selects: { kind: 'cell', cell: CORE } }, { words: 'src/pm', selects: { kind: 'cell', cell: PM } }]);
  expect(pm.facts).toEqual([
    { label: 'kind', value: 'module, a folder with an interface file' },
    { label: 'band', value: '3' },
    { label: 'files', value: '4' },
    { label: 'lines', value: '260' },
    { label: 'interface', value: '3 exports' },
    { label: 'fan in', value: '2' },
    { label: 'fan out', value: '1' },
    { label: 'through the interface', value: '2' },
    { label: 'past the interface', value: '0' },
  ]);
  expect(pm.holds).toEqual([]);
});

test("a module lists every file inside it by path, each with the change's kind, the ranks of the notices on it, and the selection selectedOf would build", () => {
  const pm = moduleAt(DEMO, PM);
  expect(pm.files).toEqual([
    { selects: pick(DEMO, 'libs/core/src/pm/index.ts'), path: 'libs/core/src/pm/index.ts', words: 'index.ts', lines: 31, change: 'modified', notices: [1, 2, 3, 4] },
    { selects: pick(DEMO, LEGACY), path: LEGACY, words: 'legacy.ts', lines: 45, change: 'deleted', notices: [] },
    { selects: pick(DEMO, SLOTS), path: SLOTS, words: 'slots.ts', lines: 88, notices: [] },
    { selects: pick(DEMO, TOOLS), path: TOOLS, words: '+tools.ts', lines: 96, change: 'added', notices: [6] },
  ]);
  expect(pm.notices.map((notice) => [notice.rank, notice.tier, notice.kind])).toEqual([
    [1, 'primary', 'red-check-slot'],
    [2, 'secondary', 'deleted-export'],
    [3, 'secondary', 'uncovered-high-reach'],
    [4, 'tertiary', 'interface-added'],
    [6, 'tertiary', 'red-check-slot'],
  ]);
  expect(pm.notices[2]).toMatchObject({ why: '5 changed lines are uncovered and the change reaches 4 cells', thresholds: 'severity 7 · high_reach_cells 3' });
});

test('a package is counted by its whole contour: its own files and those of the modules it holds, which it lists', () => {
  const core = moduleAt(DEMO, CORE);
  expect(core.noun).toBe('package');
  expect(core.trail).toEqual([{ words: 'map' }, { words: 'libs/core', selects: { kind: 'cell', cell: CORE } }]);
  expect(factsOf(core)).toMatchObject({
    kind: { value: 'package' },
    files: { value: '7 · 1 its own, 6 in 2 modules it holds' },
    lines: { value: '363' },
    'through the interface': { value: '1' },
    'past the interface': { value: '1' },
  });
  expect(core.holds).toEqual([
    { selects: { kind: 'cell', cell: 'directory:libs/core/src/util' }, words: 'src/util', files: 2, lines: 89 },
    { selects: { kind: 'cell', cell: PM }, words: 'src/pm', files: 4, lines: 260 },
  ]);
  expect(core.files.map((file) => [file.words, file.held])).toEqual([
    ['src/index.ts', undefined],
    ['src/pm/index.ts', PM],
    ['src/pm/legacy.ts', PM],
    ['src/pm/slots.ts', PM],
    ['+src/pm/tools.ts', PM],
    ['src/util/format.ts', 'directory:libs/core/src/util'],
    ['src/util/text.ts', 'directory:libs/core/src/util'],
  ]);
  // A notice on a file of a module it holds is a notice inside the package.
  expect(core.notices.map((notice) => notice.rank)).toEqual([1, 2, 3, 4, 6]);
});

test("a single-file module's file is named by its own last segment, and a module nothing measured through says why", () => {
  const doctor = moduleAt(DEMO, `single:${DOCTOR}`);
  expect(doctor.trail.map((crumb) => crumb.words)).toEqual(['map', 'apps/cli', 'src/doctor.ts']);
  expect(doctor.files.map((file) => file.words)).toEqual(['doctor.ts']);
  const why = 'a single file is its own interface';
  expect(factsOf(doctor)).toMatchObject({ kind: { value: 'module, a single file' }, 'through the interface': { muted: why }, 'past the interface': { muted: why } });

  const util = factsOf(moduleAt(DEMO, 'directory:libs/core/src/util'));
  expect(util['past the interface']).toEqual({ label: 'past the interface', muted: 'a directory has no interface file to go through or past' });
  // A count of none is a value: nothing outside reads out of the directory.
  expect(util['fan out']).toEqual({ label: 'fan out', value: '0' });
});

test('a count the map does not carry is muted with its reason, never a zero', () => {
  const cells = DEMO.terrain.cells.map((cell) => {
    if (cell.id !== PM) return cell;
    const { fan_in: _in, fan_out: _out, integrity: _integrity, ...rest } = cell;
    return rest;
  });
  const bare = factsOf(moduleAt({ ...DEMO, terrain: { ...DEMO.terrain, cells } }, PM));
  expect(bare['fan in']).toEqual({ label: 'fan in', muted: 'the map carries no count for it' });
  expect(bare['fan out']).toEqual({ label: 'fan out', muted: 'the map carries no count for it' });
  expect(bare['past the interface']).toEqual({ label: 'past the interface', muted: 'the map carries no count for it' });

  // The change deleted the folder's interface file, so there is none at head to be entered through.
  const changed = DEMO.weather.changed.map((file) => (file.path === 'libs/core/src/pm/index.ts' ? { ...file, kind: 'deleted' as const } : file));
  const unbarrelled = factsOf(moduleAt({ ...DEMO, terrain: { ...DEMO.terrain, cells }, weather: { ...DEMO.weather, changed } }, PM));
  expect(unbarrelled['through the interface']).toEqual({ label: 'through the interface', muted: 'the change deleted its interface file' });
});

test("a module's exports are its names in their own order, lit where the reach crossed its membrane by them, with the files outside it they reached nearest first", () => {
  expect(moduleAt(DEMO, PM).exports).toEqual({
    count: 3,
    names: {
      value: [
        { name: 'listSlots', lit: true, reached: ['libs/core/src/index.ts'] },
        { name: 'resolveSlot', lit: true, reached: [DOCTOR, 'libs/core/src/index.ts'] },
        { name: 'resolveTool', lit: true, reached: [DOCTOR] },
      ],
    },
  });
  // The folder and the directory are inside the package, so only the app's files are across its membrane.
  expect(moduleAt(DEMO, CORE).exports.names).toEqual({
    value: [
      { name: 'legacyResolve', lit: false, reached: [] },
      { name: 'listSlots', lit: false, reached: [] },
      { name: 'resolveSlot', lit: true, reached: [DOCTOR] },
    ],
  });
});

test('exports whose names the scan did not read, and a reach that carries no names, say so rather than reading as unlit', () => {
  const cells = DEMO.terrain.cells.map((cell) => {
    if (cell.id !== PM) return cell;
    const { exports: _names, ...rest } = cell;
    return rest;
  });
  expect(moduleAt({ ...DEMO, terrain: { ...DEMO.terrain, cells } }, PM).exports).toEqual({
    count: 3,
    names: { muted: 'the head scan read no interface file of it, so its names are not known' },
  });

  const reach = DEMO.weather.reach.map(({ names: _names, ...entry }) => entry);
  const unnamed = moduleAt({ ...DEMO, weather: { ...DEMO.weather, reach } }, PM).exports;
  expect(unnamed.unlit).toBe('the map records no name the reach carried, so none is lit');
  expect(unnamed.names).toMatchObject({ value: [{ lit: false }, { lit: false }, { lit: false }] });
  // A change that reaches nothing lights nothing, and that is measured.
  expect(moduleAt({ ...DEMO, weather: { ...DEMO.weather, reach: [] } }, PM).exports.unlit).toBeUndefined();
});

test('an added file is its way down, its facts, what the change did to it and the notices on it', () => {
  const tools = fileAt(DEMO, TOOLS);
  expect(tools.selected).toEqual({ kind: 'organelle', path: TOOLS, cell: PM });
  expect(tools.title).toBe(`+${TOOLS}`);
  expect(tools.trail).toEqual([
    { words: 'map' },
    { words: 'libs/core', selects: { kind: 'cell', cell: CORE } },
    { words: 'src/pm', selects: { kind: 'cell', cell: PM } },
    { words: '+tools.ts', selects: { kind: 'organelle', path: TOOLS, cell: PM } },
  ]);
  expect(tools.facts).toEqual([
    { label: 'lines', value: '96' },
    { label: 'band', value: '4' },
    { label: 'reachable', value: 'yes' },
    { label: 'ties', value: '1 inside its module, 1 outside' },
    { label: 'age', value: '1 day' },
    { label: 'churn', value: '1.00' },
    { label: 'change', value: 'added · +96 −0' },
    { label: 'rules broken', value: 'crap, cyclomatic' },
  ]);
  expect(tools.change).toEqual({
    kind: 'added',
    added: 96,
    deleted: 0,
    hunks: [{ start: 1, count: 96 }],
    ranges: ['lines 1-96'],
    untested: { value: [27, 64] },
    mutants: {
      value: [
        { line: 27, status: 'NoCoverage' },
        { line: 64, status: 'Survived' },
      ],
    },
  });
  expect(tools.notices).toEqual([{ rank: 6, tier: 'tertiary', kind: 'red-check-slot', why: 'the `test` check is red on this changed file', thresholds: 'severity 10' }]);
});

test("a file's functions come in line order, each with its lines and the thresholds it breaks", () => {
  expect(fileAt(DEMO, TOOLS).functions).toEqual({
    value: [
      { name: 'localBin', line: 4, lines: 30, depth: 0, breaches: { value: [] } },
      { name: 'resolveTool', line: 41, lines: 38, depth: 0, breaches: { value: ['crap', 'cyclomatic'] } },
      { name: 'toolName', line: 82, lines: 10, depth: 0, breaches: { value: [] } },
    ],
  });
  // A file the scan read and found no function in has none, which is a count and not a reason.
  expect(fileAt(DEMO, 'libs/core/src/index.ts').functions).toEqual({ value: [] });
});

test("a function nested in another says how deep, and one with no breach list says no health report was read, not that it breaks nothing", () => {
  const organelles = DEMO.terrain.organelles.map((file) =>
    file.id === SLOTS
      ? {
          ...file,
          functions: [
            { name: 'slotOf', line: 4, line_count: 30 },
            { name: 'inner', line: 10, line_count: 5 },
          ],
        }
      : file,
  );
  expect(fileAt({ ...DEMO, terrain: { ...DEMO.terrain, organelles } }, SLOTS).functions).toEqual({
    value: [
      { name: 'slotOf', line: 4, lines: 30, depth: 0, breaches: { muted: 'no health report was read' } },
      { name: 'inner', line: 10, lines: 5, depth: 1, breaches: { muted: 'no health report was read' } },
    ],
  });
});

test('a file no coverage report names counts every changed line as untested, and says that is why', () => {
  const { change } = fileAt(DEMO, DOCTOR);
  const every = [...Array.from({ length: 28 }, (_, at) => 31 + at), ...Array.from({ length: 68 }, (_, at) => 150 + at)];
  expect(change?.untested).toEqual({ value: every });
  expect(change?.unnamed).toBe('no coverage report names the file, so every changed line counts as untested');
  expect(change?.ranges).toEqual(['lines 31-58', 'lines 150-217']);
  // A mutation report was read and names no mutant on it: none, measured.
  expect(change?.mutants).toEqual({ value: [] });
});

test('a deleted file has no ties, no functions and no line to run at head, each said in words', () => {
  const legacy = fileAt(DEMO, LEGACY);
  expect(factsOf(legacy)).toMatchObject({
    ties: { muted: 'a deleted file ties nothing at head' },
    age: { value: '363 days' },
    churn: { muted: 'its size is unknown or zero' },
    change: { value: 'deleted · +0 −45' },
  });
  expect(legacy.functions).toEqual({ muted: 'a deleted file has no functions at head' });
  expect(legacy.change).toMatchObject({ kind: 'deleted', hunks: [], ranges: [], untested: { muted: 'a deleted file has no line to run' } });
});

test('a file the change did not touch has no change to show, and one the history never saw has no age', () => {
  const slots = fileAt(DEMO, SLOTS);
  expect(slots.change).toBeUndefined();
  expect(factsOf(slots)['change']).toEqual({ label: 'change', value: 'unchanged' });
  expect(slots.title).toBe(SLOTS);

  const organelles = DEMO.terrain.organelles.map((file) => {
    if (file.id !== SLOTS) return file;
    const { stability: _stability, ties: _ties, functions: _functions, ...rest } = file;
    return rest;
  });
  const unseen = fileAt({ ...DEMO, terrain: { ...DEMO.terrain, organelles } }, SLOTS);
  expect(factsOf(unseen)).toMatchObject({
    ties: { muted: 'the map carries no ties for it' },
    age: { muted: 'the history window never saw it' },
    churn: { muted: 'the history window never saw it' },
  });
  expect(unseen.functions).toEqual({ muted: 'the head scan read no functions in it' });
});

test("a renamed file says where it came from, and a whole repo's map says it is of no change", () => {
  const changed = DEMO.weather.changed.map((file) => (file.path === 'libs/core/src/pm/index.ts' ? { ...file, kind: 'renamed' as const, from: 'libs/core/src/pm/main.ts' } : file));
  const renamed = fileAt({ ...DEMO, weather: { ...DEMO.weather, changed } }, 'libs/core/src/pm/index.ts');
  expect(factsOf(renamed)['change']).toEqual({ label: 'change', value: 'renamed from libs/core/src/pm/main.ts · +18 −9' });
  expect(renamed.change).toMatchObject({ kind: 'renamed', from: 'libs/core/src/pm/main.ts' });

  const repo: MapJson = { ...DEMO, meta: { ...DEMO.meta, mode: 'repo' }, weather: { ...DEMO.weather, changed: [] } };
  expect(factsOf(fileAt(repo, SLOTS))['change']).toEqual({ label: 'change', muted: "a whole repo's map is of no change" });
});

test('with no check trusted every fact a check would have measured is muted with the reason, and the structure still reads', () => {
  const map = unchecked();
  const tools = fileAt(map, TOOLS);
  expect(factsOf(tools)).toMatchObject({
    lines: { value: '96' },
    ties: { value: '1 inside its module, 1 outside' },
    'rules broken': { muted: 'no .check/ was trusted: no .check/' },
  });
  expect(tools.change?.untested).toEqual({ muted: 'no coverage report was read' });
  expect(tools.change?.mutants).toEqual({ muted: 'no mutation report was read' });
  expect(tools.change?.unnamed).toBeUndefined();
  expect(moduleAt(map, PM).facts).toEqual(moduleAt(DEMO, PM).facts);
});

test('the rules a file breaks are muted where no report that names a rule was read, and say which half was not', () => {
  const read = (schemas: MapJson['meta']['instruments']['fallow_schemas']): Fact | undefined => {
    const { fallow_schemas: _schemas, ...instruments } = DEMO.meta.instruments;
    return factsOf(fileAt({ ...DEMO, meta: { ...DEMO.meta, instruments: { ...instruments, ...(schemas === undefined ? {} : { fallow_schemas: schemas }) } } }, SLOTS))['rules broken'];
  };
  expect(read(undefined)).toEqual({ label: 'rules broken', muted: 'no health or dead-code report was read' });
  expect(read({ dupes: 9 })).toEqual({ label: 'rules broken', muted: 'no health or dead-code report was read' });
  expect(read({ health: 9, dead: 9 })).toEqual({ label: 'rules broken', value: 'none' });
  expect(read({ dead: 9 })).toEqual({ label: 'rules broken', value: 'none · thresholds not read' });
  expect(read({ health: 9 })).toEqual({ label: 'rules broken', value: 'none · cycles and boundaries not read' });
});

test('a stale slot mutes what was read from it, as the HUD mutes its block', () => {
  const stale: MapJson = { ...DEMO, meta: { ...DEMO.meta, instruments: { ...DEMO.meta.instruments, stale: ['test: coverage/coverage-final.json', 'mutation: mutation.json'] } } };
  const { change } = fileAt(stale, DOCTOR);
  expect(change?.untested).toEqual({ muted: "the test slot's report is older than the run" });
  expect(change?.unnamed).toBeUndefined();
  expect(change?.mutants).toEqual({ muted: "the mutation slot's report is older than the run" });
});

test('a changed file the coverage report counts no line of says so', () => {
  const evidence = { ...DEMO.weather.evidence, unmeasured: [] };
  expect(fileAt({ ...DEMO, weather: { ...DEMO.weather, evidence } }, DOCTOR).change?.untested).toEqual({ muted: 'the coverage report counts no changed line of it' });
});

/** A block the map's own guard accepts: a new outside package, three departures of two modules, and a module that is gone. */
const APPROVED: ApprovedBlock = {
  at: DEMO.meta.head,
  departures: [
    { kind: 'dependency-added', target: 'kleur', why: 'kleur is imported and the approved shape did not hold it' },
    { kind: 'past-interface-up', target: 'libs/core', cell: CORE, why: 'more imports go past its interface', now: 1 },
    { kind: 'files-grown', target: 'libs/core/src/pm', cell: PM, why: 'it holds more files than approved', was: 3, now: 4 },
    { kind: 'interface-widened', target: 'libs/core/src/pm', cell: PM, why: 'its interface exports more', was: 2, now: 3, names: ['resolveTool'] },
    { kind: 'module-removed', target: 'src/gone', cell: 'directory:src/gone', why: 'the approved shape held it and the map does not' },
  ],
};

test('with no approved block the departures say no shape was approved yet, for the map and for a module alike', () => {
  expect(NO_APPROVED_SHAPE).toBe('no approved shape yet: run atis approve');
  expect(departuresIn(DEMO)).toEqual({ approved: false, words: NO_APPROVED_SHAPE });
  expect(moduleAt(DEMO, PM).departures).toEqual({ approved: false, words: NO_APPROVED_SHAPE });
});

test("the map's departures come in the map's order, each selecting the cell it names, a module that is gone and an outside package selecting nothing", () => {
  const map = assertMap({ ...DEMO, approved: APPROVED });
  expect(departuresIn(map)).toEqual({
    approved: true,
    words: 'since approved a1b2c3d',
    rows: [
      { kind: 'dependency-added', words: 'outside package added', target: 'kleur', gone: false, why: 'kleur is imported and the approved shape did not hold it', names: [] },
      { kind: 'past-interface-up', words: 'more imports past the interface', target: 'libs/core', selects: { kind: 'cell', cell: CORE }, gone: false, why: 'more imports go past its interface', count: 'now 1', names: [] },
      { kind: 'files-grown', words: 'more files', target: 'libs/core/src/pm', selects: { kind: 'cell', cell: PM }, gone: false, why: 'it holds more files than approved', count: '3 → 4', names: [] },
      { kind: 'interface-widened', words: 'interface widened', target: 'libs/core/src/pm', selects: { kind: 'cell', cell: PM }, gone: false, why: 'its interface exports more', count: '2 → 3', names: ['resolveTool'] },
      { kind: 'module-removed', words: 'module removed', target: 'src/gone', gone: true, why: 'the approved shape held it and the map does not', names: [] },
    ],
  });
});

test('a module shows the departures about its own cell, and a shape that is kept is approved with none', () => {
  const map = assertMap({ ...DEMO, approved: APPROVED });
  const pm = moduleAt(map, PM).departures;
  expect(pm.approved && pm.rows.map((row) => row.kind)).toEqual(['files-grown', 'interface-widened']);
  expect(moduleAt(map, 'package:apps/cli').departures).toEqual({ approved: true, words: 'since approved a1b2c3d', rows: [] });

  const kept = assertMap({ ...DEMO, approved: { at: 'working-tree', departures: [{ kind: 'lines-grown', target: 'libs/core', cell: CORE, why: 'it holds more lines than approved', was: 300 }] } });
  expect(departuresIn(kept)).toMatchObject({ words: 'since approved working tree', rows: [{ words: 'more lines', count: 'was 300' }] });
  expect(departuresIn(assertMap({ ...DEMO, approved: { at: 'working-tree', departures: [] } }))).toEqual({ approved: true, words: 'since approved working tree', rows: [] });
});

test('a count is written with its noun, one or many', () => {
  expect([counted(0, 'file'), counted(1, 'file'), counted(2, 'file'), counted(2, 'advisory', 'advisories')]).toEqual(['0 files', '1 file', '2 files', '2 advisories']);
});

/** How long a sweep of every committed fixture may take: it reads some thirty maps, and the suite shares the machine. */
const SWEEP_MS = 30_000;

/** A fact is a label with a value in words or a reason in words, never both and never an empty one. */
const sound = (fact: Fact): boolean => fact.label !== '' && ('muted' in fact ? fact.muted !== '' && !('value' in fact) : fact.value !== '');

/** What is wrong with one module's model against the map it was read from, in words; nothing where it inspects whole. */
const moduleFaults = (map: MapJson, id: string): readonly string[] => {
  const cell = map.terrain.cells.find((each) => each.id === id);
  const model = inspect(map, { kind: 'cell', cell: id });
  if (cell === undefined || model.kind !== 'module') return [`${id} is no module`];
  const files = new Map(map.terrain.organelles.map((file) => [file.id, file] as const));
  const parents = new Map(map.terrain.cells.map((each) => [each.id, each.parent] as const));
  const faults: string[] = [];
  const last = model.trail.at(-1)?.selects;
  if (model.selected.cell !== id || last?.kind !== 'cell' || last.cell !== id) faults.push(`${id} is not where its way down ends`);
  if (!model.facts.every(sound)) faults.push(`${id} has a fact that is no words`);
  if (model.files.length !== cell.organelles.length + model.holds.reduce((total, held) => total + held.files, 0)) faults.push(`${id} lists other files than its contour holds`);
  for (const row of model.files) {
    const file = files.get(row.path);
    const selects = row.selects.kind === 'organelle' && row.selects.path === file?.id && row.selects.cell === file.cell;
    if (!selects || (row.held ?? id) !== file.cell) faults.push(`${id} misplaces ${row.path}`);
  }
  for (const held of model.holds) {
    if (parents.get(held.selects.cell) !== id) faults.push(`${id} holds ${held.selects.cell}, which another module holds`);
  }
  return faults;
};

test('on every committed fixture each module inspects whole: its files are its contour, its rows select what the map holds, and its facts are words', () => {
  expect(COMMITTED.length).toBeGreaterThan(10);
  for (const [name, map] of COMMITTED) {
    expect(
      map.terrain.cells.flatMap((cell) => moduleFaults(map, cell.id)),
      name,
    ).toEqual([]);
  }
}, SWEEP_MS);

test('a package and the loose files at its root share a path and are still two modules, each with its own files', () => {
  const pairs = COMMITTED.flatMap(([name, map]) =>
    map.terrain.cells.flatMap((cell) => {
      const twin = map.terrain.cells.find((other) => other.id !== cell.id && other.path === cell.path && cell.kind === 'package');
      return twin === undefined ? [] : [[name, map, cell, twin] as const];
    }),
  );
  expect(pairs.length).toBeGreaterThan(0);
  for (const [name, map, pack, loose] of pairs) {
    const outer = moduleAt(map, pack.id);
    const inner = moduleAt(map, loose.id);
    expect([outer.noun, inner.noun], name).toEqual(['package', 'module']);
    expect(outer.path, name).toBe(inner.path);
    expect(outer.selected, name).not.toEqual(inner.selected);
    expect(inner.files.map((file) => file.path), name).toEqual([...loose.organelles].toSorted());
    // Its path is the package's, so on the way down and in the package's list it is named for what it is.
    expect(inner.trail.map((crumb) => crumb.words), name).toEqual(['map', pack.path, 'loose files']);
    expect(outer.holds.find((held) => held.selects.cell === loose.id)?.words, name).toBe('loose files');
  }
});

test('on every committed fixture a file inspects whole: the selection selectedOf builds, its way down ending on it, and facts that are words', () => {
  for (const [name, map] of COMMITTED) {
    const changed = new Set(map.weather.changed.map((file) => file.path));
    // Every changed file, and the first of the rest: enough to meet each kind of file without laying every plate.
    const read = [...map.terrain.organelles.filter((file) => changed.has(file.id)), ...map.terrain.organelles.slice(0, 25)];
    for (const file of read) {
      const model = inspect(map, { kind: 'organelle', path: file.id, cell: file.cell });
      if (model.kind !== 'file') throw new Error(`${name}: ${file.id} is no file`);
      expect(model.selected, `${name} ${file.id}`).toEqual(selectedOf(map, file.id));
      expect(model.trail.at(-1)?.selects, `${name} ${file.id}`).toEqual(model.selected);
      expect(model.trail[0], `${name} ${file.id}`).toEqual({ words: 'map' });
      expect(model.facts.every(sound), `${name} ${file.id}`).toBe(true);
      expect(model.change !== undefined, `${name} ${file.id}`).toBe(changed.has(file.id));
    }
  }
}, SWEEP_MS);
