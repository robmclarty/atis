/**
 * hud: §7's row of grade blocks across the top of the world, in the
 * brutalist material (D12): flat blocks, hard edges, big numerals, one
 * monospace face, no gradients, never followed by prose. The category block
 * is solid in its hue with the letters on it (C11); every other block is
 * outlined in ink with its label and a bold value, and a muted one is
 * outlined and written in the muted grey with the dash where its number
 * would be (C2, D41). The words are `hud.ts`'s, the still sheet's block for
 * block. The blocks wrap when the screen is narrow, and each opens its parts
 * beneath the row on click, one block at a time, a second click closing it
 * (step 36). Last in the row stands the `key` block, which the world's legend
 * inset folds into (D87, D166): closed at load, so it never covers the world
 * unasked, it opens the legend beneath the row as a block opens its parts,
 * and a second click or Esc folds it away again. Every token is read live
 * through the registry (D156).
 */

import {
  CATEGORY_FONT_SIZE,
  CATEGORY_LETTERS,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_PAD,
  CHROME_STROKE_WIDTH,
  FONT_FAMILY,
  HUD_BLOCK_GAP,
  HUD_BLOCK_HEIGHT,
  HUD_BLOCK_PAD,
  HUD_FONT_SIZE,
  HUD_PAD,
  IFR_HUE,
  LIFR_HUE,
  MVFR_HUE,
  SCREEN_TYPE_UP,
  VFR_HUE,
} from 'scene';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type { MapJson } from 'core';

import { RAIL_WIDTH } from '../fit.js';
import { blocksOf } from '../hud.js';
import { categoryHue } from '../notices.js';
import { partsOf } from '../parts.js';
import type { Registry } from '../registry.js';
import { hudType } from '../screen.js';
import { Legend } from './legend.js';
import { useLive } from './live.js';
import { PartsPanel } from './parts.js';

/** The tokens the row is drawn with, at rest: the shape its live view takes. */
const LOOK = {
  CATEGORY_FONT_SIZE,
  CATEGORY_LETTERS,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_PAD,
  CHROME_STROKE_WIDTH,
  FONT_FAMILY,
  HUD_BLOCK_GAP,
  HUD_BLOCK_HEIGHT,
  HUD_BLOCK_PAD,
  HUD_FONT_SIZE,
  HUD_PAD,
  IFR_HUE,
  LIFR_HUE,
  MVFR_HUE,
  SCREEN_TYPE_UP,
  VFR_HUE,
};

/** What the `key` block opens: the legend, beneath the row where a grade block's parts would be. No grade block has this id. */
const KEY = 'key';

/** The grade blocks for a map, read live from the registry, with the run's token when the map is served (D134), for the raw output a red slot links to. */
export const Hud = ({ map, registry, token }: { readonly map: MapJson; readonly registry: Registry; readonly token?: string | undefined }): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  const blocks = useMemo(() => blocksOf(map), [map]);
  const [open, setOpen] = useState<string | undefined>(undefined);
  const parts = useMemo(() => (open === undefined || open === KEY ? undefined : partsOf(map, open)), [map, open]);
  const hue = categoryHue(map.weather.checks.category, look);
  const type = hudType(look);
  const keyOpen = open === KEY;
  // Esc folds the legend away before the world reads the key: the listener captures it first and marks it handled, so an opened cell stays open.
  useEffect(() => {
    if (!keyOpen) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(undefined);
    };
    globalThis.addEventListener('keydown', onKey, { capture: true });
    return () => globalThis.removeEventListener('keydown', onKey, { capture: true });
  }, [keyOpen]);
  return (
    <div style={{ maxWidth: `calc(100vw - ${String(RAIL_WIDTH)}px)`, boxSizing: 'border-box' }}>
      <nav
        data-hud
        aria-label="grades"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: look.HUD_BLOCK_GAP,
          padding: `${String(look.HUD_PAD)}px ${String(look.CHROME_PAD)}px`,
          background: look.CHROME_GROUND,
          fontFamily: look.FONT_FAMILY,
          pointerEvents: 'auto',
        }}
      >
        {blocks.map((block) => {
          const category = block.id === 'category';
          const ink = block.muted === undefined ? look.CHROME_INK : look.CHROME_MUTED;
          return (
            <button
              type="button"
              key={block.id}
              data-block={block.id}
              data-category={category ? block.value : undefined}
              data-muted={block.muted === undefined ? undefined : 'true'}
              data-reason={block.muted}
              aria-expanded={open === block.id}
              onClick={() => setOpen((was) => (was === block.id ? undefined : block.id))}
              style={{
                // Inline, not flex, so the space between a label and its value is kept.
                display: 'inline-block',
                height: type.height,
                lineHeight: `${String(type.height)}px`,
                padding: `0 ${String(look.HUD_BLOCK_PAD)}px`,
                boxSizing: 'border-box',
                font: 'inherit',
                fontSize: category ? type.category : type.text,
                whiteSpace: 'nowrap',
                background: category ? hue : 'transparent',
                color: category ? look.CATEGORY_LETTERS : ink,
                border: category ? 'none' : `${String(look.CHROME_STROKE_WIDTH)}px solid ${ink}`,
                borderRadius: 0,
                cursor: 'pointer',
              }}
            >
              {block.label !== '' && <span>{block.label} </span>}
              <b>{block.value}</b>
              {block.tail !== '' && <span>{block.tail}</span>}
            </button>
          );
        })}
        <button
          type="button"
          data-hud-key
          aria-expanded={keyOpen}
          aria-label="legend"
          onClick={() => setOpen((was) => (was === KEY ? undefined : KEY))}
          style={{
            display: 'inline-block',
            height: type.height,
            lineHeight: `${String(type.height)}px`,
            padding: `0 ${String(look.HUD_BLOCK_PAD)}px`,
            boxSizing: 'border-box',
            font: 'inherit',
            fontSize: type.text,
            whiteSpace: 'nowrap',
            background: 'transparent',
            color: look.CHROME_INK,
            border: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_INK}`,
            borderRadius: 0,
            cursor: 'pointer',
          }}
        >
          key
        </button>
      </nav>
      {parts !== undefined && <PartsPanel parts={parts} token={token} size={type.text} registry={registry} />}
      {keyOpen && (
        <div style={{ margin: `0 ${String(look.CHROME_PAD)}px`, display: 'flex' }}>
          <Legend registry={registry} />
        </div>
      )}
    </div>
  );
};
