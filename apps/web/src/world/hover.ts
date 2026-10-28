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
 */

import { Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
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
  /** Draw the outline over its thing for this camera and canvas, and the tag beside the pointer, at the eased hover. */
  readonly render: (camera: Camera, width: number, height: number, eased: number) => void;
};

const SVG = 'http://www.w3.org/2000/svg';

/** The hover's layers over the canvas, outlines lifted to the skin's resting height as the caller reads it. */
export const createHover = (heightAt: (x: number, y: number) => number, look: HoverLook, tagLook: TagLook): Hover => {
  const outline = document.createElementNS(SVG, 'svg');
  outline.dataset['hover'] = '';
  Object.assign(outline.style, { position: 'fixed', inset: '0', pointerEvents: 'none', display: 'none' });
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linejoin', 'round');
  outline.append(path);
  const tag = document.createElement('div');
  tag.dataset['hoverTag'] = '';
  Object.assign(tag.style, { position: 'fixed', left: '0', top: '0', pointerEvents: 'none', whiteSpace: 'nowrap', display: 'none' });

  let shown: Hovered | undefined;
  let lifted: readonly Vector3[] = [];
  let pointer: { readonly x: number; readonly y: number } | undefined;
  let sized: readonly [number, number] = [0, 0];

  const show = (hovered: Hovered | undefined, at: { readonly x: number; readonly y: number } | undefined): void => {
    if (at !== undefined) pointer = at;
    if (hovered === undefined || hovered.key === shown?.key) return;
    shown = hovered;
    lifted = hovered.ring.map(([x, y]) => new Vector3(x, heightAt(x, y), y));
    tag.textContent = hovered.text;
  };

  const projected = new Vector3();
  const render = (camera: Camera, width: number, height: number, eased: number): void => {
    const visible = shown !== undefined && eased > 0;
    outline.style.display = visible ? '' : 'none';
    tag.style.display = visible && pointer !== undefined ? '' : 'none';
    if (!visible) return;
    if (sized[0] !== width || sized[1] !== height) {
      outline.setAttribute('width', String(width));
      outline.setAttribute('height', String(height));
      sized = [width, height];
    }
    const points = lifted.map((point) => {
      projected.copy(point).project(camera);
      return `${(((projected.x + 1) / 2) * width).toFixed(1)} ${(((1 - projected.y) / 2) * height).toFixed(1)}`;
    });
    path.setAttribute('d', `M${points.join('L')}Z`);
    path.setAttribute('stroke', look.ink);
    path.setAttribute('stroke-width', String(look.width));
    outline.style.opacity = String(eased);
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

  return { outline, tag, show, render };
};
