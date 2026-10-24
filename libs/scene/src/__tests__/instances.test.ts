import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { instances } from '../instances.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

test('every placed organelle becomes one instance, in path order, and no shore file does', () => {
  const placed = instances(DEMO);
  const ids = placed.map((instance) => instance.id);
  expect(ids).toEqual(DEMO.terrain.organelles.map((organelle) => organelle.id).toSorted());
  expect(ids).toEqual(ids.toSorted());
  const shore = new Set(DEMO.terrain.groups.flatMap((group) => group.files));
  expect(ids.some((id) => shore.has(id))).toBe(false);
});

test("an instance carries its file's place, size, terrace, rules and clone family from the map", () => {
  const tools = instances(DEMO).find((instance) => instance.id === 'libs/core/src/pm/tools.ts');
  const organelle = DEMO.terrain.organelles.find((each) => each.id === 'libs/core/src/pm/tools.ts');
  const place = DEMO.terrain.layout?.positions['libs/core/src/pm/tools.ts'];
  expect(tools).toEqual({
    id: 'libs/core/src/pm/tools.ts',
    cell: organelle?.cell,
    x: place?.x,
    y: place?.y,
    r: place?.r,
    band: organelle?.band,
    dents: ['crap', 'cyclomatic'],
    ...(organelle?.clone_family === undefined ? {} : { clone_family: organelle.clone_family }),
  });
  const families = instances(DEMO).filter((instance) => instance.clone_family !== undefined);
  expect(families.length).toBeGreaterThan(0);
});

test('the order holds whatever order the map lists its files in, and an unplaced file draws nothing (C2, C3)', () => {
  const layout = DEMO.terrain.layout;
  if (layout === undefined) throw new Error('the demo map has a layout');
  const { 'libs/core/src/util/text.ts': _gone, ...positions } = layout.positions;
  const map: MapJson = {
    ...DEMO,
    terrain: { ...DEMO.terrain, organelles: DEMO.terrain.organelles.toReversed(), layout: { ...layout, positions } },
  };
  const ids = instances(map).map((instance) => instance.id);
  expect(ids).not.toContain('libs/core/src/util/text.ts');
  expect(ids).toEqual(instances(DEMO).map((instance) => instance.id).filter((id) => id !== 'libs/core/src/util/text.ts'));
});
