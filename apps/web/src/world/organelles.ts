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
 * its arms' tips. Under an opened cell's slide the files of that cell give
 * way as the slide fades in, since the slide draws them moving (step 40), and
 * once a cell has closed its files stand where they last floated, still, until
 * the scheduler brings them home (D165).
 */

import { BufferAttribute, Color, DataTexture, DataUtils, DoubleSide, DynamicDrawUsage, HalfFloatType, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial, NearestFilter, RGBAFormat } from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import { abs, attribute, float, instanceIndex, mix, mrt, positionLocal, smoothstep, step, texture, uniform, varying, vec2, vec3, vec4 } from 'three/tsl';
import { ORGANELLE_FILL, ORGANELLE_STROKE, ORGANELLE_STROKE_WIDTH, instances, outlineOf, rulesOf, slideCellOf } from 'scene';
import type { Grid, Instance, Point } from 'scene';
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
  /** Let the files of a cell give way under its slide, by how far the slide has faded in; none with no cell open. */
  readonly hide: (cell: string | undefined, fade: number) => void;
  /** Stand these files where the float last left them, by path, and every other file where the layout put it (D165). */
  readonly move: (moved: ReadonlyMap<string, Point>) => void;
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

/** The instances' numbers: each centre, its glow, its outline's radii, the number of its cell, from 1, so it can give way under that cell's slide, and the file each instance draws, by its index among the files. */
type Placed = { readonly centres: Float32Array; readonly glows: Float32Array; readonly radii: readonly (readonly number[])[]; readonly cells: Float32Array; readonly owners: Int32Array };

/** The cell under a slide, by its number, and how far the slide has faded in over it. */
type Hiding = { readonly cell: Float; readonly fade: Float };

/** One instanced mesh over `placed`, drawn on the skin's relief at the skin's amplitude and lift. */
const instancedMesh = (placed: Placed, relief: DataTexture, grid: Grid, amp: Float, lift: Float, surface: Float, hiding: Hiding, look: OrganelleLook): { readonly mesh: Mesh; readonly restyle: () => void; readonly centre: InstancedBufferAttribute } => {
  const count = placed.radii.length;
  const geometry = fanGeometry();
  geometry.instanceCount = count;
  const centreAttribute = new InstancedBufferAttribute(placed.centres, 2);
  centreAttribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute('centre', centreAttribute);
  geometry.setAttribute('glow', new InstancedBufferAttribute(placed.glows, 4));
  geometry.setAttribute('cellAt', new InstancedBufferAttribute(placed.cells, 1));
  const radii = radiiTexture(placed.radii);

  const fill = uniform(new Color(look.ORGANELLE_FILL));
  const stroke = uniform(new Color(look.ORGANELLE_STROKE));
  const strokeWidth = uniform(look.ORGANELLE_STROKE_WIDTH);

  const centre = attribute('centre', 'vec2');
  const glow = attribute('glow', 'vec4');
  const cellAt = attribute('cellAt', 'float');
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
  // A file in the opened cell gives way as its slide fades in.
  const shown = surface.mul(float(1).sub(step(abs(cellAt.sub(hiding.cell)), float(0.5)).mul(hiding.fade)));
  material.opacityNode = shown;
  // Only a state's glow reaches the bloom; base tissue never does (D152, D11).
  material.mrtNode = mrt({ emissive: vec4(glow.rgb.mul(glow.a).mul(shown), 1) });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  const restyle = (): void => {
    fill.value.set(look.ORGANELLE_FILL);
    stroke.value.set(look.ORGANELLE_STROKE);
    strokeWidth.value = look.ORGANELLE_STROKE_WIDTH;
  };
  return { mesh, restyle, centre: centreAttribute };
};

