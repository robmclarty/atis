/**
 * lod: which of §6's levels of detail the camera is at, and how far each
 * level's layer has faded in. One continuous zoom scalar drives it: the
 * camera's zoom over the zoom that fits the whole layout, so 1 is the opening
 * frame, the far field (LOD0), and every map reads its levels at the same
 * relative zoom whatever its size.
 *
 * Each level is entered going in past one threshold and left coming out
 * under a lower one, so a zoom that jitters across either never flips the
 * level back and forth (hysteresis). Each level's layer then eases toward
 * shown or hidden at a fixed rate, so a cross-fade from any opacity to any
 * other takes at most `LOD_FADE_MS`, never a blink and never longer (§5.5,
 * C12). Layers are cumulative: a level's layer shows at that level and every
 * level past it, the surface staying under an opened cell, and a renderer
 * fades what belongs to one level alone out by the next level's opacity.
 *
 * Pure: the caller hands in the zoom and the time since its last plan, from
 * the scheduler's injected clock (D94), and keeps the plan between frames.
 */

import type { Lod } from './labels.js';
import { LOD_FADE_MS } from './tokens.js';

/** The zoom a level is entered at going in, and the lower zoom it is left at coming out. */
export type LodGate = { readonly enter: number; readonly exit: number };

/**
 * The gates into LOD1 to LOD4, in order. LOD1's are where the materials spike
 * left them; the deeper ones stand an order of magnitude apart, each left at
 * about five sixths of where it is entered. Tuned live by the dev panel
 * (D156), and recorded with the world's tokens (step 44).
 */
export const LOD_GATES: readonly LodGate[] = [
  { enter: 1.7, exit: 1.45 },
  { enter: 6, exit: 5 },
  { enter: 24, exit: 20 },
  { enter: 80, exit: 66 },
];

/** The level the camera is at, and how shown each level's layer is, 0 to 1, LOD0's first. */
export type LodPlan = { readonly lod: Lod; readonly opacity: readonly [number, number, number, number, number] };

const LEVELS: readonly Lod[] = [0, 1, 2, 3, 4];
const DEEPEST: Lod = 4;

function asLod(level: number): Lod {
  return LEVELS[Math.max(0, Math.min(DEEPEST, Math.round(level)))] ?? 0;
}

/**
 * The level at `zoom`, coming from `current`: step in through every gate the
 * zoom is past the entry of, or out through every gate it is under the exit
 * of, and otherwise stay where it is.
 */
export function levelAt(current: Lod, zoom: number, gates: readonly LodGate[] = LOD_GATES): Lod {
  let level: number = current;
  while (level < DEEPEST && zoom > (gates[level]?.enter ?? Number.POSITIVE_INFINITY)) level += 1;
  while (level > 0 && zoom < (gates[level - 1]?.exit ?? Number.NEGATIVE_INFINITY)) level -= 1;
  return asLod(level);
}

/** Each level's layer, LOD0's first, through a function of its level. */
function perLevel(of: (level: Lod) => number): LodPlan['opacity'] {
  return [of(0), of(1), of(2), of(3), of(4)];
}

/** Each level's layer is shown at that level and every one past it. */
function targets(lod: Lod): LodPlan['opacity'] {
  return perLevel((level) => (lod >= level ? 1 : 0));
}

/**
 * The plan for this frame. With no plan before it, the level is read
 * straight from the zoom and its layers stand at rest, since there is nothing
 * to fade from. After one, the level moves through the gates from where it
 * was, and every layer eases toward its target by `elapsedMs` over `fadeMs`.
 */
export function lodPlan(previous: LodPlan | undefined, zoom: number, elapsedMs: number, fadeMs: number = LOD_FADE_MS, gates: readonly LodGate[] = LOD_GATES): LodPlan {
  if (previous === undefined) {
    const lod = levelAt(0, zoom, gates);
    return { lod, opacity: targets(lod) };
  }
  const lod = levelAt(previous.lod, zoom, gates);
  const step = fadeMs <= 0 ? 1 : Math.max(0, elapsedMs) / fadeMs;
  const goal = targets(lod);
  const opacity = perLevel((level) => {
    const value = previous.opacity[level];
    const target = goal[level];
    return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
  });
  return { lod, opacity };
}
