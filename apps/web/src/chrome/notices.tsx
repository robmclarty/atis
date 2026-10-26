/**
 * notices: the ranked list at the head of the chrome's right-hand column
 * (§5.4, step 34): at most six rows in the map's rank order, never padded
 * (C7), each its numbered box, its target in bold with `+` before an added
 * one (D120), its kind in small caps, its why, and the thresholds that
 * produced it in the muted grey, as the still sheet writes them (D9). A row
 * whose target nothing draws says so, since it hangs no marks and no leader
 * (D148). It is the brutalist material (D12): one monospace face, hard
 * edges, nothing that glows, in the shared tokens read live through the
 * registry (D156). A click on a row flies the camera to where its target is
 * drawn, or, for a target on the shore, brings its group's block in the rail
 * into view (step 39, D153), and while the pointer is over a row the world
 * writes its target's labels, which it writes for nothing unasked (D168).
 */

import {
  CATEGORY_LETTERS,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_PAD,
  CHROME_RULE,
  CHROME_STROKE_WIDTH,
  FONT_FAMILY,
  IFR_HUE,
  LIFR_HUE,
  MVFR_HUE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  NOTICE_LEADING,
  NOTICE_NUMERAL_SIZE,
  NOTICE_ROW_GAP,
  NOTICE_SMALL_SIZE,
  NOTICE_TEXT_GAP,
  NOTICE_TEXT_SIZE,
  SCREEN_TYPE_UP,
  SECONDARY_BOX_WIDTH,
  SHORE_BLOCK_PAD,
  VFR_HUE,
} from 'scene';
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import type { MapJson } from 'core';

import type { Nav } from '../nav.js';
import { categoryHue, rowsOf, tallyOf } from '../notices.js';
import { screenType } from '../screen.js';
import type { Registry } from '../registry.js';
import { destinationOf } from '../walk.js';
import { NoticeBox } from './box.js';
import { useLive } from './live.js';

/** The tokens the list is drawn with, at rest: the shape its live view takes. */
const LOOK = {
  CATEGORY_LETTERS,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_PAD,
  CHROME_RULE,
  CHROME_STROKE_WIDTH,
  FONT_FAMILY,
  IFR_HUE,
  LIFR_HUE,
  MVFR_HUE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  NOTICE_LEADING,
  NOTICE_NUMERAL_SIZE,
  NOTICE_ROW_GAP,
  NOTICE_SMALL_SIZE,
  NOTICE_TEXT_GAP,
  NOTICE_TEXT_SIZE,
  SCREEN_TYPE_UP,
  SECONDARY_BOX_WIDTH,
  SHORE_BLOCK_PAD,
  VFR_HUE,
};

/** The share of the column the list may take before it scrolls, leaving the rail the rest. */
const LIST_SHARE = '50%';

/** Go where a notice's row leads: fly the world to its stop, or bring its shore group's block into view. */
const go = (map: MapJson, rank: number, nav: Nav | undefined): void => {
  const destination = destinationOf(map, rank);
  if (destination?.kind === 'stop') nav?.visit(destination.stop);
  if (destination?.kind === 'group') document.querySelector(`[data-rail] [data-group="${destination.group}"]`)?.scrollIntoView({ block: 'nearest' });
};

/** The ranked list for a map, read live from the registry; with the line to the world, a row's click flies there. */
export const Notices = ({ map, registry, nav }: { readonly map: MapJson; readonly registry: Registry; readonly nav?: Nav | undefined }): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  const rows = useMemo(() => rowsOf(map), [map]);
  const tally = useMemo(() => tallyOf(map), [map]);
  const hue = categoryHue(map.weather.checks.category, look);
  const type = screenType(look);
  const rule = `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}`;
  return (
    <section
      data-notices
      aria-label="notices"
      style={{ flex: '0 1 auto', maxHeight: LIST_SHARE, overflowY: 'auto', borderBottom: rule, color: look.CHROME_INK, fontFamily: look.FONT_FAMILY, fontSize: type.text, lineHeight: look.NOTICE_LEADING }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: look.SHORE_BLOCK_PAD, borderBottom: rule }}>
        <span style={{ fontVariant: 'small-caps' }}>notices</span>
        <span data-tally style={{ color: look.CHROME_MUTED }}>
          {tally}
        </span>
      </header>
      <ol style={{ listStyle: 'none', margin: 0, padding: look.CHROME_PAD, display: 'flex', flexDirection: 'column', gap: look.NOTICE_ROW_GAP }}>
        {rows.map((row) => (
          <li
            key={row.rank}
            data-notice={row.rank}
            data-tier={row.tier}
            data-kind={row.kind}
            data-target={row.target}
            data-unplaced={row.placed ? undefined : 'true'}
            onClick={row.placed ? () => go(map, row.rank, nav) : undefined}
            onMouseEnter={() => nav?.hover(row.target)}
            onMouseLeave={() => nav?.hover(undefined)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: look.NOTICE_TEXT_GAP, cursor: row.placed ? 'pointer' : 'default' }}
          >
            <NoticeBox rank={row.rank} tier={row.tier} look={look} hue={hue} side={type.box} numeral={type.numeral} />
            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <div style={{ fontWeight: 'bold' }}>{row.words}</div>
              <div style={{ fontSize: type.small, fontVariant: 'small-caps' }}>
                {row.kind}
                {!row.placed && (
                  <span data-unplaced-tag style={{ color: look.CHROME_MUTED, marginLeft: look.NOTICE_BOX_GAP }}>
                    unplaced
                  </span>
                )}
              </div>
              <div>{row.why}</div>
              {row.thresholds !== '' && <div style={{ fontSize: type.small, color: look.CHROME_MUTED }}>{row.thresholds}</div>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
