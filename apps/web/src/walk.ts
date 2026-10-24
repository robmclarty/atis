/**
 * walk: the map's stops and the ways between them (§6, step 39). A stop is
 * the field, a cell, or a file, and the HUD's breadcrumb reads its way down
 * from the field: `field › libs/core › src/pm › index.ts`, each cell named by
 * its path below the cell that holds it. From the keyboard, an arrow walks to
 * the sibling lying that way, the nearest along it and the least off it;
 * Enter descends into whatever lies under the view's centre, or else the
 * child nearest it; and Escape ascends to the cell or the field that holds the
 * stop. A notice's row names the stop its target is drawn at (D148), or its
 * group's block in the rail when the shore holds it (D153). When the reviewer
 * moves the camera by hand, the stop is read back off the view: the field
 * from the far field, and from the surface on, the cell under the view's
 * centre, or the file there at the file's level.
 *
 * Pure but for `ownsKey`, which reads the focused element, so a test walks a
 * fixture's own cells.
 */

import { createPicker, instances, noticeAnchors } from 'scene';
import type { Lod, Pick, Point } from 'scene';
import type { MapJson } from 'core';

import type { Box } from './fit.js';

export type Stop =
  | { readonly kind: 'field' }
  | { readonly kind: 'cell'; readonly cell: string }
  | { readonly kind: 'organelle'; readonly path: string; readonly cell: string };

export const FIELD: Stop = { kind: 'field' };

export type Direction = 'left' | 'right' | 'up' | 'down';

/** Where a notice's row takes the reviewer: a stop on the field, or its group's block in the rail. */
export type Destination = { readonly kind: 'stop'; readonly stop: Stop } | { readonly kind: 'group'; readonly group: string };

export type Walk = {
  /** The breadcrumb to a stop, the field first. */
  readonly crumbs: (stop: Stop) => readonly string[];
  /** What a stop frames: the layout for the field, a cell's skin, and a file with `context` times its radius round it. */
  readonly box: (stop: Stop, context: number) => Box | undefined;
  readonly ascend: (stop: Stop) => Stop | undefined;
  /** Into the child of a stop under a layout point, else the child nearest it. */
  readonly descend: (stop: Stop, toward: Point) => Stop | undefined;
  readonly sibling: (stop: Stop, direction: Direction) => Stop | undefined;
  /** The stop a view shows: what lies under its centre at its level of detail. */
  readonly stopAt: (centre: Point, lod: Lod) => Stop;
  /** Where a key takes the walk from a stop, the view centred on `centre`; none for a key the walk does not take or a way that leads nowhere. */
  readonly key: (stop: Stop, key: string, centre: Point) => Stop | undefined;
};

const STEPS: Readonly<Record<string, Direction>> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

/** Each direction on the layout, y down as the screen's is when the view looks north. */
const HEADINGS: Readonly<Record<Direction, Point>> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

/** How much a sibling off the arrow's line counts against it beside how far along the line it lies. */
const OFF_LINE = 2;

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const centreOf = (box: Box): Point => [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2];

const same = (a: Stop, b: Stop): boolean => (a.kind === 'field' ? b.kind === 'field' : a.kind === 'cell' ? b.kind === 'cell' && b.cell === a.cell : b.kind === 'organelle' && b.path === a.path);

const cellStop = (cell: string): Stop => ({ kind: 'cell', cell });

/** A stop's own name: the cell or the file it stands on. */
const idOf = (stop: Stop): string => (stop.kind === 'field' ? '' : stop.kind === 'cell' ? stop.cell : stop.path);

