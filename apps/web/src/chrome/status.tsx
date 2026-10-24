/**
 * status: the chrome's first block, a flat line saying where the map is in
 * its load. The chrome is the brutalist material (D12): one monospace face,
 * hard edges, the chrome's own ground and ink from the shared tokens (D130),
 * and nothing that glows, blurs or grades.
 */

import { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, FONT_FAMILY, HUD_FONT_SIZE, IFR_HUE } from 'scene';
import type { ReactElement } from 'react';

import type { MapState } from '../load.js';

/** What the line says for each state: the map's repo and base once it is read, else where it is coming from or why it did not. */
const wordsOf = (state: MapState): string => {
  if (state.status === 'loading') return `reading ${state.url}`;
  if (state.status === 'failed') return `no map from ${state.url}: ${state.reason}`;
  return `${state.map.meta.repo} against ${state.map.meta.base}`;
};

const INK: Readonly<Record<MapState['status'], string>> = {
  loading: CHROME_MUTED,
  ready: CHROME_INK,
  failed: IFR_HUE,
};

export const Status = ({ state }: { readonly state: MapState }): ReactElement => (
  <p
    role="status"
    data-status={state.status}
    style={{
      margin: 0,
      padding: CHROME_PAD,
      background: CHROME_GROUND,
      color: INK[state.status],
      fontFamily: FONT_FAMILY,
      fontSize: HUD_FONT_SIZE,
    }}
  >
    {wordsOf(state)}
  </p>
);
