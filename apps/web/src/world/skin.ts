/**
 * skin: the one soft skin (D16, D151), step 24's heightfield as one mesh. Its
 * relief rides a data texture (D152): the swells in one channel, which never
 * move, and the cells' mass in another, which the vertex stage scales by the
 * scheduler's amplitude, so the settle and the jiggle move the bumps alone
 * (§5.5) while the scheduler's lift raises the whole skin. No band steps it:
 * the open field is level and near-black, a ground like space, and depth
 * reads from the rules drawn over it (D169). The normal is read in the
 * fragment stage from the same texture, one sample either side, so the
 * relief stays soft however coarse the mesh, and the clearcoat reads that
 * normal too: left alone it takes the flat grid's and never glints (the
 * spike's finding).
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
 * The reach rides the tissue texture's third channel, step 26's field
 * softened a little (D152): a warm light in the skin, brightest in the
 * changed cell and dimmer per membrane crossed (D5), brighter over a cell's
 * body than in the crease between, and the bloom sees a fifth of it (D151),
 * so a broad reach stays a luminance and never a fog. A step of a range's
 * scrubber lays the next frame's reach in the fourth channel and the loop
 * mixes the two as the scheduler cross-fades the weather, the relief and the
 * tissue beneath it never moving (D100, P2).
 *
 * Past 5,000 files each package stands as one composite until the camera
 * nears it (step 66). The relief texture's two spare channels hold the tissue
 * a composite wears, its own skin over one body with none of its cells; a
 * third texture says which package's skin each sample lies under, and a row
 * of texels says how open each package stands this frame, which the loop
 * sets from the scheduler. A package that is closed wears its composite
 * tissue and is lit as though its cells' mass lay flat, so no cell reads
 * through it; the swells, the weather's reach and the skin's shape, which
 * the stars and every mark on it rest on, stay as they are, and the
 * composite costs the fragment stage alone. A map of fewer files has no
 * composites, and its skin is shaded exactly as before.
 *
 * The look, the weather's look and the relief come through the registry
 * (D156): the albedos, the sheen and the lights are uniforms the loop re-reads
 * each frame, and the relief is laid again when one of its tokens moves.
 */

import { BufferAttribute, BufferGeometry, Color, DataTexture, DataUtils, HalfFloatType, LinearFilter, Mesh, MeshPhysicalNodeMaterial, NearestFilter, RGBAFormat } from 'three/webgpu';
import type { Node, UniformNode } from 'three/webgpu';
import { clamp, float, mix, mrt, normalize, positionLocal, pow, texture, transformNormalToView, uniform, uv, vec2, vec3, vec4 } from 'three/tsl';
import { compositeGrid, compositeTissue, heightfield, reachField, skinResolution, tissue } from 'scene';
import type { Composite, Grid, Heightfield, Relief, Tissue } from 'scene';
import type { MapJson } from 'core';

import type { SkinLook, WeatherLook } from '../materials.js';

export type Skin = {
  readonly mesh: Mesh;
  /** Layout units between the heightfield's samples and the mesh's vertices: the spike's, or coarser on a field too large for it (`skinResolution`). */
  readonly resolution: number;
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
  /** Take the reach of another frame of a range, which the skin fades to from the reach it shows now as `reachMix` rises (D100). */
  readonly reach: (map: MapJson) => void;
  /** How far the skin has faded from the reach it showed to the one it took last, 0 to 1. */
  readonly reachMix: UniformNode<'float', number>;
  /** How open each composite stands, a texel each by its number from 1, the first texel always open: the organelles read it too. */
  readonly composites: DataTexture;
  /** Take how open each composite stands this frame, in composite order. */
  readonly openComposites: (shares: readonly number[]) => void;
};

/** How open each composite stands, by its number: texel 0 stands for no composite and is always open. */
const compositeShares = (count: number): DataTexture => {
  const data = new Uint16Array((count + 1) * 4).fill(DataUtils.toHalfFloat(1));
  const shares = new DataTexture(data, count + 1, 1, RGBAFormat, HalfFloatType);
  return nearestTexture(shares);
};

