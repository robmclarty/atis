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
 * the share of its light the mark names (D152). A mark that names a notice
 * follows that notice's light from the scheduler each frame (step 34, §5.5):
 * its gain brightens the mark and its scale swells the mark's radius, so the
 * primary's stain and halo breathe and flare where the scene anchors it
 * (D148) and a secondary's stain flares rarer and dimmer. The halo's own
 * share of light and bloom are the notice look's, live from the registry.
 * Under an opened cell's slide the marks in that cell give way as the slide
 * fades in, since the slide draws the change its own way (step 40), and once a
 * cell has closed, the marks on its files stand with them where they last
 * floated (D165). A frame of a range fades its marks in or out as a whole
 * while the scrubber's cross-fade runs, and they go once it has (D100). The
 * instance's numbers are packed into five buffers beside the strip's two,
 * since WebGPU allows a pipeline eight vertex buffers and no more.
 */

import { BufferAttribute, DataTexture, DoubleSide, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial } from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import { abs, attribute, cos, float, fract, length, mix, mrt, positionLocal, select, sin, step, texture, uniform, uniformArray, varying, vec2, vec3, vec4 } from 'three/tsl';
import { HATCH_PITCH, HATCH_WIDTH, STIPPLE_DOT, STIPPLE_PITCH } from 'scene';
import type { Grid, NoticeLight, Point } from 'scene';

import { hueIndex } from './palette.js';
import type { Palette } from './palette.js';
import type { Sector } from '../marks.js';

type Float = UniformNode<'float', number>;

/** How many steps a strip is swept in: enough for a full ring to read round. */
const STEPS = 48;
/** How far above the organelles the marks sit, in the heightfield's units. */
const LIFT = 0.9;
const PATTERN_INDEX = { none: 0, hatch: 1, stipple: 2 } as const;
/** The lights the material carries: one slot at rest for every mark no notice moves, then one per rank of C7's six. */
const LIGHT_SLOTS = 7;

export type Sectors = {
  readonly mesh: Mesh;
  /** The share of a mark's light the bloom sees, from the weather's look. */
  readonly bloom: Float;
  /** The halo's share of its hue's light, and of that the bloom's, from the notice look. */
  readonly halo: { readonly opacity: Float; readonly bloom: Float };
  /** Move every mark that names a notice by that notice's light this frame, in rank order. */
  readonly light: (lights: readonly NoticeLight[]) => void;
  /** Let the marks in a cell give way under its slide, by how far the slide has faded in; none with no cell open. */
  readonly hide: (cell: string | undefined, fade: number) => void;
  /** Stand the marks on these files with them, by path, where the float last left them, and every other mark at its place (D165). */
  readonly move: (moved: ReadonlyMap<string, Point>) => void;
  /** The share of the marks a range's frame shows while the scrubber cross-fades it, 1 at rest (D100). */
  readonly fade: Float;
  /** Free the mesh's buffers and its material, once its frame has faded out. */
  readonly dispose: () => void;
};

/** A strip of `STEPS` steps along and two rows across: each vertex knows how far along it is and which side it is on, as one `step` of two. */
const stripGeometry = (): InstancedBufferGeometry => {
  const count = (STEPS + 1) * 2;
  const position = new Float32Array(count * 3);
  const steps = new Float32Array(count * 2);
  for (let i = 0; i <= STEPS; i += 1) {
    for (let s = 0; s < 2; s += 1) {
      const v = i * 2 + s;
      steps[v * 2] = i / STEPS;
      steps[v * 2 + 1] = s;
    }
  }
  const index = new Uint16Array(STEPS * 6);
  for (let i = 0; i < STEPS; i += 1) {
    const a = i * 2;
    index.set([a, a + 2, a + 1, a + 1, a + 2, a + 3], i * 6);
  }
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('step', new BufferAttribute(steps, 2));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
};

