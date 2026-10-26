/**
 * overlays: which of a `repo` map's overlays the world shows (D101). A repo
 * map opens on the scene's default, trouble spots, as the still map does;
 * the HUD's toggles show another, one at a time, and pressing the one shown
 * takes it away, so the terrain can be read bare. A map of a change holds no
 * overlays and shows none. Pure, so a test reads it straight.
 */

import type { MapJson, OverlayName } from 'core';
import { DEFAULT_OVERLAY } from 'scene';

/** What the chrome has asked the world to show: an overlay, none at all, or nothing yet, which is the map's default. */
export type OverlayAsk = OverlayName | 'none' | undefined;

/** The overlay a map shows under what was asked; none on a map of a change. */
export const shownOverlay = (map: MapJson, asked: OverlayAsk): OverlayName | undefined => {
  if (map.overlays === undefined || asked === 'none') return undefined;
  return asked ?? DEFAULT_OVERLAY;
};

/** What pressing `name`'s toggle asks for: `name`, or none when it is the overlay shown. */
export const toggled = (map: MapJson, asked: OverlayAsk, name: OverlayName): OverlayAsk => (shownOverlay(map, asked) === name ? 'none' : name);
