/**
 * skin: the one soft skin (D16, D151), step 24's heightfield as one mesh. Its
 * relief rides a data texture (D152): the terraces and swells in one channel,
 * which never move, and the cells' mass in another, which the vertex stage
 * scales by the scheduler's amplitude, so the settle and the jiggle move the
 * bumps alone (§5.5) while the scheduler's lift raises the whole skin. The
 * normal is read in the fragment stage from the same texture, one sample
 * either side, so the terraces stay soft however coarse the mesh, and the
 * clearcoat reads that normal too: left alone it takes the flat grid's and
 * never glints (the spike's finding).
 *
 * The base tissue rides a second texture, step 25's grids: the cells' bodies,
 * which blend the albedo from graphite to blue-grey, and their membrane lines,
 * teeth and all (D159), laid over it. The tissue has a faint light of its own
 * (D151): a rim where the skin slopes away from the eye, and each cell's own
 * glow over its body. Both are emissive and neither ever blooms, so the
 * material writes nothing to the bloom's target (D152, D11); the weather's
 * light joins at step 33. At the far field the albedo dims to a trace, the key
 * light and the sky being off there.
 *
 * The look, the tissue's look and the relief come through the registry
 * (D156): the albedos, the sheen and the lights are uniforms the loop re-reads
 * each frame, and the relief is laid again when one of its tokens moves.
 */

import { BufferAttribute, BufferGeometry, Color, DataTexture, DataUtils, HalfFloatType, LinearFilter, Mesh, MeshPhysicalNodeMaterial, RGBAFormat } from 'three/webgpu';
import type { Node, UniformNode } from 'three/webgpu';
import { clamp, float, mix, mrt, normalize, positionLocal, pow, texture, transformNormalToView, uniform, uv, vec2, vec3, vec4 } from 'three/tsl';
import { heightfield, tissue } from 'scene';
import type { Grid, Heightfield, Relief, Tissue } from 'scene';
import type { MapJson } from 'core';

import type { SkinLook } from '../materials.js';

/** Layout units between the heightfield's samples and the mesh's vertices: the spike's, a skin of about 116k vertices on retake-3. */
export const RESOLUTION = 4;

export type Skin = {
  readonly mesh: Mesh;
  /** The relief as the GPU reads it, which the organelles ride too. */
  readonly relief: DataTexture;
  /** The scheduler's amplitude on the cells' mass, 1 at rest. */
  readonly amp: UniformNode<'float', number>;
  /** How far the whole skin hangs above the terrain, in the heightfield's units. */
  readonly lift: UniformNode<'float', number>;
  /** How far the surface has resolved: 0 at the far field, 1 from LOD1 on, the plan's second layer. */
  readonly surface: UniformNode<'float', number>;
  /** Re-read the look into the material, each frame, so a token moved in the registry shows on the next (D156). */
  readonly restyle: () => void;
  /** Lay the relief again from the registry's relief, when one of its tokens moved. */
  readonly relayer: () => void;
};

/** Fill the relief as the GPU reads it: red the resting terraces and swells, green the cells' mass, half floats so both backends filter it. */
const fillRelief = (data: Uint16Array, field: Heightfield): void => {
  const { columns, rows } = field.height;
  for (let i = 0; i < columns * rows; i += 1) {
    data[i * 4] = DataUtils.toHalfFloat((field.terrace.values[i] ?? 0) + (field.swell.values[i] ?? 0));
    data[i * 4 + 1] = DataUtils.toHalfFloat(field.mass.values[i] ?? 0);
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = DataUtils.toHalfFloat(1);
  }
};

/** The tissue as the GPU reads it: red the cells' bodies, green their membrane lines. */
const tissueTexture = (layers: Tissue): DataTexture => {
  const { columns, rows } = layers.body;
  const data = new Uint16Array(columns * rows * 4);
  for (let i = 0; i < columns * rows; i += 1) {
    data[i * 4] = DataUtils.toHalfFloat(layers.body.values[i] ?? 0);
    data[i * 4 + 1] = DataUtils.toHalfFloat(layers.membrane.values[i] ?? 0);
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = DataUtils.toHalfFloat(1);
  }
  return softTexture(new DataTexture(data, columns, rows, RGBAFormat, HalfFloatType));
};

