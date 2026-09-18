/**
 * force: where every organelle sits (§5.1, D34).
 *
 * The geometry is the abyss: depth runs top to bottom, so the only thing a
 * file's `y` is allowed to say is which terrace it is on, and everything else
 * the layout knows has to be said in `x`. Four forces settle it. `forceY`
 * holds each organelle on its band's strip. `forceLink` pulls importer and
 * imported together, which is §5.1's "coupling = proximity"; the ordinary
 * edges it works from are never drawn, only felt. A cohesion force pulls a
 * cell's files toward their own centroid, so a cell reads as one clump under
 * the membrane step 16 draws around it. And `forceCollide` keeps two files
 * from sharing a spot, on a radius that already means mass (C11).
 *
 * A fifth holds the first one's promise. The terraces are not a preference
 * the forces negotiate over, so `forceTerrace` runs after all four and trims
 * each tick back to what the strip can hold; see it below for why a clamp at
 * the end will not do.
 *
 * Nothing here runs on a clock: the simulation is created, stopped before
 * `d3-timer` can take a frame, and then advanced by hand (D34). Its chance
 * comes from a seeded generator, so a base ref draws one map (C3).
 */

import { forceCollide, forceLink, forceSimulation, forceY } from 'd3-force';
import type { Force, SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';

import type { ImportEdge } from '../modules.js';

/** What the layout needs to know about one terrain file. */
export type LayoutFile = {
  readonly id: string;
  readonly cell: string;
  readonly band: number;
  readonly loc: number;
};

/** One band's horizontal strip of the field, `y0` above `y1` (the abyss runs downward). */
export type Strip = { readonly y0: number; readonly y1: number };

/** Where one file landed, and how big it is. */
export type Placement = { readonly id: string; readonly x: number; readonly y: number; readonly r: number };

export type SimulationInput = {
  readonly files: readonly LayoutFile[];
  /** The terrain's import graph; the simulation feels every edge and draws none. */
  readonly edges: readonly ImportEdge[];
  /** The strip each band index owns. A file whose band has no strip is dropped. */
  readonly strips: ReadonlyMap<number, Strip>;
  /** The nominal field width the first pass spreads its cells across. */
  readonly width: number;
  /** Positions already settled, pinned so this pass cannot move them (D32). */
  readonly fixed: ReadonlyMap<string, Placement>;
  readonly random: () => number;
};

/**
 * Size means mass and nothing else (C11), so the radius grows with the square
 * root of the file's lines: twice the area for twice the code. The floor keeps
 * a one-line file visible and the ceiling keeps a generated monster from
 * swallowing its terrace.
 */
const RADIUS_MIN = 4;
const RADIUS_MAX = 30;
const RADIUS_SCALE = 0.62;

/**
 * The tuning. The tick count is the step's 300, which is also where
 * `d3-force`'s own alpha decay lands the simulation at rest. The strengths are
 * ordered by what has to win: the band is the map's spine, so it outranks the
 * two forces that pull sideways, and both of those are weak enough that an
 * import across six terraces bends a position rather than breaking a terrace.
 */
const TICKS = 300;
const BAND_STRENGTH = 0.3;
const COLLIDE_STRENGTH = 0.9;
const COLLIDE_ITERATIONS = 2;
const COLLIDE_PAD = 5;
const LINK_STRENGTH = 0.06;
const LINK_GAP = 34;
/** Cohesion pulls sideways; vertically it only nudges, or it would fight the terraces. */
const COHESION_STRENGTH = 0.09;
const COHESION_VERTICAL = 0.2;
/** The share of its velocity a node carries into the next tick; `d3-force`'s own default. */
const VELOCITY_KEPT = 0.6;
/** How far a starting position may fall from its cell's column, in either direction. */
const START_JITTER = 44;
/** The clearance a file keeps from its terrace's own edges, on top of its radius. */
const STRIP_PAD = 3;

type Node = SimulationNodeDatum & {
  readonly id: string;
  readonly cell: string;
  readonly band: number;
  readonly r: number;
  readonly strip: Strip;
  /** The height within the strip this file is held at; see `restOn`. */
  readonly rest: number;
  x: number;
  y: number;
};

type Link = SimulationLinkDatum<Node> & { source: string | Node; target: string | Node };

type Point = { readonly x: number; readonly y: number };

/** The radius a file of `loc` lines is drawn at. */
export function radiusOf(loc: number): number {
  const scaled = RADIUS_MIN + RADIUS_SCALE * Math.sqrt(Math.max(loc, 0));
  return Math.min(Math.max(scaled, RADIUS_MIN), RADIUS_MAX);
}

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function centerOf(strip: Strip): number {
  return (strip.y0 + strip.y1) / 2;
}

/**
 * Keep a file on its terrace: never nearer an edge than its own radius and a
 * little clearance, so the shape the SVG draws is inside the strip and not
 * only its centre, and so a file resting against the boundary still reads as
 * on the terrace rather than on the line between two. A strip too thin to hold
 * the file at all falls back to the middle of it, which is the closest thing
 * to inside that exists.
 */
function ontoStrip(y: number, node: Node): number {
  const low = node.strip.y0 + node.r + STRIP_PAD;
  const high = node.strip.y1 - node.r - STRIP_PAD;
  if (low > high) return centerOf(node.strip);
  return Math.min(Math.max(y, low), high);
}

/**
 * The height inside the strip a file is held at. Every file on a terrace being
 * pulled to one centre line would pack them into a thread and leave collision
 * as the only thing pushing back, which ends with the crowd squeezed out over
 * the terrace's edges; giving each file its own rest height instead lets the
 * band fill, and collision then has room to resolve in two directions rather
 * than one. The clearance means a rest height is never nearer an edge than the
 * file's own radius, so `forceY` is always pulling back inside the strip.
 */
function restOn(strip: Strip, radius: number, random: () => number): number {
  const room = strip.y1 - strip.y0 - 2 * (radius + STRIP_PAD);
  if (room <= 0) return centerOf(strip);
  return strip.y0 + radius + STRIP_PAD + random() * room;
}

/**
 * The column each cell starts in: the cells in path order, spread evenly
 * across the field. Alphabetical order is not arbitrary — it puts `apps/*`
 * beside `apps/*` and `libs/*` beside `libs/*`, so the first frame already
 * looks like the repository, and the forces only have to refine it.
 */
function columns(files: readonly LayoutFile[], width: number): ReadonlyMap<string, number> {
  const cells = [...new Set(files.map((file) => file.cell))].toSorted(byPath);
  const margin = RADIUS_MAX + START_JITTER;
  const usable = Math.max(width - 2 * margin, 1);
  return new Map(cells.map((cell, index) => [cell, margin + ((index + 0.5) * usable) / cells.length]));
}

/**
 * Where a cell's new files should appear: beside the ones it already has, when
 * the terrain settled some, and otherwise in the cell's own column. An added
 * file joins its neighbours rather than landing across the field from them.
 */
function anchors(
  files: readonly LayoutFile[],
  fixed: ReadonlyMap<string, Placement>,
  column: ReadonlyMap<string, number>,
): ReadonlyMap<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  for (const file of files) {
    const placed = fixed.get(file.id);
    if (placed === undefined) continue;
    const seen = sums.get(file.cell) ?? { total: 0, count: 0 };
    sums.set(file.cell, { total: seen.total + placed.x, count: seen.count + 1 });
  }
  return new Map(
    [...column].map(([cell, x]) => {
      const seen = sums.get(cell);
      return [cell, seen === undefined ? x : seen.total / seen.count];
    }),
  );
}

