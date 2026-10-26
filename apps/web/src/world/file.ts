/**
 * file: §6's file level drawn (LOD3, D102). Past LOD3's gate the file nearest
 * the view's centre opens onto a plate over the canvas, centred where the
 * file lies and filling a share of the free screen: its functions as the
 * scene lays them, granules down its lines in the organelles' dim tissue,
 * each dented once per threshold it breaks and named beside it where it has
 * the room, and beside them the strip of its lines, the change's hunks in the
 * change hue, the changed lines no test ran in the evidence light (D71, D80),
 * and each live mutant a notch of that light pinned to its line. The plate
 * shows at LOD3's layer, so it cross-fades in over the opened cell as the
 * level's plan eases it (step 28, C12), and its every token is read live
 * through the registry (D156). It is laid again only when the file or its
 * size on the screen changes, and moves with the file between.
 */

import { Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import {
  CHANGE_HUE,
  EVIDENCE_LIGHT,
  FILE_PLATE_SCREEN,
  FONT_FAMILY,
  MUTANT_NOTCH_WIDTH,
  ORGANELLE_FILL,
  ORGANELLE_STROKE,
  ORGANELLE_STROKE_WIDTH,
  TERRACE_FILL,
  TERRACE_LINE,
} from 'scene';
import type { FileLevel } from 'scene';

/** The tokens the plate is drawn with, at rest: the shape its live view takes (D156). */
export const FILE_LOOK = { CHANGE_HUE, EVIDENCE_LIGHT, FILE_PLATE_SCREEN, FONT_FAMILY, MUTANT_NOTCH_WIDTH, ORGANELLE_FILL, ORGANELLE_STROKE, ORGANELLE_STROKE_WIDTH, TERRACE_FILL, TERRACE_LINE };
export type FileLook = typeof FILE_LOOK;

export type FilePlate = {
  readonly element: SVGSVGElement;
  /** Draw `level` on its plate over the file at `at` on the skin, for this camera and canvas, `free` pixels of it left of the rail, at `shown`; nothing when either is absent or `shown` is 0. */
  readonly render: (camera: Camera, width: number, height: number, free: number, at: Vector3 | undefined, level: FileLevel | undefined, shown: number) => void;
};

const SVG = 'http://www.w3.org/2000/svg';
/** A function is named beside its granule only where its slot is at least this tall on the screen, in pixels. */
const NAMED_FROM = 11;
/** The size its name is written at, in pixels. */
const NAME_SIZE = 9;

const svg = (tag: string, attrs: Readonly<Record<string, string | number>>): SVGElement => {
  const node = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
};

/** The plate's markup for `level` at `side` pixels a side, from its top-left corner. */
const lay = (level: FileLevel, side: number, look: FileLook): readonly SVGElement[] => {
  const row = (line: number): number => ((line - 1) / level.lines) * side;
  const tall = (count: number): number => Math.max(1, (count / level.lines) * side);
  const x0 = level.strip.x0 * side;
  const stripWidth = (level.strip.x1 - level.strip.x0) * side;
  const ground = svg('rect', { x: 0, y: 0, width: side, height: side, fill: look.TERRACE_FILL, stroke: look.TERRACE_LINE, 'stroke-width': 1 });
  const granules = level.granules.flatMap((granule) => {
    const points = granule.ring.map(([x, y]) => `${(x * side).toFixed(1)} ${(y * side).toFixed(1)}`).join('L');
    const body = svg('path', { 'data-function': granule.name, 'data-rules': granule.rules.length, d: `M${points}Z`, fill: look.ORGANELLE_FILL, stroke: look.ORGANELLE_STROKE, 'stroke-width': look.ORGANELLE_STROKE_WIDTH });
    if (tall(granule.line_count) < NAMED_FROM) return [body];
    const name = svg('text', { x: (granule.x + granule.r) * side + 4, y: granule.y * side + NAME_SIZE / 3, 'font-size': NAME_SIZE, 'font-family': look.FONT_FAMILY, fill: look.ORGANELLE_STROKE });
    name.textContent = granule.name;
    return [body, name];
  });
  const strip = svg('rect', { 'data-strip': '', x: x0, y: 0, width: stripWidth, height: side, fill: look.TERRACE_LINE });
  const hunks = level.hunks.map((hunk) => svg('rect', { 'data-hunk': hunk.start, x: x0, y: row(hunk.start), width: stripWidth, height: tall(Math.max(hunk.count, 1)), fill: look.CHANGE_HUE }));
  const uncovered = level.uncovered.map((line) => svg('rect', { 'data-uncovered': line, x: x0, y: row(line), width: stripWidth, height: tall(1), fill: look.EVIDENCE_LIGHT }));
  const half = look.MUTANT_NOTCH_WIDTH;
  const mutants = level.mutants.map((mutant) => {
    const y = row(mutant.line) + tall(1) / 2;
    return svg('path', { 'data-mutant': mutant.line, d: `M${(x0 - half * 2).toFixed(1)} ${(y - half).toFixed(1)}L${x0.toFixed(1)} ${y.toFixed(1)}L${(x0 - half * 2).toFixed(1)} ${(y + half).toFixed(1)}Z`, fill: look.EVIDENCE_LIGHT });
  });
  return [ground, ...granules, strip, ...hunks, ...uncovered, ...mutants];
};

export const createFilePlate = (look: FileLook): FilePlate => {
  const element = document.createElementNS(SVG, 'svg');
  element.dataset['filePlate'] = '';
  Object.assign(element.style, { position: 'fixed', inset: '0', pointerEvents: 'none', display: 'none' });
  const plate = document.createElementNS(SVG, 'g');
  element.append(plate);
  let laid = '';
  let sized: readonly [number, number] = [0, 0];
  const projected = new Vector3();

  const render: FilePlate['render'] = (camera, width, height, free, at, level, shown) => {
    const visible = at !== undefined && level !== undefined && shown > 0;
    element.style.display = visible ? '' : 'none';
    if (!visible) return;
    if (sized[0] !== width || sized[1] !== height) {
      element.setAttribute('width', String(width));
      element.setAttribute('height', String(height));
      sized = [width, height];
    }
    const side = Math.round(look.FILE_PLATE_SCREEN * Math.min(free, height));
    const key = `${level.path}\n${String(side)}\n${JSON.stringify(look)}`;
    if (key !== laid) {
      plate.replaceChildren(...lay(level, side, look));
      plate.dataset['file'] = level.path;
      laid = key;
    }
    projected.copy(at).project(camera);
    const x = ((projected.x + 1) / 2) * width - side / 2;
    const y = ((1 - projected.y) / 2) * height - side / 2;
    plate.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    element.style.opacity = String(shown);
  };
  return { element, render };
};
