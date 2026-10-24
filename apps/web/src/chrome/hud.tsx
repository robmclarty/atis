/**
 * hud: §7's row of grade blocks across the top of the world, in the
 * brutalist material (D12): flat blocks, hard edges, big numerals, one
 * monospace face, no gradients, never followed by prose. The category block
 * is solid in its hue with the letters on it (C11); every other block is
 * outlined in ink with its label and a bold value, and a muted one is
 * outlined and written in the muted grey with the dash where its number
 * would be (C2, D41). The words are `hud.ts`'s, the still sheet's block for
 * block. The blocks wrap when the screen is narrow, and each opens its parts
 * on click from step 36. Every token is read live through the registry
 * (D156).
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
  VFR_HUE,
} from 'scene';
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import type { MapJson } from 'core';

import { RAIL_WIDTH } from '../fit.js';
import { blocksOf } from '../hud.js';
import { categoryHue } from '../notices.js';
import type { Registry } from '../registry.js';
import { hudType } from '../screen.js';
import { useLive } from './live.js';

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
  VFR_HUE,
};

/** The grade blocks for a map, read live from the registry. */
export const Hud = ({ map, registry }: { readonly map: MapJson; readonly registry: Registry }): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  const blocks = useMemo(() => blocksOf(map), [map]);
  const hue = categoryHue(map.weather.checks.category, look);
  const type = hudType(look);
  return (
    <nav
      data-hud
      aria-label="grades"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: look.HUD_BLOCK_GAP,
        maxWidth: `calc(100vw - ${String(RAIL_WIDTH)}px)`,
        boxSizing: 'border-box',
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
          <span
            key={block.id}
            data-block={block.id}
            data-category={category ? block.value : undefined}
            data-muted={block.muted === undefined ? undefined : 'true'}
            data-reason={block.muted}
            style={{
              // Inline, not flex, so the space between a label and its value is kept.
              display: 'inline-block',
              height: type.height,
              lineHeight: `${String(type.height)}px`,
              padding: `0 ${String(look.HUD_BLOCK_PAD)}px`,
              boxSizing: 'border-box',
              fontSize: category ? type.category : type.text,
              whiteSpace: 'nowrap',
              background: category ? hue : 'transparent',
              color: category ? look.CATEGORY_LETTERS : ink,
              border: category ? 'none' : `${String(look.CHROME_STROKE_WIDTH)}px solid ${ink}`,
            }}
          >
            {block.label !== '' && <span>{block.label} </span>}
            <b>{block.value}</b>
            {block.tail !== '' && <span>{block.tail}</span>}
          </span>
        );
      })}
    </nav>
  );
};
