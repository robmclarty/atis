/**
 * skin: the one soft skin (D16, D151), step 24's heightfield as one mesh. Its
 * relief rides a data texture (D152): the terraces and swells in one channel,
 * which never move, and the cells' mass in another, which the vertex stage
 * scales by the scheduler's amplitude, so the settle and the jiggle move the
 * bumps alone (§5.5) while the scheduler's lift raises the whole skin. The
 * normal is read in the fragment stage from the same texture, one sample
 * either side, so the terraces stay soft however coarse the mesh, and the
 * clearcoat reads that normal too: left alone it takes the flat grid's and
 * never glints (the spike's finding). The albedo is graphite where the skin
 * lies on the field and blue-grey where a cell swells through it; at the far
 * field it dims to a trace, the key light and the sky being off there (D151).
 * Nothing here is emissive, and the material says so (D152).
 */

import { BufferAttribute, BufferGeometry, DataTexture, DataUtils, HalfFloatType, LinearFilter, Mesh, MeshPhysicalNodeMaterial, RGBAFormat } from 'three/webgpu';
import type { Node, UniformNode } from 'three/webgpu';
import { clamp, color, float, mix, normalize, positionLocal, texture, transformNormalToView, uniform, uv, vec2, vec3 } from 'three/tsl';
import { RELIEF, heightfield } from 'scene';
import type { Grid, Heightfield } from 'scene';
import type { MapJson } from 'core';

/**
 * The skin's material, at the values the materials spike left them (D151):
 * the two albedos, how rough and how wet it is, and the share of its albedo
 * kept at the far field. One object, so the dev panel can move them live
 * (D156); `SKIN` is where they rest.
 */
export type SkinLook = {
  /** The skin where it lies on the field: graphite. */
  readonly fieldAlbedo: string;
  /** The skin where a cell swells through it: blue-grey. */
  readonly tissueAlbedo: string;
  readonly roughness: number;
  /** The wet sheen: a clearcoat, and how soft its reflection is. */
  readonly clearcoat: number;
  readonly clearcoatRoughness: number;
  /** The share of the albedo the far field keeps, lit only by the ambient's floor. */
  readonly farAlbedo: number;
};

const SKIN: SkinLook = {
  fieldAlbedo: '#14181e',
  tissueAlbedo: '#2b333d',
  roughness: 0.46,
  clearcoat: 1,
  clearcoatRoughness: 0.14,
  farAlbedo: 0.05,
};

/** Layout units between the heightfield's samples and the mesh's vertices: the spike's, a skin of about 116k vertices on retake-3. */
const RESOLUTION = 4;

export type Skin = {
  readonly mesh: Mesh;
  /** The scheduler's amplitude on the cells' mass, 1 at rest. */
  readonly amp: UniformNode<'float', number>;
  /** How far the whole skin hangs above the terrain, in the heightfield's units. */
  readonly lift: UniformNode<'float', number>;
  /** How far the surface has resolved: 0 at the far field, 1 from LOD1 on, the plan's second layer. */
  readonly surface: UniformNode<'float', number>;
};

/** The relief as the GPU reads it: red the resting terraces and swells, green the cells' mass, half floats so both backends filter it. */
const reliefTexture = (field: Heightfield): DataTexture => {
  const { columns, rows } = field.height;
  const data = new Uint16Array(columns * rows * 4);
  for (let i = 0; i < columns * rows; i += 1) {
    data[i * 4] = DataUtils.toHalfFloat((field.terrace.values[i] ?? 0) + (field.swell.values[i] ?? 0));
    data[i * 4 + 1] = DataUtils.toHalfFloat(field.mass.values[i] ?? 0);
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = DataUtils.toHalfFloat(1);
  }
  const relief = new DataTexture(data, columns, rows, RGBAFormat, HalfFloatType);
  relief.minFilter = LinearFilter;
  relief.magFilter = LinearFilter;
  relief.generateMipmaps = false;
  relief.needsUpdate = true;
  return relief;
};

/**
 * A flat grid on the ground plane, one vertex per sample, the map's x along
 * x and its y along z. Each vertex's uv lands on the centre of its texel, so
 * the vertex stage reads its own sample and the fragment stage reads between
 * them. The last column and row stop at the layout's edge.
 */
const gridGeometry = (grid: Grid, width: number, height: number): BufferGeometry => {
  const { columns, rows, resolution } = grid;
  const count = columns * rows;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const i = row * columns + column;
      position[i * 3] = Math.min(width, column * resolution);
      position[i * 3 + 2] = Math.min(height, row * resolution);
      normal[i * 3 + 1] = 1;
      uvs[i * 2] = (column + 0.5) / columns;
      uvs[i * 2 + 1] = (row + 0.5) / rows;
    }
  }
  const index = new Uint32Array((columns - 1) * (rows - 1) * 6);
  let k = 0;
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      // Wound to face up, the way the camera looks at them.
      index.set([a, c, b, b, c, d], k);
      k += 6;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('normal', new BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
};

/** The skin for a map: its mesh, and the uniforms the render loop moves each frame. */
export const createSkin = (map: MapJson, look: SkinLook = SKIN): Skin => {
  const field = heightfield(map, RESOLUTION);
  const relief = reliefTexture(field);
  const { columns, rows, resolution } = field.height;
  const amp = uniform(1);
  const lift = uniform(0);
  const surface = uniform(0);

  /** The skin's height at a texture coordinate: the resting terraces and swells, and the cells' mass at the scheduler's amplitude. */
  const heightAt = (at: Node) => {
    const sample = texture(relief, at);
    return sample.r.add(sample.g.mul(amp));
  };

  const material = new MeshPhysicalNodeMaterial();
  material.positionNode = vec3(positionLocal.x, heightAt(uv()).add(lift), positionLocal.z);

  // The normal from the height's gradient, one texel either side, so the relief reads smoothly however the mesh is cut.
  const du = 1 / columns;
  const dv = 1 / rows;
  const dx = heightAt(uv().add(vec2(du, 0))).sub(heightAt(uv().sub(vec2(du, 0))));
  const dz = heightAt(uv().add(vec2(0, dv))).sub(heightAt(uv().sub(vec2(0, dv))));
  const normalInView = transformNormalToView(normalize(vec3(dx.div(-2 * resolution), 1, dz.div(-2 * resolution))));
  material.normalNode = normalInView;
  material.clearcoatNormalNode = normalInView;

  // Blue-grey where a cell swells through the skin, graphite on the field between; a trace of either at the far field.
  const swell = clamp(texture(relief, uv()).g.div(RELIEF.bodyHeight), 0, 1);
  const albedo = mix(color(look.fieldAlbedo), color(look.tissueAlbedo), swell);
  material.colorNode = albedo.mul(mix(float(look.farAlbedo), float(1), surface));
  material.emissiveNode = vec3(0, 0, 0);
  material.roughness = look.roughness;
  material.clearcoat = look.clearcoat;
  material.clearcoatRoughness = look.clearcoatRoughness;

  const { width, height } = map.terrain.layout ?? { width: 0, height: 0 };
  const mesh = new Mesh(gridGeometry(field.height, width, height), material);
  // The vertex stage moves the skin, so its resting bounds would cull it wrongly.
  mesh.frustumCulled = false;
  return { mesh, amp, lift, surface };
};
