import earcut from 'earcut';
import elk from 'elkjs/lib/elk.bundled.js';
import { expect, test } from 'vitest';

import * as scene from '../index.js';

/**
 * A smoke test for the package itself: the barrel loads and carries the
 * shared tokens (D130), and the two libraries the scene was given for its
 * levels of detail (D34) resolve from it and run, with no DOM and no worker.
 * Steps 25 and 41 put them to work; until then this is what proves they are
 * installed where the scene can reach them.
 */

test('the barrel carries the tokens both renderers read', () => {
  expect(scene.FIELD_FILL).toMatch(/^#[0-9a-f]{6}$/);
  expect(scene.REACH_DECAY).toBeGreaterThan(0);
  expect(scene.LOD_FADE_MS).toBeLessThanOrEqual(300);
});

test('earcut triangulates a square into two triangles', () => {
  expect(earcut([0, 0, 1, 0, 1, 1, 0, 1])).toHaveLength(6);
});

test('elkjs lays out a two-node graph without a worker', async () => {
  // The bundled build is CommonJS whose types declare an ES default, so under
  // NodeNext the constructor is the module's `default`, which the bundle also
  // sets at runtime, in Node and under Vite alike.
  const layout = new elk.default();
  const graph = await layout.layout({
    id: 'root',
    children: [
      { id: 'a', width: 10, height: 10 },
      { id: 'b', width: 10, height: 10 },
    ],
    edges: [{ id: 'ab', sources: ['a'], targets: ['b'] }],
  });
  expect(graph.children?.map((node) => node.id)).toEqual(['a', 'b']);
  expect(graph.children?.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
});
