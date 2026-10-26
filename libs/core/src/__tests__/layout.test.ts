import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import { LAYOUT_SEED, computeLayout, computeMembranes, radiusOf, seededRandom, simulate } from '../layout/index.js';
import type { Ground, LayoutInput } from '../layout/index.js';
import { buildMap, layOutTerrain } from '../map.js';
import type { BuildInputs } from '../map.js';
import { assertMap } from '../schema.js';
import type { Band, Group, Layout, Organelle, Position } from '../schema.js';

/**
 * The fixture is a repository shaped like one: eight cells, each sitting on
 * two neighbouring terraces the way a folder module's files do, chained
 * together by imports, with a shore of documentation beside them. The
 * pathological shape — a cell with a file on every terrace — is deliberately
 * not the fixture: §5.1 says such a cell is *stretched* across the abyss, so
 * the map drawing it as a tall column rather than a clump is the encoding
 * working, not the layout failing.
 */
const CELLS = 8;
const PER_CELL = 6;
const BANDS = 7;

function cellOf(index: number): string {
  return `folder:libs/p${String(index).padStart(2, '0')}/src`;
}

function fileOf(cell: number, file: number): string {
  return `libs/p${String(cell).padStart(2, '0')}/src/f${String(file).padStart(2, '0')}.ts`;
}

function organelleAt(cell: number, file: number): Organelle {
  return {
    id: fileOf(cell, file),
    path: fileOf(cell, file),
    cell: cellOf(cell),
    band: (cell % (BANDS - 1)) + (file % 2),
    reachable: true,
    // A wide spread of sizes, so collision is working on radii that differ.
    loc: 20 + ((cell * 37 + file * 13) % 600),
    dents: [],
  };
}

function fixture(added: readonly string[] = []): LayoutInput {
  const organelles = Array.from({ length: CELLS }, (_unused, cell) =>
    Array.from({ length: PER_CELL }, (_file, file) => organelleAt(cell, file)),
  ).flat();
  const cells = Array.from({ length: CELLS }, (_unused, cell) => ({
    id: cellOf(cell),
    organelles: organelles.flatMap((organelle) => (organelle.cell === cellOf(cell) ? [organelle.id] : [])),
  }));
  // A chain through each cell's files, and one import from each cell into the next.
  const edges = organelles.flatMap((organelle, index) =>
    index === 0 ? [] : [{ from: organelles[index - 1]?.id ?? '', to: organelle.id }],
  );
  const groups: readonly Group[] = [
    { id: 'docs', files: Array.from({ length: 14 }, (_unused, index) => `docs/page-${String(index)}.md`) },
    { id: 'deps', files: ['package.json', 'pnpm-workspace.yaml'] },
    { id: 'tests', files: ['libs/p00/src/__tests__/p00.test.ts'] },
    { id: 'other', files: ['notes.xyz'] },
  ];
  const bands: readonly Band[] = Array.from({ length: BANDS }, (_unused, index) => ({
    index,
    depth_min: index,
    depth_max: index,
  }));
  return { cells, organelles, edges, bands, groups, added: new Set(added) };
}

/** One field, shared by every test that only reads it; laying it out twice is the slow part. */
const INPUT = fixture();
const FIELD = computeLayout(INPUT);

function positionOf(layout: Layout, id: string): Position {
  const position = layout.positions[id];
  if (position === undefined) throw new Error(`no position for ${id}`);
  return position;
}

/** The mean distance between two sets of points; within one set, a point is not its own neighbour. */
function meanDistance(from: readonly Position[], to: readonly Position[]): number {
  const pairs = from.flatMap((a) => to.flatMap((b) => (a === b ? [] : [Math.hypot(a.x - b.x, a.y - b.y)])));
  return pairs.reduce((total, distance) => total + distance, 0) / pairs.length;
}

function draw(seed: number): readonly number[] {
  const random = seededRandom(seed);
  return Array.from({ length: 8 }, () => random());
}

