/**
 * nuclei: every file's functions as granules on the map itself, one
 * instanced mesh (D206 (detail-by-size)). The scene lays each file's nucleus
 * at rest (`nucleiOf`), and a granule is one small fan of one geometry, sized
 * and placed by its instance's four numbers: no radii texture, since every
 * granule here is round (D294 (granules-round)). Each vertex reads the skin's
 * relief where it lands, as a file's does, and the mesh is drawn after the
 * marks, so a stain never covers a function (D295 (granules-over-marks)). It
 * is drawn after the ribbons too, which share the marks' place in the frame,
 * so a granule lies over a ribbon where one's bow crosses a file (D299
 * (granules-over-ribbons)).
 *
 * A granule is base tissue: unlit, the file's fill darkened by the slide's
 * own `INTERIOR.granuleShade`, and no light the bloom sees. The bloom's
 * target does not blend, so a granule blots the light under its disc from the
 * moment it has any size, ahead of its own ink, as a file blots the skin's
 * (D298 (granules-blot-bloom), D152, D11).
 *
 * It resolves by its size on the screen and by nothing else (D206
 * (detail-by-size)): the loop hands in the pixels one layout unit takes, and
 * a granule fades in as its radius grows from `LEVELS.granuleFrom` pixels to
 * `LEVELS.granuleFull`. Below the lower bound it is drawn at no size at all,
 * so a far view pays for no fragments. With both at 0 every granule shows at
 * every zoom.
 *
 * The granules ride their files: under an opened module's slide they give way
 * with the files of that module, since the slide draws its own, and they
 * stand with a file where it last floated (D165). The nucleus's tokens are
 * read live (D156): the granules are laid again, in the buffer they were
 * given, on the first restyle after one moves.
 *
 * On a map whose packages stand as composites, and on one that carries no
 * function data, there is no mesh, and `shown` says why (D292
 * (granules-off-composites), D293 (granules-unmeasured)).
 */

import { BufferAttribute, Color, DoubleSide, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial } from 'three/webgpu';
import type { DataTexture, UniformNode } from 'three/webgpu';
import { abs, attribute, clamp, float, max, mrt, positionLocal, step, texture, uniform, varying, vec2, vec3, vec4 } from 'three/tsl';
import { nucleiOf, slideCellOf } from 'scene';
import type { Composite, Grid, NucleusTokens, Point, RestGranule } from 'scene';
import type { MapJson } from 'core';

import type { InteriorLook, LevelsLook } from '../materials.js';
import type { OrganelleLook } from './organelles.js';

/** A float uniform the skin moves and the granules read: the scheduler's amplitude and lift, and the surface's layer. */
type Float = UniformNode<'float', number>;

/** How many segments a granule's disc is drawn in, as a round granule's is on the slide. */
const SEGMENTS = 12;
/** How far above the skin a granule sits, in the heightfield's units, between the marks (0.9) and the ribbons (1). It keeps a granule clear of the skin, which alone writes depth; among the files, the marks, the ribbons and the bolts it orders nothing, since none of them does, and `RENDER_ORDER` alone says which is drawn over which. */
const LIFT = 0.95;
/** Where the granules are drawn in the frame: after the marks and the ribbons, which share 2 so nothing can be drawn between them, and before the bolts and an opened slide (3), whichever of them was made last (D295 (granules-over-marks), D299 (granules-over-ribbons)). */
const RENDER_ORDER = 2.5;
/** The least the fade's two bounds are taken to stand apart, in pixels, so bounds set equal cut and never divide by nothing. */
const FADE_LEAST = 1e-4;

/**
 * The look the granules read live from the registry: the file's fill from
 * the base tissue tokens, how much darker a granule is drawn from the
 * slide's look, the two pixel bounds of the fade from the levels, and the
 * nucleus's tokens the scene lays them by.
 */
export type NucleiLook = {
  readonly tissue: Pick<OrganelleLook, 'ORGANELLE_FILL'>;
  readonly interior: Pick<InteriorLook, 'granuleShade'>;
  readonly levels: Pick<LevelsLook, 'granuleFrom' | 'granuleFull'>;
  readonly nucleus: NucleusTokens;
};

