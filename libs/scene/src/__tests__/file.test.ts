import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { fileLevelOf } from '../file.js';
import { outlineOf } from '../shape.js';
import { FILE_GRANULE_PAD, FILE_STRIP_SHARE } from '../tokens.js';

/**
 * §6's file level (LOD3, D102) on the demo map: a file's functions as
 * granules down a unit plate, level with their lines on the strip beside
 * them, dented by what they break; the strip's hunks, uncovered lines and
 * live mutants; and nothing drawn for what the map does not carry (C2).
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const TOOLS = 'libs/core/src/pm/tools.ts';

test("a file's functions are granules down the plate, each level with its own lines and sized by them, dented once per rule it breaks", () => {
  const level = fileLevelOf(DEMO, TOOLS);
  expect(level?.lines).toBe(96);
  expect(level?.strip).toEqual({ x0: 1 - FILE_STRIP_SHARE, x1: 1 });
  const [localBin, resolveTool, toolName] = level?.granules ?? [];
  expect([localBin?.name, resolveTool?.name, toolName?.name]).toEqual(['localBin', 'resolveTool', 'toolName']);
  // `resolveTool` spans lines 41 to 78 of 96, so it sits level with them: its centre halfway down its slot.
  expect(resolveTool?.y).toBeCloseTo((40 + 38 / 2) / 96);
  expect(resolveTool?.rules).toEqual(['crap', 'cyclomatic']);
  // Sized by its lines, the longer function is the bigger granule, each keeping its pad clear.
  expect(resolveTool?.r ?? 0).toBeGreaterThan(toolName?.r ?? 0);
  expect(toolName?.r).toBeCloseTo((10 / 96 / 2) * (1 - FILE_GRANULE_PAD));
  // Its two rules dent its outline as two would dent a file's; a function within every threshold stays round.
  expect(resolveTool?.ring).toEqual(outlineOf(`${TOOLS}#resolveTool@41`, { x: resolveTool?.x ?? 0, y: resolveTool?.y ?? 0, r: resolveTool?.r ?? 0 }, 2).ring);
  expect(localBin?.depth).toBe(0);
});

test("the strip carries the change's hunks, the changed lines no test ran, and the live mutants on their lines", () => {
  const level = fileLevelOf(DEMO, TOOLS);
  expect(level?.hunks).toEqual([{ start: 1, count: 96 }]);
  expect(level?.measured).toBe(true);
  expect(level?.uncovered).toEqual([27, 64]);
  expect(level?.mutants).toEqual([
    { line: 27, status: 'NoCoverage' },
    { line: 64, status: 'Survived' },
  ]);
});

test('a file no coverage report names lights every changed line, and the strip runs as far as a hunk reaches (D80)', () => {
  const level = fileLevelOf(DEMO, 'apps/cli/src/doctor.ts');
  expect(level?.measured).toBe(true);
  expect(level?.uncovered).toHaveLength(28 + 68);
  expect(level?.uncovered.slice(0, 2)).toEqual([31, 32]);
  // Its base was 212 lines and its second hunk reaches line 217 at head.
  expect(level?.lines).toBe(217);
});

test('a function nested in another stands in a column to its right, and the columns share the plate left of the strip', () => {
  const nested: MapJson = {
    ...DEMO,
    terrain: {
      ...DEMO.terrain,
      organelles: DEMO.terrain.organelles.map((organelle) =>
        organelle.path === TOOLS ? { ...organelle, functions: [{ name: 'outer', line: 4, line_count: 40 }, { name: 'inner', line: 10, line_count: 5 }] } : organelle,
      ),
    },
  };
  const [outer, inner] = fileLevelOf(nested, TOOLS)?.granules ?? [];
  expect([outer?.depth, inner?.depth]).toEqual([0, 1]);
  expect(inner?.x ?? 0).toBeGreaterThan(outer?.x ?? 0);
  expect((inner?.x ?? 1) + (inner?.r ?? 1)).toBeLessThan(1 - FILE_STRIP_SHARE);
  // With no health read the functions break nothing that can be drawn, so their granules stay round.
  expect(outer?.rules).toEqual([]);
});

test('what the map does not carry is not drawn: no functions read, no coverage channel, or no such file (C2)', () => {
  const bare: MapJson = {
    ...DEMO,
    terrain: { ...DEMO.terrain, organelles: DEMO.terrain.organelles.map(({ functions: _read, ...organelle }) => organelle) },
    weather: { ...DEMO.weather, evidence: {} },
  };
  const level = fileLevelOf(bare, TOOLS);
  expect(level?.granules).toEqual([]);
  expect(level?.uncovered).toEqual([]);
  expect(level?.measured).toBe(false);
  expect(level?.mutants).toEqual([]);
  expect(fileLevelOf(DEMO, 'nowhere.ts')).toBeUndefined();
  expect(JSON.stringify(fileLevelOf(DEMO, TOOLS))).toBe(JSON.stringify(fileLevelOf(DEMO, TOOLS)));
});
