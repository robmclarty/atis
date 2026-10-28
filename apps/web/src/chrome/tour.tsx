/**
 * tour: the stepper a served tour plays in (D112, D183), a flat strip under
 * the breadcrumb, absent when no tour is served. It opens on how many stops
 * the tour has; its arrows step through them in the tour's order, and each
 * step asks the world, over the line (`nav.ts`), to fly to the stop's target,
 * write its labels and flare the notice it explains, as a highlight does
 * (D178), while the strip writes the notice's rank and target and the stop's
 * one sentence beneath them. A tour written for another base or head, as a
 * pushed map or a switched base can leave it, plays nothing and says so in one
 * muted line. The brutalist material (D12): one monospace face, hard edges,
 * nothing that glows, every token read live through the registry (D156); the
 * sentence's measure, 60 characters, is the one look baked in.
 */

import { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_STROKE_WIDTH, FONT_FAMILY, HUD_BLOCK_GAP, HUD_FONT_SIZE, NOTICE_LEADING } from 'scene';
import { useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { MapJson } from 'core';

import type { Nav } from '../nav.js';
import type { Registry } from '../registry.js';
import { playable, stopHighlight, tourFits } from '../tour.js';
import type { Tour } from '../tour.js';
import { useLive } from './live.js';

/** The tokens the strip is drawn with, at rest: the shape its live view takes. */
const LOOK = { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_STROKE_WIDTH, FONT_FAMILY, HUD_BLOCK_GAP, HUD_FONT_SIZE, NOTICE_LEADING };

/** How wide the stop's sentence runs before it wraps. */
const MEASURE = '60ch';

/** `1 stop`, `6 stops`. */
const stopsOf = (count: number): string => `${String(count)} ${count === 1 ? 'stop' : 'stops'}`;

export const TourStepper = ({ map, tour, registry, nav }: { readonly map: MapJson; readonly tour: Tour; readonly registry: Registry; readonly nav: Nav }): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  const stops = useMemo(() => playable(map, tour), [map, tour]);
  // The stop the strip stands at, none before the first step; held to the stops this map plays.
  const [at, setAt] = useState<number | undefined>(undefined);
  const here = at === undefined || stops.length === 0 ? undefined : Math.min(at, stops.length - 1);
  const stop = here === undefined ? undefined : stops[here];
  const strip: CSSProperties = {
    margin: 0,
    padding: `0 ${String(look.CHROME_PAD)}px ${String(look.CHROME_PAD)}px`,
    background: look.CHROME_GROUND,
    color: look.CHROME_INK,
    fontFamily: look.FONT_FAMILY,
    fontSize: look.HUD_FONT_SIZE,
    pointerEvents: 'auto',
  };
  if (!tourFits(map, tour) || stops.length === 0) {
    return (
      <section data-tour="none" aria-label="tour" style={{ ...strip, color: look.CHROME_MUTED }}>
        {tourFits(map, tour) ? 'tour · no stop of it lands on this map' : `tour · written for ${tour.base}..${tour.head.slice(0, 7)}, not this map`}
      </section>
    );
  }
  const go = (index: number): void => {
    const next = stops[index];
    if (next === undefined) return;
    setAt(index);
    nav.highlight(stopHighlight(next));
  };
  const arrow: CSSProperties = { font: 'inherit', color: look.CHROME_INK, background: 'transparent', border: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_MUTED}`, padding: '0 6px', cursor: 'pointer' };
  return (
    <section data-tour={here === undefined ? 'start' : String(here + 1)} aria-label="tour" style={strip}>
      <div style={{ display: 'flex', alignItems: 'center', gap: look.HUD_BLOCK_GAP }}>
        <button type="button" data-tour-step="back" aria-label="the stop before" disabled={here === undefined || here === 0} onClick={() => go((here ?? 1) - 1)} style={arrow}>
          ‹
        </button>
        <span data-tour-place>{here === undefined ? `tour · ${stopsOf(stops.length)}` : `tour · ${String(here + 1)} of ${String(stops.length)}`}</span>
        <button type="button" data-tour-step="on" aria-label={here === undefined ? 'the first stop' : 'the stop after'} disabled={here === stops.length - 1} onClick={() => go(here === undefined ? 0 : here + 1)} style={arrow}>
          ›
        </button>
      </div>
      {stop !== undefined && (
        <div data-tour-stop={stop.target} style={{ maxWidth: MEASURE, marginTop: look.CHROME_PAD / 2, lineHeight: look.NOTICE_LEADING }}>
          <div data-tour-notice={stop.notice} style={{ color: look.CHROME_MUTED }}>
            notice {stop.notice} · {stop.target}
          </div>
          <p data-tour-sentence style={{ margin: 0 }}>
            {stop.sentence}
          </p>
        </div>
      )}
    </section>
  );
};
