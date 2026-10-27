import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import { computeLayout, seededRandom, withinContour } from '../layout/index.js';
import type { Contour, LayoutInput, MembraneCell } from '../layout/index.js';
import { buildMap } from '../map.js';
import type { BuildInputs } from '../map.js';
import type { Band, Layout, Organelle } from '../schema.js';

/**
 * Packages keep to themselves (D166): a package's skin holds every cell
 * beneath it (D45), so wherever the layout let one package's files wander in
 * among another's, that skin ran between the other's cells and the map read
 * as one package inside the other, as `apps/atis`'s ran through
 * `apps/web/src/world` on atis's own map. The fixtures are seeded synthetic
 * repositories of several packages shaped the way that one was: each lives
 * on a few terraces that overlap its neighbours', one has a file stranded on
 * a terrace far from the rest of it, imports cross between packages, and the
 * change adds files to some.
 *
 * And inside a package, its cells keep apart the same way (D171): a folder's
 * skin reaches round all of its files, so a single-file cell the forces
 * settled among them drew two skins crossing, as `folder:apps/web/src/world`
 * crossed `single:apps/web/src/nav.ts`. The second fixtures are seeded
 * packages of folder and single-file cells shaped the way `apps/web` was:
 * folders stretched over several terraces, a crowd of single-file cells on
 * the same terraces, imports tying the singles into the folders, and a
 * change that adds files to folders and brings a new cell whole.
 */
const PACKAGES = 4;
const BANDS = 6;
const SEEDS = [1, 2, 3, 4, 5, 6];

type Shape = { readonly input: LayoutInput; readonly packages: ReadonlyMap<string, string> };

function organelle(path: string, cell: string, band: number, loc: number): Organelle {
  return { id: path, path, cell, band, reachable: true, loc, dents: [] };
}

function synthetic(seed: number): Shape {
  const random = seededRandom(seed);
  const pick = (count: number): number => Math.floor(random() * count);
  const cells: MembraneCell[] = [];
  const organelles: Organelle[] = [];
  const packages = new Map<string, string>();

  for (let index = 0; index < PACKAGES; index += 1) {
    const root = `libs/p${String(index)}`;
    const pkg = `package:${root}`;
    const home = pick(BANDS - 2);
    const barrel = `${root}/src/index.ts`;
    organelles.push(organelle(barrel, pkg, home, 20 + pick(80)));
    cells.push({ id: pkg, organelles: [barrel] });
    packages.set(pkg, pkg);

    const held = 2 + pick(3);
    for (let at = 0; at < held; at += 1) {
      const folder = at % 2 === 0;
      const cell = folder ? `folder:${root}/src/m${String(at)}` : `single:${root}/src/m${String(at)}.ts`;
      const count = folder ? 3 + pick(4) : 1;
      const files = Array.from({ length: count }, (_unused, file) =>
        folder ? `${root}/src/m${String(at)}/f${String(file)}.ts` : `${root}/src/m${String(at)}.ts`,
      );
      for (const path of files) organelles.push(organelle(path, cell, home + pick(3), 10 + pick(500)));
      cells.push({ id: cell, parent: pkg, organelles: files });
      packages.set(cell, pkg);
    }
    // The stray: a file nothing imports, alone on the deepest terrace, the shape of `apps/web/src/vite-env.d.ts`.
    if (index === 0) {
      const stray = `${root}/src/stray.ts`;
      organelles.push(organelle(stray, `single:${stray}`, BANDS - 1, 5));
      cells.push({ id: `single:${stray}`, parent: pkg, organelles: [stray] });
      packages.set(`single:${stray}`, pkg);
    }
  }

  const ids = organelles.map((file) => file.id);
  const edges = Array.from({ length: organelles.length * 2 }, () => ({ from: ids[pick(ids.length)] ?? '', to: ids[pick(ids.length)] ?? '' }));
  const added = new Set(ids.filter(() => random() < 0.1));
  const bands: readonly Band[] = Array.from({ length: BANDS }, (_unused, index) => ({ index, depth_min: index, depth_max: index }));
  return { input: { cells, organelles, edges, bands, groups: [], added }, packages };
}

