/**
 * labels: the words the world writes beside a mark (step 33): a change storm's
 * slot in the IFR hue and a renamed file's old path in the change hue (D40),
 * each a flat DOM tag kept over its point on the skin by projecting the
 * point through the camera each frame, in the chrome's material (D12): one
 * monospace face, nothing that glows. They show from LOD1, fading with the
 * surface. Step 34's notice labels and leaders build on the same layer. The
 * projection is done here rather than by three's CSS2D renderer, which
 * imports the core build beside the WebGPU one and the smoke test counts
 * that warning as a fault.
 */

import { Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { FONT_FAMILY, RENAME_LABEL_SIZE, STORM_LABEL_SIZE } from 'scene';

import type { Palette } from './palette.js';
import type { Label } from '../marks.js';

export type Labels = {
  /** The layer over the canvas the tags live in. */
  readonly element: HTMLElement;
  /** Place every tag over its point for this camera and canvas, with the surface's layer as the layer's opacity. */
  readonly render: (camera: Camera, width: number, height: number, surface: number) => void;
};

/** The labels of a map over the canvas, each at its point's height as the caller reads it off the skin. */
export const createLabels = (labels: readonly Label[], heightAt: (x: number, y: number) => number, palette: Palette): Labels => {
  const element = document.createElement('div');
  element.dataset['labels'] = '';
  Object.assign(element.style, { position: 'fixed', inset: '0', pointerEvents: 'none', overflow: 'hidden' });
  const tags = labels.map((label) => {
    const tag = document.createElement('span');
    tag.dataset['label'] = label.kind;
    tag.textContent = label.text;
    Object.assign(tag.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      fontFamily: FONT_FAMILY,
      fontSize: `${String(label.kind === 'storm' ? STORM_LABEL_SIZE : RENAME_LABEL_SIZE)}px`,
      fontVariant: label.kind === 'storm' ? 'small-caps' : 'normal',
      whiteSpace: 'nowrap',
    });
    element.append(tag);
    return { tag, label, point: new Vector3(label.x, heightAt(label.x, label.y), label.y) };
  });
  const projected = new Vector3();
  return {
    element,
    render: (camera, width, height, surface) => {
      element.style.opacity = String(surface);
      for (const { tag, label, point } of tags) {
        projected.copy(point).project(camera);
        const onScreen = projected.z >= -1 && projected.z <= 1;
        tag.style.display = onScreen ? 'block' : 'none';
        // The tag hangs from its left edge, level with the point, as the SVG writes it to the right of its mark.
        tag.style.transform = `translate(${String(((projected.x + 1) / 2) * width)}px, calc(${String(((1 - projected.y) / 2) * height)}px - 50%))`;
        tag.style.color = `#${palette.colour(label.hue).getHexString()}`;
      }
    },
  };
};
