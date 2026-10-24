/**
 * wiring: a changed cell's wiring (§6's LOD2 overlay, step 41), the
 * change-only subgraph a reviewer toggles on in an opened cell: every import
 * edge of the map's `weather.wiring` with an end in this cell, its importers
 * and its importees. Each file sits in a frame for its home, the opened cell
 * first, then each other cell by its path, or the shore group a test or a
 * config file belongs to (D48), and `elkjs` lays the frames and the files
 * out as a layered drawing (D34): importers on the left and importees on the
 * right, the lines between them orthogonal, the way a technical drawing runs
 * (D12). Laid across rather than down, so a cell read by many files stacks
 * their names in a column instead of stretching one row past the screen. A
 * file is named within its home's path, `+` before an added one (D120).
 *
 * Pure (C1): elkjs is plain JavaScript run in-thread, loaded the first time a
 * plate is laid so the world's first frame never waits on it, and seeded, so
 * one wiring gives one plate (C3). Everything is in the chrome's pixels.
 */

import type { ChangeKind, MapJson, WiringEdge } from 'core';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled.js';

import type { Point } from './minimap.js';
import { MONO_ADVANCE } from './tokens.js';

/**
 * How a plate is spaced, in pixels: the names' size and the pad round them,
 * the gap between two files in a column, the gap between two columns, and
 * the pad inside a frame and round the plate. One object, handed in, so the
 * dev panel can move it live (D156); `WIRING_SPACING` is where it rests.
 */
export type WiringSpacing = {
  readonly fontSize: number;
  readonly pad: number;
  readonly nodeGap: number;
  readonly layerGap: number;
  readonly framePad: number;
};

export const WIRING_SPACING: WiringSpacing = { fontSize: 11, pad: 3, nodeGap: 10, layerGap: 36, framePad: 8 };

/** A file at an end of a wire: its path, its name within its home, and what the change did to it. */
export type WiringFile = { readonly id: string; readonly text: string; readonly change?: ChangeKind };

/** Where a wired file lives: the opened cell (`inside`), another cell, or a shore group, with the files of it the wires reach. */
export type WiringHome = { readonly id: string; readonly text: string; readonly inside: boolean; readonly files: readonly WiringFile[] };

/** An opened cell's wiring: its homes, the opened cell's first, and the wires with an end in it. */
export type Wiring = { readonly cell: string; readonly homes: readonly WiringHome[]; readonly edges: readonly WiringEdge[] };

/** A box on the plate, its top-left corner and its size. */
export type PlateBox = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

export type PlateHome = PlateBox & { readonly id: string; readonly text: string; readonly inside: boolean };

export type PlateFile = PlateBox & { readonly id: string; readonly text: string; readonly home: string; readonly change?: ChangeKind };

/** A wire as drawn: from its importer's edge, round its bends, to its importee's edge. */
export type PlateLine = { readonly from: string; readonly to: string; readonly points: readonly Point[] };

/** A cell's wiring laid out: the plate's size, the frames, the files in them, and the wires. */
export type Plate = {
  readonly cell: string;
  readonly width: number;
  readonly height: number;
  readonly homes: readonly PlateHome[];
  readonly files: readonly PlateFile[];
  readonly lines: readonly PlateLine[];
};

