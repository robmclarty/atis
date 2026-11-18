/**
 * interior: an opened cell drawn as a stained slide (§5.6's inside, §6's
 * LOD2, step 40), from the scene's layout (`libs/scene/src/interior.ts`).
 * The slide is the cell's membrane cut into triangles, with the cells it
 * holds cut out, floating a little above the cell's highest relief so the
 * bodies on it never fight the skin: warm and clinical ground where the
 * surface is dark, unlit, and never blooming. Its membrane is drawn round it
 * as the frame, as thick as the cell's interface, with the barrel's exports
 * written on it as a tag: the count, then the names a few to a line (D162),
 * those the reach crossed the membrane by lit in the chrome's ink among the
 * muted rest, since luminance is reach (C11, D181). Each file is a body laid again every frame where
 * the scene has it, in its morphed outline as the scheduler moves it (D146,
 * D147), drifting by its looseness (D157): filled in the body's colour, the
 * change hue where the change stained it with the share no test ran left
 * unstained (C11), a deleted file its outline alone and a renamed one dashed
 * (D40), the bulbs at its arms' tips at levels 5 and 6, and a noticed file's
 * stain following its notice's light. Inside each body its nucleus is drawn,
 * a fan per granule in the body's ink, darker: the stain's hue so darkened
 * where the body is stained, and left unstained where the body is, by the
 * granule's angle from the body's middle (D197). The granules ride the body
 * and never pulse or turn. Every material is double-sided, since
 * triangulating in layout coordinates flips the winding on the ground plane.
 *
 * The chrome over it is flat (D12): each file's tag in its column beside the
 * slide with its rule count, joined to its body by a dotted leader that runs
 * straight out to its elbow and then to the body's rim, the columns clear of
 * the chrome's claims on the screen, and a footer under a column that had no
 * row for every tag (D198). No body moves for the exploded view: it spreads
 * the tags alone. The tags and the exports are written only
 * when asked (D168): in the exploded view, as it spreads, or a tag at a time
 * while the pointer is over its body. Words the reader asked for are the last
 * thing anything covers (D185): the tags and the exports lie in a layer of
 * their own over every other layer the world lays over the canvas, and the
 * exports' ground is opaque the moment they show, while their words fade in
 * with the spread. The look comes through the registry (D156).
 */

import { BufferAttribute, BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Mesh, MeshBasicNodeMaterial, Vector3 } from 'three/webgpu';
import type { Camera, UniformNode } from 'three/webgpu';
import { attribute, mrt, uniform, vec4 } from 'three/tsl';
import { CHANGE_HUE, CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_STROKE_WIDTH, EXPORTS_GAP, FONT_FAMILY, IMPROVED_HUE, LABELING, LEADER_DASH, LEADER_INK, LEADER_WIDTH, RENAME_DASH, SHAPE_LEVELS, TAG_ELBOW, TAG_ROW_FLOOR, exportsTable, tagsOf } from 'scene';
import type { Body, ExportsTable, Margins, Nucleus, NucleusGranule, Point, Slide } from 'scene';

import type { SlideWords } from '../asked.js';
import type { InteriorLook } from '../materials.js';

/** The scene's tokens the slide's chrome and stains read live, at rest: the shape the registry's view takes (D156). */
export const SLIDE_CHROME = { CHANGE_HUE, CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_STROKE_WIDTH, FONT_FAMILY, IMPROVED_HUE, LEADER_DASH, LEADER_INK, LEADER_WIDTH, TAG_ELBOW, TAG_ROW_FLOOR };
export type SlideChrome = typeof SLIDE_CHROME;

