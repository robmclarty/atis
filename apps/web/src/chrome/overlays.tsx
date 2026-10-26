/**
 * overlays: a whole repo's overlay toggles in the HUD (D101), a flat strip
 * under the grade blocks on a `repo` map, absent on a map of a change. One
 * button per overlay §8 names, the one shown pressed and outlined in ink;
 * pressing another shows it in its place, one at a time as the still map
 * draws them, and pressing the one shown takes it away, so the terrain reads
 * bare. An overlay the map holds as muted is a disabled button whose title is
 * the map's reason (C2). Each press goes over the line to the world
 * (`nav.ts`), which cross-fades to the overlay. The brutalist material
 * (D12): one face, hard edges, nothing that glows, every token read live
 * through the registry (D156).
 */

import { OVERLAY_NAMES } from 'core';
import type { MapJson } from 'core';
import { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_STROKE_WIDTH, FONT_FAMILY, HUD_BLOCK_GAP, HUD_FONT_SIZE, overlayOf } from 'scene';
import { useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';

import type { Nav } from '../nav.js';
import { shownOverlay, toggled } from '../overlays.js';
import type { Registry } from '../registry.js';
import { useLive } from './live.js';

/** The tokens the strip is drawn with, at rest: the shape its live view takes. */
const LOOK = { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_STROKE_WIDTH, FONT_FAMILY, HUD_BLOCK_GAP, HUD_FONT_SIZE };

export const OverlayToggles = ({ map, registry, nav }: { readonly map: MapJson; readonly registry: Registry; readonly nav: Nav }): ReactElement | null => {
  useLive(registry);
  const look = registry.view(LOOK);
  const asked = useSyncExternalStore(nav.subscribe, nav.overlay, nav.overlay);
  if (map.overlays === undefined) return null;
  const shown = shownOverlay(map, asked);
  return (
    <nav
      data-overlays={shown ?? 'none'}
      aria-label="overlays"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: look.HUD_BLOCK_GAP,
        padding: `0 ${String(look.CHROME_PAD)}px ${String(look.CHROME_PAD)}px`,
        background: look.CHROME_GROUND,
        fontFamily: look.FONT_FAMILY,
        fontSize: look.HUD_FONT_SIZE,
        pointerEvents: 'auto',
      }}
    >
      {OVERLAY_NAMES.map((name) => {
        const view = overlayOf(map, name);
        const reason = view !== undefined && 'reason' in view ? view.reason : undefined;
        const on = name === shown;
        const ink = reason === undefined ? look.CHROME_INK : look.CHROME_MUTED;
        return (
          <button
            type="button"
            key={name}
            data-overlay={name}
            aria-pressed={on}
            disabled={reason !== undefined}
            title={reason}
            onClick={() => nav.showOverlay(toggled(map, nav.overlay(), name))}
            style={{
              font: 'inherit',
              whiteSpace: 'nowrap',
              color: ink,
              background: 'transparent',
              border: `${String(look.CHROME_STROKE_WIDTH)}px solid ${on ? look.CHROME_INK : look.CHROME_MUTED}`,
              outline: on ? `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_INK}` : 'none',
              borderRadius: 0,
              padding: '0 6px',
              cursor: reason === undefined ? 'pointer' : 'default',
            }}
          >
            {view?.title ?? name}
          </button>
        );
      })}
    </nav>
  );
};