export type Nuclei = {
  /** The one mesh, for the scene; none on a map that draws no granules. */
  readonly meshes: readonly Mesh[];
  /** How many granules are laid, as the scene counts them for the tokens last read. */
  readonly count: () => number;
  /** What the canvas says of them (`data-nuclei`): how many, or why there are none. */
  readonly shown: () => string;
  /** Each frame: the pixels one layout unit takes on the screen, which a granule's fade is read from. */
  readonly frame: (pixelsPerUnit: number) => void;
  /** Re-read the tokens into the material, each frame (D156), and lay the granules again once a nucleus token has moved. */
  readonly restyle: () => void;
  /** Let the granules of a module's files give way under its slide, by how far the slide has faded in; none with no module open. */
  readonly hide: (cell: string | undefined, fade: number) => void;
  /** Stand the granules of these files with them, by path, where the float last left them, and every other where the layout put its file (D165). */
  readonly move: (moved: ReadonlyMap<string, Point>) => void;
  /** Free the mesh's buffers and its material. */
  readonly dispose: () => void;
};

/** A fan of one unit disc: a centre and `SEGMENTS` rim vertices, laid on the ground. */
const fanGeometry = (): InstancedBufferGeometry => {
  const position = new Float32Array((SEGMENTS + 1) * 3);
  for (let i = 0; i < SEGMENTS; i += 1) {
    const theta = (i / SEGMENTS) * 2 * Math.PI;
    position[(i + 1) * 3] = Math.cos(theta);
    position[(i + 1) * 3 + 2] = Math.sin(theta);
  }
  const index = new Uint16Array(SEGMENTS * 3);
  for (let i = 0; i < SEGMENTS; i += 1) {
    index[i * 3] = 0;
    index[i * 3 + 1] = i + 1;
    index[i * 3 + 2] = ((i + 1) % SEGMENTS) + 1;
  }
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
};

const clamp01 = (value: number): number => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

/** The nucleus's tokens as one word, so a restyle knows when one has moved. */
const laidBy = (tokens: NucleusTokens): string => [tokens.NUCLEUS_FILL, tokens.NUCLEUS_PAD, tokens.NUCLEUS_MOST].join(' ');

/** No granules, and why: nothing to add to the scene, and every call a no-op. */
const none = (why: string): Nuclei => ({
  meshes: [],
  count: () => 0,
  shown: () => why,
  frame: () => undefined,
  restyle: () => undefined,
  hide: () => undefined,
  move: () => undefined,
  dispose: () => undefined,
});

/**
 * The granules of a map on the skin's relief, at the skin's amplitude and
 * lift and on the surface's layer, as the files are, in the registry's live
 * look. `composites` are the map's: with any, no granule is drawn. Left out,
 * the scene reads them from the map, so a map past the threshold draws none
 * whether or not the caller remembered them.
 */
