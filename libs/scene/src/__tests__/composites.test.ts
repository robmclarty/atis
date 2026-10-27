import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import { expect, test } from 'vitest';

import { COMPOSITE_FILES, COMPOSITE_GATE, compositeGrid, compositeTissue, compositesOf, compositesOpen } from '../composites.js';
import { tissue } from '../membranes.js';
import { MOTION_TOKENS, createScheduler } from '../motion.js';
import { createPicker } from '../picking.js';

/**
 * Past 5,000 files each package stands at the surface as one composite until
 * the camera nears it (step 66, C14). The demo holds a few dozen files, so it
 * is read as composites by lowering the threshold, which is what a repo past
 * it gets: the demo's two packages, `apps/cli` holding a single-file module
 * and `libs/core` a folder and a loose directory.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const RESOLUTION = 4;

test('a repo of 5,000 placed files or fewer has no composites; past it, one per package, numbered in id order, holding every file and cell beneath it', () => {
  expect(COMPOSITE_FILES).toBe(5000);
  expect(compositesOf(DEMO)).toEqual([]);
  const placed = DEMO.terrain.organelles.filter((organelle) => DEMO.terrain.layout?.positions[organelle.id] !== undefined).length;
  expect(compositesOf(DEMO, placed)).toEqual([]);

  const composites = compositesOf(DEMO, placed - 1);
  expect(composites.map((composite) => [composite.id, composite.number])).toEqual([
    ['package:apps/cli', 1],
    ['package:libs/core', 2],
  ]);
  const [cli, core] = composites;
  expect(cli?.cells).toEqual(['single:apps/cli/src/doctor.ts']);
  expect(core?.cells).toEqual(['directory:libs/core/src/util', 'folder:libs/core/src/pm']);
  // Every file placed under a package is in its composite, and in no other.
  const held = composites.flatMap((composite) => composite.files);
  expect(new Set(held).size).toBe(held.length);
  for (const organelle of DEMO.terrain.organelles) {
    if (DEMO.terrain.layout?.positions[organelle.id] === undefined) continue;
    const cell = DEMO.terrain.cells.find((each) => each.id === organelle.cell);
    const owner = cell?.kind === 'package' ? cell.id : cell?.parent;
    expect(composites.find((composite) => composite.id === owner)?.files, organelle.id).toContain(organelle.id);
  }
  // Its box spans its skin.
  for (const composite of composites) {
    for (const [x, y] of DEMO.terrain.layout?.contours?.[composite.id] ?? []) {
      expect(x).toBeGreaterThanOrEqual(composite.box.x0);
      expect(x).toBeLessThanOrEqual(composite.box.x1);
      expect(y).toBeGreaterThanOrEqual(composite.box.y0);
      expect(y).toBeLessThanOrEqual(composite.box.y1);
    }
  }
});

test("the composite grid says which package's skin each sample lies under, and 0 where none's does", () => {
  const composites = compositesOf(DEMO, 0);
  const grid = compositeGrid(DEMO, composites, RESOLUTION);
  const at = (x: number, y: number): number => grid.values[Math.round(y / RESOLUTION) * grid.columns + Math.round(x / RESOLUTION)] ?? -1;
  for (const composite of composites) {
    // A file well inside its package's skin lies on a sample the package's number marks.
    const inside = composite.files.filter((file) => {
      const place = DEMO.terrain.layout?.positions[file];
      return place !== undefined && at(place.x, place.y) === composite.number;
    });
    expect(inside.length, composite.id).toBeGreaterThan(composite.files.length / 2);
  }
  expect(at(0, 0)).toBe(0);
  expect(new Set(grid.values)).toEqual(new Set([0, ...composites.map((composite) => composite.number)]));
});

test("a composite wears its own skin over one body: the tissue laid with none of the cells a package holds", () => {
  const composites = compositesOf(DEMO, 0);
  const worn = compositeTissue(DEMO, composites, RESOLUTION);
  const inner = new Set(composites.flatMap((composite) => composite.cells));
  const outer = tissue({ ...DEMO, terrain: { ...DEMO.terrain, cells: DEMO.terrain.cells.filter((cell) => !inner.has(cell.id)) } }, RESOLUTION);
  expect(worn).toEqual(outer);
  // The cells inside drew lines and nested bodies that the composite does not wear.
  const full = tissue(DEMO, RESOLUTION);
  expect(full.membrane.values.some((line, index) => line > 0.5 && (worn.membrane.values[index] ?? 0) === 0)).toBe(true);
  expect(Math.max(...worn.body.values)).toBeLessThan(Math.max(...full.body.values));
});

test('a package opens once it fills the gate\'s share of the screen, holds open down to the lesser share, and every one is open from the cell\'s level on', () => {
  const { open, close } = COMPOSITE_GATE;
  expect(close).toBeLessThan(open);
  const between = (open + close) / 2;
  // Closed below the gate, open past it, and one off the screen is never open at the surface.
  expect(compositesOpen([false, false, false], [{ fill: between, seen: true }, { fill: open, seen: true }, { fill: open * 2, seen: false }], 1)).toEqual([false, true, false]);
  // Open holds between the two shares, and closes under the lesser.
  expect(compositesOpen([true, true], [{ fill: between, seen: true }, { fill: close - 0.01, seen: true }], 1)).toEqual([true, false]);
  // At the far field the rule is the surface's; from the cell's level on, every package is open.
  expect(compositesOpen([false], [{ fill: 0, seen: false }], 0)).toEqual([false]);
  expect(compositesOpen([false, false], [{ fill: 0, seen: false }, { fill: 0, seen: true }], 2)).toEqual([true, true]);
  // The gate handed in is the one read, so the dev panel moves it live (D156).
  expect(compositesOpen([false], [{ fill: 0.1, seen: true }], 1, { open: 0.05, close: 0.01 })).toEqual([true]);
});

test('the scheduler eases each composite open or closed at the cross-fade\'s rate, starts one where it is first told, and cuts under reduced motion (C12)', () => {
  let now = 0;
  const scheduler = createScheduler({ clock: () => now, seed: 1, tiers: [], reduced: false });
  expect(scheduler.frame(1, undefined, [true, false]).composites).toEqual([1, 0]);
  now = MOTION_TOKENS.LOD_FADE_MS / 2;
  const half = scheduler.frame(1, undefined, [false, true]).composites;
  expect(half[0]).toBeCloseTo(0.5);
  expect(half[1]).toBeCloseTo(0.5);
  // Not told this frame, each holds where it stands.
  expect(scheduler.frame(1).composites).toEqual(half);
  now = MOTION_TOKENS.LOD_FADE_MS * 2;
  expect(scheduler.frame(1, undefined, [false, true]).composites).toEqual([0, 1]);

  const still = createScheduler({ clock: () => 0, seed: 1, tiers: [], reduced: true });
  still.frame(1, undefined, [true]);
  expect(still.frame(1, undefined, [false]).composites).toEqual([0]);
});

test('a package drawn as one composite answers the pointer as its own skin, none of its files or cells inside it', () => {
  const picker = createPicker(DEMO);
  const composites = compositesOf(DEMO, 0);
  const core = composites.find((composite) => composite.id === 'package:libs/core');
  const file = core?.files.find((id) => DEMO.terrain.organelles.find((organelle) => organelle.id === id)?.cell === 'folder:libs/core/src/pm');
  const place = file === undefined ? undefined : DEMO.terrain.layout?.positions[file];
  if (place === undefined || core === undefined) throw new Error('the demo has a placed file in libs/core/src/pm');
  expect(picker.pick([place.x, place.y], 1, 0)).toMatchObject({ kind: 'organelle', path: file });
  expect(picker.pick([place.x, place.y], 1, 0, new Set([core.id]))).toEqual({ kind: 'membrane', cell: core.id });
  // Another package's composite changes nothing here.
  expect(picker.pick([place.x, place.y], 1, 0, new Set(['package:apps/cli']))).toMatchObject({ kind: 'organelle', path: file });
});