/** A data texture the skin samples between, as every soft layer is (D152). */
const softTexture = (map: DataTexture): DataTexture => {
  map.minFilter = LinearFilter;
  map.magFilter = LinearFilter;
  map.generateMipmaps = false;
  map.needsUpdate = true;
  return map;
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

/** The skin for a map over a look and a relief, both read live: its mesh, and the uniforms the render loop moves each frame. */
export const createSkin = (map: MapJson, look: SkinLook, relief: Relief): Skin => {
  const field = heightfield(map, RESOLUTION, { ...relief });
  const { columns, rows, resolution } = field.height;
  const data = new Uint16Array(columns * rows * 4);
  fillRelief(data, field);
  const reliefMap = softTexture(new DataTexture(data, columns, rows, RGBAFormat, HalfFloatType));
  const tissueMap = tissueTexture(tissue(map, RESOLUTION));

  const amp = uniform(1);
  const lift = uniform(0);
  const surface = uniform(0);
  const fieldAlbedo = uniform(new Color(look.fieldAlbedo));
  const tissueAlbedo = uniform(new Color(look.tissueAlbedo));
  const membraneLine = uniform(new Color(look.membraneLine));
  const farAlbedo = uniform(look.farAlbedo);
  const rimColour = uniform(new Color(look.rimColour));
  const rimGain = uniform(look.rimGain);
  const rimPower = uniform(look.rimPower);
  const cellLight = uniform(look.cellLight);

  /** The skin's height at a texture coordinate: the resting terraces and swells, and the cells' mass at the scheduler's amplitude. */
  const heightAt = (at: Node) => {
    const sample = texture(reliefMap, at);
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

  // Blue-grey where a cell's body lies under the skin, graphite on the field between, the membrane line laid over; a trace of it all at the far field.
  const base = texture(tissueMap, uv());
  const body = clamp(base.r, 0, 1);
  const albedo = mix(fieldAlbedo, tissueAlbedo, body).add(membraneLine.mul(base.g));
  material.colorNode = albedo.mul(mix(farAlbedo, float(1), surface));

  // The tissue's own faint light, which never blooms (D151): a rim where the skin slopes away, and each cell's own glow over its body.
  const facing = clamp(normalInView.z, 0, 1);
  const rim = pow(float(1).sub(facing), rimPower).mul(rimGain);
  const glow = body.mul(cellLight);
  material.emissiveNode = rimColour.mul(rim.add(glow)).mul(surface);
  material.mrtNode = mrt({ emissive: vec4(0, 0, 0, 1) });

  const restyle = (): void => {
    fieldAlbedo.value.set(look.fieldAlbedo);
    tissueAlbedo.value.set(look.tissueAlbedo);
    membraneLine.value.set(look.membraneLine);
    farAlbedo.value = look.farAlbedo;
    rimColour.value.set(look.rimColour);
    rimGain.value = look.rimGain;
    rimPower.value = look.rimPower;
    cellLight.value = look.cellLight;
    material.roughness = look.roughness;
    material.clearcoat = look.clearcoat;
    material.clearcoatRoughness = look.clearcoatRoughness;
  };
  restyle();

  const relayer = (): void => {
    fillRelief(data, heightfield(map, RESOLUTION, { ...relief }));
    reliefMap.needsUpdate = true;
  };

  const { width, height } = map.terrain.layout ?? { width: 0, height: 0 };
  const mesh = new Mesh(gridGeometry(field.height, width, height), material);
  // The vertex stage moves the skin, so its resting bounds would cull it wrongly.
  mesh.frustumCulled = false;
  return { mesh, relief: reliefMap, amp, lift, surface, restyle, relayer };
};