type Point = readonly [number, number];

/** Whether segment `ab` crosses segment `cd`, by the same half-open rule the membranes carve by. */
function crossing(a: Point, b: Point, c: Point, d: Point): boolean {
  const [rx, ry] = [b[0] - a[0], b[1] - a[1]];
  const [sx, sy] = [d[0] - c[0], d[1] - c[1]];
  const denominator = rx * sy - ry * sx;
  if (denominator === 0) return false;
  const [qx, qy] = [c[0] - a[0], c[1] - a[1]];
  const along = (qx * sy - qy * sx) / denominator;
  const across = (qx * ry - qy * rx) / denominator;
  return along >= 0 && along < 1 && across >= 0 && across < 1;
}

function skinsCross(one: Contour, other: Contour): boolean {
  return one.some((a, index) => {
    const b = one[index + 1];
    if (b === undefined) return false;
    return other.some((c, at) => {
      const d = other[at + 1];
      return d !== undefined && crossing(a, b, c, d);
    });
  });
}

/**
 * Everything wrong with how one field keeps two cells apart, for every pair
 * `apart` names: a file whose centre lies under the skin of a cell it should
 * keep out of, and a skin that crosses, or lies wholly inside, the other's.
 */
function trouble(layout: Layout, cells: readonly Pick<MembraneCell, 'id'>[], organelles: readonly Organelle[], apart: (one: string, other: string) => boolean): readonly string[] {
  const found: string[] = [];
  const skins = cells.flatMap((cell) => {
    const contour = layout.contours?.[cell.id];
    return contour === undefined ? [] : [{ id: cell.id, contour }];
  });
  for (const file of organelles) {
    const at = layout.positions[file.id];
    if (at === undefined) continue;
    for (const skin of skins) {
      if (apart(file.cell, skin.id) && withinContour(skin.contour, at.x, at.y)) found.push(`${file.id} lies under ${skin.id}`);
    }
  }
  skins.forEach((one, index) => {
    for (const other of skins.slice(index + 1)) {
      if (!apart(one.id, other.id)) continue;
      const [ox, oy] = other.contour[0] ?? [0, 0];
      const [nx, ny] = one.contour[0] ?? [0, 0];
      if (skinsCross(one.contour, other.contour)) found.push(`${one.id} crosses ${other.id}`);
      else if (withinContour(one.contour, ox, oy) || withinContour(other.contour, nx, ny)) found.push(`${one.id} and ${other.id} nest`);
    }
  });
  return found;
}

/** Two cells in different packages, for the lanes (D166). */
function otherPackages(packageOf: ReadonlyMap<string, string>): (one: string, other: string) => boolean {
  return (one, other) => (packageOf.get(one) ?? one) !== (packageOf.get(other) ?? other);
}

/** Two cells of which neither holds the other (D171). */
function unrelated(cells: readonly MembraneCell[]): (one: string, other: string) => boolean {
  const parentOf = new Map(cells.flatMap((cell) => (cell.parent === undefined ? [] : [[cell.id, cell.parent] as const])));
  const holds = (outer: string, inner: string): boolean => {
    for (let at = parentOf.get(inner); at !== undefined; at = parentOf.get(at)) if (at === outer) return true;
    return false;
  };
  return (one, other) => one !== other && !holds(one, other) && !holds(other, one);
}

const FIELDS = SEEDS.map((seed) => {
  const shape = synthetic(seed);
  return { seed, shape, layout: computeLayout(shape.input) };
});

test('no skin crosses a skin of another package, and no file lies under one', () => {
  for (const { seed, shape, layout } of FIELDS) {
    expect(trouble(layout, shape.input.cells, shape.input.organelles, otherPackages(shape.packages)), `seed ${String(seed)}`).toEqual([]);
  }
});

