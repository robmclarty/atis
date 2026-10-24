/**
 * sectors: every mark on a file as one instanced mesh (step 33): a strip of
 * one geometry swept round each file between two offsets from its radius,
 * which cuts a ring, an arc, a disc, a spoke's strip or a wedge by the
 * instance's numbers alone (`marks.ts`). Each vertex reads the skin's relief
 * where it lands, a hair above the organelles, so the marks drape on the
 * skin and ride its settle. The colour is the palette's by the mark's hue,
 * live from the registry; the opacity is the mark's, times the surface's
 * layer unless the mark shows at the far field; a dashed mark is cut along
 * its arc; and a history texture is laid in the fragment stage from the
 * ground's own coordinates (C11). Every mark is emissive, and the bloom sees
 * the share of its light the mark names (D152).
 */

import { BufferAttribute, DataTexture, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial } from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import { attribute, cos, float, fract, length, mix, mrt, positionLocal, select, sin, step, texture, uniform, varying, vec2, vec3, vec4 } from 'three/tsl';
import { HATCH_PITCH, HATCH_WIDTH, STIPPLE_DOT, STIPPLE_PITCH } from 'scene';
import type { Grid } from 'scene';

import { hueIndex } from './palette.js';
import type { Palette } from './palette.js';
import type { Sector } from '../marks.js';

type Float = UniformNode<'float', number>;

/** How many steps a strip is swept in: enough for a full ring to read round. */
const STEPS = 48;
/** How far above the organelles the marks sit, in the heightfield's units. */
const LIFT = 0.9;
const PATTERN_INDEX = { none: 0, hatch: 1, stipple: 2 } as const;

export type Sectors = {
  readonly mesh: Mesh;
  /** The share of a mark's light the bloom sees, from the weather's look. */
  readonly bloom: Float;
};

/** A strip of `STEPS` steps along and two rows across: each vertex knows how far along it is and which side it is on. */
const stripGeometry = (): InstancedBufferGeometry => {
  const count = (STEPS + 1) * 2;
  const position = new Float32Array(count * 3);
  const along = new Float32Array(count);
  const side = new Float32Array(count);
  for (let i = 0; i <= STEPS; i += 1) {
    for (let s = 0; s < 2; s += 1) {
      const v = i * 2 + s;
      along[v] = i / STEPS;
      side[v] = s;
    }
  }
  const index = new Uint16Array(STEPS * 6);
  for (let i = 0; i < STEPS; i += 1) {
    const a = i * 2;
    index.set([a, a + 2, a + 1, a + 1, a + 2, a + 3], i * 6);
  }
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('along', new BufferAttribute(along, 1));
  geometry.setAttribute('side', new BufferAttribute(side, 1));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
};

/** The marks as one instanced mesh on the skin's relief. */
export const createSectors = (sectors: readonly Sector[], relief: DataTexture, grid: Grid, amp: Float, lift: Float, surface: Float, palette: Palette): Sectors => {
  const count = sectors.length;
  const geometry = stripGeometry();
  geometry.instanceCount = count;
  const centre = new Float32Array(count * 3);
  const angles = new Float32Array(count * 2);
  const offsets = new Float32Array(count * 2);
  const halves = new Float32Array(count * 2);
  const style = new Float32Array(count * 4);
  const dashes = new Float32Array(count * 2);
  const patterns = new Float32Array(count * 2);
  sectors.forEach((sector, i) => {
    centre.set([sector.x, sector.y, sector.r], i * 3);
    angles.set([sector.from, sector.to], i * 2);
    offsets.set([sector.inner, sector.outer], i * 2);
    halves.set([sector.innerHalf, sector.outerHalf], i * 2);
    style.set([hueIndex(sector.hue), sector.opacity, sector.bloom, sector.far ? 1 : 0], i * 4);
    dashes.set([sector.dash[0], sector.dash[1]], i * 2);
    patterns.set([PATTERN_INDEX[sector.pattern], 0], i * 2);
  });
  geometry.setAttribute('centre', new InstancedBufferAttribute(centre, 3));
  geometry.setAttribute('angles', new InstancedBufferAttribute(angles, 2));
  geometry.setAttribute('offsets', new InstancedBufferAttribute(offsets, 2));
  geometry.setAttribute('halves', new InstancedBufferAttribute(halves, 2));
  geometry.setAttribute('style', new InstancedBufferAttribute(style, 4));
  geometry.setAttribute('dashes', new InstancedBufferAttribute(dashes, 2));
  geometry.setAttribute('patterns', new InstancedBufferAttribute(patterns, 2));

  const bloom = uniform(1);
  const at = attribute('centre', 'vec3');
  const span = attribute('angles', 'vec2');
  const offset = attribute('offsets', 'vec2');
  const half = attribute('halves', 'vec2');
  const look = attribute('style', 'vec4');
  const dash = attribute('dashes', 'vec2');
  const pattern = attribute('patterns', 'vec2').x;
  const along = attribute('along', 'float');
  const side = attribute('side', 'float');

  // Swept from the start angle to the end along the strip, between the two offsets across it; along a spoke, the strip's width is the mark's.
  const angle = mix(span.x, span.y, along);
  const radial = at.z.add(mix(offset.x, offset.y, side));
  const tangential = along.mul(2).sub(1).mul(mix(half.x, half.y, side));
  const x = at.x.add(cos(angle).mul(radial)).sub(sin(angle).mul(tangential));
  const z = at.y.add(sin(angle).mul(radial)).add(cos(angle).mul(tangential));
  const uvAt = vec2(x.div(grid.resolution).add(0.5).div(grid.columns), z.div(grid.resolution).add(0.5).div(grid.rows));
  const height = texture(relief, uvAt);
  const y = height.r.add(height.g.mul(amp)).add(lift).add(LIFT).add(positionLocal.y);

  const material = new MeshBasicNodeMaterial();
  material.positionNode = vec3(x, y, z);
  material.side = DoubleSide;
  material.transparent = true;
  material.depthWrite = false;

  // The arc length under the fragment, for a dash; the ground beneath it, for a texture.
  const arc = varying(angle.mul(at.z.add(offset.x.add(offset.y).mul(0.5))));
  const ground = varying(vec2(x, z));
  const period = dash.x.add(dash.y);
  const dashed = select(dash.x.greaterThan(0), step(fract(arc.div(period)).mul(period), dash.x), float(1));
  const hatched = step(fract(ground.x.add(ground.y).div(HATCH_PITCH)), float(HATCH_WIDTH / HATCH_PITCH));
  const stippled = step(length(fract(ground.div(STIPPLE_PITCH)).sub(0.5)).mul(STIPPLE_PITCH), float(STIPPLE_DOT));
  const textured = select(pattern.lessThan(0.5), float(1), select(pattern.lessThan(1.5), hatched, stippled));
  const shown = mix(surface, float(1), look.w);
  const alpha = look.y.mul(shown).mul(dashed).mul(textured);
  const colour = palette.colourOf(look.x);
  material.colorNode = colour;
  material.opacityNode = alpha;
  // A mark is light; the bloom sees the share it names (D152).
  material.mrtNode = mrt({ emissive: vec4(colour.mul(alpha).mul(look.z).mul(bloom), 1) });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.visible = count > 0;
  return { mesh, bloom };
};

