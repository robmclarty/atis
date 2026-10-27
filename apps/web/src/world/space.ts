/**
 * space: the world's ground drawn as space (D169), from `space.ts`'s data.
 * The stars are one wide plane a little above the level field, lit in an
 * additive ink over whatever lies beneath and hidden wherever the skin rises
 * through it (a cell's body, a bedrock swell), so they show on the open
 * ground and run on past the layout's edge into the dark round it. Each star
 * is a disc a few pixels across at every zoom, its size measured against the
 * screen's footprint of the ground rather than the ground itself, and it
 * never blooms. The rules are an SVG over the canvas, beneath every other
 * layer: one line a band boundary, through where the boundary meets the
 * level ground, run out to the screen's edges, or in a field whose lanes
 * wrap into rows across its row alone (Q73), in a translucent ink. The
 * look comes through the registry (D156), and the field is drawn again from
 * a new seed or density on the frame after one moves.
 */

import { AdditiveBlending, Color, DataTexture, FloatType, Mesh, MeshBasicNodeMaterial, NearestFilter, PlaneGeometry, RGBAFormat, RepeatWrapping, Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { float, floor, fwidth, length, max, mrt, positionWorld, smoothstep, texture, uniform, vec4 } from 'three/tsl';
import type { MapJson } from 'core';

import type { SpaceLook } from '../materials.js';
import { STAR_GRID, across, bandRules, between, starField } from '../space.js';

export type Space = {
  /** The stars' plane, in the scene. */
  readonly mesh: Mesh;
  /** The rules' layer over the canvas. */
  readonly rules: SVGSVGElement;
  /** Re-read the look, each frame, and draw the field again when its seed or density moved. */
  readonly restyle: () => void;
  /** Lay each rule across the screen for this camera and canvas. */
  readonly render: (camera: Camera, width: number, height: number) => void;
};

const SVG = 'http://www.w3.org/2000/svg';

/** How far above the level field the stars' plane lies, in the heightfield's units: clear of the field, and under every body and swell that rises. */
const STAR_LIFT = 0.3;

/** How many times the layout's longer side the plane reaches each way, so the stars run on past every frame the camera allows. */
const STAR_REACH = 8;

export const createSpace = (map: MapJson, look: SpaceLook): Space => {
  const layout = map.terrain.layout ?? { width: 1, height: 1 };
  const field = new DataTexture(starField(look.starSeed, look.starDensity), STAR_GRID, STAR_GRID, RGBAFormat, FloatType);
  field.minFilter = NearestFilter;
  field.magFilter = NearestFilter;
  field.wrapS = RepeatWrapping;
  field.wrapT = RepeatWrapping;
  field.generateMipmaps = false;
  field.needsUpdate = true;
  let drawn = { seed: look.starSeed, density: look.starDensity };

  const ink = uniform(new Color(look.starInk));
  const gain = uniform(look.starGain);
  const radius = uniform(look.starRadius);
  const spacing = uniform(look.starSpacing);

  // The ground under this fragment, its cell in the star grid, and that cell's star, if it has one.
  const ground = positionWorld.xz;
  const cell = floor(ground.div(spacing));
  const star = texture(field, cell.add(0.5).div(STAR_GRID));
  const centre = cell.add(star.gb).mul(spacing);
  // How far this fragment lies from the star in screen pixels: the ground's distance over how much ground one pixel holds here.
  const footprint = max(fwidth(ground.x), fwidth(ground.y));
  const pixels = length(ground.sub(centre)).div(footprint);
  const light = star.r.mul(float(1).sub(smoothstep(radius.sub(0.5), radius.add(0.5), pixels))).mul(gain);

  const material = new MeshBasicNodeMaterial();
  material.transparent = true;
  material.blending = AdditiveBlending;
  material.depthWrite = false;
  material.colorNode = ink.mul(light);
  // The stars are base tissue's: they write nothing the bloom reads (D11).
  material.mrtNode = mrt({ emissive: vec4(0, 0, 0, 0) });

  const reach = Math.max(layout.width, layout.height) * STAR_REACH;
  const geometry = new PlaneGeometry(reach, reach);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(layout.width / 2, STAR_LIFT, layout.height / 2);
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;

  const rules = document.createElementNS(SVG, 'svg');
  rules.dataset['rules'] = '';
  Object.assign(rules.style, { position: 'fixed', inset: '0', pointerEvents: 'none' });
  const lines = bandRules(map).map((rule) => {
    const line = document.createElementNS(SVG, 'line');
    line.dataset['rule'] = String(rule.band);
    line.setAttribute('shape-rendering', 'crispEdges');
    rules.append(line);
    return { rule, line };
  });

  const restyle = (): void => {
    ink.value.set(look.starInk);
    gain.value = look.starGain;
    radius.value = look.starRadius;
    spacing.value = look.starSpacing;
    if (drawn.seed !== look.starSeed || drawn.density !== look.starDensity) {
      field.image.data = starField(look.starSeed, look.starDensity);
      field.needsUpdate = true;
      drawn = { seed: look.starSeed, density: look.starDensity };
    }
  };
  restyle();

  let sized: readonly [number, number] = [0, 0];
  const ends = [new Vector3(), new Vector3()] as const;
  const render = (camera: Camera, width: number, height: number): void => {
    if (sized[0] !== width || sized[1] !== height) {
      rules.setAttribute('width', String(width));
      rules.setAttribute('height', String(height));
      sized = [width, height];
    }
    for (const { rule, line } of lines) {
      const [x0, x1] = rule.row ?? [0, layout.width];
      const [left, right] = ends.map((end, side) => {
        end.set(side === 0 ? x0 : x1, 0, rule.y).project(camera);
        return [((end.x + 1) / 2) * width, ((1 - end.y) / 2) * height] as const;
      });
      // A row's rule runs across its row alone; the camera is orthographic, so its ends never fold behind it.
      const clipped = rule.row === undefined ? across : between;
      const run = left === undefined || right === undefined ? undefined : clipped(left, right, width, height);
      line.style.display = run === undefined ? 'none' : '';
      if (run === undefined) continue;
      // A level rule sits on a pixel's middle, so its one pixel is drawn whole.
      const level = Math.abs(run[0][1] - run[1][1]) < 0.5;
      const lift = (y: number): number => (level ? Math.round(y) + 0.5 : y);
      line.setAttribute('x1', String(run[0][0]));
      line.setAttribute('y1', String(lift(run[0][1])));
      line.setAttribute('x2', String(run[1][0]));
      line.setAttribute('y2', String(lift(run[1][1])));
      line.setAttribute('stroke', look.ruleInk);
      line.setAttribute('stroke-opacity', String(look.ruleOpacity));
      line.setAttribute('stroke-width', String(look.ruleWidth));
    }
  };

  return { mesh, rules, restyle, render };
};