test('each package stands in a stretch of the field no other package has a file in, in path order', () => {
  for (const { seed, shape, layout } of FIELDS) {
    const stretches = new Map<string, { left: number; right: number }>();
    for (const file of shape.input.organelles) {
      const at = layout.positions[file.id];
      const pkg = shape.packages.get(file.cell) ?? file.cell;
      if (at === undefined) continue;
      const seen = stretches.get(pkg) ?? { left: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY };
      stretches.set(pkg, { left: Math.min(seen.left, at.x - at.r), right: Math.max(seen.right, at.x + at.r) });
    }
    const ordered = [...stretches].toSorted(([a], [b]) => (a < b ? -1 : 1));
    ordered.forEach(([pkg, stretch], index) => {
      const next = ordered[index + 1];
      if (next !== undefined) expect(stretch.right, `seed ${String(seed)}: ${pkg} reaches ${next[0]}`).toBeLessThan(next[1].left);
    });
  }
});

test('a file stranded far below the rest of its package stands under its package', () => {
  for (const { seed, shape, layout } of FIELDS) {
    const stray = layout.positions['libs/p0/src/stray.ts'];
    const rest = shape.input.organelles.filter((file) => file.id.startsWith('libs/p0/') && file.id !== 'libs/p0/src/stray.ts');
    const edges = rest.flatMap((file) => {
      const at = layout.positions[file.id];
      return at === undefined ? [] : [at.x - at.r, at.x + at.r];
    });
    expect(stray?.x, `seed ${String(seed)}`).toBeGreaterThanOrEqual(Math.min(...edges));
    expect(stray?.x, `seed ${String(seed)}`).toBeLessThanOrEqual(Math.max(...edges));
  }
});

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', 'fixtures');

test('the demo keeps its packages apart, and the cells inside each', () => {
  const inputs = JSON.parse(readFileSync(join(FIXTURES, 'demo', 'inputs.json'), 'utf8')) as BuildInputs;
  const map = buildMap(inputs, DEFAULT_CONFIG);
  const layout = map.terrain.layout;
  expect(layout).toBeDefined();
  if (layout === undefined) return;
  const packages = new Map(map.terrain.cells.map((cell) => [cell.id, cell.kind === 'package' ? cell.id : (cell.parent ?? cell.id)] as const));

  expect(new Set(packages.values()).size).toBeGreaterThan(1);
  expect(trouble(layout, map.terrain.cells, map.terrain.organelles, otherPackages(packages))).toEqual([]);
  expect(map.terrain.cells.filter((cell) => cell.parent !== undefined).length).toBeGreaterThan(2);
  expect(trouble(layout, map.terrain.cells, map.terrain.organelles, unrelated(map.terrain.cells))).toEqual([]);
});

/**
 * One package shaped the way `apps/web` was on atis's own map: two or three
 * folders stretched over several terraces, a crowd of single-file cells on
 * the same terraces, a barrel of its own, and imports that tie the singles
 * into the folders, which is what pulled the forces' singles in among a
 * folder's files. The change adds files to the folders, a file to a single
 * that sits on another terrace from it, and a new single-file cell whole.
 */
const SINGLES = 12;

