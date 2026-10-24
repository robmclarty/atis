/**
 * rail: the shore as the world shows it, a scrolled column of flat blocks at
 * the tab's right edge (D153), one per group, from the scene's `shoreRail`,
 * so the world and the SVG's band show one shore. The groups the change
 * touched come first and open on their files: a grid of one small square per
 * file (D160), the changed ones first and lit in the change hue as the world
 * stains them, a ghost's dashed, the rest the base tissue's grey, then the
 * changed files and the ghosts named with the same mark. The rest stay
 * collapsed to their name and count, and a click on any header opens or
 * closes its block. A red slot over a group hangs its bolt on the header, the
 * change's in the IFR hue with its slot, standing state grey. It is the
 * brutalist material (D12): one monospace face, hard edges, nothing that
 * glows, drawn in the shared tokens read through the registry (D156). A
 * notice on a shore file, or on a group, wears its numbered box at the end
 * of its group's header, in rank order (step 34, D148), since the shore is
 * chrome and the box is where the notice's leader would land. The rail
 * stands beneath the ranked list in the chrome's column.
 */

import {
  CATEGORY_LETTERS,
  CHANGE_HUE,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_RULE,
  CHROME_STROKE_WIDTH,
  FONT_FAMILY,
  GHOST_STROKE,
  IFR_HUE,
  LIFR_HUE,
  MONO_ADVANCE,
  MVFR_HUE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  NOTICE_NUMERAL_SIZE,
  NOTICE_SMALL_SIZE,
  NOTICE_TEXT_SIZE,
  ORGANELLE_FILL,
  SECONDARY_BOX_WIDTH,
  SHORE_BLOCK_GAP,
  SHORE_BLOCK_PAD,
  SHORE_FONT_SIZE,
  SHORE_GRID_CELL,
  SHORE_GRID_GAP,
  SHORE_LINE,
  STANDING_STORM_FILL,
  VFR_HUE,
  shoreRail,
} from 'scene';
import type { ShoreBlock, ShoreFile, ShoreStorm } from 'scene';
import { useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { MapJson } from 'core';

import { RAIL_WIDTH } from '../fit.js';
import { categoryHue, marksOnShore, screenType } from '../notices.js';
import type { Marked } from '../notices.js';
import type { Registry } from '../registry.js';
import { NoticeBox } from './box.js';
import { useLive } from './live.js';

/** The tokens the rail is drawn with, at rest: the shape its live view takes. */
const LOOK = {
  CATEGORY_LETTERS,
  CHANGE_HUE,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_RULE,
  CHROME_STROKE_WIDTH,
  FONT_FAMILY,
  GHOST_STROKE,
  IFR_HUE,
  LIFR_HUE,
  MONO_ADVANCE,
  MVFR_HUE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  NOTICE_NUMERAL_SIZE,
  NOTICE_SMALL_SIZE,
  NOTICE_TEXT_SIZE,
  ORGANELLE_FILL,
  SECONDARY_BOX_WIDTH,
  SHORE_BLOCK_GAP,
  SHORE_BLOCK_PAD,
  SHORE_FONT_SIZE,
  SHORE_GRID_CELL,
  SHORE_GRID_GAP,
  SHORE_LINE,
  STANDING_STORM_FILL,
  VFR_HUE,
};
type Look = typeof LOOK;

/** The storm bolt, the still sheet's own glyph about its origin, drawn at the line's size. */
const BOLT = 'M1 -6L-3 1H0L-1 6L3 -1H0Z';

/** The words a named file is written with: `+` before an added path, the old path before a renamed one (D40, D120). */
const wordsOf = (file: ShoreFile): string => {
  if (file.change?.kind === 'added') return `+${file.path}`;
  if (file.change?.kind === 'renamed' && file.change.from !== undefined) return `${file.change.from} → ${file.path}`;
  return file.path;
};

/** A path cut from its left to fit `budget` characters, so the file's own name, the end that says most, survives, as the SVG's band cuts it. */
const fitted = (words: string, budget: number): string => (words.length <= budget ? words : `…${words.slice(words.length - Math.max(budget - 1, 1))}`);

/** What kind of mark a file wears. */
const kindOf = (file: ShoreFile): string => file.change?.kind ?? (file.ghost === true ? 'ghost' : 'file');

/** A mark's paint, as the world stains it: filled for an edit, an outline for a deletion, dashed for a rename, a dashed grey ring for a ghost, the base tissue's grey for any other file. */
const paintOf = (file: ShoreFile, look: Look): CSSProperties => {
  const hairline = `${String(look.CHROME_STROKE_WIDTH)}px`;
  if (file.ghost === true) return { border: `${hairline} dashed ${look.GHOST_STROKE}` };
  if (file.change === undefined) return { background: look.ORGANELLE_FILL };
  if (file.change.kind === 'deleted') return { border: `${hairline} solid ${look.CHANGE_HUE}` };
  if (file.change.kind === 'renamed') return { border: `${hairline} dashed ${look.CHANGE_HUE}` };
  return { background: look.CHANGE_HUE };
};

const Storm = ({ storm, look }: { readonly storm: ShoreStorm; readonly look: Look }): ReactElement => (
  <span data-slot={storm.slot} data-change={storm.change ? 'true' : 'false'} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: look.SHORE_BLOCK_GAP }}>
    <svg width={look.SHORE_FONT_SIZE} height={look.SHORE_FONT_SIZE} viewBox="-6 -6 12 12" aria-hidden="true">
      <path d={BOLT} fill={storm.change ? look.IFR_HUE : look.STANDING_STORM_FILL} transform={storm.change ? undefined : 'scale(0.6)'} />
    </svg>
    {storm.change && <span style={{ color: look.IFR_HUE, fontVariant: 'small-caps' }}>{storm.slot}</span>}
  </span>
);

