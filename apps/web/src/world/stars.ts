/**
 * stars: the outside packages as stars in the sky round the map (D354
 * (package-stars)), one instanced mesh and a few names over the canvas. The
 * scene hangs each star just off the ground the world draws
 * (`packageStarsOf`); here each is a four-pointed star that keeps its size
 * on the screen, as the field's faint stars do (D169), between
 * `SPACE.packageStarLeast` pixels for a package one file imports and
 * `SPACE.packageStarMost` for the busiest. Four points and a hue tell it
 * from the field's stars, which are specks of one ink and mean nothing.
 *
 * A star's hue is its package's health (D170): the IFR hue for an advisory
 * at high or critical, the panel's amber for a lesser one, the change hue
 * for a package this change added or moved, the field's own star ink where
 * an audit read it clean, and the muted grey where no audit read it, which
 * is no clean audit (C2). It is a light, so the bloom sees
 * `SPACE.packageStarBloom` of it, but for a star no audit read, which is
 * drawn and does not glow.
 *
 * A star an advisory names, or the change touched, is named beside it
 * unasked; a calm one keeps quiet (P1), and the inspector's map view lists
 * every package. The names ride their stars each frame. Every token is read
 * live through the registry (D156).
 */

import { BufferAttribute, Color, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial, Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { attribute, float, max, mix, mrt, positionLocal, uniform, vec3, vec4 } from 'three/tsl';
import { CHANGE_HUE, CHROME_MUTED, FONT_FAMILY, IFR_HUE, packageStarsOf, starNamed } from 'scene';
import type { GroundBox, PackageStar, StarHue } from 'scene';
import type { MapJson } from 'core';

import type { PanelLook, SpaceLook } from '../materials.js';

/** The scene's tokens the stars are drawn with, at rest: the shape their live view takes (D156). */
export const STAR_LOOK = { CHANGE_HUE, CHROME_MUTED, FONT_FAMILY, IFR_HUE };

/** The look the stars read live: the scene's hues, the sky's own tokens, and the panel's amber, which a lesser advisory's star wears as its row does. */
export type PackageStarsLook = {
  readonly hues: typeof STAR_LOOK;
  readonly space: SpaceLook;
  readonly panel: Pick<PanelLook, 'amber'>;
};

export type PackageStars = {
  /** The one mesh, for the scene; none on a map that hangs no star. */
  readonly meshes: readonly Mesh[];
  /** The names over the canvas, one layer. */
  readonly labels: HTMLElement;
  /** How many stars hang, and how many of them are named. */
  readonly count: () => number;
  readonly named: () => number;
  /** Each frame: re-read the tokens, size the stars for the pixels a layout unit takes, and stand each name beside its star. */
  readonly frame: (camera: Camera, width: number, height: number, pixelsPerUnit: number) => void;
  readonly dispose: () => void;
};

/** How far above the ground the stars hang, in the heightfield's units: clear of the field's own stars. */
const HEIGHT = 1;
/** A star's waist, as a share of its reach: how thin its four points are. */
const WAIST = 0.26;
/** The gap between a star's point and its name, in pixels. */
const NAME_GAP = 4;
/** The least a layout unit is taken to measure on the screen, in pixels, so a frame before the camera is fitted divides by something. */
const SCALE_LEAST = 1e-6;

/** A four-pointed star about its origin, on the ground: a centre and eight rim vertices, a point and a waist by turns. */
const starGeometry = (): InstancedBufferGeometry => {
  const position = new Float32Array(9 * 3);
  for (let i = 0; i < 8; i += 1) {
    const reach = i % 2 === 0 ? 1 : WAIST;
    const theta = (i * Math.PI) / 4;
    position[(i + 1) * 3] = Math.cos(theta) * reach;
    position[(i + 1) * 3 + 2] = Math.sin(theta) * reach;
  }
  const index = new Uint16Array(8 * 3);
  for (let i = 0; i < 8; i += 1) index.set([0, i + 1, ((i + 1) % 8) + 1], i * 3);
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
};

/** The ink a star's hue is drawn in. */
const inkOf = (hue: StarHue, look: PackageStarsLook): string => {
  if (hue === 'ifr') return look.hues.IFR_HUE;
  if (hue === 'amber') return look.panel.amber;
  if (hue === 'change') return look.hues.CHANGE_HUE;
  return hue === 'clean' ? look.space.starInk : look.hues.CHROME_MUTED;
};

/** The inks as one word, so a frame knows when one has moved. */
const inkedBy = (look: PackageStarsLook): string => [look.hues.IFR_HUE, look.panel.amber, look.hues.CHANGE_HUE, look.space.starInk, look.hues.CHROME_MUTED, look.hues.FONT_FAMILY, look.space.packageStarLabel].join(' ');

const label = (star: PackageStar): HTMLElement => {
  const element = document.createElement('span');
  element.dataset['packageStar'] = star.name;
  element.dataset['hue'] = star.hue;
  element.textContent = star.name;
  Object.assign(element.style, { position: 'absolute', left: '0', top: '0', whiteSpace: 'nowrap', willChange: 'transform' });
  return element;
};

/**
 * The stars of a map round the ground the world draws, in the registry's
 * live look. The sky's layout tokens are read as the stars are hung: a map
 * drawn again, as a watch's push draws it, hangs them by the tokens then.
 */
export const createPackageStars = (map: MapJson, ground: GroundBox | undefined, look: PackageStarsLook): PackageStars => {
  const stars = packageStarsOf(map, ground, { near: look.space.packageStarNear, far: look.space.packageStarFar, gap: look.space.packageStarGap, seed: look.space.packageStarSeed });
  const labels = document.createElement('div');
  labels.dataset['packageStars'] = String(stars.length);
  Object.assign(labels.style, { position: 'fixed', inset: '0', pointerEvents: 'none', overflow: 'hidden' });
  const named = stars.flatMap((star) => (starNamed(star) ? [{ star, element: label(star) }] : []));
  labels.append(...named.map((each) => each.element));
  if (stars.length === 0) return { meshes: [], labels, count: () => 0, named: () => 0, frame: () => undefined, dispose: () => labels.remove() };

  const geometry = starGeometry();
  geometry.instanceCount = stars.length;
  // Each instance's place and its share of the busiest package, then its ink as linear light and whether it glows.
  const placed = new Float32Array(stars.length * 3);
  const tint = new Float32Array(stars.length * 4);
  stars.forEach((star, i) => placed.set([star.x, star.y, star.weight], i * 3));
  geometry.setAttribute('star', new InstancedBufferAttribute(placed, 3));
  const tintAttribute = new InstancedBufferAttribute(tint, 4);
  geometry.setAttribute('tint', tintAttribute);
  const colour = new Color();
  let inkedFor = '';
  const ink = (): void => {
    const word = inkedBy(look);
    if (word === inkedFor) return;
    inkedFor = word;
    stars.forEach((star, i) => {
      colour.set(inkOf(star.hue, look));
      // A star no audit read is drawn and does not glow: no evidence is no light (C2).
      tint.set([colour.r, colour.g, colour.b, star.hue === 'unread' ? 0 : 1], i * 4);
    });
    tintAttribute.needsUpdate = true;
    for (const { star, element } of named) Object.assign(element.style, { color: inkOf(star.hue, look), fontFamily: look.hues.FONT_FAMILY, fontSize: `${String(look.space.packageStarLabel)}px` });
  };
  ink();

  const scale = uniform(0);
  const least = uniform(look.space.packageStarLeast);
  const most = uniform(look.space.packageStarMost);
  const bloom = uniform(look.space.packageStarBloom);
  const at = attribute('star', 'vec3');
  const inked = attribute('tint', 'vec4');
  // A star keeps its size on the screen: its reach on the ground is its pixels over the pixels a unit takes.
  const reach = mix(least, most, at.z).div(max(scale, float(SCALE_LEAST)));
  const material = new MeshBasicNodeMaterial();
  material.positionNode = vec3(at.x.add(positionLocal.x.mul(reach)), float(HEIGHT), at.y.add(positionLocal.z.mul(reach)));
  material.side = DoubleSide;
  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.colorNode = inked.xyz;
  material.mrtNode = mrt({ emissive: vec4(inked.xyz.mul(inked.w).mul(bloom), 1) });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;

  const projected = new Vector3();
  const frame: PackageStars['frame'] = (camera, width, height, pixelsPerUnit) => {
    scale.value = pixelsPerUnit;
    least.value = look.space.packageStarLeast;
    most.value = look.space.packageStarMost;
    bloom.value = look.space.packageStarBloom;
    ink();
    for (const { star, element } of named) {
      projected.set(star.x, HEIGHT, star.y).project(camera);
      const radius = look.space.packageStarLeast + (look.space.packageStarMost - look.space.packageStarLeast) * star.weight;
      const x = ((projected.x + 1) / 2) * width + radius + NAME_GAP;
      const y = ((1 - projected.y) / 2) * height - look.space.packageStarLabel / 2;
      const moved = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (element.style.transform !== moved) element.style.transform = moved;
    }
  };
  return {
    meshes: [mesh],
    labels,
    count: () => stars.length,
    named: () => named.length,
    frame,
    dispose: () => {
      labels.remove();
      geometry.dispose();
      material.dispose();
    },
  };
};