/** A data texture read at its texels, never between: a number, or a share by number. */
const nearestTexture = (map: DataTexture): DataTexture => {
  map.minFilter = NearestFilter;
  map.magFilter = NearestFilter;
  map.generateMipmaps = false;
  map.needsUpdate = true;
  return map;
};

/** Which composite each sample lies under, by its number, in the red channel. */
const partsTexture = (grid: Grid): DataTexture => {
  const data = new Uint16Array(grid.columns * grid.rows * 4);
  for (let i = 0; i < grid.columns * grid.rows; i += 1) {
    data[i * 4] = DataUtils.toHalfFloat(grid.values[i] ?? 0);
    data[i * 4 + 3] = DataUtils.toHalfFloat(1);
  }
  return nearestTexture(new DataTexture(data, grid.columns, grid.rows, RGBAFormat, HalfFloatType));
};



/** Fill the relief as the GPU reads it: red the resting swells, green the cells' mass, half floats so both backends filter it; and, past 5,000 files, blue and alpha the body and the membrane line a composite wears (step 66). */
const fillRelief = (data: Uint16Array, field: Heightfield, worn: Tissue | undefined): void => {
  const { columns, rows } = field.height;
  for (let i = 0; i < columns * rows; i += 1) {
    data[i * 4] = DataUtils.toHalfFloat(field.swell.values[i] ?? 0);
    data[i * 4 + 1] = DataUtils.toHalfFloat(field.mass.values[i] ?? 0);
    data[i * 4 + 2] = worn === undefined ? 0 : DataUtils.toHalfFloat(worn.body.values[i] ?? 0);
    data[i * 4 + 3] = DataUtils.toHalfFloat(worn === undefined ? 1 : (worn.membrane.values[i] ?? 0));
  }
};

/** Average each sample with its neighbours `radius` samples each way, held at the edges: one pass across, one down. */
const soften = (grid: Grid, radius: number): Grid => {
  if (radius < 1) return grid;
  for (const across of [true, false]) {
    const source = Float32Array.from(grid.values);
    const lines = across ? grid.rows : grid.columns;
    const length = across ? grid.columns : grid.rows;
    const indexOf = (line: number, step: number): number => (across ? line * grid.columns + step : step * grid.columns + line);
    for (let line = 0; line < lines; line += 1) {
      for (let step = 0; step < length; step += 1) {
        let sum = 0;
        for (let offset = -radius; offset <= radius; offset += 1) sum += source[indexOf(line, Math.min(length - 1, Math.max(0, step + offset)))] ?? 0;
        grid.values[indexOf(line, step)] = sum / (2 * radius + 1);
      }
    }
  }
  return grid;
};

/** The tissue as the GPU reads it: red the cells' bodies, green their membrane lines, blue the reach shown and alpha the reach a scrub fades to, softened; both reaches the one at first. */
const tissueTexture = (layers: Tissue, reach: Grid): DataTexture => {
  const { columns, rows } = layers.body;
  const data = new Uint16Array(columns * rows * 4);
  for (let i = 0; i < columns * rows; i += 1) {
    data[i * 4] = DataUtils.toHalfFloat(layers.body.values[i] ?? 0);
    data[i * 4 + 1] = DataUtils.toHalfFloat(layers.membrane.values[i] ?? 0);
    data[i * 4 + 2] = DataUtils.toHalfFloat(reach.values[i] ?? 0);
    data[i * 4 + 3] = data[i * 4 + 2] ?? 0;
  }
  return softTexture(new DataTexture(data, columns, rows, RGBAFormat, HalfFloatType));
};

/**
 * Lay another frame's reach in the alpha channel to fade to, and what the
 * skin shows at this moment of the fade in the blue channel to fade from, so
 * a step taken mid-fade carries on from where the light stands.
 */