function toNodes(input: SimulationInput): readonly Node[] {
  const column = columns(input.files, input.width);
  const anchor = anchors(input.files, input.fixed, column);
  return input.files.flatMap((file): Node[] => {
    const strip = input.strips.get(file.band);
    if (strip === undefined) return [];
    const r = radiusOf(file.loc);
    const base = { id: file.id, cell: file.cell, band: file.band, r, strip };
    const placed = input.fixed.get(file.id);
    // A pinned file rests exactly where the pass before this one left it.
    if (placed !== undefined) {
      return [{ ...base, rest: placed.y, x: placed.x, y: placed.y, fx: placed.x, fy: placed.y }];
    }
    const rest = restOn(strip, r, input.random);
    return [
      {
        ...base,
        rest,
        x: (anchor.get(file.cell) ?? input.width / 2) + (input.random() - 0.5) * START_JITTER,
        y: rest,
      },
    ];
  });
}

/** Every import between two placed files, once; a file importing itself is no link. */
function toLinks(edges: readonly ImportEdge[], placed: ReadonlySet<string>): Link[] {
  const seen = new Set<string>();
  return edges.flatMap((edge): Link[] => {
    const key = `${edge.from}\n${edge.to}`;
    if (edge.from === edge.to || !placed.has(edge.from) || !placed.has(edge.to) || seen.has(key)) return [];
    seen.add(key);
    return [{ source: edge.from, target: edge.to }];
  });
}

