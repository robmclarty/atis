/**
 * status: the chrome's first block, a flat line saying where the map is in
 * its load. The chrome is the brutalist material (D12): one monospace face,
 * hard edges, the chrome's own ground and ink from the shared tokens (D130),
 * read through the registry so the dev panel moves them live (D156), and
 * nothing that glows, blurs or grades. While the demo switch is on the line
 * says so, since an opened cell's shapes are then no reading of the map (D202).
 * A map no check was read for says it is structure only, so nobody takes a
 * map with no weather on it for a clean one (C2), and a page whose run
 * watches the repository says it is live, and that a map is being rebuilt
 * while one is (D106, D208 (side-panels), D336 (watch-says)). A run with no
 * watch says neither, though its socket is open, since nothing follows the
 * repository for it. A map that departs from its approved shape says by how
 * many departures, so the count is on the first frame wherever the column
 * is scrolled to (D339 (departures-in-status)).
 */

import { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, FONT_FAMILY, HUD_FONT_SIZE, IFR_HUE } from 'scene';
import type { ReactElement } from 'react';

import type { MapState } from '../load.js';
import type { Registry } from '../registry.js';
import { useLive } from './live.js';

/** The tokens the line is drawn with, at rest: the shape its live view takes. */
const LOOK = { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, FONT_FAMILY, HUD_FONT_SIZE, IFR_HUE };

/** What the line adds while `?shapes=demo` is on (D202). */
const SHAPES_DEMO_WORDS = 'shapes: demo';

/** What the line adds for a map read with no `.check/` trusted: it shows the repo's structure and no check's verdict. */
const STRUCTURE_ONLY_WORDS = 'structure only: no checks ran';

/** What the line adds while the run's watch follows the repository. */
const LIVE_WORDS = 'live';

/** What the line adds while the watch measures a map the repository moved to. */
const REBUILDING_WORDS = 'rebuilding';

/** How many departures from its approved shape a map tells; none for a map that keeps its shape, has none approved, or is not read yet. */
const departuresOf = (state: MapState): number => (state.status === 'ready' ? (state.map.approved?.departures.length ?? 0) : 0);

/** What the line adds for a map that departs from its approved shape. */
const departedWords = (count: number): string => `${String(count)} ${count === 1 ? 'departure' : 'departures'} from the approved shape`;

/** What stands between the line's parts. */
const BETWEEN = ' · ';

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

type StatusProps = {
  readonly state: MapState;
  readonly registry: Registry;
  readonly shapes?: 'demo' | undefined;
  /** Whether the run's watch follows the repository (D106, D336 (watch-says)). The line says `live` while it does, and nothing of it otherwise. */
  readonly live?: boolean | undefined;
  /** Whether the watch is measuring a map the repository moved to; the line says `rebuilding` after `live` until it is done. */
  readonly rebuilding?: boolean | undefined;
};

export const Status = ({ state, registry, shapes, live, rebuilding }: StatusProps): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  const structureOnly = state.status === 'ready' && state.map.meta.instruments.mode !== 'check';
  const departed = departuresOf(state);
  const building = live === true && rebuilding === true;
  const words = [wordsOf(state), ...(structureOnly ? [STRUCTURE_ONLY_WORDS] : []), ...(shapes === undefined ? [] : [SHAPES_DEMO_WORDS]), ...(departed === 0 ? [] : [departedWords(departed)]), ...(live === true ? [LIVE_WORDS] : []), ...(building ? [REBUILDING_WORDS] : [])];
  return (
    <p
      role="status"
      data-status={state.status}
      {...(shapes === undefined ? {} : { 'data-shapes': shapes })}
      {...(structureOnly ? { 'data-structure-only': '' } : {})}
      {...(departed === 0 ? {} : { 'data-departed': String(departed) })}
      {...(live === true ? { 'data-live': '' } : {})}
      {...(building ? { 'data-rebuilding': '' } : {})}
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
      {words.join(BETWEEN)}
    </p>
  );
};