export type Interior = {
  /** The slide, its frame and its bodies, in the order they stack. */
  readonly meshes: readonly Mesh[];
  /** The leaders' layer over the canvas, which lies under the labels. */
  readonly leaders: Element;
  /** The words' layer, the tags and the exports, which lies over every other layer the world lays over the canvas (D185). */
  readonly words: HTMLElement;
  /** Lay the slide for a cell, or take it away. */
  readonly slide: (slide: Slide | undefined) => void;
  /** Lay the bodies where the scene has them this frame, at the slide's fade, each stain lit by its notice's gain. */
  readonly show: (bodies: readonly Body[], shown: number, gainOf: (id: string) => number) => void;
  /** Place the tags, the leaders and the exports on the screen for this camera, inside the margins the chrome claims, the words as strongly as they are asked for and the footers as far as the exploded view has spread. */
  readonly render: (camera: Camera, width: number, height: number, margins: Margins, pixelsPerUnit: number, spread: number, words: SlideWords) => void;
  /** The bodies as last laid, for the pointer to pick against. */
  readonly bodies: () => readonly Body[];
};

const SVG = 'http://www.w3.org/2000/svg';
/** Where the lit gap starts: the top of the ring, as the evidence ring lights it. */
const TOP = -Math.PI / 2;
const TAU = 2 * Math.PI;
/** How far above the slide its frame and its bodies sit, in the heightfield's units. */
const FRAME_LIFT = 0.3;
const BODY_LIFT = 0.6;
/** How many segments a bulb's disc is drawn in. */
const BULB_SEGMENTS = 12;
/** The most points an outline is drawn through, and the most bulbs it carries: what one body's vertices are sized for. Between two forms an outline wears both forms' bulbs, one set fading out as the other fades in (D194). */
const MOST_SAMPLES = Math.max(...SHAPE_LEVELS.map((form) => form.samples));
const MOST_BULBS = Math.max(...SHAPE_LEVELS.map((form, level) => form.arms + (SHAPE_LEVELS[level + 1]?.arms ?? 0)));
/** The vertices one body may take: a fan of triangles for its fill, two per sample for its stroke, and a fan per bulb. */
const VERTICES_PER_BODY = MOST_SAMPLES * 9 + MOST_BULBS * BULB_SEGMENTS * 3;
/** How many segments a round granule's disc is drawn in; a dented one keeps every point of its ring, so its dents read (D102). */
const GRANULE_SEGMENTS = 12;

/** How far apart the points of a granule's ring its fan is drawn through are. */
const strideOf = (granule: NucleusGranule): number => (granule.rules.length === 0 ? Math.max(1, Math.ceil(granule.ring.length / GRANULE_SEGMENTS)) : 1);

/** The vertices each nucleus's fans take, counted once: a nucleus is laid once and rides its body (D197). */
const NUCLEUS_VERTICES = new WeakMap<Nucleus, number>();
const verticesOf = (nucleus: Nucleus | undefined): number => {
  if (nucleus === undefined) return 0;
  const counted = NUCLEUS_VERTICES.get(nucleus);
  if (counted !== undefined) return counted;
  const count = nucleus.granules.reduce((total, granule) => total + Math.ceil(granule.ring.length / strideOf(granule)) * 3, 0);
  NUCLEUS_VERTICES.set(nucleus, count);
  return count;
};

/** A dash token, `"3 2"`, as its on and off lengths. */
const dashOf = (token: string): readonly [number, number] => {
  const [on = 0, off = 0] = token.split(' ').map(Number);
  return [on, off];
};

/** A float uniform the loop moves: a layer's fade. */
type Float = UniformNode<'float', number>;

/** A flat mesh whose colour is a uniform, double-sided, never blooming. */
const flatMaterial = (colour: Color, alpha: Float): MeshBasicNodeMaterial => {
  const material = new MeshBasicNodeMaterial();
  material.colorNode = uniform(colour);
  material.opacityNode = alpha;
  material.side = DoubleSide;
  material.transparent = true;
  material.depthWrite = false;
  material.mrtNode = mrt({ emissive: vec4(0, 0, 0, alpha) });
  return material;
};

