/**
 * labels: the words the world writes over the field, DOM text through
 * three's CSS2D renderer (D91, step 34) in the chrome's material (D12): one
 * monospace face on the chrome's ground, nothing that glows. Three kinds
 * share the layer. The tags of step 33: a change storm's slot in the IFR hue
 * and a renamed file's old path in the change hue (D40), each hung from its
 * point on the skin. The labels step 27 places: from LOD1 every notice's
 * label and the level's budget of file names, each at the spot the scene
 * found clear of every other over what the camera shows, a notice's joined
 * to its mark by a dotted leader in an SVG under the text (§5.6). And the
 * marks themselves: at each target a run of numbered boxes in rank order,
 * hung off its lower right past the tier ring as the still sheet hangs
 * them, with the primary's kind written under its run in the category hue
 * (§5.4). The layer shows from LOD1, fading with the surface, and is placed
 * again whenever the view, the level of detail or what it is asked for
 * changes. It writes no word unasked (D168): a tag or a label shows only for
 * a target the pointer is over, on the field or in the notice column, a
 * storm's slot for the cell it hangs over or a file in it; the numbered
 * boxes stay as they are. The addons import
 * three's core build by its bare name; the app's Vite config resolves that
 * name to the WebGPU build the world draws with, so one copy of three loads
 * and the console stays clean.
 */

import { Scene, Vector3 } from 'three/webgpu';
import type { Camera, OrthographicCamera } from 'three/webgpu';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  CATEGORY_LETTERS,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_STROKE_WIDTH,
  EMPHASIS_PAD,
  FONT_FAMILY,
  IFR_HUE,
  LABELING,
  LEADER_DASH,
  LEADER_INK,
  LEADER_WIDTH,
  LIFR_HUE,
  MVFR_HUE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  NOTICE_NUMERAL_SIZE,
  NOTICE_SMALL_SIZE,
  NOTICE_TEXT_SIZE,
  RENAME_LABEL_SIZE,
  SCREEN_TYPE_UP,
  SECONDARY_BOX_WIDTH,
  STORM_LABEL_SIZE,
  VFR_HUE,
  interiorOf,
  labelsFor,
  tagsOf,
} from 'scene';
import type { Lod, Point, Slide, Viewport } from 'scene';
import type { MapJson } from 'core';

import { asksFor } from '../asked.js';
import { RAIL_WIDTH } from '../fit.js';
import { boxStyle, categoryHue, runsOf } from '../notices.js';
import type { Run } from '../notices.js';
import { screenType } from '../screen.js';
import type { Label } from '../marks.js';
import type { Palette } from './palette.js';

/** The tokens the layer is drawn with, at rest: the shape its live view takes (D156). */
export const LABEL_LOOK = {
  CATEGORY_LETTERS,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_STROKE_WIDTH,
  EMPHASIS_PAD,
  FONT_FAMILY,
  IFR_HUE,
  LEADER_DASH,
  LEADER_INK,
  LEADER_WIDTH,
  LIFR_HUE,
  MVFR_HUE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  NOTICE_NUMERAL_SIZE,
  NOTICE_SMALL_SIZE,
  NOTICE_TEXT_SIZE,
  RENAME_LABEL_SIZE,
  SCREEN_TYPE_UP,
  SECONDARY_BOX_WIDTH,
  STORM_LABEL_SIZE,
  VFR_HUE,
};
export type LabelLook = typeof LABEL_LOOK;

export type Labels = {
  /** The layers over the canvas, in the order they stack: the leaders, then the text. */
  readonly elements: readonly Element[];
  /** Lay the labels out again for what the camera shows at this level of detail and the targets it is asked about (D168): their notices' labels and file names, clear of each other (step 27), but for the files an opened cell's slide tags in its own columns (step 40), and none on the slide or its tag columns, where its own tags stand alone (D166); and their storm slots and old paths. */
  readonly place: (viewport: Viewport, lod: Lod, slide: Slide | undefined, asked: ReadonlySet<string>) => void;
  /** Keep every label over its point for this camera and canvas, and draw the leaders, with the surface's layer as the layers' opacity. */
  readonly render: (camera: Camera, width: number, height: number, surface: number) => void;
  /** Take the layers off the page, once a range's frame they belong to has faded out (D100). */
  readonly dispose: () => void;
};

const SVG = 'http://www.w3.org/2000/svg';

/** The skin's resting height at a layout point, as the caller reads it off the relief. */
type Height = (x: number, y: number) => number;

