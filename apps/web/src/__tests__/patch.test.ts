import { expect, test } from 'vitest';

import { literal, patchOf } from '../dev/index.js';
import { MATERIALS_TITLE, SECTIONS, createRegistry } from '../registry.js';

test('no change is an empty patch', () => {
  expect(patchOf([])).toBe('');
});

test("a scene token's change is one line out and one in, as tokens.ts writes it", () => {
  expect(patchOf([{ name: 'FLARE_MS', from: 600, to: 500 }])).toBe(['--- a/libs/scene/src/tokens.ts', '+++ b/libs/scene/src/tokens.ts', '-export const FLARE_MS = 600;', '+export const FLARE_MS = 500;'].join('\n'));
});

test('strings, lists and objects are written as the source writes them', () => {
  expect(literal('#5fd8ea')).toBe("'#5fd8ea'");
  expect(literal("it's")).toBe("'it\\'s'");
  expect(literal([0, 0.25, 0.4])).toBe('[0, 0.25, 0.4]');
  expect(literal([{ arms: 3, reach: 0.06 }])).toBe('[{ arms: 3, reach: 0.06 }]');
  expect(literal(true)).toBe('true');
});

test("a material's change goes under its own file, as a field", () => {
  const patch = patchOf([
    { name: 'FLARE_MS', from: 600, to: 500 },
    { name: 'SKIN.roughness', from: 0.46, to: 0.7 },
    { name: 'SKY.boxes', from: [[1, 2, 3, 4]], to: [[1, 2, 3, 5]] },
    { name: 'RELIEF.terraceStep', from: 4, to: 6 },
  ]);
  expect(patch).toBe(
    [
      '--- a/libs/scene/src/tokens.ts',
      '+++ b/libs/scene/src/tokens.ts',
      '-export const FLARE_MS = 600;',
      '+export const FLARE_MS = 500;',
      '',
      '--- a/apps/web/src/materials.ts',
      '+++ b/apps/web/src/materials.ts',
      '-  roughness: 0.46,',
      '+  roughness: 0.7,',
      '-  boxes: [[1, 2, 3, 4]],',
      '+  boxes: [[1, 2, 3, 5]],',
      '',
      '--- a/libs/scene/src/heightfield.ts',
      '+++ b/libs/scene/src/heightfield.ts',
      '-  terraceStep: 4,',
      '+  terraceStep: 6,',
    ].join('\n'),
  );
});

test("a change to any of the world's own materials names materials.ts, the levels, the hover and the side panels among them", () => {
  const patch = patchOf([
    { name: 'LEVELS.autoOpen', from: 0, to: 1 },
    { name: 'LEVELS.gates', from: [{ enter: 0, exit: 0 }], to: [{ enter: 1.7, exit: 1.45 }] },
    { name: 'HOVER.clickMs', from: 400, to: 300 },
    { name: 'PANEL.inspectorWidth', from: 420, to: 480 },
    { name: 'SPACE.starGain', from: 0.5, to: 0.6 },
  ]);
  expect(patch).toBe(
    [
      '--- a/apps/web/src/materials.ts',
      '+++ b/apps/web/src/materials.ts',
      '-  autoOpen: 0,',
      '+  autoOpen: 1,',
      '-  gates: [{ enter: 0, exit: 0 }],',
      '+  gates: [{ enter: 1.7, exit: 1.45 }],',
      '-  clickMs: 400,',
      '+  clickMs: 300,',
      '-  inspectorWidth: 420,',
      '+  inspectorWidth: 480,',
      '-  starGain: 0.5,',
      '+  starGain: 0.6,',
    ].join('\n'),
  );
});

test("no material's change is put under the scene's token file: every object the panel lists names the file it rests in", () => {
  const registry = createRegistry();
  const materials = SECTIONS.find((section) => section.title === MATERIALS_TITLE)?.names ?? [];
  expect(materials.length).toBeGreaterThan(100);
  const files = new Set(materials.map((name) => patchOf([{ name, from: registry.rest(name), to: 'moved' }]).split('\n')[0]));
  expect(files).toEqual(new Set(['--- a/apps/web/src/materials.ts', '--- a/libs/scene/src/cinema.ts', '--- a/libs/scene/src/heightfield.ts', '--- a/libs/scene/src/minimap.ts', '--- a/libs/scene/src/wiring.ts']));
});
