/**
 * hover: the world's answer to the pointer (step 38). The thing under it is
 * outlined, a file in its own morphed shape and a cell along its membrane,
 * drawn flat over the canvas at its resting height on the skin, in an
 * annotation's ink that never blooms (D12); and its path is written in a tag
 * beside the pointer, in the chrome's material. Both show at the scheduler's
 * eased hover, so the highlight eases in over `HOVER_MS` and out again, and
 * neither moves of its own (§5.5, C12). Passing from one thing straight to
 * the next moves the highlight with the pointer, already shown, so a sweep
 * across the files reads as one highlight travelling, not a flicker.
 *
 * The selection is ringed in the same layer, under the hover's outline (D207
 * (click-selects)): a second outline round the selected file or module, in
 * `HOVER.selectInk` at `HOVER.selectWidth`, the hover's ink drawn heavier. It
 * is steady: it eases neither in nor out, and stays for as long as the
 * selection does, wherever the pointer is.
 *
 * What a row of the chrome points at is outlined in the layer too (D209
 * (selection-line)): the pointer is over the thing's row in the tree or the
 * inspector and not over the thing, so it is drawn as the thing under the
 * pointer is, in `HOVER.ink` at `HOVER.width`, between the selection's ring
 * and the hover's outline, with no tag, since the row beside the pointer
 * already says its path. It shows at once and goes at once: the row's own
 * light is what eases (D234 (pointed-ring)).
 */

import { Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import type { Point } from 'scene';
import { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_STROKE_WIDTH, FONT_FAMILY, LABELING } from 'scene';

import type { Hovered } from '../hover.js';
import type { HoverLook } from '../materials.js';

/** The chrome tokens the tag is written with, at rest: the shape its live view takes (D156). */
export const TAG_LOOK = { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_STROKE_WIDTH, FONT_FAMILY };
export type TagLook = typeof TAG_LOOK;

export type Hover = {
  /** The outline's layer, under the labels, and the tag, over them. */
  readonly outline: Element;
  readonly tag: HTMLElement;
  /** What is under the pointer now, if anything, and where the pointer is on the page. The last thing shown stays drawn while the highlight eases out. */
  readonly show: (hovered: Hovered | undefined, pointer: { readonly x: number; readonly y: number } | undefined) => void;
  /** The selection's outline, in layout units, or none once nothing is selected (D207 (click-selects)). The same ring handed in again costs nothing, so the caller hands it in every frame, and a new one where its thing floats. */
  readonly select: (ring: readonly Point[] | undefined) => void;
  /** The outline of what a row of the chrome points at, in layout units, or none once it points at nothing (D209 (selection-line)). Handed in every frame as the selection's is. */
  readonly point: (ring: readonly Point[] | undefined) => void;
  /** Draw the selection's ring, steady, over it the outline of what the chrome points at, and over both the outline of the thing under the pointer for this camera and canvas, with the tag beside the pointer, at the eased hover. */
  readonly render: (camera: Camera, width: number, height: number, eased: number) => void;
};

const SVG = 'http://www.w3.org/2000/svg';

/** Write an outline's attribute only where it moved: a steady ring is traced every frame, and at rest it traces the path the page already holds, which is then left alone. */
const set = (drawn: SVGPathElement, name: string, value: string): void => {
  if (drawn.getAttribute(name) !== value) drawn.setAttribute(name, value);
};

/** The hover's layers over the canvas, outlines lifted to the skin's resting height as the caller reads it. */
export const createHover = (heightAt: (x: number, y: number) => number, look: HoverLook, tagLook: TagLook): Hover => {
  const outline = document.createElementNS(SVG, 'svg');
  outline.dataset['hover'] = '';
  Object.assign(outline.style, { position: 'fixed', inset: '0', pointerEvents: 'none', display: 'none' });
  const stroke = (name: string): SVGPathElement => {
    const drawn = document.createElementNS(SVG, 'path');
    drawn.dataset['ring'] = name;
    drawn.setAttribute('fill', 'none');
    drawn.setAttribute('stroke-linejoin', 'round');
    drawn.style.display = 'none';
    return drawn;
  };
  // The selection's ring lies under the pointer's outline, so a hover over the selected thing reads on it; what the chrome points at lies between the two.
  const ring = stroke('selected');
  const aimed = stroke('pointed');
  const path = stroke('hover');
  outline.append(ring, aimed, path);
  const tag = document.createElement('div');
  tag.dataset['hoverTag'] = '';
  Object.assign(tag.style, { position: 'fixed', left: '0', top: '0', pointerEvents: 'none', whiteSpace: 'nowrap', display: 'none' });

  let shown: Hovered | undefined;
  let lifted: readonly Vector3[] = [];
  let selected: readonly Point[] | undefined;
  let selectedLifted: readonly Vector3[] = [];
  let pointed: readonly Point[] | undefined;
  let pointedLifted: readonly Vector3[] = [];
  let pointer: { readonly x: number; readonly y: number } | undefined;
  let sized: readonly [number, number] = [0, 0];

  const show = (hovered: Hovered | undefined, at: { readonly x: number; readonly y: number } | undefined): void => {
    if (at !== undefined) pointer = at;
    if (hovered === undefined || hovered.key === shown?.key) return;
    shown = hovered;
    lifted = hovered.ring.map(([x, y]) => new Vector3(x, heightAt(x, y), y));
    tag.textContent = hovered.text;
  };

  /** A ring's points at the skin's resting height. */
  const lift = (points: readonly Point[] | undefined): readonly Vector3[] => (points === undefined ? [] : points.map(([x, y]) => new Vector3(x, heightAt(x, y), y)));

  const select = (next: readonly Point[] | undefined): void => {
    if (next === selected) return;
    selected = next;
    selectedLifted = lift(next);
  };

  const point = (next: readonly Point[] | undefined): void => {
    if (next === pointed) return;
    pointed = next;
    pointedLifted = lift(next);
  };

  const projected = new Vector3();
  /** A closed outline's path on the screen, through its points where the camera shows them. */
  const traced = (points: readonly Vector3[], camera: Camera, width: number, height: number): string =>
    `M${points
      .map((corner) => {
        projected.copy(corner).project(camera);
        return `${(((projected.x + 1) / 2) * width).toFixed(1)} ${(((1 - projected.y) / 2) * height).toFixed(1)}`;
      })
      .join('L')}Z`;

  const render = (camera: Camera, width: number, height: number, eased: number): void => {
    const visible = shown !== undefined && eased > 0;
    const ringed = selectedLifted.length > 0;
    const aiming = pointedLifted.length > 0;
    outline.style.display = visible || ringed || aiming ? '' : 'none';
    tag.style.display = visible && pointer !== undefined ? '' : 'none';
    ring.style.display = ringed ? '' : 'none';
    aimed.style.display = aiming ? '' : 'none';
    path.style.display = visible ? '' : 'none';
    if (!visible && !ringed && !aiming) return;
    if (sized[0] !== width || sized[1] !== height) {
      outline.setAttribute('width', String(width));
      outline.setAttribute('height', String(height));
      sized = [width, height];
    }
    if (ringed) {
      set(ring, 'd', traced(selectedLifted, camera, width, height));
      set(ring, 'stroke', look.selectInk);
      set(ring, 'stroke-width', String(look.selectWidth));
    }
    if (aiming) {
      set(aimed, 'd', traced(pointedLifted, camera, width, height));
      set(aimed, 'stroke', look.ink);
      set(aimed, 'stroke-width', String(look.width));
    }
    if (!visible) return;
    set(path, 'd', traced(lifted, camera, width, height));
    set(path, 'stroke', look.ink);
    set(path, 'stroke-width', String(look.width));
    path.style.opacity = String(eased);
    if (pointer === undefined) return;
    Object.assign(tag.style, {
      transform: `translate(${String(pointer.x + look.tagGap)}px, ${String(pointer.y + look.tagGap)}px)`,
      padding: `${String(LABELING.pad)}px`,
      font: `${String(LABELING.fontSize)}px/${String(LABELING.fontSize)}px ${tagLook.FONT_FAMILY}`,
      background: tagLook.CHROME_GROUND,
      color: tagLook.CHROME_INK,
      border: `${String(tagLook.CHROME_STROKE_WIDTH)}px solid ${tagLook.CHROME_MUTED}`,
      opacity: String(eased),
    });
  };

  return { outline, tag, show, select, point, render };
};
