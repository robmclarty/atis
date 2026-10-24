import { expect, test } from 'vitest';

import { literal, patchOf } from '../dev/index.js';

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
