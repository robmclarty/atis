/**
 * ribbons: the exceptional edges, the only lines on the map (§5.1), as one
 * mesh of flat ribbons draped on the skin (step 33): each edge's bow sampled
 * into a strip `EDGE_WIDTH` wide, ending in an arrowhead on the imported
 * file's rim, in the hue of its kind, a cycle or a boundary crossed in LIFR
 * and a new cross-module import in the change hue (C11). A renamed file's
 * leader runs in the same mesh, a ribbon per dash at its own width and with
 * no arrowhead (D40, D97); widths are laid into the geometry when the world
 * is built, so a moved width shows on the next map, not the next frame. They
 * show from LOD1, and the bloom sees a small share of their light, so a
 * tangle of cycles reads as lines and not as haze. A frame of a range fades
 * its ribbons in or out as a whole while the scrubber's cross-fade runs, and
 * they go once it has (D100).
 */

import { BufferAttribute, BufferGeometry, DataTexture, DoubleSide, Mesh, MeshBasicNodeMaterial } from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import { attribute, mrt, positionLocal, texture, uniform, vec2, vec3, vec4 } from 'three/tsl';
import type { Grid } from 'scene';

import { hueIndex } from './palette.js';
import type { Palette } from './palette.js';
import { RIBBON_WIDTH } from '../marks.js';
import type { Ribbon } from '../marks.js';

type Float = UniformNode<'float', number>;

/** How far above the marks the ribbons run. */
const LIFT = 1;

/** One ribbon's vertices: a strip along its points, and the arrowhead's three. */
const lay = (ribbon: Ribbon, positions: number[], hues: number[], index: number[]): void => {
  const base = positions.length / 3;
  const half = (ribbon.width ?? RIBBON_WIDTH) / 2;
  ribbon.points.forEach(([x, y], i) => {
    const [px, py] = ribbon.points[Math.max(0, i - 1)] ?? [x, y];
    const [nx, ny] = ribbon.points[Math.min(ribbon.points.length - 1, i + 1)] ?? [x, y];
    const length = Math.hypot(nx - px, ny - py) || 1;
    const ox = (-(ny - py) / length) * half;
    const oy = ((nx - px) / length) * half;
    positions.push(x + ox, 0, y + oy, x - ox, 0, y - oy);
    hues.push(hueIndex(ribbon.hue), hueIndex(ribbon.hue));
  });
  for (let i = 0; i + 1 < ribbon.points.length; i += 1) {
    const a = base + i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  // The arrowhead: a triangle whose tip is the ribbon's end, as wide at its base as it is long; a leader's dash has none.
  if (ribbon.arrow === undefined) return;
  const { x, y, angle, size } = ribbon.arrow;
  const tip = positions.length / 3;
  const bx = x - Math.cos(angle) * size;
  const by = y - Math.sin(angle) * size;
  positions.push(x, 0, y, bx - Math.sin(angle) * (size / 2), 0, by + Math.cos(angle) * (size / 2), bx + Math.sin(angle) * (size / 2), 0, by - Math.cos(angle) * (size / 2));
  hues.push(hueIndex(ribbon.hue), hueIndex(ribbon.hue), hueIndex(ribbon.hue));
  index.push(tip, tip + 1, tip + 2);
};

/** The ribbons as the world draws them: the mesh, the bloom's share of their light, and, for a range's frame, its share of the cross-fade and the free once it has faded out (D100). */
export type Ribbons = { readonly mesh: Mesh; readonly bloom: Float; readonly fade: Float; readonly dispose: () => void };

export const createRibbons = (ribbons: readonly Ribbon[], relief: DataTexture, grid: Grid, amp: Float, lift: Float, surface: Float, palette: Palette): Ribbons => {
  const positions: number[] = [];
  const hues: number[] = [];
  const index: number[] = [];
  for (const ribbon of ribbons) lay(ribbon, positions, hues, index);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(Float32Array.from(positions), 3));
  geometry.setAttribute('hue', new BufferAttribute(Float32Array.from(hues), 1));
  geometry.setIndex(new BufferAttribute(Uint32Array.from(index), 1));

  const bloom = uniform(1);
  const fade = uniform(1);
  const shown = surface.mul(fade);
  const uvAt = vec2(positionLocal.x.div(grid.resolution).add(0.5).div(grid.columns), positionLocal.z.div(grid.resolution).add(0.5).div(grid.rows));
  const height = texture(relief, uvAt);
  const material = new MeshBasicNodeMaterial();
  material.positionNode = vec3(positionLocal.x, height.r.add(height.g.mul(amp)).add(lift).add(LIFT), positionLocal.z);
  material.side = DoubleSide;
  material.transparent = true;
  material.depthWrite = false;
  const colour = palette.colourOf(attribute('hue', 'float'));
  material.colorNode = colour;
  material.opacityNode = shown;
  material.mrtNode = mrt({ emissive: vec4(colour.mul(shown).mul(bloom), 1) });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.visible = ribbons.length > 0;
  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
  };
  return { mesh, bloom, fade, dispose };
};