/** Every placed file as instances, and the bulbs of the files at levels 5 and 6 as a second set, each numbered by the cell whose slide it gives way under: its own, or the package a single-file module floats in (D167). */
const placedOf = (map: MapJson, cellNumber: ReadonlyMap<string, number>): { readonly files: Placed; readonly bulbs: Placed } => {
  const files = instances(map);
  const centres = new Float32Array(files.length * 2);
  const glows = new Float32Array(files.length * 4);
  const cells = new Float32Array(files.length);
  const bulbCentres: number[] = [];
  const bulbCells: number[] = [];
  const bulbOwners: number[] = [];
  const bulbRadii: (readonly number[])[] = [];
  const radii = files.map((file, index) => {
    centres[index * 2] = file.x;
    centres[index * 2 + 1] = file.y;
    const slide = cellNumber.get(slideCellOf(map, file.cell)) ?? 0;
    cells[index] = slide;
    const rules = rulesOf(file.dents);
    if (rules > 0) {
      for (const bulb of outlineOf(file.id, { x: file.x, y: file.y, r: file.r }, rules).bulbs) {
        bulbCentres.push(bulb.x, bulb.y);
        bulbCells.push(slide);
        bulbOwners.push(index);
        bulbRadii.push(Array.from({ length: SAMPLES }, () => bulb.r));
      }
    }
    return radiiOf(file);
  });
  return {
    files: { centres, glows, radii, cells, owners: Int32Array.from(files, (_, index) => index) },
    bulbs: { centres: Float32Array.from(bulbCentres), glows: new Float32Array(bulbRadii.length * 4), radii: bulbRadii, cells: Float32Array.from(bulbCells), owners: Int32Array.from(bulbOwners) },
  };
};

/** The organelles of a map on the skin's relief, in the registry's live look. */
export const createOrganelles = (map: MapJson, relief: DataTexture, grid: Grid, amp: Float, lift: Float, look: OrganelleLook): Organelles => {
  const surface = uniform(0);
  // The cells numbered from 1, in id order, so a file can give way under its cell's slide; 0 is no cell.
  const cellNumber = new Map(map.terrain.cells.map((cell) => cell.id).toSorted().map((cell, index) => [cell, index + 1] as const));
  const hiding: Hiding = { cell: uniform(0), fade: uniform(0) };
  const { files, bulbs } = placedOf(map, cellNumber);
  const placedSets = [files, ...(bulbs.radii.length === 0 ? [] : [bulbs])];
  const sets = placedSets.map((placed) => instancedMesh(placed, relief, grid, amp, lift, surface, hiding, look));
  // Where each instance rests, and each file's index by path, so a move reads off the layout's place.
  const rests = placedSets.map((placed) => Float32Array.from(placed.centres));
  const indexOf = new Map(instances(map).map((file, index) => [file.id, index] as const));
  const resting = instances(map).map((file): Point => [file.x, file.y]);
  // Each file's offset from its place as last laid, by its index: none for a file at its place.
  let offsets = new Map<number, Point>();
  const move = (moved: ReadonlyMap<string, Point>): void => {
    const next = new Map<number, Point>();
    for (const [path, [x, y]] of moved) {
      const index = indexOf.get(path);
      const rest = index === undefined ? undefined : resting[index];
      if (index !== undefined && rest !== undefined && (x !== rest[0] || y !== rest[1])) next.set(index, [x - rest[0], y - rest[1]]);
    }
    const same = next.size === offsets.size && [...next].every(([index, [dx, dy]]) => offsets.get(index)?.[0] === dx && offsets.get(index)?.[1] === dy);
    if (same) return;
    placedSets.forEach((placed, set) => {
      const rest = rests[set];
      const centres = sets[set]?.centre;
      if (rest === undefined || centres === undefined) return;
      placed.owners.forEach((owner, instance) => {
        const [dx, dy] = next.get(owner) ?? [0, 0];
        placed.centres[instance * 2] = (rest[instance * 2] ?? 0) + dx;
        placed.centres[instance * 2 + 1] = (rest[instance * 2 + 1] ?? 0) + dy;
      });
      centres.needsUpdate = true;
    });
    offsets = next;
  };
  return {
    meshes: sets.map((set) => set.mesh),
    surface,
    restyle: () => sets.forEach((set) => set.restyle()),
    hide: (cell, fade) => {
      hiding.cell.value = cell === undefined ? 0 : (cellNumber.get(cell) ?? 0);
      hiding.fade.value = fade;
    },
    move,
  };
};