test('the same inputs lay out byte for byte the same, twice', () => {
  expect(JSON.stringify(computeLayout(INPUT))).toBe(JSON.stringify(FIELD));
});

test('a seeded generator repeats its stream, and a different seed is a different one', () => {
  expect(draw(LAYOUT_SEED)).toEqual(draw(LAYOUT_SEED));
  expect(draw(LAYOUT_SEED)).not.toEqual(draw(LAYOUT_SEED + 1));
  expect(draw(LAYOUT_SEED).every((value) => value >= 0 && value < 1)).toBe(true);
});

test('every organelle lands on its own terrace, inside the strip and not only on its line', () => {
  const strips = new Map(FIELD.bands.map((band) => [band.index, band] as const));

  expect(FIELD.bands.map((band) => band.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  // The terraces stack under the shore with no gap and no overlap between them.
  expect(FIELD.shore).toEqual({ y0: 0, y1: FIELD.bands[0]?.y0 });
  expect(FIELD.bands.at(-1)?.y1).toBe(FIELD.height);
  for (const [index, band] of FIELD.bands.entries()) {
    expect(band.y0).toBe(FIELD.bands[index - 1]?.y1 ?? FIELD.shore.y1);
  }

  for (const organelle of INPUT.organelles) {
    const position = positionOf(FIELD, organelle.id);
    const strip = strips.get(organelle.band);
    expect(strip, `band ${String(organelle.band)} has no strip`).toBeDefined();
    expect(position.y - position.r).toBeGreaterThanOrEqual(strip?.y0 ?? 0);
    expect(position.y + position.r).toBeLessThanOrEqual(strip?.y1 ?? 0);
  }
});

test('no two organelles overlap by more than a pixel', () => {
  const placed = INPUT.organelles.map((organelle) => positionOf(FIELD, organelle.id));
  const overlaps = placed.flatMap((a, index) =>
    placed.slice(index + 1).map((b) => a.r + b.r - Math.hypot(a.x - b.x, a.y - b.y)),
  );
  expect(Math.max(...overlaps)).toBeLessThanOrEqual(1);
});

test('a cell sits closer to itself than to any other cell', () => {
  const cells = new Map<string, Position[]>();
  for (const organelle of INPUT.organelles) {
    cells.set(organelle.cell, [...(cells.get(organelle.cell) ?? []), positionOf(FIELD, organelle.id)]);
  }

  for (const [cell, own] of cells) {
    const inside = meanDistance(own, own);
    for (const [other, theirs] of cells) {
      if (other === cell) continue;
      expect(inside, `${cell} is no tighter than the gap to ${other}`).toBeLessThan(meanDistance(own, theirs));
    }
  }
});

test('size means mass and only mass', () => {
  expect(radiusOf(400)).toBeGreaterThan(radiusOf(100));
  // Area with lines, so twice the code is twice the ink; floored so a one-line
  // file still shows and capped so a generated monster cannot eat its terrace.
  expect(radiusOf(0)).toBe(radiusOf(1) - 0.62);
  expect(radiusOf(1_000_000)).toBe(radiusOf(999_999));
});

test('the second pass cannot move what the first one settled', () => {
  const files = INPUT.organelles.map((organelle) => ({
    id: organelle.id,
    cell: organelle.cell,
    band: organelle.band,
    loc: organelle.loc,
  }));
  const strips = new Map(FIELD.bands.map((band) => [band.index, { y0: band.y0, y1: band.y1 }] as const));
  const weather = `${cellOf(CELLS - 1)}/`;
  const shared = { edges: INPUT.edges, strips, width: 900 } as const;

  const terrain = files.filter((file) => !file.id.startsWith(weather.replace('folder:', '')));
  const first = simulate({ ...shared, files: terrain, fixed: new Map(), random: seededRandom(LAYOUT_SEED) });
  const fixed = new Map(first.map((placed) => [placed.id, placed] as const));
  const second = simulate({ ...shared, files, fixed, random: seededRandom(LAYOUT_SEED + 1) });

  expect(first).not.toHaveLength(files.length);
  const settled = new Map(second.map((placed) => [placed.id, placed] as const));
  for (const placed of first) expect(settled.get(placed.id)).toEqual(placed);
  // And the files the second pass was there for did get a place of their own.
  expect(second).toHaveLength(files.length);
});

test('the shore is a grid above band 0, group by group, and holds no test file', () => {
  const shore = Object.entries(FIELD.positions).filter(([, position]) => position.y < FIELD.shore.y1);
  expect(shore).not.toHaveLength(0);
  for (const [, position] of shore) {
    expect(position.y).toBeGreaterThan(0);
    // Every mark is the same size: the shore is not terrain and carries no mass (D48).
    expect(position.r).toBe(4);
  }

  // Groups run in D48's table order, left to right, each its own block.
  const leftmostOf = (prefix: string): number =>
    Math.min(...shore.filter(([path]) => path.startsWith(prefix)).map(([, position]) => position.x));
  expect(leftmostOf('docs/')).toBeLessThan(leftmostOf('package.json'));
  expect(leftmostOf('package.json')).toBeLessThan(leftmostOf('notes.xyz'));

  // A changed test file names a group, but it is evidence and never shore (D4).
  expect(FIELD.positions['libs/p00/src/__tests__/p00.test.ts']).toBeUndefined();
});

test('an empty repository lays out an empty field rather than throwing', () => {
  const layout = computeLayout({ cells: [], organelles: [], edges: [], bands: [], groups: [], added: new Set() });
  expect(layout).toEqual({ width: 480, height: 0, shore: { y0: 0, y1: 0 }, bands: [], positions: {}, contours: {} });
});

/** The end of the seam: `buildMap` is what puts the field in the file (D24). */
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', 'fixtures');

test('buildMap emits a layout every organelle and shore file has a place in', () => {
  const inputs = JSON.parse(readFileSync(join(FIXTURES, 'demo', 'inputs.json'), 'utf8')) as BuildInputs;
  const map = buildMap(inputs, DEFAULT_CONFIG);
  const layout = map.terrain.layout;

  expect(() => assertMap(map)).not.toThrow();
  expect(layout).toBeDefined();
  if (layout === undefined) return;

  for (const organelle of map.terrain.organelles) expect(layout.positions[organelle.id]).toBeDefined();
  for (const group of map.terrain.groups) {
    for (const file of group.files) {
      expect(layout.positions[file] === undefined).toBe(group.id === 'tests');
    }
  }
  // The membranes are cut over the same field: one per cell (step 16).
  for (const cell of map.terrain.cells) expect(layout.contours?.[cell.id]).toBeDefined();
  // The added file was placed by the second pass and is on the field like any other.
  expect(layout.positions['libs/core/src/pm/tools.ts']).toBeDefined();
});

/** The mean distance the files both layouts place moved from the first to the second. */
function displacement(from: Layout, to: Layout): number {
  const moved = Object.keys(to.positions).flatMap((id) => {
    const was = from.positions[id];
    const now = to.positions[id];
    return was === undefined || now === undefined ? [] : [Math.hypot(now.x - was.x, now.y - was.y)];
  });
  return moved.reduce((total, distance) => total + distance, 0) / moved.length;
}

/** One file of a one-cell, one-terrace pass. */
function lone(id: string): { readonly id: string; readonly cell: string; readonly band: number; readonly loc: number } {
  return { id, cell: 'folder:src', band: 0, loc: 40 };
}

test('a file the prior placed starts where it was, and a new file of its cell starts beside it (D97)', () => {
  const strips = new Map([[0, { y0: 100, y1: 200 }]]);
  const shared = { edges: [], strips, width: 900, fixed: new Map(), random: seededRandom(LAYOUT_SEED) } as const;
  const start = new Map([['src/a.ts', { x: 2400, y: 130 }]]);

  // Alone on its terrace nothing pulls it anywhere, so it rests exactly where it started, far outside a cold pass's columns.
  expect(simulate({ ...shared, files: [lone('src/a.ts')], start })).toEqual([{ id: 'src/a.ts', x: 2400, y: 130, r: radiusOf(40) }]);

  // A file the prior never saw starts beside its cell's files, in the prior's frame, not in a cold pass's column.
  const placed = simulate({ ...shared, files: [lone('src/a.ts'), lone('src/b.ts')], start });
  const added = placed.find((one) => one.id === 'src/b.ts');
  expect(Math.abs((added?.x ?? 0) - 2400)).toBeLessThan(80);
});

test('relaxed from its own layout, a field barely moves, and one prior and one input lay out one field (D97)', () => {
  const relaxed = computeLayout({ ...INPUT, prior: FIELD });
  expect(displacement(FIELD, relaxed)).toBeLessThan(3);
  expect(JSON.stringify(computeLayout({ ...INPUT, prior: FIELD }))).toBe(JSON.stringify(relaxed));
  // No prior, no relaxing: the field is the one it always was.
  expect(JSON.stringify(computeLayout({ ...INPUT }))).toBe(JSON.stringify(FIELD));
});

test('a renamed file keeps where it stood before, carried beside the file nearest it that stayed (D40, D97)', () => {
  const inputs = JSON.parse(readFileSync(join(FIXTURES, 'rename', 'inputs.json'), 'utf8')) as BuildInputs;
  const prior = layOutTerrain(inputs.base, DEFAULT_CONFIG);
  const map = buildMap({ ...inputs, prior }, DEFAULT_CONFIG);
  expect(() => assertMap(map)).not.toThrow();

  const was = prior.positions['src/old-name.ts'];
  const before = prior.positions['src/index.ts'];
  const after = map.terrain.layout.positions['src/index.ts'];
  expect(was).toBeDefined();
  // `src/index.ts` is the nearest file to the old name that stands in both layouts.
  expect(map.terrain.layout.renamed_from).toEqual({
    'src/new-name.ts': {
      x: Math.round(((was?.x ?? 0) + (after?.x ?? 0) - (before?.x ?? 0)) * 100) / 100,
      y: Math.round(((was?.y ?? 0) + (after?.y ?? 0) - (before?.y ?? 0)) * 100) / 100,
      r: was?.r,
    },
  });

  // With no layout before it there is nowhere it stood, and the key is absent rather than guessed (C2).
  expect(buildMap(inputs, DEFAULT_CONFIG).terrain.layout.renamed_from).toBeUndefined();
  // And a second position for a file the map does not place is refused.
  const stray = { ...map, terrain: { ...map.terrain, layout: { ...map.terrain.layout, renamed_from: { 'src/gone.ts': { x: 1, y: 1, r: 4 } } } } };
  expect(() => assertMap(stray)).toThrow(/renamed_from/);
});

/** The fixture's own field as a change over it holds it (D172): its layout and the terrain it laid out. */
const GROUND: Ground = {
  layout: FIELD,
  cells: INPUT.cells,
  organelles: INPUT.organelles.map(({ id, cell, band, loc }) => ({ id, cell, band, loc })),
  bands: INPUT.bands,
  groups: INPUT.groups,
};

const ADDED = 'libs/p03/src/f06.ts';
const RENAMED = { from: 'libs/p05/src/f02.ts', to: 'libs/p05/src/g02.ts' } as const;

/**
 * A change over the fixture: a file added to the fourth cell, a file of the
 * sixth renamed within it, and a page added to the docs.
 */
function changed(docs: readonly string[] = ['docs/page-14.md']): LayoutInput {
  const rename = (id: string): string => (id === RENAMED.from ? RENAMED.to : id);
  const organelles = [
    ...INPUT.organelles.map((organelle) => (organelle.id === RENAMED.from ? { ...organelle, id: RENAMED.to, path: RENAMED.to } : organelle)),
    { ...organelleAt(3, 0), id: ADDED, path: ADDED },
  ];
  return {
    ...INPUT,
    organelles,
    cells: INPUT.cells.map((cell) => ({ ...cell, organelles: [...cell.organelles.map(rename), ...(cell.id === cellOf(3) ? [ADDED] : [])] })),
    groups: INPUT.groups.map((group) => (group.id === 'docs' ? { ...group, files: [...group.files, ...docs] } : group)),
    added: new Set([ADDED, ...docs]),
    renames: new Map([[RENAMED.to, RENAMED.from]]),
  };
}

test('over its base, a change holds every file and skin it left alone exactly where the base had them (D172)', () => {
  const input = changed();
  const held = computeLayout({ ...input, ground: GROUND });
  const moved = new Set([ADDED, RENAMED.to, 'docs/page-14.md']);

  // Every file the change did not add or rename stands where the base put it, shore marks with the rest.
  for (const [id, position] of Object.entries(held.positions)) {
    if (!moved.has(id)) expect(position, id).toEqual(FIELD.positions[id]);
  }
  // The change's own files have places, the new page in its block's next free one, and the renamed file's old place is its base place (D40).
  for (const id of moved) expect(held.positions[id], id).toBeDefined();
  expect(held.positions['docs/page-14.md']?.y).toBeLessThan(FIELD.shore.y1);
  expect(held.renamed_from).toEqual({ [RENAMED.to]: FIELD.positions[RENAMED.from] });
  // The terraces, the shore and the field's size are the base's.
  expect({ ...held, positions: {}, contours: {}, renamed_from: {} }).toEqual({ ...FIELD, positions: {}, contours: {}, renamed_from: {} });

  // Every skin is the one a full cut over the held field gives, and the skins far from the change are the base's own.
  expect(held.contours).toEqual(computeMembranes({ cells: input.cells, groups: input.groups, positions: held.positions }));
  for (const far of [cellOf(0), cellOf(1)]) expect(held.contours?.[far], far).toEqual(FIELD.contours?.[far]);
  // One base and one change hold one field.
  expect(JSON.stringify(computeLayout({ ...input, ground: GROUND }))).toBe(JSON.stringify(held));
});

test('a change that changes nothing holds its base exactly (D172)', () => {
  expect(computeLayout({ ...INPUT, ground: GROUND })).toEqual(FIELD);
});

test('a file the change moves to another terrace, and a lane the base never had, are laid out around the held ground (D172)', () => {
  const lifted = organelleAt(2, 0);
  const fresh = ['libs/p08/src/f00.ts', 'libs/p08/src/f01.ts'];
  const input: LayoutInput = {
    ...INPUT,
    organelles: [
      ...INPUT.organelles.map((organelle) => (organelle.id === lifted.id ? { ...organelle, band: organelle.band + 1 } : organelle)),
      ...fresh.map((id, index) => ({ ...organelleAt(0, index), id, path: id, cell: 'folder:libs/p08/src' })),
    ],
    cells: [...INPUT.cells, { id: 'folder:libs/p08/src', organelles: fresh }],
    added: new Set(fresh),
  };
  const held = computeLayout({ ...input, ground: GROUND });
  const strip = held.bands.find((band) => band.index === lifted.band + 1);

  // The lifted file left its old place for its new terrace; everything else of the base stayed.
  expect(held.positions[lifted.id]).not.toEqual(FIELD.positions[lifted.id]);
  expect(held.positions[lifted.id]?.y).toBeGreaterThan(strip?.y0 ?? Number.POSITIVE_INFINITY);
  expect(held.positions[lifted.id]?.y).toBeLessThan(strip?.y1 ?? 0);
  for (const id of Object.keys(FIELD.positions).filter((path) => path !== lifted.id)) expect(held.positions[id], id).toEqual(FIELD.positions[id]);
  // The new lane stands right of every lane the base had.
  const right = Math.max(...INPUT.organelles.map((organelle) => positionOf(FIELD, organelle.id).x));
  for (const id of fresh) expect(positionOf(held, id).x).toBeGreaterThan(right);
  expect(held.contours).toEqual(computeMembranes({ cells: input.cells, groups: input.groups, positions: held.positions }));
});

test('pages a full block cannot take grow it a row into the gap below, then stand at the end of its row, and the ground holds (D172)', () => {
  const pages = Array.from({ length: 10 }, (_unused, index) => `docs/page-${String(14 + index)}.md`);
  const input = changed(pages);
  const held = computeLayout({ ...input, ground: GROUND });

  for (const [id, position] of Object.entries(FIELD.positions)) {
    if (id !== RENAMED.from) expect(held.positions[id], id).toEqual(position);
  }
  // The docs block, four columns of four rows, takes two pages in its last row and four in the row below it.
  const shore = Object.values(FIELD.positions).filter((position) => position.y < FIELD.shore.y1);
  const docs = (INPUT.groups[0]?.files ?? []).map((file) => positionOf(FIELD, file));
  for (const page of pages.slice(0, 6)) {
    expect(positionOf(held, page).x).toBeLessThanOrEqual(Math.max(...docs.map((at) => at.x)));
    expect(positionOf(held, page).y).toBeGreaterThan(Math.max(...docs.map((at) => at.y)) - 20);
  }
  // The rest stand in a block of their own past every block of the row; the shore and the terraces never moved.
  for (const page of pages.slice(6)) expect(positionOf(held, page).x).toBeGreaterThan(Math.max(...shore.map((at) => at.x)));
  for (const page of pages) expect(positionOf(held, page).y).toBeLessThan(FIELD.shore.y1);
  expect({ shore: held.shore, bands: held.bands, height: held.height }).toEqual({ shore: FIELD.shore, bands: FIELD.bands, height: FIELD.height });
  expect(held.contours).toEqual(computeMembranes({ cells: input.cells, groups: input.groups, positions: held.positions }));
});

test('a change its base cannot hold relaxes from it instead (D97, D172)', () => {
  // A terrace that spans other depths now means something else.
  const deeper = { ...changed(), bands: INPUT.bands.map((band) => (band.index === 6 ? { ...band, depth_max: 9 } : band)) };
  expect(computeLayout({ ...deeper, ground: GROUND })).toEqual(computeLayout({ ...deeper, prior: FIELD }));

  // A base with no shore has none for a new page to join without pushing the terraces down.
  const bare = { ...INPUT, groups: [] };
  const ashore = { ...bare, groups: [{ id: 'docs', files: ['README.md'] }], added: new Set(['README.md']) };
  const field = computeLayout(bare);
  const ground = { ...GROUND, layout: field, groups: [] };
  expect(computeLayout({ ...ashore, ground })).toEqual(computeLayout({ ...ashore, prior: field }));
});

test('a map over its base keeps what the base laid out where the change left it, and a change of nothing keeps it all (D172)', () => {
  const inputs = JSON.parse(readFileSync(join(FIXTURES, 'rename', 'inputs.json'), 'utf8')) as BuildInputs;
  const ground = layOutTerrain(inputs.base, DEFAULT_CONFIG);
  const map = buildMap({ ...inputs, ground }, DEFAULT_CONFIG);
  expect(() => assertMap(map)).not.toThrow();
  const layout = map.terrain.layout;
  const touched = new Set(inputs.diff.flatMap((file) => [file.path, ...(file.from === undefined ? [] : [file.from])]));

  const kept = Object.keys(layout.positions).filter((id) => !touched.has(id) && ground.positions[id] !== undefined);
  expect(kept).not.toHaveLength(0);
  for (const id of kept) expect(layout.positions[id], id).toEqual(ground.positions[id]);
  // The renamed file's leader runs from exactly where it stood (D40).
  expect(layout.renamed_from).toEqual({ 'src/new-name.ts': ground.positions['src/old-name.ts'] });
  expect(layout.contours).toEqual(computeMembranes({ cells: map.terrain.cells, groups: map.terrain.groups, positions: layout.positions }));

  const still = { ...inputs, head: inputs.base, diff: [], deps_added: [], deps_moved: [] };
  expect(buildMap({ ...still, ground }, DEFAULT_CONFIG).terrain.layout).toEqual(ground);
});
