/**
 * organelles: every placed file as one instanced mesh, each in the outline
 * step 94 gives it (D146): a fan of one geometry, scaled per vertex by the
 * radius its file's outline has at that angle, read from a texture with one
 * row per instance. They sit a hair above the skin and ride its settle: each
 * vertex reads the relief where it lands, so a file on a slope drapes on it.
 *
 * They are base tissue, dim and flat (§5.6, D11): the organelle's fill and
 * stroke from the shared tokens, unlit by the key light, shown from LOD1 on.
 * Each carries an emissive glow of its own that is nothing at rest and lights
 * only by state, which step 33's weather sets, and that glow is all the
 * material writes to the bloom's target (D152). A file within every threshold
 * is a disc; one that breaks rules is its morphed outline, still at rest here,
 * and at levels 5 and 6 a second, smaller instanced mesh carries the bulbs at
 * its arms' tips.
 */

import { BufferAttribute, Color, DataTexture, DataUtils, DoubleSide, HalfFloatType, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial, NearestFilter, RGBAFormat } from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import { attribute, instanceIndex, mix, mrt, positionLocal, smoothstep, texture, uniform, varying, vec2, vec3, vec4 } from 'three/tsl';
import { ORGANELLE_FILL, ORGANELLE_STROKE, ORGANELLE_STROKE_WIDTH, instances, outlineOf, rulesOf } from 'scene';
import type { Grid, Instance } from 'scene';
import type { MapJson } from 'core';

/** A float uniform the skin moves and the organelles read: the scheduler's amplitude and lift, and the surface's layer. */
type Float = UniformNode<'float', number>;

/** How many angles each outline is read at: enough for the sharpest spike the shape tokens draw. */
const SAMPLES = 96;
/** How far above the skin an organelle sits, in the heightfield's units: a hair, so it never fights the skin for the depth buffer. */
const LIFT = 0.6;

export type Organelles = {
  readonly meshes: readonly Mesh[];
  /** How far the surface has resolved, the layer the organelles belong to. */
  readonly surface: Float;
  /** Re-read the tokens' colours into the material, each frame (D156). */
  readonly restyle: () => void;
};

/** The look the organelles read live from the registry: the two base tissue tokens and the stroke's width. */
export type OrganelleLook = {
  readonly ORGANELLE_FILL: string;
  readonly ORGANELLE_STROKE: string;
  readonly ORGANELLE_STROKE_WIDTH: number;
};

/** The look at rest, which is the shape the registry's view takes. */
export const ORGANELLE_LOOK: OrganelleLook = { ORGANELLE_FILL, ORGANELLE_STROKE, ORGANELLE_STROKE_WIDTH };

/** A file's outline as its radius at each of `SAMPLES` angles from 0, read off the ring step 94 draws, which samples uniformly from 0. */
const radiiOf = (file: Instance): readonly number[] => {
  const rules = rulesOf(file.dents);
  if (rules === 0) return Array.from({ length: SAMPLES }, () => file.r);
  const { ring } = outlineOf(file.id, { x: file.x, y: file.y, r: file.r }, rules);
  const radii = ring.map(([x, y]) => Math.hypot(x - file.x, y - file.y));
  return Array.from({ length: SAMPLES }, (_, sample) => {
    const at = (sample / SAMPLES) * ring.length;
    const low = Math.floor(at);
    const share = at - low;
    return (radii[low % ring.length] ?? file.r) * (1 - share) + (radii[(low + 1) % ring.length] ?? file.r) * share;
  });
};

/** A fan of one unit disc: a centre and `SAMPLES` rim vertices, each knowing which spoke it is on and that it is on the rim. (`sample` is a word GLSL keeps.) */
const fanGeometry = (): InstancedBufferGeometry => {
  const count = SAMPLES + 1;
  const position = new Float32Array(count * 3);
  const spoke = new Float32Array(count);
  const edge = new Float32Array(count);
  for (let i = 0; i < SAMPLES; i += 1) {
    const theta = (i / SAMPLES) * 2 * Math.PI;
    position[(i + 1) * 3] = Math.cos(theta);
    position[(i + 1) * 3 + 2] = Math.sin(theta);
    spoke[i + 1] = i;
    edge[i + 1] = 1;
  }
  const index = new Uint16Array(SAMPLES * 3);
  for (let i = 0; i < SAMPLES; i += 1) {
    index[i * 3] = 0;
    index[i * 3 + 1] = i + 1;
    index[i * 3 + 2] = ((i + 1) % SAMPLES) + 1;
  }
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('spoke', new BufferAttribute(spoke, 1));
  geometry.setAttribute('edge', new BufferAttribute(edge, 1));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
};

/** One row per instance, one texel per sample: the radius at that angle, in layout units. */
const radiiTexture = (rows: readonly (readonly number[])[]): DataTexture => {
  const data = new Uint16Array(SAMPLES * Math.max(1, rows.length) * 4);
  rows.forEach((radii, row) => {
    radii.forEach((radius, sample) => {
      const i = (row * SAMPLES + sample) * 4;
      data[i] = DataUtils.toHalfFloat(radius);
      data[i + 3] = DataUtils.toHalfFloat(1);
    });
  });
  const map = new DataTexture(data, SAMPLES, Math.max(1, rows.length), RGBAFormat, HalfFloatType);
  map.minFilter = NearestFilter;
  map.magFilter = NearestFilter;
  map.generateMipmaps = false;
  map.needsUpdate = true;
  return map;
};

