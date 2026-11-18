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
 *
 * A ribbon whose import enters a module past its interface sways (Q84, Q93):
 * the vertex stage moves it across its width by `RIBBON_SWAY` on a wave that
 * travels along its bow from the importer to the imported file, one wave
 * every `WEATHER.ribbonWave` of the bow, at `RIBBON_SWAY_HZ`. Each vertex
 * carries which way is across, how far along the bow it lies, and how much
 * of the sway it takes: none at the importer's rim, none under the arrowhead,
 * eased in between, so the line leaves and arrives where it always did and
 * the arrowhead stays on the rim. A swaying ribbon is laid in short pieces,
 * so the wave bends it smoothly; a still ribbon is laid as before, takes no
 * sway and never moves, and a map with no swaying ribbon draws with the
 * material it always had. The time is the scheduler's (C12), and under
 * reduced motion nothing sways.
 */

import { BufferAttribute, BufferGeometry, DataTexture, DoubleSide, Mesh, MeshBasicNodeMaterial } from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import { attribute, mrt, positionLocal, sin, texture, uniform, vec2, vec3, vec4 } from 'three/tsl';
import type { Grid } from 'scene';

import { hueIndex } from './palette.js';
import type { Palette } from './palette.js';
import { RIBBON_WIDTH } from '../marks.js';
import type { Ribbon } from '../marks.js';

type Float = UniformNode<'float', number>;
type Point = readonly [number, number];

/** How far above the marks the ribbons run. */
const LIFT = 1;

/** The longest piece a swaying ribbon is laid in, in layout units: short enough that a wave bends it smoothly at any length the dev panel sets inside reason. */
const SWAY_PIECE = 2;
/** How far along the bow the sway eases in from the importer's rim, and out before the arrowhead, in layout units; half the bow each where it is shorter. */
const SWAY_EASE = 12;

/** A ribbon's points with each one's distance along it from the first. */
const measured = (points: readonly Point[]): readonly { readonly at: Point; readonly along: number }[] => {
  let along = 0;
  return points.map((at, i) => {
    const [px, py] = points[Math.max(0, i - 1)] ?? at;
    along += Math.hypot(at[0] - px, at[1] - py);
    return { at, along };
  });
};

/** A swaying ribbon's points cut into pieces no longer than `SWAY_PIECE`, each new point on the straight between two it was given, so the line it draws at rest is the one it drew. */
const pieced = (points: readonly Point[]): readonly Point[] =>
  points.flatMap((at, i): readonly Point[] => {
    const next = points[i + 1];
    if (next === undefined) return [at];
    const pieces = Math.max(1, Math.ceil(Math.hypot(next[0] - at[0], next[1] - at[1]) / SWAY_PIECE));
    return Array.from({ length: pieces }, (_, k): Point => [at[0] + ((next[0] - at[0]) * k) / pieces, at[1] + ((next[1] - at[1]) * k) / pieces]);
  });

/** A smooth rise from 0 to 1 as `share` runs from 0 to 1, flat at both ends. */
const eased = (share: number): number => {
  const t = Math.min(1, Math.max(0, share));
  return t * t * (3 - 2 * t);
};

/**
 * How much of the sway a point `along` a bow of `length` takes: none at the
 * importer's rim, none from where the arrowhead begins, `size` short of the
 * end, and eased in between, so the line leaves its file and meets its
 * arrowhead where it always did. A bow too short to hold more than its
 * arrowhead takes none.
 */
const swayShare = (along: number, length: number, size: number): number => {
  const free = length - size;
  if (free <= 0) return 0;
  const ease = Math.min(SWAY_EASE, free / 2);
  return eased(along / ease) * eased((free - along) / ease);
};

