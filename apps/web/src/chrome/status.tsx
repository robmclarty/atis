/**
 * status: the chrome's first block, a flat line saying where the map is in
 * its load. The chrome is the brutalist material (D12): one monospace face,
 * hard edges, the chrome's own ground and ink from the shared tokens (D130),
 * read through the registry so the dev panel moves them live (D156), and
 * nothing that glows, blurs or grades.
 */

import { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, FONT_FAMILY, HUD_FONT_SIZE, IFR_HUE } from 'scene';
import type { ReactElement } from 'react';

import type { MapState } from '../load.js';
import type { Registry } from '../registry.js';
import { useLive } from './live.js';

/** The tokens the line is drawn with, at rest: the shape its live view takes. */
const LOOK = { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, FONT_FAMILY, HUD_FONT_SIZE, IFR_HUE };

/** How many characters of a commit's sha the line writes. */
const SHORT_SHA = 7;

/** What the line says for each state: the map's repo and base once it is read, or the commit a whole repo's map is of (D101), else where it is coming from or why it did not. */
const wordsOf = (state: MapState): string => {
  if (state.status === 'loading') return `reading ${state.url}`;
  if (state.status === 'failed') return `no map from ${state.url}: ${state.reason}`;
  const { meta } = state.map;
  if (meta.mode === 'repo') return `${meta.repo}, the whole repo at ${meta.head.slice(0, SHORT_SHA)}`;
  return `${meta.repo} against ${meta.base}`;
};

/** The ink each state is written in: muted while loading, the default once read, the IFR hue when the map did not arrive. */
const inkOf = (state: MapState, look: typeof LOOK): string => {
  if (state.status === 'loading') return look.CHROME_MUTED;
  if (state.status === 'failed') return look.IFR_HUE;
  return look.CHROME_INK;
};

export const Status = ({ state, registry }: { readonly state: MapState; readonly registry: Registry }): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  return (
    <p
      role="status"
      data-status={state.status}
      style={{
        margin: 0,
        padding: look.CHROME_PAD,
        background: look.CHROME_GROUND,
        color: inkOf(state, look),
        fontFamily: look.FONT_FAMILY,
        fontSize: look.HUD_FONT_SIZE,
        pointerEvents: 'auto',
      }}
    >
      {wordsOf(state)}
    </p>
  );
};