function crowded(seed: number): LayoutInput {
  const random = seededRandom(seed);
  const pick = (count: number): number => Math.floor(random() * count);
  const root = 'apps/w';
  const pkg = `package:${root}`;
  const barrel = `${root}/src/main.ts`;
  const organelles: Organelle[] = [organelle(barrel, pkg, 0, 40 + pick(60))];
  const cells: MembraneCell[] = [{ id: pkg, organelles: [barrel] }];
  const hold = (cell: string, files: readonly string[], bands: () => number): void => {
    for (const path of files) organelles.push(organelle(path, cell, bands(), 10 + pick(400)));
    cells.push({ id: cell, parent: pkg, organelles: [...files] });
  };

  const folders = 2 + pick(2);
  for (let at = 0; at < folders; at += 1) {
    const top = pick(BANDS - 3);
    const files = Array.from({ length: 5 + pick(8) }, (_unused, file) => `${root}/src/d${String(at)}/f${String(file)}.ts`);
    hold(`folder:${root}/src/d${String(at)}`, files, () => top + pick(3));
  }
  for (let at = 0; at < SINGLES; at += 1) {
    const path = `${root}/src/s${String(at).padStart(2, '0')}.ts`;
    hold(`single:${path}`, [path], () => pick(BANDS));
  }

  const novel = `${root}/src/new.ts`;
  organelles.push(organelle(novel, `single:${novel}`, pick(BANDS), 30));
  cells.push({ id: `single:${novel}`, parent: pkg, organelles: [novel] });
  const ids = organelles.map((file) => file.id);
  const singles = ids.filter((id) => /\/s\d+\.ts$/u.test(id));
  const folded = ids.filter((id) => id.includes('/d'));
  const edges = [
    ...singles.flatMap((single) => [{ from: single, to: folded[pick(folded.length)] ?? '' }, { from: folded[pick(folded.length)] ?? '', to: single }]),
    ...Array.from({ length: ids.length }, () => ({ from: ids[pick(ids.length)] ?? '', to: ids[pick(ids.length)] ?? '' })),
  ];
  const added = new Set([novel, ...folded.filter(() => random() < 0.2), ...singles.filter(() => random() < 0.1)]);
  const bands: readonly Band[] = Array.from({ length: BANDS }, (_unused, index) => ({ index, depth_min: index, depth_max: index }));
  return { cells, organelles, edges, bands, groups: [], added };
}

const CROWDS = SEEDS.map((seed) => {
  const input = crowded(seed);
  return { seed, input, layout: computeLayout(input) };
});

test('no two cells of which neither holds the other draw skins that cross or nest, and no file lies under a cell it is not in', () => {
  for (const { seed, input, layout } of CROWDS) {
    expect(trouble(layout, input.cells, input.organelles, unrelated(input.cells)), `crowd ${String(seed)}`).toEqual([]);
  }
  for (const { seed, shape, layout } of FIELDS) {
    expect(trouble(layout, shape.input.cells, shape.input.organelles, unrelated(shape.input.cells)), `seed ${String(seed)}`).toEqual([]);
  }
});

test('a crowded package places every file it holds, each on its own terrace', () => {
  for (const { seed, input, layout } of CROWDS) {
    for (const file of input.organelles) {
      const at = layout.positions[file.id];
      const band = layout.bands.find((strip) => strip.index === file.band);
      expect(at, `crowd ${String(seed)}: ${file.id}`).toBeDefined();
      expect(at?.y, `crowd ${String(seed)}: ${file.id}`).toBeGreaterThan(band?.y0 ?? 0);
      expect(at?.y, `crowd ${String(seed)}: ${file.id}`).toBeLessThan(band?.y1 ?? 0);
    }
  }
});

/**
 * A repo of many packages, each wider than its terraces are tall, stood its
 * lanes in a strip far wider than any screen: step 43's generator laid 5,000
 * files 57,740 units wide and 3,139 tall. So once one row of lanes would run
 * wider than about 1.6 times its terraces' height, the lanes wrap into rows,
 * filled in path order, each row carrying its own ladder of the same
 * terraces lower down (Q73). The fixtures are seeded rows of small packages,
 * each a barrel over a crowd of single-file cells on a few shallow
 * terraces, with some files added and, in one, a package the change brings
 * whole.
 */
const WIDE = 9;