/** A geometry of `count` vertices with a position and a colour each, laid again every frame. */
const dynamicGeometry = (count: number): { readonly geometry: BufferGeometry; readonly positions: Float32Array; readonly colours: Float32Array } => {
  const positions = new Float32Array(Math.max(3, count) * 3);
  const colours = new Float32Array(Math.max(3, count) * 3);
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(positions, 3);
  position.setUsage(DynamicDrawUsage);
  const colour = new BufferAttribute(colours, 3);
  colour.setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.setAttribute('colour', colour);
  geometry.setDrawRange(0, 0);
  return { geometry, positions, colours };
};

/** The ring as a strip `thickness` wide centred on it, each vertex offset along the mean of its two edges' normals. */
const stripOf = (ring: readonly Point[], thickness: number, y: number): Float32Array => {
  const n = ring.length;
  const normals = ring.map((_, i): Point => {
    const [ax, ay] = ring[(i - 1 + n) % n] ?? [0, 0];
    const [bx, by] = ring[i] ?? [0, 0];
    const [cx, cy] = ring[(i + 1) % n] ?? [0, 0];
    const before = Math.hypot(bx - ax, by - ay) || 1;
    const after = Math.hypot(cx - bx, cy - by) || 1;
    const nx = (by - ay) / before + (cy - by) / after;
    const ny = -((bx - ax) / before) - (cx - bx) / after;
    const length = Math.hypot(nx, ny) || 1;
    return [nx / length, ny / length];
  });
  const half = thickness / 2;
  const vertices = new Float32Array(n * 6 * 3);
  ring.forEach(([x, z], i) => {
    const [nx, nz] = normals[i] ?? [0, 0];
    const [x2, z2] = ring[(i + 1) % n] ?? [x, z];
    const [nx2, nz2] = normals[(i + 1) % n] ?? [0, 0];
    const inner: Point = [x - nx * half, z - nz * half];
    const outer: Point = [x + nx * half, z + nz * half];
    const inner2: Point = [x2 - nx2 * half, z2 - nz2 * half];
    const outer2: Point = [x2 + nx2 * half, z2 + nz2 * half];
    vertices.set([inner[0], y, inner[1], outer[0], y, outer[1], inner2[0], y, inner2[1], outer[0], y, outer[1], outer2[0], y, outer2[1], inner2[0], y, inner2[1]], i * 18);
  });
  return vertices;
};

/** The slide's chrome element: a tag on the chrome's ground. */
const tagElement = (): HTMLSpanElement => {
  const tag = document.createElement('span');
  Object.assign(tag.style, { position: 'absolute', left: '0', top: '0', whiteSpace: 'nowrap', boxSizing: 'border-box' });
  return tag;
};

/** One tag's chrome: the tag, and for a file's the leader to its body; a column's footer has none (D198). */
type Tagged = { readonly tag: HTMLSpanElement; readonly leader?: SVGPolylineElement };