type Placed = { readonly centres: Float32Array; readonly glows: Float32Array; readonly radii: readonly (readonly number[])[] };

/** One instanced mesh over `placed`, drawn on the skin's relief at the skin's amplitude and lift. */
const instancedMesh = (placed: Placed, relief: DataTexture, grid: Grid, amp: Float, lift: Float, surface: Float, look: OrganelleLook): { readonly mesh: Mesh; readonly restyle: () => void } => {
  const count = placed.radii.length;
  const geometry = fanGeometry();
  geometry.instanceCount = count;
  geometry.setAttribute('centre', new InstancedBufferAttribute(placed.centres, 2));
  geometry.setAttribute('glow', new InstancedBufferAttribute(placed.glows, 4));
  const radii = radiiTexture(placed.radii);

  const fill = uniform(new Color(look.ORGANELLE_FILL));
  const stroke = uniform(new Color(look.ORGANELLE_STROKE));
  const strokeWidth = uniform(look.ORGANELLE_STROKE_WIDTH);

  const centre = attribute('centre', 'vec2');
  const glow = attribute('glow', 'vec4');
  const spoke = attribute('spoke', 'float');
  const edge = attribute('edge', 'float');
  // The radius at this vertex's angle, from the instance's row; the centre vertex takes the first sample's, which the fan never shows.
  const radius = texture(radii, vec2(spoke.add(0.5).div(SAMPLES), instanceIndex.toFloat().add(0.5).div(count))).r;
  const x = centre.x.add(positionLocal.x.mul(radius));
  const z = centre.y.add(positionLocal.z.mul(radius));
  // Each vertex reads the skin's height where it lands, the way the skin's own vertices do.
  const at = vec2(x.div(grid.resolution).add(0.5).div(grid.columns), z.div(grid.resolution).add(0.5).div(grid.rows));
  const height = texture(relief, at);
  const y = height.r.add(height.g.mul(amp)).add(lift).add(LIFT);

  const material = new MeshBasicNodeMaterial();
  material.positionNode = vec3(x, y, z);
  material.side = DoubleSide;
  material.transparent = true;
  material.depthWrite = false;
  // The stroke: the outer `strokeWidth` of the radius along each spoke, read from how far out the fragment sits.
  const out = varying(edge.mul(radius));
  const rim = varying(radius);
  const band = smoothstep(rim.sub(strokeWidth).sub(0.5), rim.sub(strokeWidth).add(0.5), out);
  material.colorNode = mix(fill, stroke, band).add(glow.rgb.mul(glow.a));
  material.opacityNode = surface;
  // Only a state's glow reaches the bloom; base tissue never does (D152, D11).
  material.mrtNode = mrt({ emissive: vec4(glow.rgb.mul(glow.a).mul(surface), 1) });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  const restyle = (): void => {
    fill.value.set(look.ORGANELLE_FILL);
    stroke.value.set(look.ORGANELLE_STROKE);
    strokeWidth.value = look.ORGANELLE_STROKE_WIDTH;
  };
  return { mesh, restyle };
};

/** Every placed file as instances, and the bulbs of the files at levels 5 and 6 as a second set. */
const placedOf = (map: MapJson): { readonly files: Placed; readonly bulbs: Placed } => {
  const files = instances(map);
  const centres = new Float32Array(files.length * 2);
  const glows = new Float32Array(files.length * 4);
  const bulbCentres: number[] = [];
  const bulbRadii: (readonly number[])[] = [];
  const radii = files.map((file, index) => {
    centres[index * 2] = file.x;
    centres[index * 2 + 1] = file.y;
    const rules = rulesOf(file.dents);
    if (rules > 0) {
      for (const bulb of outlineOf(file.id, { x: file.x, y: file.y, r: file.r }, rules).bulbs) {
        bulbCentres.push(bulb.x, bulb.y);
        bulbRadii.push(Array.from({ length: SAMPLES }, () => bulb.r));
      }
    }
    return radiiOf(file);
  });
  return {
    files: { centres, glows, radii },
    bulbs: { centres: Float32Array.from(bulbCentres), glows: new Float32Array(bulbRadii.length * 4), radii: bulbRadii },
  };
};

/** The organelles of a map on the skin's relief, in the registry's live look. */
export const createOrganelles = (map: MapJson, relief: DataTexture, grid: Grid, amp: Float, lift: Float, look: OrganelleLook): Organelles => {
  const surface = uniform(0);
  const { files, bulbs } = placedOf(map);
  const sets = [files, ...(bulbs.radii.length === 0 ? [] : [bulbs])].map((placed) => instancedMesh(placed, relief, grid, amp, lift, surface, look));
  return {
    meshes: sets.map((set) => set.mesh),
    surface,
    restyle: () => sets.forEach((set) => set.restyle()),
  };
};