/** A box's place in pixels relative to the projection of the point it hangs from, and its size. */
type Offset = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

/** A target's run of boxes as laid: the run, its point on the skin, the element the offset moves, and the offset from the point's projection. */
type Marks = { readonly run: Run; readonly inner: HTMLElement; offset: Offset };

/** A placed label: its object at its anchor, its box's offset, and, for a notice's, the leader to its box in the target's run. */
type Pinned = {
  readonly object: CSS2DObject;
  readonly point: Vector3;
  readonly offset: Offset;
  readonly leader?: { readonly line: SVGLineElement; readonly marks: Marks; readonly index: number };
};

/** Hang an element from a point on the skin, pivoting on `centre` as a share of its own size. */
const pin = (scene: Scene, element: HTMLElement, point: Vector3, centre: readonly [number, number]): CSS2DObject => {
  const object = new CSS2DObject(element);
  object.center.set(centre[0], centre[1]);
  object.position.copy(point);
  scene.add(object);
  return object;
};

/** A hanger of no size whose child is moved by a pixel offset: what a label and a run hang from. */
const hanger = (): { readonly outer: HTMLDivElement; readonly inner: HTMLDivElement } => {
  const outer = document.createElement('div');
  Object.assign(outer.style, { width: '0', height: '0' });
  const inner = document.createElement('div');
  inner.style.position = 'absolute';
  outer.append(inner);
  return { outer, inner };
};

/** Where a leader leaves a label's box: the point on its edge toward the mark, or none when the mark lies inside the box. */
const exitOf = (box: Offset, ax: number, ay: number, tx: number, ty: number): readonly [number, number] | undefined => {
  const cx = ax + box.x + box.width / 2;
  const cy = ay + box.y + box.height / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const t = Math.min(dx === 0 ? Number.POSITIVE_INFINITY : box.width / 2 / Math.abs(dx), dy === 0 ? Number.POSITIVE_INFINITY : box.height / 2 / Math.abs(dy));
  return t >= 1 ? undefined : [cx + dx * t, cy + dy * t];
};

/**
 * The rectangle of the ground an orthographic camera shows, in layout units,
 * and how many pixels one unit takes across it: the viewport step 27 places
 * labels over. The centre is where the camera's middle ray meets the ground,
 * so a panned or tilted camera reads right; the span is the frame's at its
 * zoom, overhead, so a tilt foreshortens the labels' spacing a little.
 */
export const viewportOf = (camera: OrthographicCamera, width: number): Viewport => {
  const near = new Vector3(0, 0, -1).unproject(camera);
  const direction = new Vector3(0, 0, 1).unproject(camera).sub(near);
  const t = direction.y === 0 ? 0 : -near.y / direction.y;
  const centre = near.add(direction.multiplyScalar(t));
  const spanX = (camera.right - camera.left) / camera.zoom;
  const spanY = (camera.top - camera.bottom) / camera.zoom;
  return { x: centre.x - spanX / 2, y: centre.z - spanY / 2, width: spanX, height: spanY, pixelsPerUnit: width / spanX };
};

/**
 * The ground an opened slide holds on the screen, which no surface label may
 * fall on (D166): its skin, and each column of its tags as the scene lays
 * them with the bodies at rest, run the whole height of the skin as well as
 * the column's, since the tags slide up and down with the bodies they name.
 * Worked in the viewport's pixels the labels are placed in, and handed back
 * as rings of layout units.
 */
const slideGround = (slide: Slide, viewport: Viewport): readonly (readonly Point[])[] => {
  const ppu = viewport.pixelsPerUnit;
  const project = (x: number, y: number): Point => [(x - viewport.x) * ppu, (y - viewport.y) * ppu];
  const back = (px: number, py: number): Point => [px / ppu + viewport.x, py / ppu + viewport.y];
  const tags = tagsOf(slide, interiorOf(slide), project, { width: viewport.width * ppu - RAIL_WIDTH, height: viewport.height * ppu, pixelsPerUnit: ppu });
  const skin = slide.ring.map(([, y]) => (y - viewport.y) * ppu);
  const columns = (['left', 'right'] as const).flatMap((side) => {
    const boxes = tags.filter((tag) => tag.side === side).map((tag) => tag.box);
    if (boxes.length === 0) return [];
    const x0 = Math.min(...boxes.map((box) => box.x));
    const x1 = Math.max(...boxes.map((box) => box.x + box.width));
    const y0 = Math.min(...skin, ...boxes.map((box) => box.y));
    const y1 = Math.max(...skin, ...boxes.map((box) => box.y + box.height));
    return [[back(x0, y0), back(x1, y0), back(x1, y1), back(x0, y1)]];
  });
  return [slide.ring, ...columns];
};