/** The notices' boxes at the end of a block's header, in rank order (D148, D153). */
const Boxes = ({ marked, look, hue }: { readonly marked: readonly Marked[]; readonly look: Look; readonly hue: string }): ReactElement => {
  const type = screenType(look);
  return (
    <span data-marks style={{ display: 'inline-flex', gap: look.NOTICE_BOX_GAP, marginLeft: look.SHORE_BLOCK_GAP }}>
      {marked.map(({ rank, tier }) => (
        <NoticeBox key={rank} rank={rank} tier={tier} look={look} hue={hue} side={type.box} numeral={type.numeral} />
      ))}
    </span>
  );
};

const Block = ({ block, look, marked, hue }: { readonly block: ShoreBlock; readonly look: Look; readonly marked: readonly Marked[]; readonly hue: string }): ReactElement => {
  const [open, setOpen] = useState(block.touched);
  const named = block.files.filter((file) => file.change !== undefined || file.ghost === true);
  const opens = block.touched || named.length > 0;
  const square = { width: look.SHORE_GRID_CELL, height: look.SHORE_GRID_CELL, boxSizing: 'border-box' as const };
  // The characters a name has room for: the rail's width less the padding, the mark and its gap, at the face's widest advance.
  const budget = Math.floor((RAIL_WIDTH - look.CHROME_STROKE_WIDTH - 2 * look.SHORE_BLOCK_PAD - look.SHORE_GRID_CELL - look.SHORE_BLOCK_GAP / 2) / ((look.SHORE_FONT_SIZE + 2) * MONO_ADVANCE));
  return (
    <section
      data-group={block.group}
      data-touched={block.touched || undefined}
      data-loud={block.loud || undefined}
      data-open={(opens && open) || undefined}
      style={{ borderBottom: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}`, outline: block.loud ? `${String(look.SECONDARY_BOX_WIDTH)}px solid ${look.CHROME_INK}` : undefined, outlineOffset: -look.SECONDARY_BOX_WIDTH }}
    >
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        disabled={!opens}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: `${String((look.SHORE_LINE - look.SHORE_FONT_SIZE) / 2)}px ${String(look.SHORE_BLOCK_PAD)}px`,
          font: 'inherit',
          color: look.CHROME_INK,
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: opens ? 'pointer' : 'default',
        }}
      >
        <span style={{ fontVariant: 'small-caps' }}>{block.group}</span>
        <span style={{ color: look.CHROME_MUTED, marginLeft: 4 }}>{block.count}</span>
        {block.storms.map((storm) => (
          <Storm key={storm.slot} storm={storm} look={look} />
        ))}
        {marked.length > 0 && <Boxes marked={marked} look={look} hue={hue} />}
      </button>
      {opens && open && (
        <div style={{ padding: `0 ${String(look.SHORE_BLOCK_PAD)}px ${String(look.SHORE_BLOCK_PAD)}px` }}>
          {block.touched && (
            <div data-grid style={{ display: 'flex', flexWrap: 'wrap', gap: look.SHORE_GRID_GAP, marginBottom: look.SHORE_BLOCK_GAP }}>
              {block.files.map((file) => (
                <span key={file.path} data-file={file.path} data-kind={kindOf(file)} title={file.path} style={{ ...square, ...paintOf(file, look) }} />
              ))}
            </div>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {named.map((file) => (
              <li key={file.path} data-id={file.path} data-kind={kindOf(file)} title={file.path} style={{ display: 'flex', alignItems: 'center', gap: look.SHORE_BLOCK_GAP / 2, lineHeight: `${String(look.SHORE_LINE)}px`, whiteSpace: 'nowrap' }}>
                <span style={{ ...square, borderRadius: '50%', flex: 'none', ...paintOf(file, look) }} />
                <span>{fitted(wordsOf(file), budget)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

/** The shore rail for a map, read live from the registry; it fills what the column leaves it. */
export const Rail = ({ map, registry }: { readonly map: MapJson; readonly registry: Registry }): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  const blocks = useMemo(() => shoreRail(map), [map]);
  const marks = useMemo(() => marksOnShore(map), [map]);
  const hue = categoryHue(map.weather.checks.category, look);
  const files = blocks.reduce((total, block) => total + block.count, 0);
  return (
    <section
      data-rail
      aria-label="shore"
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: look.CHROME_GROUND,
        color: look.CHROME_INK,
        fontFamily: look.FONT_FAMILY,
        fontSize: look.SHORE_FONT_SIZE + 2,
        pointerEvents: 'auto',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: `${String(look.SHORE_BLOCK_PAD)}px`, borderBottom: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}` }}>
        <span style={{ fontVariant: 'small-caps' }}>shore</span>
        <span style={{ color: look.CHROME_MUTED }}>
          {files} files · {blocks.length} groups
        </span>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {blocks.map((block) => (
          <Block key={block.group} block={block} look={look} marked={marks.get(block.group) ?? []} hue={hue} />
        ))}
      </div>
    </section>
  );
};
