/**
 * notices: the six notices as the world draws them (§5.4, step 34), worked
 * out from the scene's anchors (D148) into flat records the GPU, the labels
 * layer and the chrome each read: where each notice's marks hang on the
 * field, the run of numbered boxes at each target, the rows of the ranked
 * list, and the boxes a shore group's block wears in the rail (D153). The
 * tiers take §5.4's channels: the primary's halo breathes and flares in the
 * category hue with its kind written under its boxes, a secondary wears a
 * thick ring in the leaders' grey (D72), and a tertiary its box alone. The
 * category hue is the one saturated hue the chrome borrows (C11), and the
 * boxes are the chrome's material wherever they land (D12). Pure: no three,
 * no DOM, no React, so a test reads the records straight.
 */

import { STITCH_LENGTH, noticeAnchors } from 'scene';
import type { NoticeAnchor } from 'scene';
import type { FlightCategory, MapJson, Notice, NoticeTier } from 'core';

/** What an added file's path is written with, wherever the map writes it (D120). */
const ADDED = '+';
/** The tier separator in a tally, and between a notice's thresholds. */
const DOT = '·';

/** A point on the layout with the radius of what is drawn there. */
type Spot = { readonly x: number; readonly y: number; readonly r: number };

/**
 * Where a notice's marks hang on the field, from the scene's anchor: a
 * placed file; the stitch a test file draws, ringed at half a stitch's
 * length as the still sheet rings it; a cell by the middle of its skin. A
 * shore group has no spot: its block in the rail wears the boxes instead.
 */
const spotOf = (anchor: NoticeAnchor | undefined, map: MapJson): Spot | undefined => {
  if (anchor === undefined || anchor.kind === 'group') return undefined;
  if (anchor.kind === 'organelle') return { x: anchor.x, y: anchor.y, r: anchor.r };
  if (anchor.kind === 'stitch') return { x: anchor.x, y: anchor.y, r: STITCH_LENGTH / 2 };
  const contour = map.terrain.layout?.contours?.[anchor.cell] ?? [];
  if (contour.length === 0) return undefined;
  return {
    x: contour.reduce((total, [px]) => total + px, 0) / contour.length,
    y: contour.reduce((total, [, py]) => total + py, 0) / contour.length,
    r: 0,
  };
};

/** A notice's rank and tier, which is all a box needs. */
export type Marked = { readonly rank: number; readonly tier: NoticeTier };

/**
 * A run of boxes at one target: its spot, the notices on it in rank order,
 * the strongest tier among them, which is the one emphasis the target wears,
 * the index of the notice whose light the scheduler moves it by, and the
 * primary's kind when the primary is among them.
 */
export type Run = {
  readonly target: string;
  readonly spot: Spot;
  readonly marked: readonly Marked[];
  readonly strongest: NoticeTier;
  readonly light: number;
  readonly primaryKind?: string;
};

const ORDER: Readonly<Record<NoticeTier, number>> = { primary: 0, secondary: 1, tertiary: 2 };

/** The strongest tier among a target's notices. */
const strongestOf = (marked: readonly Marked[]): NoticeTier => marked.reduce<NoticeTier>((best, each) => (ORDER[each.tier] < ORDER[best] ? each.tier : best), 'tertiary');

/** Each target's run, in the order the targets first appear in the list, so the primary's comes first. */
export const runsOf = (map: MapJson): readonly Run[] => {
  const runs = new Map<string, { readonly spot: Spot; readonly marked: Marked[]; primaryKind?: string }>();
  for (const { rank, notice, anchor } of noticeAnchors(map)) {
    const spot = spotOf(anchor, map);
    if (spot === undefined) continue;
    const held = runs.get(notice.target) ?? { spot, marked: [] };
    held.marked.push({ rank, tier: notice.tier });
    if (notice.tier === 'primary') held.primaryKind = notice.kind;
    runs.set(notice.target, held);
  }
  return [...runs].map(([target, { spot, marked, primaryKind }]): Run => {
    const strongest = strongestOf(marked);
    const leading = marked.find((each) => each.tier === strongest) ?? marked[0];
    return { target, spot, marked, strongest, light: (leading?.rank ?? 1) - 1, ...(primaryKind === undefined ? {} : { primaryKind }) };
  });
};

/** One row of the ranked list: the target as the map names it and as it is written (D120), and whether anything draws it. */
export type Row = {
  readonly rank: number;
  readonly tier: NoticeTier;
  readonly kind: string;
  readonly target: string;
  readonly words: string;
  readonly why: string;
  readonly thresholds: string;
  readonly placed: boolean;
};