/** The slide laid in the world: the look and the scene's tokens read live, and the skin's resting height as the caller reads it, sampled every `step` layout units. */
export const createInterior = (heightAt: (x: number, y: number) => number, step: number, look: InteriorLook, chrome: SlideChrome): Interior => {
  const shown = uniform(0);
  const slideAlpha = uniform(0);
  const slideColour = new Color(look.slide);
  const frameColour = new Color(look.frame);
  const slideGeometry = new BufferGeometry();
  const slideMesh = new Mesh(slideGeometry, flatMaterial(slideColour, slideAlpha));
  slideMesh.frustumCulled = false;
  slideMesh.renderOrder = 3;
  slideMesh.visible = false;
  const frameGeometry = new BufferGeometry();
  const frameMesh = new Mesh(frameGeometry, flatMaterial(frameColour, shown));
  frameMesh.frustumCulled = false;
  frameMesh.renderOrder = 4;
  frameMesh.visible = false;

  let bodies = dynamicGeometry(0);
  const bodyMaterial = new MeshBasicNodeMaterial();
  bodyMaterial.colorNode = attribute('colour', 'vec3');
  bodyMaterial.opacityNode = shown;
  bodyMaterial.side = DoubleSide;
  bodyMaterial.transparent = true;
  bodyMaterial.depthWrite = false;
  bodyMaterial.mrtNode = mrt({ emissive: vec4(0, 0, 0, shown) });
  const bodyMesh = new Mesh(bodies.geometry, bodyMaterial);
  bodyMesh.frustumCulled = false;
  bodyMesh.renderOrder = 5;
  bodyMesh.visible = false;

  // The chrome over the canvas: the leaders in an SVG, the tags in a layer over them.
  const leaders = document.createElementNS(SVG, 'svg');
  leaders.dataset['interiorLeaders'] = '';
  Object.assign(leaders.style, { position: 'fixed', inset: '0', pointerEvents: 'none', display: 'none' });
  const strokes = document.createElementNS(SVG, 'g');
  leaders.append(strokes);
  const layer = document.createElement('div');
  layer.dataset['interior'] = '';
  Object.assign(layer.style, { position: 'fixed', inset: '0', pointerEvents: 'none', display: 'none' });
  const exportsTag = tagElement();
  exportsTag.dataset['interiorExports'] = '';
  // The exports' words in a span of their own, so they fade in with the spread over a ground that does not (D185).
  const exportsText = document.createElement('span');
  exportsTag.append(exportsText);
  layer.append(exportsTag);
  // The exports as last written, so the tag is written again only when the names or the inks move.
  let exportsWritten = '';
  /** Write the exports' table into the tag, a row to a line, each name the reach crossed by in the lit ink (D181). */
  const writeExports = (table: ExportsTable, ink: string): void => {
    const key = JSON.stringify([table, ink]);
    if (key === exportsWritten) return;
    exportsWritten = key;
    const nodes: Node[] = [document.createTextNode(table.head)];
    for (const row of table.rows) {
      nodes.push(document.createTextNode('\n'));
      row.forEach((cell, column) => {
        if (column > 0) nodes.push(document.createTextNode(EXPORTS_GAP));
        if (!cell.reached) {
          nodes.push(document.createTextNode(cell.text));
          return;
        }
        const name = document.createElement('span');
        name.dataset['reached'] = cell.name;
        name.style.color = ink;
        name.textContent = cell.text;
        nodes.push(name);
      });
    }
    if (table.tail !== undefined) nodes.push(document.createTextNode(`\n${table.tail}`));
    exportsText.replaceChildren(...nodes);
  };

  let slide: Slide | undefined;
  let top = 0;
  let laid: readonly Body[] = [];
  let tagged = new Map<string, Tagged>();
  // Each column's footer, which counts the tags the column had no row for.
  const footers = new Map<'left' | 'right', Tagged>(
    (['left', 'right'] as const).map((side) => {
      const tag = tagElement();
      tag.dataset['interiorFooter'] = side;
      tag.style.display = 'none';
      layer.append(tag);
      return [side, { tag }] as const;
    }),
  );
  let sized: readonly [number, number] = [0, 0];
  let capacity = 0;
  const granuleColour = new Color();
  const bodyColour = new Color();
  const strokeColour = new Color();
  const stain = new Color();
  const lit = new Color();

  /** The skin's highest resting point over the ring's box, sampled every `step`, which the slide floats above. */
  const topOver = (ring: readonly Point[]): number => {
    const xs = ring.map(([x]) => x);
    const ys = ring.map(([, y]) => y);
    let highest = 0;
    for (let y = Math.min(...ys); y <= Math.max(...ys) + step; y += step) for (let x = Math.min(...xs); x <= Math.max(...xs) + step; x += step) highest = Math.max(highest, heightAt(x, y));
    return highest;
  };

  const lay = (next: Slide | undefined): void => {
    slide = next;
    laid = [];
    for (const { tag, leader } of tagged.values()) {
      tag.remove();
      leader?.remove();
    }
    tagged = new Map();
    slideMesh.visible = next !== undefined;
    frameMesh.visible = next !== undefined;
    bodyMesh.visible = next !== undefined;
    if (next === undefined) return;
    top = topOver(next.ring) + look.lift;
    const positions = new Float32Array((next.vertices.length / 2) * 3);
    for (let i = 0; i < next.vertices.length / 2; i += 1) positions.set([next.vertices[i * 2] ?? 0, top, next.vertices[i * 2 + 1] ?? 0], i * 3);
    slideGeometry.setAttribute('position', new BufferAttribute(positions, 3));
    slideGeometry.setIndex(new BufferAttribute(next.triangles, 1));
    frameGeometry.setAttribute('position', new BufferAttribute(stripOf(next.ring, next.thickness, top + FRAME_LIFT), 3));
    bodies.geometry.dispose();
    capacity = next.files.length * VERTICES_PER_BODY;
    bodies = dynamicGeometry(capacity);
    bodyMesh.geometry = bodies.geometry;
    for (const file of next.files) {
      const tag = tagElement();
      tag.dataset['interiorTag'] = file.id;
      const leader = document.createElementNS(SVG, 'polyline');
      leader.dataset['interiorLeader'] = file.id;
      strokes.append(leader);
      layer.append(tag);
      tagged.set(file.id, { tag, leader });
    }
  };

  /** Whether the body's fill at an angle round it is left unstained: inside the open share from the top clockwise. */
  const unstained = (body: Body, theta: number): boolean => {
    const open = body.stain?.open ?? 0;
    if (open <= 0) return false;
    const along = (((theta - TOP) % TAU) + TAU) % TAU;
    return along < open * TAU;
  };

  const show = (next: readonly Body[], fade: number, gainOf: (id: string) => number): void => {
    laid = next;
    shown.value = fade;
    slideAlpha.value = fade * look.slideOpacity;
    slideColour.set(look.slide);
    frameColour.set(look.frame);
    if (slide === undefined || fade <= 0) {
      bodies.geometry.setDrawRange(0, 0);
      return;
    }
    bodyColour.set(look.body);
    strokeColour.set(look.bodyStroke);
    // The nuclei's fans ride in the bodies' own mesh, which grows to hold them the first frame they are asked for.
    const needed = next.reduce((total, body) => total + VERTICES_PER_BODY + verticesOf(body.nucleus), 0);
    if (needed > capacity) {
      bodies.geometry.dispose();
      capacity = needed;
      bodies = dynamicGeometry(capacity);
      bodyMesh.geometry = bodies.geometry;
    }
    const shade = 1 - Math.min(1, Math.max(0, look.granuleShade));
    const { positions, colours } = bodies;
    const y = top + BODY_LIFT;
    const [dashOn, dashOff] = dashOf(RENAME_DASH);
    let used = 0;
    const put = (x: number, z: number, colour: Color): void => {
      positions.set([x, y, z], used * 3);
      colours.set([colour.r, colour.g, colour.b], used * 3);
      used += 1;
    };
    for (const body of next) {
      const { ring, bulbs } = body.outline;
      const n = ring.length;
      const kind = body.stain?.kind;
      // The stain: its state's hue, the change's or the calm-positive one (D98), lit by the file's notice, taken by the body's fill at the look's share.
      lit.set(body.stain?.improved === true ? chrome.IMPROVED_HUE : chrome.CHANGE_HUE).multiplyScalar(gainOf(body.id));
      stain.copy(bodyColour).lerp(lit, look.stainShare);
      const fillAt = (theta: number): Color => (kind === undefined || unstained(body, theta) ? bodyColour : stain);
      if (kind !== 'deleted') {
        for (let i = 0; i < n; i += 1) {
          const [ax, az] = ring[i] ?? [body.x, body.y];
          const [bx, bz] = ring[(i + 1) % n] ?? [body.x, body.y];
          const colour = fillAt(((i + 0.5) / n) * TAU);
          put(body.x, body.y, colour);
          put(ax, az, colour);
          put(bx, bz, colour);
        }
        for (const bulb of bulbs) {
          const colour = fillAt(Math.atan2(bulb.y - body.y, bulb.x - body.x));
          for (let i = 0; i < BULB_SEGMENTS; i += 1) {
            const a = (i / BULB_SEGMENTS) * TAU;
            const b = ((i + 1) / BULB_SEGMENTS) * TAU;
            put(bulb.x, bulb.y, colour);
            put(bulb.x + Math.cos(a) * bulb.r, bulb.y + Math.sin(a) * bulb.r, colour);
            put(bulb.x + Math.cos(b) * bulb.r, bulb.y + Math.sin(b) * bulb.r, colour);
          }
        }
        // The nucleus (D197): a fan per granule over the fill, in the ink the body wears where the granule lies, darker.
        for (const granule of body.nucleus?.granules ?? []) {
          granuleColour.copy(fillAt(Math.atan2(granule.y, granule.x))).multiplyScalar(shade);
          const points = granule.ring;
          const stride = strideOf(granule);
          for (let i = 0; i < points.length; i += stride) {
            const [ax, az] = points[i] ?? [granule.x, granule.y];
            const [bx, bz] = points[i + stride < points.length ? i + stride : 0] ?? [granule.x, granule.y];
            put(body.x + granule.x, body.y + granule.y, granuleColour);
            put(body.x + ax, body.y + az, granuleColour);
            put(body.x + bx, body.y + bz, granuleColour);
          }
        }
      }
      // The stroke: a band inside the outline, in the change hue for a changed file, dashed along the ring for a renamed one.
      const edge = kind === undefined ? strokeColour : lit;
      let along = 0;
      for (let i = 0; i < n; i += 1) {
        const [ax, az] = ring[i] ?? [body.x, body.y];
        const [bx, bz] = ring[(i + 1) % n] ?? [body.x, body.y];
        const segment = Math.hypot(bx - ax, bz - az);
        const drawn = kind !== 'renamed' || along % (dashOn + dashOff) < dashOn;
        along += segment;
        if (!drawn) continue;
        const ra = Math.hypot(ax - body.x, az - body.y) || 1;
        const rb = Math.hypot(bx - body.x, bz - body.y) || 1;
        const pa = Math.max(0, 1 - look.strokeWidth / ra);
        const pb = Math.max(0, 1 - look.strokeWidth / rb);
        const qax = body.x + (ax - body.x) * pa;
        const qaz = body.y + (az - body.y) * pa;
        const qbx = body.x + (bx - body.x) * pb;
        const qbz = body.y + (bz - body.y) * pb;
        put(qax, qaz, edge);
        put(ax, az, edge);
        put(qbx, qbz, edge);
        put(ax, az, edge);
        put(bx, bz, edge);
        put(qbx, qbz, edge);
      }
    }
    bodies.geometry.setDrawRange(0, used);
    const position = bodies.geometry.getAttribute('position');
    const colour = bodies.geometry.getAttribute('colour');
    if (position instanceof BufferAttribute) position.needsUpdate = true;
    if (colour instanceof BufferAttribute) colour.needsUpdate = true;
  };

  const projected = new Vector3();
  const render = (camera: Camera, width: number, height: number, margins: Margins, pixelsPerUnit: number, spread: number, words: SlideWords): void => {
    const visible = slide !== undefined && shown.value > 0;
    layer.style.display = visible ? '' : 'none';
    leaders.style.display = visible ? '' : 'none';
    if (slide === undefined || !visible) return;
    if (sized[0] !== width || sized[1] !== height) {
      leaders.setAttribute('width', String(width));
      leaders.setAttribute('height', String(height));
      sized = [width, height];
    }
    layer.style.opacity = String(shown.value);
    leaders.style.opacity = String(shown.value);
    strokes.setAttribute('stroke', chrome.LEADER_INK);
    strokes.setAttribute('stroke-width', String(chrome.LEADER_WIDTH));
    strokes.setAttribute('stroke-dasharray', chrome.LEADER_DASH);
    strokes.setAttribute('stroke-linecap', 'round');
    strokes.setAttribute('fill', 'none');
    const project = (x: number, z: number): Point => {
      projected.set(x, top + BODY_LIFT, z).project(camera);
      return [((projected.x + 1) / 2) * width, ((1 - projected.y) / 2) * height];
    };
    const font = `${String(LABELING.fontSize)}px/${String(LABELING.fontSize)}px ${chrome.FONT_FAMILY}`;
    const screen = { width, height, pixelsPerUnit, margins };
    const columns = tagsOf(slide, laid, project, screen, LABELING, chrome);
    // A body the pointer is on whose column had no row for its tag is tagged by itself, level with it.
    const named = new Set(columns.map((tag) => tag.id));
    const alone = laid.filter((body) => !named.has(body.id) && words.tag(body.id) > spread);
    const tags = alone.length === 0 ? columns : [...columns, ...tagsOf(slide, alone, project, screen, LABELING, chrome)];
    const placed = new Set<Tagged>();
    for (const tag of tags) {
      const held = tag.more === undefined ? tagged.get(tag.id) : footers.get(tag.side);
      if (held === undefined) continue;
      placed.add(held);
      held.tag.textContent = tag.text;
      // A tag and its leader are laid whether or not they are asked for, so they stand where they belong the moment they are; a footer shows with the exploded view.
      const asked = tag.more === undefined ? words.tag(tag.id) : spread;
      held.tag.style.display = asked > 0 ? '' : 'none';
      Object.assign(held.tag.style, {
        opacity: String(asked),
        transform: `translate(${String(tag.box.x)}px, ${String(tag.box.y)}px)`,
        width: `${String(tag.box.width)}px`,
        height: `${String(tag.box.height)}px`,
        // The words at the size their row leaves them, centred in it.
        padding: `${String(Math.max(0, (tag.box.height - tag.fontSize) / 2))}px ${String(LABELING.pad)}px`,
        font: `${String(tag.fontSize)}px/${String(tag.fontSize)}px ${chrome.FONT_FAMILY}`,
        overflow: 'hidden',
        background: chrome.CHROME_GROUND,
        color: tag.more === undefined ? chrome.CHROME_INK : chrome.CHROME_MUTED,
      });
      if (held.leader === undefined || tag.leader === undefined) continue;
      held.leader.style.display = asked > 0 ? '' : 'none';
      held.leader.style.opacity = String(asked);
      held.leader.setAttribute('points', [tag.leader.from, tag.leader.elbow, tag.leader.to].map(([x, y]) => `${String(x)},${String(y)}`).join(' '));
    }
    // What no column had a row for, and no pointer asked for, is not drawn.
    for (const held of [...tagged.values(), ...footers.values()]) {
      if (placed.has(held)) continue;
      held.tag.style.display = 'none';
      if (held.leader !== undefined) held.leader.style.display = 'none';
    }
    const [ex, ey] = project(slide.exports.x, slide.exports.y);
    writeExports(exportsTable(slide.exports, look), chrome.CHROME_INK);
    // The ground and its frame show whole as soon as the exports are asked for at all, and the words over it at how strongly they are.
    exportsText.style.opacity = String(words.exports);
    Object.assign(exportsTag.style, {
      display: words.exports > 0 ? '' : 'none',
      whiteSpace: 'pre',
      transform: `translate(${String(ex)}px, ${String(ey)}px) translate(-50%, -50%)`,
      padding: `${String(LABELING.pad)}px`,
      font,
      // After the font, whose shorthand sets the line's height to the tags' single row.
      lineHeight: `${String(LABELING.fontSize + LABELING.pad)}px`,
      background: chrome.CHROME_GROUND,
      color: chrome.CHROME_MUTED,
      border: `${String(chrome.CHROME_STROKE_WIDTH)}px solid ${chrome.CHROME_MUTED}`,
    });
  };

  return { meshes: [slideMesh, frameMesh, bodyMesh], leaders, words: layer, slide: lay, show, render, bodies: () => laid };
};