function wide(seed: number, whole: boolean): Shape {
  const random = seededRandom(seed);
  const pick = (count: number): number => Math.floor(random() * count);
  const cells: MembraneCell[] = [];
  const organelles: Organelle[] = [];
  const packages = new Map<string, string>();
  const edges: { from: string; to: string }[] = [];
  const lay = (root: string): readonly string[] => {
    const pkg = `package:${root}`;
    const barrel = `${root}/src/index.ts`;
    organelles.push(organelle(barrel, pkg, 0, 20 + pick(60)));
    cells.push({ id: pkg, organelles: [barrel] });
    packages.set(pkg, pkg);
    const singles = Array.from({ length: 5 + pick(4) }, (_unused, at) => `${root}/src/s${String(at)}.ts`);
    for (const path of singles) {
      organelles.push(organelle(path, `single:${path}`, pick(3), 10 + pick(300)));
      cells.push({ id: `single:${path}`, parent: pkg, organelles: [path] });
      packages.set(`single:${path}`, pkg);
      edges.push({ from: barrel, to: path });
    }
    return [barrel, ...singles];
  };
  const ground = Array.from({ length: WIDE }, (_unused, index) => lay(`libs/q${String(index)}`)).flat();
  const brought = whole ? lay('libs/z') : [];
  const added = new Set([...ground.filter(() => random() < 0.1), ...brought]);
  const bands: readonly Band[] = Array.from({ length: 3 }, (_unused, index) => ({ index, depth_min: index, depth_max: index }));
  return { input: { cells, organelles, edges, bands, groups: [], added }, packages };
}

const WIDES = SEEDS.flatMap((seed) =>
  [false, true].map((whole) => {
    const shape = wide(seed, whole);
    return { seed: `${String(seed)}${whole ? ' with a package brought whole' : ''}`, shape, layout: computeLayout(shape.input) };
  }),
);

/** The row a placed file stands in: the one whose terraces hold its centre. */
function rowOf(layout: Layout, y: number): number {
  return (layout.rows ?? []).findIndex((row) => row.bands.some((band) => y >= band.y0 && y < band.y1));
}

/** Each package's row, by the row its files stand in, and how far across it its files reach; undefined for a package split across rows. */
function standings(layout: Layout, shape: Shape): ReadonlyMap<string, { readonly row: number | undefined; readonly left: number; readonly right: number }> {
  const seen = new Map<string, { row: number | undefined; left: number; right: number }>();
  for (const file of shape.input.organelles) {
    const at = layout.positions[file.id];
    if (at === undefined) continue;
    const pkg = shape.packages.get(file.cell) ?? file.cell;
    const row = rowOf(layout, at.y);
    const was = seen.get(pkg);
    seen.set(pkg, {
      row: was === undefined || was.row === row ? row : undefined,
      left: Math.min(was?.left ?? Number.POSITIVE_INFINITY, at.x - at.r),
      right: Math.max(was?.right ?? Number.NEGATIVE_INFINITY, at.x + at.r),
    });
  }
  return seen;
}

test('lanes that would run wider than about 1.6 times their terraces wrap into rows, each with its own copy of the ladder, near the screen\'s shape', () => {
  for (const { seed, shape, layout } of WIDES) {
    const rows = layout.rows ?? [];
    expect(rows.length, `seed ${seed}`).toBeGreaterThan(1);
    expect(rows[0]?.bands, `seed ${seed}`).toEqual(layout.bands);
    const ladder = layout.bands.reduce((total, band) => total + (band.y1 - band.y0), 0);
    rows.forEach((row, index) => {
      const below = rows[index - 1]?.bands.at(-1)?.y1;
      // Every row repeats the first's terraces, as tall, a gap below the row above it.
      expect(row.bands.map((band) => [band.index, band.y1 - band.y0]), `seed ${seed}`).toEqual(layout.bands.map((band) => [band.index, band.y1 - band.y0]));
      if (below !== undefined) expect(row.bands[0]?.y0, `seed ${seed}`).toBeGreaterThan(below);
      expect(row.x0, `seed ${seed}`).toBeLessThan(row.x1);
      expect(row.x1, `seed ${seed}`).toBeLessThanOrEqual(layout.width);
    });
    expect(layout.height, `seed ${seed}`).toBe(rows.at(-1)?.bands.at(-1)?.y1);
    // Wrapped, the field keeps near the screen's shape: no wider than about twice its height, nor far taller than wide.
    expect(layout.width, `seed ${seed}`).toBeLessThanOrEqual(2 * layout.height);
    expect(layout.height, `seed ${seed}`).toBeLessThan(2 * layout.width);
    // One row of the same lanes, side by side a lane's slack and gutter apart, would have run wider than 1.6 times its terraces.
    const lanes = [...standings(layout, shape).values()];
    const one = lanes.reduce((total, lane) => total + (lane.right - lane.left), 0) + (lanes.length - 1) * 24;
    expect(one, `seed ${seed}`).toBeGreaterThan(1.6 * ladder);
  }
});

