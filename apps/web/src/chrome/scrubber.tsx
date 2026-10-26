/**
 * scrubber: a range's frames in the HUD (D100), a flat strip under the grade
 * blocks on a map of `--range a..b`, absent on a map of one change. Each
 * commit of the range is one tick, oldest first, filled in its frame's flight
 * category hue, so the strip reads as the weather over the range before a
 * step is taken (C11); the frame it stands at is outlined in ink, and beside
 * the ticks it writes that commit's place, short sha and subject. A click on
 * a tick, the two arrows at its ends, or `,` and `.` on the keyboard step it,
 * and each step goes over the line to the world (`nav.ts`), which
 * cross-fades the weather while the terrain holds still (C12, P2). It opens
 * on the last frame, the map's own weather. The brutalist material (D12): one
 * monospace face, hard edges, nothing that glows, every token read live
 * through the registry (D156).
 */

import { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_STROKE_WIDTH, FONT_FAMILY, HUD_BLOCK_GAP, HUD_FONT_SIZE, IFR_HUE, LIFR_HUE, MVFR_HUE, VFR_HUE } from 'scene';
import { useEffect, useSyncExternalStore } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { MapJson } from 'core';

import { captionOf, framesOf, lastFrame, stepped } from '../frames.js';
import type { Nav } from '../nav.js';
import { categoryHue } from '../notices.js';
import type { Registry } from '../registry.js';
import { ownsKey } from '../walk.js';
import { useLive } from './live.js';

/** The tokens the strip is drawn with, at rest: the shape its live view takes. */
const LOOK = { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_STROKE_WIDTH, FONT_FAMILY, HUD_BLOCK_GAP, HUD_FONT_SIZE, IFR_HUE, LIFR_HUE, MVFR_HUE, VFR_HUE };

export const Scrubber = ({ map, registry, nav }: { readonly map: MapJson; readonly registry: Registry; readonly nav: Nav }): ReactElement | null => {
  useLive(registry);
  const look = registry.view(LOOK);
  const frames = framesOf(map);
  const at = useSyncExternalStore(nav.subscribe, nav.frame, nav.frame) ?? lastFrame(map) ?? 0;

  // `,` steps back a commit and `.` on one, unless the key is the focused element's own or the chrome already took it.
  useEffect(() => {
    if (frames.length === 0) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || ownsKey(event.target, event.key)) return;
      const next = stepped(map, nav.frame(), event.key);
      if (next === undefined) return;
      event.preventDefault();
      nav.scrub(next);
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [map, nav, frames.length]);

  if (frames.length === 0) return null;
  const side = look.HUD_FONT_SIZE;
  const arrow: CSSProperties = { font: 'inherit', color: look.CHROME_INK, background: 'transparent', border: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_MUTED}`, padding: '0 6px', cursor: 'pointer' };
  return (
    <nav
      data-scrubber={String(at)}
      aria-label="commits"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: look.HUD_BLOCK_GAP,
        margin: 0,
        padding: `0 ${String(look.CHROME_PAD)}px ${String(look.CHROME_PAD)}px`,
        background: look.CHROME_GROUND,
        color: look.CHROME_INK,
        fontFamily: look.FONT_FAMILY,
        fontSize: look.HUD_FONT_SIZE,
        pointerEvents: 'auto',
      }}
    >
      <button type="button" data-step="back" aria-label="the commit before" disabled={at === 0} onClick={() => nav.scrub(Math.max(0, at - 1))} style={arrow}>
        ‹
      </button>
      {frames.map((frame, index) => (
        <button
          type="button"
          key={frame.commit}
          data-frame={index}
          data-shown={index === at ? 'on' : 'off'}
          aria-label={captionOf(map, index)}
          aria-current={index === at ? 'step' : undefined}
          onClick={() => nav.scrub(index)}
          style={{
            width: side / 2,
            height: side,
            padding: 0,
            boxSizing: 'border-box',
            background: categoryHue(frame.weather.checks.category, look),
            border: `${String(look.CHROME_STROKE_WIDTH)}px solid ${index === at ? look.CHROME_INK : look.CHROME_GROUND}`,
            outline: index === at ? `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_INK}` : 'none',
            cursor: 'pointer',
          }}
        />
      ))}
      <button type="button" data-step="on" aria-label="the commit after" disabled={at === frames.length - 1} onClick={() => nav.scrub(Math.min(frames.length - 1, at + 1))} style={arrow}>
        ›
      </button>
      <span data-caption style={{ whiteSpace: 'nowrap' }}>
        {captionOf(map, at)}
      </span>
    </nav>
  );
};