/**
 * The one force `d3-force` has no name for: every file in a cell pulled toward
 * the mean of that cell's positions. The centroid is recomputed each tick, so
 * the clump finds its own place rather than being told one.
 */
function forceCohesion(): Force<Node, Link> {
  let nodes: Node[] = [];
  const force = (alpha: number): void => {
    const sums = new Map<string, { x: number; y: number; count: number }>();
    for (const node of nodes) {
      const seen = sums.get(node.cell) ?? { x: 0, y: 0, count: 0 };
      sums.set(node.cell, { x: seen.x + node.x, y: seen.y + node.y, count: seen.count + 1 });
    }
    const centroids = new Map<string, Point>(
      [...sums].map(([cell, sum]) => [cell, { x: sum.x / sum.count, y: sum.y / sum.count }]),
    );
    for (const node of nodes) {
      const centroid = centroids.get(node.cell);
      if (centroid === undefined) continue;
      node.vx = (node.vx ?? 0) + (centroid.x - node.x) * COHESION_STRENGTH * alpha;
      node.vy = (node.vy ?? 0) + (centroid.y - node.y) * COHESION_STRENGTH * COHESION_VERTICAL * alpha;
    }
  };
  force.initialize = (given: Node[]): void => {
    nodes = given;
  };
  return force;
}

/**
 * The terrace is a contract rather than a preference: `y` means depth and
 * nothing else (D13), so a file that collision shoved off its band would be a
 * file whose position lies. `forceY` pulls toward the rest height and fades
 * with alpha, while collision does not fade at all, which on a busy terrace
 * ends with the crowd pushed over the edges and a last-moment clamp stacking
 * them back on top of each other. So this runs last, once collision has had
 * its say, and trims what the tick was about to do to what the strip can
 * hold; the push collision wanted survives in `x`, which is where the field
 * has room for it anyway.
 */
function forceTerrace(): Force<Node, Link> {
  let nodes: Node[] = [];
  const force = (): void => {
    for (const node of nodes) {
      if (node.fy !== undefined) continue;
      const held = ontoStrip(node.y + (node.vy ?? 0) * VELOCITY_KEPT, node);
      node.vy = (held - node.y) / VELOCITY_KEPT;
    }
  };
  force.initialize = (given: Node[]): void => {
    nodes = given;
  };
  return force;
}

/** Two linked files rest a gap apart, whatever their sizes; the gap is the same everywhere. */
function linkDistance(link: Link): number {
  const radius = (end: string | Node): number => (typeof end === 'string' ? RADIUS_MIN : end.r);
  return radius(link.source) + radius(link.target) + LINK_GAP;
}

/**
 * Settle the given files. The simulation is stopped the moment it exists, so
 * the only thing that ever advances it is the `tick(300)` below (D34): the
 * timer `d3-force` starts by default would make the result depend on how busy
 * the machine was, which is the opposite of a map.
 */
export function simulate(input: SimulationInput): readonly Placement[] {
  const nodes = toNodes(input);
  if (nodes.length === 0) return [];
  const links = toLinks(input.edges, new Set(nodes.map((node) => node.id)));

  const simulation = forceSimulation<Node, Link>([...nodes]);
  simulation.stop();
  simulation.randomSource(input.random);
  simulation.velocityDecay(1 - VELOCITY_KEPT);
  simulation.force('band', forceY<Node>((node) => node.rest).strength(BAND_STRENGTH));
  simulation.force(
    'link',
    forceLink<Node, Link>(links)
      .id((node) => node.id)
      .distance((link) => linkDistance(link))
      .strength(LINK_STRENGTH),
  );
  simulation.force('cohesion', forceCohesion());
  // Collision is the last of the four that move a file, so it has the final
  // say on two of them sharing a spot; the terrace then holds them all on
  // their own band whatever the four between them worked out.
  simulation.force(
    'collide',
    forceCollide<Node>((node) => node.r + COLLIDE_PAD)
      .strength(COLLIDE_STRENGTH)
      .iterations(COLLIDE_ITERATIONS),
  );
  simulation.force('terrace', forceTerrace());
  simulation.tick(TICKS);

  return nodes.map((node) => ({
    id: node.id,
    x: node.x,
    y: node.fy === undefined ? ontoStrip(node.y, node) : node.y,
    r: node.r,
  }));
}