/** One ribbon's vertices: a strip along its points, each with how it sways, and the arrowhead's three, which never do. */
const lay = (ribbon: Ribbon, positions: number[], hues: number[], sways: number[], index: number[]): void => {
  const base = positions.length / 3;
  const half = (ribbon.width ?? RIBBON_WIDTH) / 2;
  const points = measured(ribbon.sway ? pieced(ribbon.points) : ribbon.points);
  const length = points.at(-1)?.along ?? 0;
  points.forEach(({ at: [x, y], along }, i) => {
    const [px, py] = points[Math.max(0, i - 1)]?.at ?? [x, y];
    const [nx, ny] = points[Math.min(points.length - 1, i + 1)]?.at ?? [x, y];
    const span = Math.hypot(nx - px, ny - py) || 1;
    const ax = -(ny - py) / span;
    const ay = (nx - px) / span;
    positions.push(x + ax * half, 0, y + ay * half, x - ax * half, 0, y - ay * half);
    hues.push(hueIndex(ribbon.hue), hueIndex(ribbon.hue));
    // Both edges of the strip sway the same way across it, so the ribbon keeps its width.
    const share = ribbon.sway ? swayShare(along, length, ribbon.arrow?.size ?? 0) : 0;
    sways.push(ax, ay, share, along, ax, ay, share, along);
  });
  for (let i = 0; i + 1 < points.length; i += 1) {
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
  sways.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  index.push(tip, tip + 1, tip + 2);
};

/** The tokens a sway is timed and sized from, read live (D156): how far and how fast, the scene's, and one wave's length along the bow, the weather look's. */
export type SwayLook = { readonly tokens: { readonly RIBBON_SWAY: number; readonly RIBBON_SWAY_HZ: number }; readonly weather: { readonly ribbonWave: number } };

/**
 * The ribbons as the world draws them: the mesh, the bloom's share of their
 * light, for a range's frame its share of the cross-fade and the free once
 * it has faded out (D100), and the sway, run to the scheduler's time in
 * milliseconds since load, `still` under reduced motion (Q84).
 */
export type Ribbons = { readonly mesh: Mesh; readonly bloom: Float; readonly fade: Float; readonly sway: (t: number, still: boolean) => void; readonly dispose: () => void };

export const createRibbons = (ribbons: readonly Ribbon[], relief: DataTexture, grid: Grid, amp: Float, lift: Float, surface: Float, palette: Palette, look: SwayLook): Ribbons => {
  const positions: number[] = [];
  const hues: number[] = [];
  const sways: number[] = [];
  const index: number[] = [];
  for (const ribbon of ribbons) lay(ribbon, positions, hues, sways, index);
  const swaying = ribbons.some((ribbon) => ribbon.sway);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(Float32Array.from(positions), 3));
  geometry.setAttribute('hue', new BufferAttribute(Float32Array.from(hues), 1));
  // Each vertex's sway: which way is across the ribbon there, the share of the sway it takes, and how far along the bow it lies.
  if (swaying) geometry.setAttribute('sway', new BufferAttribute(Float32Array.from(sways), 4));
  geometry.setIndex(new BufferAttribute(Uint32Array.from(index), 1));

  const bloom = uniform(1);
  const fade = uniform(1);
  const shown = surface.mul(fade);
  // The sway (Q84): where the scheduler's clock stands in its period, as an angle; how far a ribbon sways, none until the loop says they move; and the phase a layout unit of the bow turns through.
  const swayTurn = uniform(0);
  const swayReach = uniform(0);
  const swayWave = uniform(0);
  // A swaying vertex stands across the ribbon from its place by the wave where it lies along the bow; with no swaying ribbon nothing is read or moved.
  const moved = ((): { readonly x: typeof positionLocal.x; readonly z: typeof positionLocal.z } => {
    if (!swaying) return { x: positionLocal.x, z: positionLocal.z };
    const each = attribute('sway', 'vec4');
    const swing = sin(swayTurn.sub(each.w.mul(swayWave))).mul(each.z).mul(swayReach);
    return { x: positionLocal.x.add(each.x.mul(swing)), z: positionLocal.z.add(each.y.mul(swing)) };
  })();
  const uvAt = vec2(moved.x.div(grid.resolution).add(0.5).div(grid.columns), moved.z.div(grid.resolution).add(0.5).div(grid.rows));
  const height = texture(relief, uvAt);
  const material = new MeshBasicNodeMaterial();
  material.positionNode = vec3(moved.x, height.r.add(height.g.mul(amp)).add(lift).add(LIFT), moved.z);
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
  const sway = (t: number, still: boolean): void => {
    if (!swaying) return;
    // The clock's place in the period is worked out here, where the time keeps its precision however long the page has stood open.
    swayTurn.value = 2 * Math.PI * (((look.tokens.RIBBON_SWAY_HZ * t) / 1000) % 1);
    swayReach.value = still ? 0 : look.tokens.RIBBON_SWAY;
    swayWave.value = look.weather.ribbonWave > 0 ? (2 * Math.PI) / look.weather.ribbonWave : 0;
  };
  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
  };
  return { mesh, bloom, fade, sway, dispose };
};