/** The labels of a map over the canvas, each at its point's resting height as the caller reads it off the skin. */
export const createLabels = (map: MapJson, tags: readonly Label[], heightAt: Height, palette: Palette, look: LabelLook): Labels => {
  const scene = new Scene();
  const text = document.createElement('div');
  text.dataset['labels'] = '';
  Object.assign(text.style, { position: 'fixed', inset: '0', pointerEvents: 'none' });
  const css = new CSS2DRenderer({ element: text });
  css.sortObjects = false;
  const leaders = document.createElementNS(SVG, 'svg');
  leaders.dataset['leaders'] = '';
  Object.assign(leaders.style, { position: 'fixed', inset: '0', pointerEvents: 'none' });
  const strokes = document.createElementNS(SVG, 'g');
  leaders.append(strokes);

  const tagged = tags.map((label) => {
    const tag = document.createElement('span');
    tag.dataset['label'] = label.kind;
    tag.textContent = label.text;
    tag.style.whiteSpace = 'nowrap';
    // The tag hangs from its left edge, level with the point, as the SVG writes it to the right of its mark.
    const object = pin(scene, tag, new Vector3(label.x, heightAt(label.x, label.y), label.y), [0, 0.5]);
    return { tag, label, object };
  });

  const hue = categoryHue(map.weather.checks.category, look);
  const runs: Marks[] = runsOf(map).map((run) => {
    const { outer, inner } = hanger();
    outer.dataset['run'] = run.target;
    // The boxes sit over any label that lands under them.
    outer.style.zIndex = '1';
    pin(scene, outer, new Vector3(run.spot.x, heightAt(run.spot.x, run.spot.y), run.spot.y), [0, 0]);
    return { run, inner, offset: { x: 0, y: 0, width: 0, height: 0 } };
  });

  let placed: Pinned[] = [];
  let sized: readonly [number, number] = [0, 0];

  /** Each run's boxes in rank order with the primary's kind under them, hung off the target's lower right past its ring, at this many pixels per unit. */
  const layRuns = (ppu: number): void => {
    const type = screenType(look);
    for (const marks of runs) {
      const { run } = marks;
      const reach = (run.spot.r + look.EMPHASIS_PAD + look.NOTICE_BOX_GAP) * Math.SQRT1_2 * ppu;
      marks.offset = { x: reach, y: reach, width: run.marked.length * type.box + (run.marked.length - 1) * look.NOTICE_BOX_GAP, height: type.box };
      Object.assign(marks.inner.style, { left: `${String(reach)}px`, top: `${String(reach)}px` });
      const boxes = document.createElement('div');
      Object.assign(boxes.style, { display: 'flex', gap: `${String(look.NOTICE_BOX_GAP)}px` });
      for (const { rank, tier } of run.marked) {
        const box = document.createElement('span');
        box.dataset['mark'] = String(rank);
        box.dataset['tier'] = tier;
        box.textContent = String(rank);
        Object.assign(box.style, boxStyle(tier, look, hue, type.box, type.numeral));
        boxes.append(box);
      }
      const children: HTMLElement[] = [boxes];
      if (run.primaryKind !== undefined) {
        const kind = document.createElement('div');
        kind.dataset['kind'] = run.primaryKind;
        kind.textContent = run.primaryKind;
        Object.assign(kind.style, { marginTop: `${String(look.NOTICE_BOX_GAP)}px`, font: `${String(type.small)}px ${look.FONT_FAMILY}`, fontVariant: 'small-caps', color: hue, whiteSpace: 'nowrap' });
        children.push(kind);
      }
      marks.inner.replaceChildren(...children);
    }
  };

  const place = (viewport: Viewport, lod: Lod, slide: Slide | undefined, asked: ReadonlySet<string>): void => {
    const ppu = viewport.pixelsPerUnit;
    layRuns(ppu);
    const asks = asksFor(map, asked);
    for (const { tag, label, object } of tagged) {
      // The renderer writes a hidden object's element out of the layout itself, every frame.
      object.visible = asks(label.target);
      Object.assign(tag.style, {
        fontFamily: look.FONT_FAMILY,
        fontSize: `${String(label.kind === 'storm' ? look.STORM_LABEL_SIZE : look.RENAME_LABEL_SIZE)}px`,
        fontVariant: label.kind === 'storm' ? 'small-caps' : 'normal',
      });
    }
    for (const old of placed) scene.remove(old.object);
    strokes.replaceChildren();
    strokes.setAttribute('stroke', look.LEADER_INK);
    strokes.setAttribute('stroke-width', String(look.LEADER_WIDTH));
    strokes.setAttribute('stroke-dasharray', look.LEADER_DASH);
    strokes.setAttribute('stroke-linecap', 'round');
    strokes.setAttribute('fill', 'none');
    const byTarget = new Map(runs.map((marks) => [marks.run.target, marks] as const));
    const onSlide = new Set(slide?.files.map((file) => file.id));
    placed = labelsFor(map, lod, viewport, LABELING, slide === undefined ? [] : slideGround(slide, viewport), asked)
      .filter((label) => label.rank !== undefined || !onSlide.has(label.target))
      .map((label): Pinned => {
      const { outer, inner } = hanger();
      const notice = label.rank !== undefined;
      outer.dataset['label'] = notice ? 'notice' : 'file';
      outer.dataset['target'] = label.target;
      inner.textContent = label.text;
      // Step 27 placed the box in the viewport's pixels; it hangs from its anchor by the same offset wherever the anchor projects.
      const px = (label.anchor.x - viewport.x) * ppu;
      const py = (label.anchor.y - viewport.y) * ppu;
      const offset = { x: label.box.x - px, y: label.box.y - py, width: label.box.width, height: label.box.height };
      Object.assign(inner.style, {
        left: `${String(offset.x)}px`,
        top: `${String(offset.y)}px`,
        width: `${String(offset.width)}px`,
        height: `${String(offset.height)}px`,
        boxSizing: 'border-box',
        padding: `${String(LABELING.pad)}px`,
        font: `${String(LABELING.fontSize)}px/${String(LABELING.fontSize)}px ${look.FONT_FAMILY}`,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        background: look.CHROME_GROUND,
        color: notice ? look.CHROME_INK : look.CHROME_MUTED,
      });
      const point = new Vector3(label.anchor.x, heightAt(label.anchor.x, label.anchor.y), label.anchor.y);
      const object = pin(scene, outer, point, [0, 0]);
      const marks = notice ? byTarget.get(label.target) : undefined;
      const index = marks === undefined ? -1 : marks.run.marked.findIndex((each) => each.rank === label.rank);
      if (marks === undefined || index < 0) return { object, point, offset };
      const line = document.createElementNS(SVG, 'line');
      line.dataset['notice'] = String(label.rank);
      strokes.append(line);
      return { object, point, offset, leader: { line, marks, index } };
    });
  };

  const projected = new Vector3();
  const render = (camera: Camera, width: number, height: number, surface: number): void => {
    if (sized[0] !== width || sized[1] !== height) {
      css.setSize(width, height);
      leaders.setAttribute('width', String(width));
      leaders.setAttribute('height', String(height));
      sized = [width, height];
    }
    text.style.opacity = String(surface);
    leaders.style.opacity = String(surface);
    css.render(scene, camera);
    for (const { tag, label } of tagged) tag.style.color = `#${palette.colour(label.hue).getHexString()}`;
    for (const { point, offset, leader } of placed) {
      if (leader === undefined) continue;
      projected.copy(point).project(camera);
      const onScreen = projected.z >= -1 && projected.z <= 1;
      const ax = ((projected.x + 1) / 2) * width;
      const ay = ((1 - projected.y) / 2) * height;
      const { marks, index, line } = leader;
      // The leader runs from the label's edge to the centre of its box, which is drawn over it.
      const tx = ax + marks.offset.x + index * (marks.offset.height + look.NOTICE_BOX_GAP) + marks.offset.height / 2;
      const ty = ay + marks.offset.y + marks.offset.height / 2;
      const from = onScreen ? exitOf(offset, ax, ay, tx, ty) : undefined;
      line.style.display = from === undefined ? 'none' : '';
      if (from === undefined) continue;
      line.setAttribute('x1', String(from[0]));
      line.setAttribute('y1', String(from[1]));
      line.setAttribute('x2', String(tx));
      line.setAttribute('y2', String(ty));
    }
  };

  const dispose = (): void => {
    leaders.remove();
    text.remove();
  };

  return { elements: [leaders, text], place, render, dispose };
};