test('in a wrapped field every file stands on its own terrace in its package\'s row, the packages fill the rows in path order, and the change\'s whole packages come after the ground', { timeout: 60_000 }, () => {
  for (const { seed, shape, layout } of WIDES) {
    const rows = layout.rows ?? [];
    for (const file of shape.input.organelles) {
      const at = layout.positions[file.id];
      const row = rows[rowOf(layout, at?.y ?? Number.NaN)];
      const band = row?.bands.find((strip) => strip.index === file.band);
      expect(band, `seed ${seed}: ${file.id} stands on no terrace of its band`).toBeDefined();
      expect(at?.y, `seed ${seed}: ${file.id}`).toBeGreaterThan(band?.y0 ?? 0);
      expect(at?.y, `seed ${seed}: ${file.id}`).toBeLessThan(band?.y1 ?? 0);
      expect((at?.x ?? 0) + (at?.r ?? 0), `seed ${seed}: ${file.id}`).toBeLessThanOrEqual(row?.x1 ?? 0);
    }
    const stood = [...standings(layout, shape)].toSorted(([a], [b]) => (a < b ? -1 : 1));
    stood.forEach(([pkg, here], index) => {
      expect(here.row, `seed ${seed}: ${pkg} is split across rows`).toBeDefined();
      const next = stood[index + 1]?.[1];
      if (next === undefined) return;
      // In path order a package stands in the same row as the one before it, right of it, or in a row below.
      expect(next.row ?? 0, `seed ${seed}: ${pkg}`).toBeGreaterThanOrEqual(here.row ?? 0);
      if (next.row === here.row) expect(here.right, `seed ${seed}: ${pkg}`).toBeLessThan(next.left);
    });
    const brought = stood.find(([pkg]) => pkg === 'package:libs/z')?.[1];
    if (brought !== undefined) expect(brought.row, `seed ${seed}`).toBe(Math.max(...stood.map(([, here]) => here.row ?? 0)));
    // A row moves each lane whole, so its cells keep apart as they settled; what wrapping could break is two packages' skins meeting across rows.
    expect(trouble(layout, shape.input.cells, shape.input.organelles, otherPackages(shape.packages)), `seed ${seed}`).toEqual([]);
  }
});

test('a field that fits one row writes no rows, as the demo and every narrower field did before lanes wrapped', () => {
  const inputs = JSON.parse(readFileSync(join(FIXTURES, 'demo', 'inputs.json'), 'utf8')) as BuildInputs;
  expect(buildMap(inputs, DEFAULT_CONFIG).terrain.layout?.rows).toBeUndefined();
  for (const { seed, layout } of [...FIELDS, ...CROWDS]) {
    expect(layout.rows, `seed ${String(seed)}`).toBeUndefined();
    expect(Object.keys(layout)).not.toContain('rows');
  }
});

test('a wrapped field relaxed from itself stands each file about where it stood, on the same row\'s terrace', () => {
  for (const { seed, shape, layout } of WIDES) {
    const again = computeLayout({ ...shape.input, prior: layout });
    expect(again.rows?.length, `seed ${seed}`).toBe(layout.rows?.length);
    const moved = shape.input.organelles.map((file) => {
      const [was, now] = [layout.positions[file.id], again.positions[file.id]];
      return was === undefined || now === undefined ? Number.POSITIVE_INFINITY : Math.hypot(now.x - was.x, now.y - was.y);
    });
    expect(moved.reduce((total, by) => total + by, 0) / moved.length, `seed ${seed}`).toBeLessThan(12);
  }
});