/** What an added file's name is written with (D120). */
const ADDED = '+';
const ROOT = 'plate';
const HOME = 'home:';
const FILE = 'file:';
const WIRE = 'wire:';

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A file's name within its home: the path past the home's own, or the last part of it where the home is a group or the file is the home. */
function nameIn(path: string, home: string | undefined): string {
  if (home !== undefined && path.startsWith(`${home}/`)) return path.slice(home.length + 1);
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * The wiring an opened cell shows: every wire of the map with an end among
 * the cell's own files, and every file at either end in its home. None for a
 * map that records no wiring (C2), a cell the map lacks, or a cell no wire
 * reaches, so the toggle shows only where there is something to draw.
 */
export function cellWiring(map: MapJson, cell: string): Wiring | undefined {
  const opened = map.terrain.cells.find((each) => each.id === cell);
  const wiring = map.weather.wiring;
  if (opened === undefined || wiring === undefined) return undefined;
  const cellOf = new Map(map.terrain.organelles.map((organelle) => [organelle.id, organelle.cell] as const));
  const edges = wiring.filter((edge) => cellOf.get(edge.from) === cell || cellOf.get(edge.to) === cell);
  if (edges.length === 0) return undefined;

  const cells = new Map(map.terrain.cells.map((each) => [each.id, each] as const));
  const groupOf = new Map(map.terrain.groups.flatMap((group) => group.files.map((path) => [path, group.id] as const)));
  const changes = new Map(map.weather.changed.map((file) => [file.path, file.kind] as const));
  const homes = new Map<string, { readonly text: string; readonly path?: string; readonly files: Set<string> }>();
  for (const path of new Set(edges.flatMap((edge) => [edge.from, edge.to]))) {
    const home = cellOf.get(path) ?? groupOf.get(path);
    if (home === undefined) continue;
    const at = cells.get(home);
    const held = homes.get(home) ?? { text: at?.path ?? home, ...(at === undefined ? {} : { path: at.path }), files: new Set<string>() };
    held.files.add(path);
    homes.set(home, held);
  }
  const wired = new Set([...homes.values()].flatMap((home) => [...home.files]));
  return {
    cell,
    homes: [...homes]
      .map(([id, home]): WiringHome => ({
        id,
        text: home.text,
        inside: id === cell,
        files: [...home.files].toSorted(byPath).map((path): WiringFile => {
          const change = changes.get(path);
          return { id: path, text: `${change === 'added' ? ADDED : ''}${nameIn(path, home.path)}`, ...(change === undefined ? {} : { change }) };
        }),
      }))
      .toSorted((a, b) => Number(b.inside) - Number(a.inside) || byPath(a.id, b.id)),
    edges: edges.filter((edge) => wired.has(edge.from) && wired.has(edge.to)),
  };
}

/** A text's box at the plate's size: its monospace advance, padded. */
function boxOf(text: string, spacing: WiringSpacing): { readonly width: number; readonly height: number } {
  return { width: text.length * spacing.fontSize * MONO_ADVANCE + 2 * spacing.pad, height: spacing.fontSize + 2 * spacing.pad };
}

/** The graph elkjs lays: one node per home holding one per file, its top padded for the home's name and at least as wide, and the wires between the files. */
function graphOf(wiring: Wiring, spacing: WiringSpacing): ElkNode {
  const row = spacing.fontSize + 2 * spacing.pad;
  const pad = spacing.framePad;
  return {
    id: ROOT,
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.randomSeed': '1',
      'elk.spacing.nodeNode': String(spacing.nodeGap),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing.layerGap),
      'elk.padding': `[top=${String(pad)},left=${String(pad)},bottom=${String(pad)},right=${String(pad)}]`,
    },
    children: wiring.homes.map(
      (home): ElkNode => ({
        id: `${HOME}${home.id}`,
        layoutOptions: {
          'elk.padding': `[top=${String(row + pad)},left=${String(pad)},bottom=${String(pad)},right=${String(pad)}]`,
          'elk.nodeSize.constraints': 'MINIMUM_SIZE',
          'elk.nodeSize.minimum': `(${String(boxOf(home.text, spacing).width + 2 * pad)}, ${String(row + 2 * pad)})`,
        },
        children: home.files.map((file): ElkNode => ({ id: `${FILE}${file.id}`, ...boxOf(file.text, spacing) })),
      }),
    ),
    edges: wiring.edges.map((edge, index): ElkExtendedEdge => ({ id: `${WIRE}${String(index)}`, sources: [`${FILE}${edge.from}`], targets: [`${FILE}${edge.to}`] })),
  };
}

/** A laid shape's box, at an origin. */
function placed(shape: ElkNode, [ox, oy]: Point): PlateBox {
  return { x: ox + (shape.x ?? 0), y: oy + (shape.y ?? 0), width: shape.width ?? 0, height: shape.height ?? 0 };
}

/**
 * A cell's wiring laid out as a plate. elkjs places each file inside its
 * home's frame and routes each wire in the frame holding both its ends, or
 * across the plate, so every point is moved back onto the plate by the frame
 * it was laid in.
 */
export async function layWiring(wiring: Wiring, spacing: WiringSpacing = WIRING_SPACING): Promise<Plate> {
  // elkjs ships CommonJS typed as an ES module, so under NodeNext its
  // constructor sits one `default` down; the bundle sets it there on
  // `module.exports` too, so the one path holds in Node, Vite and the build.
  const elk = await import('elkjs/lib/elk.bundled.js');
  const laid = await new elk.default.default().layout(graphOf(wiring, spacing));
  const homesById = new Map<string, WiringHome>(wiring.homes.map((home) => [`${HOME}${home.id}`, home]));
  const filesById = new Map<string, { readonly file: WiringFile; readonly home: string }>(wiring.homes.flatMap((home) => home.files.map((file) => [`${FILE}${file.id}`, { file, home: home.id }])));
  const origins = new Map<string, Point>([[ROOT, [0, 0]]]);
  const homes: PlateHome[] = [];
  const files: PlateFile[] = [];
  for (const node of laid.children ?? []) {
    const home = homesById.get(node.id);
    if (home === undefined) continue;
    const box = placed(node, [0, 0]);
    origins.set(node.id, [box.x, box.y]);
    homes.push({ ...box, id: home.id, text: home.text, inside: home.inside });
    for (const child of node.children ?? []) {
      const found = filesById.get(child.id);
      if (found === undefined) continue;
      files.push({ ...placed(child, [box.x, box.y]), id: found.file.id, text: found.file.text, home: found.home, ...(found.file.change === undefined ? {} : { change: found.file.change }) });
    }
  }
  const lines = (laid.edges ?? []).flatMap((edge): PlateLine[] => {
    const wire = wiring.edges[Number(edge.id.slice(WIRE.length))];
    if (wire === undefined) return [];
    const [ox, oy] = origins.get(edge.container ?? ROOT) ?? [0, 0];
    const points = (edge.sections ?? []).flatMap((section) => [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map(({ x, y }): Point => [ox + x, oy + y]));
    return [{ from: wire.from, to: wire.to, points }];
  });
  return { cell: wiring.cell, width: laid.width ?? 0, height: laid.height ?? 0, homes, files, lines };
}