export const createNuclei = (map: MapJson, relief: DataTexture, grid: Grid, amp: Float, lift: Float, surface: Float, look: NucleiLook, composites?: readonly Composite[]): Nuclei => {
  const first = nucleiOf(map, composites, look.nucleus);
  if (first.off !== undefined) return none(`off: ${first.off}`);
  const positions = map.terrain.layout?.positions ?? {};
  // The most granules any tokens lay: a function each, since the nucleus's own most only ever counts some away.
  const room = map.terrain.organelles.reduce((total, organelle) => total + (positions[organelle.id] === undefined ? 0 : (organelle.functions?.length ?? 0)), 0);
  // Function data that names no function is read, and is nothing to draw.
  if (room === 0) return none('0');

  // The cells numbered from 1, in id order, as the files number them, so a granule gives way under its module's slide; 0 is no cell.
  const cellNumber = new Map(map.terrain.cells.map((cell) => cell.id).toSorted().map((cell, index) => [cell, index + 1] as const));
  // Each instance's four numbers: its middle, its radius, and the number of the cell whose slide shows its file.
  const packed = new Float32Array(room * 4);
  // Where each instance rests, and the file it lies in, so a move reads off the layout's place.
  const rests = new Float32Array(room * 2);
  const owners: string[] = [];
  let count = 0;
  let laidFor = '';
  // Each file's offset from its place as last laid, by path: none for a file at its place.
  let offsets = new Map<string, Point>();

  const geometry = fanGeometry();
  const granuleAttribute = new InstancedBufferAttribute(packed, 4);
  granuleAttribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute('granule', granuleAttribute);

  /** Stand every laid instance at its rest, moved with its file. */
  const place = (): void => {
    for (let i = 0; i < count; i += 1) {
      const [dx, dy] = offsets.get(owners[i] ?? '') ?? [0, 0];
      packed[i * 4] = (rests[i * 2] ?? 0) + dx;
      packed[i * 4 + 1] = (rests[i * 2 + 1] ?? 0) + dy;
    }
    granuleAttribute.needsUpdate = true;
  };
  /** Lay the granules the scene gives for the tokens as they stand, in the room there is. */
  const lay = (granules: readonly RestGranule[]): void => {
    count = Math.min(room, granules.length);
    owners.length = 0;
    for (let i = 0; i < count; i += 1) {
      const granule = granules[i];
      if (granule === undefined) continue;
      owners[i] = granule.file;
      rests[i * 2] = granule.x;
      rests[i * 2 + 1] = granule.y;
      packed[i * 4 + 2] = granule.r;
      packed[i * 4 + 3] = cellNumber.get(slideCellOf(map, granule.cell)) ?? 0;
    }
    geometry.instanceCount = count;
    laidFor = laidBy(look.nucleus);
    place();
  };
  lay(first.granules);

  // The pixels one layout unit takes, nothing until the loop's first frame says; the fade's two bounds; the ink; and the cell under a slide, by its number, with how far the slide has faded in over it.
  const scale = uniform(0);
  const from = uniform(look.levels.granuleFrom);
  const full = uniform(look.levels.granuleFull);
  const ink = uniform(new Color());
  const hidden = uniform(0);
  const hiddenFade = uniform(0);
  const inked = (): void => {
    ink.value.set(look.tissue.ORGANELLE_FILL).multiplyScalar(1 - clamp01(look.interior.granuleShade));
  };
  inked();

  const at = attribute('granule', 'vec4');
  // The granule's radius on the screen, in pixels.
  const size = at.z.mul(scale);
  // Below the lower bound a granule is drawn at no size at all, so its fan costs no fragments.
  const reach = at.z.mul(step(from, size));
  const x = at.x.add(positionLocal.x.mul(reach));
  const z = at.y.add(positionLocal.z.mul(reach));
  // Each vertex reads the skin's height where it lands, the way the skin's own vertices do.
  const uvAt = vec2(x.div(grid.resolution).add(0.5).div(grid.columns), z.div(grid.resolution).add(0.5).div(grid.rows));
  const height = texture(relief, uvAt);
  const y = height.r.add(height.g.mul(amp)).add(lift).add(LIFT);

  const material = new MeshBasicNodeMaterial();
  material.positionNode = vec3(x, y, z);
  material.side = DoubleSide;
  material.transparent = true;
  material.depthWrite = false;
  // The fade by size: nothing at the lower bound, whole at the upper, eased between as a smoothstep eases, and a cut where the two are set equal.
  const grown = clamp(size.sub(from).div(max(full.sub(from), float(FADE_LEAST))), 0, 1);
  const eased = grown.mul(grown).mul(float(3).sub(grown.mul(2)));
  // A granule of a file in the opened module gives way as the slide fades in.
  const under = step(abs(at.w.sub(hidden)), float(0.5)).mul(hiddenFade);
  // One value an instance, worked out at its vertices and carried to its fragments.
  const drawn = varying(eased.mul(float(1).sub(under)));
  const shown = surface.mul(drawn);
  material.colorNode = ink;
  material.opacityNode = shown;
  // Base tissue never blooms (D152, D11): a granule writes no light. Only the pass's own colour blends; every other target takes what is written whole, so this
  // replaces the light beneath the disc at any opacity. Alpha 1, as the files write, keeps that the same where a backend blends every target by the material (D298 (granules-blot-bloom)).
  material.mrtNode = mrt({ emissive: vec4(0, 0, 0, 1) });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = RENDER_ORDER;

  // The place the layout gave each file that carries granules, which a move is read against.
  const homes = new Map(map.terrain.organelles.flatMap((organelle) => {
    const home = positions[organelle.id];
    return home === undefined || organelle.functions === undefined ? [] : [[organelle.id, [home.x, home.y]] as const];
  }));
  const move = (moved: ReadonlyMap<string, Point>): void => {
    const next = new Map<string, Point>();
    for (const [path, [px, py]] of moved) {
      const home = homes.get(path);
      if (home !== undefined && (px !== home[0] || py !== home[1])) next.set(path, [px - home[0], py - home[1]]);
    }
    const same = next.size === offsets.size && [...next].every(([path, [dx, dy]]) => offsets.get(path)?.[0] === dx && offsets.get(path)?.[1] === dy);
    if (same) return;
    offsets = next;
    place();
  };

  return {
    meshes: [mesh],
    count: () => count,
    shown: () => String(count),
    frame: (pixelsPerUnit) => {
      scale.value = pixelsPerUnit;
    },
    restyle: () => {
      from.value = look.levels.granuleFrom;
      full.value = look.levels.granuleFull;
      inked();
      // No composites stand on this map, or there would be no mesh to lay in.
      if (laidBy(look.nucleus) !== laidFor) lay(nucleiOf(map, [], look.nucleus).granules);
    },
    hide: (cell, fade) => {
      const number = cell === undefined ? 0 : (cellNumber.get(cell) ?? 0);
      hidden.value = number;
      hiddenFade.value = number === 0 ? 0 : fade;
    },
    move,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
};