/** The thresholds that produced a notice, as `key value` pairs in the map's order (D9), as the still sheet writes them. */
export const thresholdsOf = (notice: Notice): string =>
  Object.entries(notice.thresholds)
    .map(([key, value]) => `${key} ${String(value)}`)
    .join(` ${DOT} `);

/** The ranked list's rows (C7): at most six, in the map's order, never padded. */
export const rowsOf = (map: MapJson): readonly Row[] => {
  const added = new Set(map.weather.changed.filter((file) => file.kind === 'added').map((file) => file.path));
  return noticeAnchors(map).map(
    ({ rank, notice, anchor }): Row => ({
      rank,
      tier: notice.tier,
      kind: notice.kind,
      target: notice.target,
      words: added.has(notice.target) ? `${ADDED}${notice.target}` : notice.target,
      why: notice.why,
      thresholds: thresholdsOf(notice),
      placed: anchor !== undefined,
    }),
  );
};

/** The tally the chrome writes for the list: how many of each tier it holds, `1·2·3` (C7). */
export const tallyOf = (map: MapJson): string => {
  const counts: Record<NoticeTier, number> = { primary: 0, secondary: 0, tertiary: 0 };
  for (const { notice } of noticeAnchors(map)) counts[notice.tier] += 1;
  return [counts.primary, counts.secondary, counts.tertiary].map(String).join(DOT);
};

/** The boxes each shore group's block wears, from every notice on the group or a file on it, in rank order (D153). */
export const marksOnShore = (map: MapJson): ReadonlyMap<string, readonly Marked[]> => {
  const held = new Map<string, Marked[]>();
  for (const { rank, notice, anchor } of noticeAnchors(map)) {
    if (anchor?.kind !== 'group') continue;
    const marks = held.get(anchor.group) ?? [];
    marks.push({ rank, tier: notice.tier });
    held.set(anchor.group, marks);
  }
  return held;
};

/** The tokens a category's hue is read from. */
export type CategoryLook = {
  readonly VFR_HUE: string;
  readonly MVFR_HUE: string;
  readonly IFR_HUE: string;
  readonly LIFR_HUE: string;
  readonly CHROME_MUTED: string;
};

/** The token each category's hue is (§5.3, D6); NOINST has none and takes the muted grey, with the letters still on it. */
export const CATEGORY_TOKEN: Readonly<Record<FlightCategory, keyof CategoryLook>> = {
  VFR: 'VFR_HUE',
  MVFR: 'MVFR_HUE',
  IFR: 'IFR_HUE',
  LIFR: 'LIFR_HUE',
  NOINST: 'CHROME_MUTED',
};

/** The hue a map's category is drawn in, live from the look. */
export const categoryHue = (category: FlightCategory, look: CategoryLook): string => look[CATEGORY_TOKEN[category]];

/** The tokens a numbered box is drawn with. */
export type BoxLook = {
  readonly CHROME_GROUND: string;
  readonly CHROME_INK: string;
  readonly CHROME_MUTED: string;
  readonly CHROME_STROKE_WIDTH: number;
  readonly SECONDARY_BOX_WIDTH: number;
  readonly CATEGORY_LETTERS: string;
  readonly FONT_FAMILY: string;
};

/** A box's style, in the form both React and a bare element take. */
export type BoxStyle = {
  readonly display: 'inline-flex';
  readonly alignItems: 'center';
  readonly justifyContent: 'center';
  readonly flex: 'none';
  readonly width: string;
  readonly height: string;
  readonly boxSizing: 'border-box';
  readonly background: string;
  readonly border: string;
  readonly color: string;
  readonly font: string;
  readonly lineHeight: string;
};

/**
 * The numbered box as the still sheet draws it: solid in the hue for the
 * primary with the letters' ink on it, a thick ink frame for a secondary, a
 * thin muted frame for a tertiary, the numeral bold and centred.
 */
export const boxStyle = (tier: NoticeTier, look: BoxLook, hue: string, side: number, numeral: number): BoxStyle => {
  const solid = tier === 'primary';
  const frame = tier === 'secondary' ? `${String(look.SECONDARY_BOX_WIDTH)}px solid ${look.CHROME_INK}` : `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_MUTED}`;
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
    width: `${String(side)}px`,
    height: `${String(side)}px`,
    boxSizing: 'border-box',
    background: solid ? hue : look.CHROME_GROUND,
    border: solid ? 'none' : frame,
    color: solid ? look.CATEGORY_LETTERS : look.CHROME_INK,
    font: `bold ${String(numeral)}px ${look.FONT_FAMILY}`,
    lineHeight: '1',
  };
};