export const createWalk = (map: MapJson): Walk => {
  const layout = map.terrain.layout;
  const contours = layout?.contours ?? {};
  const cells = new Map(map.terrain.cells.map((cell) => [cell.id, cell] as const));
  const files = new Map(instances(map).map((file) => [file.id, file] as const));
  const added = new Set(map.weather.changed.filter((file) => file.kind === 'added').map((file) => file.path));
  const picker = createPicker(map);

  const parentOf = (cell: string): string | undefined => {
    const parent = cells.get(cell)?.parent;
    return parent !== undefined && cells.has(parent) ? parent : undefined;
  };

  /** A cell's box: its skin's, else its placed files', else none, and then it is no stop. */
  const cellBox = (cell: string): Box | undefined => {
    const xs: number[] = [];
    const ys: number[] = [];
    const contour = contours[cell] ?? [];
    for (const [x, y] of contour) {
      xs.push(x);
      ys.push(y);
    }
    if (contour.length === 0) {
      for (const file of files.values()) {
        if (file.cell !== cell) continue;
        xs.push(file.x - file.r, file.x + file.r);
        ys.push(file.y - file.r, file.y + file.r);
      }
    }
    return xs.length === 0 ? undefined : { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  };

  const box = (stop: Stop, context: number): Box | undefined => {
    if (stop.kind === 'field') return layout === undefined ? undefined : { x0: 0, y0: 0, x1: layout.width, y1: layout.height };
    if (stop.kind === 'cell') return cellBox(stop.cell);
    const file = files.get(stop.path);
    if (file === undefined) return undefined;
    const reach = file.r * context;
    return { x0: file.x - reach, y0: file.y - reach, x1: file.x + reach, y1: file.y + reach };
  };

  /** Where a stop stands on the layout, for the arrows' bearings. */
  const centre = (stop: Stop): Point | undefined => {
    const framed = box(stop, 1);
    return framed === undefined ? undefined : centreOf(framed);
  };

  const fileStop = (path: string): Stop | undefined => {
    const file = files.get(path);
    return file === undefined ? undefined : { kind: 'organelle', path, cell: file.cell };
  };

  /** The stops one step below a stop: the field's top cells; a cell's own cells and its own files, each by path. */
  const children = (stop: Stop): readonly Stop[] => {
    if (stop.kind === 'organelle') return [];
    const owner = stop.kind === 'cell' ? stop.cell : undefined;
    const held = [...cells.keys()].filter((cell) => parentOf(cell) === owner && cellBox(cell) !== undefined).toSorted(byPath).map(cellStop);
    const own = owner === undefined ? [] : [...files.values()].filter((file) => file.cell === owner).map((file): Stop => ({ kind: 'organelle', path: file.id, cell: owner }));
    return [...held, ...own];
  };

  const ascend = (stop: Stop): Stop | undefined => {
    if (stop.kind === 'field') return undefined;
    if (stop.kind === 'organelle') return cellStop(stop.cell);
    const parent = parentOf(stop.cell);
    return parent === undefined ? FIELD : cellStop(parent);
  };

  /** The way up from a pick to the field: the file if it is one, then each cell that holds it. */
  const lineage = (pick: Pick): readonly Stop[] => {
    const line: Stop[] = [];
    let cell: string | undefined = pick.cell;
    if (pick.kind === 'organelle') line.push({ kind: 'organelle', path: pick.path, cell: pick.cell });
    while (cell !== undefined) {
      line.push(cellStop(cell));
      cell = parentOf(cell);
    }
    return line;
  };

  const nearest = (stops: readonly Stop[], [x, y]: Point): Stop | undefined =>
    stops
      .map((stop) => {
        const [cx, cy] = centre(stop) ?? [Number.POSITIVE_INFINITY, 0];
        return { stop, distance: Math.hypot(cx - x, cy - y) };
      })
      .toSorted((a, b) => a.distance - b.distance || byPath(idOf(a.stop), idOf(b.stop)))[0]?.stop;

  const descend = (stop: Stop, toward: Point): Stop | undefined => {
    const below = children(stop);
    if (below.length === 0) return undefined;
    const pick = picker.pick(toward, 1, 0);
    const line = pick === undefined ? [] : lineage(pick);
    // The child of this stop on the way up from what lies under the point, if the way passes through it.
    const under = line.find((each) => {
      const up = ascend(each);
      return up !== undefined && same(up, stop);
    });
    return under !== undefined && below.some((each) => same(each, under)) ? under : nearest(below, toward);
  };

  const sibling = (stop: Stop, direction: Direction): Stop | undefined => {
    const parent = ascend(stop);
    const here = centre(stop);
    if (parent === undefined || here === undefined) return undefined;
    const [ux, uy] = HEADINGS[direction];
    return children(parent)
      .filter((each) => each.kind === stop.kind && !same(each, stop))
      .flatMap((each) => {
        const [cx, cy] = centre(each) ?? here;
        const along = (cx - here[0]) * ux + (cy - here[1]) * uy;
        const off = Math.abs((cx - here[0]) * uy - (cy - here[1]) * ux);
        return along > 0 ? [{ stop: each, score: along + OFF_LINE * off }] : [];
      })
      .toSorted((a, b) => a.score - b.score || byPath(idOf(a.stop), idOf(b.stop)))[0]?.stop;
  };

  const stopAt = (point: Point, lod: Lod): Stop => {
    if (lod === 0) return FIELD;
    const pick = picker.pick(point, lod, 0);
    if (pick === undefined) return FIELD;
    if (pick.kind === 'membrane') return cellStop(pick.cell);
    return lod >= 3 ? (fileStop(pick.path) ?? cellStop(pick.cell)) : cellStop(pick.cell);
  };

  /** A cell's name in the breadcrumb: its path below the cell that holds it, or its whole path at the top. */
  const nameOf = (cell: string): string => {
    const path = cells.get(cell)?.path ?? cell;
    const parent = cells.get(parentOf(cell) ?? '')?.path;
    return parent !== undefined && path.startsWith(`${parent}/`) ? path.slice(parent.length + 1) : path;
  };

  const crumbs = (stop: Stop): readonly string[] => {
    if (stop.kind === 'field') return ['field'];
    const chain: string[] = [];
    let cell: string | undefined = stop.cell;
    while (cell !== undefined) {
      chain.unshift(nameOf(cell));
      cell = parentOf(cell);
    }
    if (stop.kind === 'cell') return ['field', ...chain];
    const name = stop.path.slice(stop.path.lastIndexOf('/') + 1);
    return ['field', ...chain, added.has(stop.path) ? `+${name}` : name];
  };

  const key = (stop: Stop, pressed: string, at: Point): Stop | undefined => {
    const step = STEPS[pressed];
    if (step !== undefined) return sibling(stop, step);
    if (pressed === 'Enter') return descend(stop, at);
    if (pressed === 'Escape') return ascend(stop);
    return undefined;
  };

  return { crumbs, box, ascend, descend, sibling, stopAt, key };
};

/** Where a notice's row takes the reviewer, by where its target is drawn (D148): its file, the file a test's stitch sits on, its cell, or its group's block; none for an unplaced notice. */
export const destinationOf = (map: MapJson, rank: number): Destination | undefined => {
  const anchor = noticeAnchors(map).find((each) => each.rank === rank)?.anchor;
  if (anchor === undefined) return undefined;
  if (anchor.kind === 'group') return { kind: 'group', group: anchor.group };
  if (anchor.kind === 'cell') return { kind: 'stop', stop: { kind: 'cell', cell: anchor.cell } };
  const path = anchor.kind === 'organelle' ? anchor.path : anchor.on;
  const organelle = map.terrain.organelles.find((each) => each.id === path);
  return organelle === undefined ? undefined : { kind: 'stop', stop: { kind: 'organelle', path, cell: organelle.cell } };
};

/** Whether a key belongs to the focused element rather than the walk: anything typed into a field, and Enter on a button or a link. */
export const ownsKey = (target: EventTarget | null, key: string): boolean => {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return key === 'Enter' && (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement);
};