/** The base a wrapped field's change was made over: its input without the change's added files, and the field that base laid out, as the cache holds it (D172). */
function baseOf(input: LayoutInput): { readonly input: LayoutInput; readonly ground: NonNullable<LayoutInput['ground']> } {
  const organelles = input.organelles.filter((file) => !input.added.has(file.id));
  const kept = new Set(organelles.map((file) => file.id));
  const cells = input.cells.flatMap((cell) => {
    const held = cell.organelles.filter((id) => kept.has(id));
    return held.length === 0 && !input.cells.some((other) => other.parent === cell.id && other.organelles.some((id) => kept.has(id))) ? [] : [{ ...cell, organelles: held }];
  });
  const base: LayoutInput = { ...input, cells, organelles, edges: input.edges.filter((edge) => kept.has(edge.from) && kept.has(edge.to)), added: new Set() };
  const files = organelles.map((file) => ({ id: file.id, cell: file.cell, band: file.band, loc: file.loc }));
  return { input: base, ground: { layout: computeLayout(base), cells, organelles: files, bands: input.bands, groups: input.groups } };
}

test("a change over a wrapped base's own field holds every file it left alone where the base put it, and places its own files on their rows' terraces (D172)", { timeout: 60_000 }, () => {
  for (const { seed, shape } of WIDES) {
    const { input } = shape;
    const { ground } = baseOf(input);
    expect(ground.layout.rows?.length, `seed ${seed}`).toBeGreaterThan(1);
    const held = computeLayout({ ...input, ground });
    expect(held.rows?.length, `seed ${seed}`).toBe(ground.layout.rows?.length);
    expect(held.bands, `seed ${seed}`).toEqual(ground.layout.bands);
    expect(held.height, `seed ${seed}`).toBe(ground.layout.height);
    for (const file of input.organelles) {
      const at = held.positions[file.id];
      if (!input.added.has(file.id)) {
        expect(at, `seed ${seed}: ${file.id}`).toEqual(ground.layout.positions[file.id]);
        continue;
      }
      // An added file stands on its own terrace in the row its package stands in, inside that row's reach.
      const pkg = shape.packages.get(file.cell) ?? file.cell;
      const sibling = input.organelles.find((other) => !input.added.has(other.id) && (shape.packages.get(other.cell) ?? other.cell) === pkg);
      const row = held.rows?.[rowOf(held, (sibling === undefined ? undefined : ground.layout.positions[sibling.id])?.y ?? (held.rows.at(-1)?.bands[0]?.y0 ?? 0))];
      const band = row?.bands.find((strip) => strip.index === file.band);
      expect(at?.y, `seed ${seed}: ${file.id}`).toBeGreaterThan(band?.y0 ?? Number.POSITIVE_INFINITY);
      expect(at?.y, `seed ${seed}: ${file.id}`).toBeLessThan(band?.y1 ?? Number.NEGATIVE_INFINITY);
      expect((at?.x ?? 0) + (at?.r ?? 0), `seed ${seed}: ${file.id}`).toBeLessThanOrEqual(row?.x1 ?? 0);
    }
    expect(trouble(held, input.cells, input.organelles, otherPackages(shape.packages)), `seed ${seed}`).toEqual([]);
    // One input, one field (C3).
    expect(computeLayout({ ...input, ground }), `seed ${seed}`).toEqual(held);
  }
});

test("a change that gives a wrapped base's ladder another terrace relaxes from the base, since every row below the first would move", () => {
  const shape = WIDES[0]?.shape ?? wide(1, false);
  const { ground } = baseOf(shape.input);
  const deeper = shape.input.organelles.map((file, index) => (index === 1 ? { ...file, band: 3 } : file));
  const bands: readonly Band[] = Array.from({ length: 4 }, (_unused, index) => ({ index, depth_min: index, depth_max: index }));
  const input = { ...shape.input, organelles: deeper, bands };
  expect(computeLayout({ ...input, ground })).toEqual(computeLayout({ ...input, prior: ground.layout }));
});
