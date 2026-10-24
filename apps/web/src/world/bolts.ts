/**
 * bolts: every storm as one instanced bolt on the skin (step 33, D68): the
 * SVG's own glyph cut into triangles once, placed where the scene hangs each
 * storm above its cell, the change's full size in the IFR hue and standing
 * state smaller in graphite, drawn flat on the skin and shown from LOD1. A
 * change's bolt is light the bloom sees; a standing bolt is terrain and is
 * not.
 */

import { BufferAttribute, DataTexture, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial, Shape, ShapeGeometry } from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import { attribute, mrt, positionLocal, texture, uniform, vec2, vec3, vec4 } from 'three/tsl';
import type { Grid } from 'scene';

import { hueIndex } from './palette.js';
import type { Palette } from './palette.js';
import type { Bolt } from '../marks.js';

type Float = UniformNode<'float', number>;

/** How far above the marks the bolts sit. */
const LIFT = 1.2;

/** The bolt as the still sheet draws it about its origin, y down: the same six points, as a shape three cuts. */
const BOLT_POINTS: readonly (readonly [number, number])[] = [
  [1, -6],
  [-3, 1],
  [0, 1],
  [-1, 6],
  [3, -1],
  [0, -1],
];

const boltGeometry = (): InstancedBufferGeometry => {
  const shape = new Shape();
  BOLT_POINTS.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  const flat = new ShapeGeometry(shape);
  const geometry = new InstancedBufferGeometry();
  const positions = flat.getAttribute('position');
  // The shape lies in x and y; the world lays it on the ground, x along x and y along z.
  const laid = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i += 1) laid.set([positions.getX(i), 0, positions.getY(i)], i * 3);
  geometry.setAttribute('position', new BufferAttribute(laid, 3));
  const index = flat.getIndex();
  if (index !== null) geometry.setIndex(new BufferAttribute(Uint16Array.from(index.array), 1));
  flat.dispose();
  return geometry;
};

export const createBolts = (bolts: readonly Bolt[], relief: DataTexture, grid: Grid, amp: Float, lift: Float, surface: Float, palette: Palette): { readonly mesh: Mesh; readonly bloom: Float } => {
  const count = bolts.length;
  const geometry = boltGeometry();
  geometry.instanceCount = count;
  const centre = new Float32Array(count * 3);
  const style = new Float32Array(count * 2);
  bolts.forEach((bolt, i) => {
    centre.set([bolt.x, bolt.y, bolt.scale], i * 3);
    style.set([hueIndex(bolt.hue), bolt.hue === 'ifr' ? 1 : 0], i * 2);
  });
  geometry.setAttribute('centre', new InstancedBufferAttribute(centre, 3));
  geometry.setAttribute('style', new InstancedBufferAttribute(style, 2));

  const bloom = uniform(1);
  const at = attribute('centre', 'vec3');
  const look = attribute('style', 'vec2');
  const x = at.x.add(positionLocal.x.mul(at.z));
  const z = at.y.add(positionLocal.z.mul(at.z));
  const uvAt = vec2(x.div(grid.resolution).add(0.5).div(grid.columns), z.div(grid.resolution).add(0.5).div(grid.rows));
  const height = texture(relief, uvAt);
  const y = height.r.add(height.g.mul(amp)).add(lift).add(LIFT);

  const material = new MeshBasicNodeMaterial();
  material.positionNode = vec3(x, y, z);
  material.side = DoubleSide;
  material.transparent = true;
  material.depthWrite = false;
  const colour = palette.colourOf(look.x);
  material.colorNode = colour;
  material.opacityNode = surface;
  material.mrtNode = mrt({ emissive: vec4(colour.mul(surface).mul(look.y).mul(bloom), 1) });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.visible = count > 0;
  return { mesh, bloom };
};
