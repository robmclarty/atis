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