/** The marks as one instanced mesh on the skin's relief. */
export const createSectors = (sectors: readonly Sector[], relief: DataTexture, grid: Grid, amp: Float, lift: Float, surface: Float, palette: Palette): Sectors => {
  const count = sectors.length;
  const geometry = stripGeometry();
  geometry.instanceCount = count;
  // The cells the marks sit in, each numbered from 1, so a mark can be hidden under its cell's slide; 0 is no cell.
  const cells = [...new Set(sectors.flatMap((sector) => (sector.cell === undefined ? [] : [sector.cell])))].toSorted();
  const cellNumber = new Map(cells.map((cell, index) => [cell, index + 1] as const));
  // Five buffers per instance: its centre and radius; its sweep, the two angles and the two offsets; its edges, the two half widths and the dash; its style; and the rest, its pattern, its light slot after the resting one, whether it is the halo the notice look sizes, and its cell's number.
  const centre = new Float32Array(count * 3);
  const sweep = new Float32Array(count * 4);
  const edges = new Float32Array(count * 4);
  const style = new Float32Array(count * 4);
  const extra = new Float32Array(count * 4);
  sectors.forEach((sector, i) => {
    centre.set([sector.x, sector.y, sector.r], i * 3);
    sweep.set([sector.from, sector.to, sector.inner, sector.outer], i * 4);
    edges.set([sector.innerHalf, sector.outerHalf, sector.dash[0], sector.dash[1]], i * 4);
    style.set([hueIndex(sector.hue), sector.opacity, sector.bloom, sector.far ? 1 : 0], i * 4);
    extra.set([PATTERN_INDEX[sector.pattern], sector.notice + 1, sector.kind === 'halo' ? 1 : 0, sector.cell === undefined ? 0 : (cellNumber.get(sector.cell) ?? 0)], i * 4);
  });
  const centreAttribute = new InstancedBufferAttribute(centre, 3);
  centreAttribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute('centre', centreAttribute);
  geometry.setAttribute('sweep', new InstancedBufferAttribute(sweep, 4));
  geometry.setAttribute('edges', new InstancedBufferAttribute(edges, 4));
  geometry.setAttribute('style', new InstancedBufferAttribute(style, 4));
  geometry.setAttribute('extra', new InstancedBufferAttribute(extra, 4));

  const bloom = uniform(1);
  const fade = uniform(1);
  const haloOpacity = uniform(1);
  const haloBloom = uniform(1);
  // The cell under a slide, by its number, and how far the slide has faded in over it.
  const hidden = uniform(0);
  const hiddenFade = uniform(0);
  // Each notice's light this frame, by its slot: a gain on the mark's light and a scale on its radius, both 1 at rest.
  const gains = uniformArray<'float'>(Array.from({ length: LIGHT_SLOTS }, () => 1), 'float');
  const scales = uniformArray<'float'>(Array.from({ length: LIGHT_SLOTS }, () => 1), 'float');
  const at = attribute('centre', 'vec3');
  const span = attribute('sweep', 'vec4').xy;
  const offset = attribute('sweep', 'vec4').zw;
  const half = attribute('edges', 'vec4').xy;
  const dash = attribute('edges', 'vec4').zw;
  const look = attribute('style', 'vec4');
  const rest = attribute('extra', 'vec4');
  const pattern = rest.x;
  const slot = rest.y.toInt();
  const halo = rest.z;
  const inCell = rest.w;
  const along = attribute('step', 'vec2').x;
  const side = attribute('step', 'vec2').y;
  const gain = gains.element(slot);
  const scale = scales.element(slot);

  // Swept from the start angle to the end along the strip, between the two offsets across it, swelled by its notice's light; along a spoke, the strip's width is the mark's.
  const angle = mix(span.x, span.y, along);
  const radial = at.z.add(mix(offset.x, offset.y, side)).mul(scale);
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
  // A mark in the opened cell gives way as its slide fades in.
  const under = step(abs(inCell.sub(hidden)), float(0.5)).mul(hiddenFade);
  const alpha = look.y.mul(mix(float(1), haloOpacity, halo)).mul(shown).mul(dashed).mul(textured).mul(float(1).sub(under)).mul(fade);
  // A mark's colour, brightened by its notice's light while it flares.
  const colour = palette.colourOf(look.x).mul(gain);
  material.colorNode = colour;
  material.opacityNode = alpha;
  // A mark is light; the bloom sees the share it names (D152), and of the halo's the share the notice look gives it.
  material.mrtNode = mrt({ emissive: vec4(colour.mul(alpha).mul(look.z).mul(mix(float(1), haloBloom, halo)).mul(bloom), 1) });

  // Each mark's file, the files' places as the marks rest round them, and the offsets as last laid, so a move reads off the place.
  const byPath = new Map<string, number[]>();
  sectors.forEach((sector, i) => byPath.set(sector.path, [...(byPath.get(sector.path) ?? []), i]));
  const placed = Float32Array.from(centre);
  let offsets = new Map<string, Point>();
  const move = (moved: ReadonlyMap<string, Point>): void => {
    const next = new Map<string, Point>();
    for (const [path, [px, py]] of moved) {
      const first = byPath.get(path)?.[0];
      if (first === undefined) continue;
      const [rx, ry] = [sectors[first]?.x ?? px, sectors[first]?.y ?? py];
      if (px !== rx || py !== ry) next.set(path, [px - rx, py - ry]);
    }
    const same = next.size === offsets.size && [...next].every(([path, [dx, dy]]) => offsets.get(path)?.[0] === dx && offsets.get(path)?.[1] === dy);
    if (same) return;
    for (const path of new Set([...offsets.keys(), ...next.keys()])) {
      const [dx, dy] = next.get(path) ?? [0, 0];
      for (const i of byPath.get(path) ?? []) {
        centre[i * 3] = (placed[i * 3] ?? 0) + dx;
        centre[i * 3 + 1] = (placed[i * 3 + 1] ?? 0) + dy;
      }
    }
    centreAttribute.needsUpdate = true;
    offsets = next;
  };

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.visible = count > 0;
  return {
    mesh,
    bloom,
    halo: { opacity: haloOpacity, bloom: haloBloom },
    light: (lights) => {
      for (let rank = 0; rank < LIGHT_SLOTS - 1; rank += 1) {
        gains.array[rank + 1] = lights[rank]?.gain ?? 1;
        scales.array[rank + 1] = lights[rank]?.scale ?? 1;
      }
    },
    hide: (cell, share) => {
      hidden.value = cell === undefined ? 0 : (cellNumber.get(cell) ?? 0);
      hiddenFade.value = share;
    },
    move,
    fade,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
};