const takeReach = (data: Uint16Array, reach: Grid, mixed: number): void => {
  for (let i = 0; i < reach.values.length; i += 1) {
    const from = DataUtils.fromHalfFloat(data[i * 4 + 2] ?? 0);
    const to = DataUtils.fromHalfFloat(data[i * 4 + 3] ?? 0);
    data[i * 4 + 2] = DataUtils.toHalfFloat(from + (to - from) * mixed);
    data[i * 4 + 3] = DataUtils.toHalfFloat(reach.values[i] ?? 0);
  }
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

/** The skin for a map over a look, the weather's look and a relief, all read live: its mesh, and the uniforms the render loop moves each frame. */
export const createSkin = (map: MapJson, look: SkinLook, weather: WeatherLook, reachGlow: { readonly REACH_GLOW: string; readonly REACH_ORIGIN_OPACITY: number }, relief: Relief, composites: readonly Composite[] = []): Skin => {
  const field = heightfield(map, skinResolution(map), { ...relief });
  const { columns, rows, resolution } = field.height;
  // The tissue a composite wears, laid into the relief beside it (step 66).
  const worn = composites.length === 0 ? undefined : compositeTissue(map, composites, resolution);
  const data = new Uint16Array(columns * rows * 4);
  fillRelief(data, field, worn);
  const reliefMap = softTexture(new DataTexture(data, columns, rows, RGBAFormat, HalfFloatType));
  const tissueMap = tissueTexture(tissue(map, resolution), soften(reachField(map, resolution), Math.round(weather.reachSoften)));

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
  const reachColour = uniform(new Color(reachGlow.REACH_GLOW));
  const reachGain = uniform(weather.reachGain);
  const reachOrigin = uniform(reachGlow.REACH_ORIGIN_OPACITY);
  const reachBloom = uniform(weather.reachBloom);
  const reachBodyGain = uniform(weather.reachBodyGain);
  const reachMix = uniform(1);

  // The composites' side (step 66): which one each sample lies under, and how open each stands.
  const shares = compositeShares(composites.length);
  const parts = composites.length === 0 ? undefined : partsTexture(compositeGrid(map, composites, resolution));
  /** How open the composite at a texture coordinate stands, 1 under none; none to read with no composites. */
  const openAt = (at: Node) => (parts === undefined ? undefined : texture(shares, vec2(texture(parts, at).r.add(0.5).div(composites.length + 1), 0.5)).r);

  /** The skin's height at a texture coordinate: the resting swells, and the cells' mass at the scheduler's amplitude. */
  const heightAt = (at: Node) => {
    const sample = texture(reliefMap, at);
    return sample.r.add(sample.g.mul(amp));
  };
  /** The height the skin is lit as: its own, but a closed composite's cells' mass laid flat by how open it stands, `open`, so none of them reads through it. */
  const litAt = (at: Node, open: ReturnType<typeof openAt>) => {
    if (open === undefined) return heightAt(at);
    const sample = texture(reliefMap, at);
    return sample.r.add(sample.g.mul(amp).mul(open));
  };

  const material = new MeshPhysicalNodeMaterial();
  material.positionNode = vec3(positionLocal.x, heightAt(uv()).add(lift), positionLocal.z);

  // The normal from the height's gradient, one texel either side, so the relief reads smoothly however the mesh is cut.
  // How open the composite under this fragment stands is read once, since a texel either side lies under the same package.
  const open = openAt(uv());
  const du = 1 / columns;
  const dv = 1 / rows;
  const dx = litAt(uv().add(vec2(du, 0)), open).sub(litAt(uv().sub(vec2(du, 0)), open));
  const dz = litAt(uv().add(vec2(0, dv)), open).sub(litAt(uv().sub(vec2(0, dv)), open));
  const normalInView = transformNormalToView(normalize(vec3(dx.div(-2 * resolution), 1, dz.div(-2 * resolution))));
  material.normalNode = normalInView;
  material.clearcoatNormalNode = normalInView;

  // Blue-grey where a cell's body lies under the skin, near-black on the field between, the membrane line laid over; a trace of it all at the far field.
  // A closed composite wears its own tissue in place of its cells'.
  const base = texture(tissueMap, uv());
  const wearing = worn === undefined || open === undefined ? undefined : texture(reliefMap, uv());
  // The worn tissue rides the relief's blue and alpha.
  const wornBody = wearing?.b;
  const wornLine = wearing?.a;
  const body = clamp(wornBody === undefined || open === undefined ? base.r : mix(wornBody, base.r, open), 0, 1);
  const line = wornLine === undefined || open === undefined ? base.g : mix(wornLine, base.g, open);
  const albedo = mix(fieldAlbedo, tissueAlbedo, body).add(membraneLine.mul(line));
  material.colorNode = albedo.mul(mix(farAlbedo, float(1), surface));

  // The tissue's own faint light, which never blooms (D151): a rim where the skin slopes away, and each cell's own glow over its body.
  const facing = clamp(normalInView.z, 0, 1);
  const rim = pow(float(1).sub(facing), rimPower).mul(rimGain);
  const glow = body.mul(cellLight);
  // The reach's light in the skin, at the origin's opacity the SVG lays it at and dimmer per hop: brighter over a body than in the crease between, and the bloom sees only its share.
  const reachLight = reachColour.mul(mix(base.b, base.a, reachMix)).mul(reachOrigin).mul(reachGain).mul(mix(float(1), reachBodyGain, body)).mul(surface);
  material.emissiveNode = rimColour.mul(rim.add(glow)).mul(surface).add(reachLight);
  material.mrtNode = mrt({ emissive: vec4(reachLight.mul(reachBloom), 1) });

  const restyle = (): void => {
    fieldAlbedo.value.set(look.fieldAlbedo);
    tissueAlbedo.value.set(look.tissueAlbedo);
    membraneLine.value.set(look.membraneLine);
    farAlbedo.value = look.farAlbedo;
    rimColour.value.set(look.rimColour);
    rimGain.value = look.rimGain;
    rimPower.value = look.rimPower;
    cellLight.value = look.cellLight;
    reachColour.value.set(reachGlow.REACH_GLOW);
    reachOrigin.value = reachGlow.REACH_ORIGIN_OPACITY;
    reachGain.value = weather.reachGain;
    reachBloom.value = weather.reachBloom;
    reachBodyGain.value = weather.reachBodyGain;
    material.roughness = look.roughness;
    material.clearcoat = look.clearcoat;
    material.clearcoatRoughness = look.clearcoatRoughness;
  };
  restyle();

  const relayer = (): void => {
    fillRelief(data, heightfield(map, resolution, { ...relief }), worn);
    reliefMap.needsUpdate = true;
  };

  const reach = (next: MapJson): void => {
    const { data: texels } = tissueMap.image;
    if (!(texels instanceof Uint16Array)) return;
    takeReach(texels, soften(reachField(next, resolution), Math.round(weather.reachSoften)), reachMix.value);
    reachMix.value = 0;
    tissueMap.needsUpdate = true;
  };

  const { width, height } = map.terrain.layout ?? { width: 0, height: 0 };
  const mesh = new Mesh(gridGeometry(field.height, width, height), material);
  // The vertex stage moves the skin, so its resting bounds would cull it wrongly.
  mesh.frustumCulled = false;
  const openComposites = (next: readonly number[]): void => {
    const { data: texels } = shares.image;
    if (!(texels instanceof Uint16Array)) return;
    let moved = false;
    next.forEach((share, index) => {
      const value = DataUtils.toHalfFloat(share);
      if (texels[(index + 1) * 4] === value) return;
      texels[(index + 1) * 4] = value;
      moved = true;
    });
    if (moved) shares.needsUpdate = true;
  };
  return { mesh, resolution, relief: reliefMap, amp, lift, surface, restyle, relayer, reach, reachMix, composites: shares, openComposites };
};
