/**
 * legend: the key every map carries in its chrome (D87), an inset at the
 * world's bottom left: a hairline frame, a small-caps title, one numbered row
 * per mark with a small sample of the mark beside a few words on what it
 * measures, and last the key of the seven shapes (D146). The rows and their
 * words are `hud.ts`'s, the still sheet's row for row, and the samples are
 * the world's own shapes and inks drawn flat (D12): no opacity, no blur, no
 * pattern, the one translucent ink the world draws laid already flattened
 * over the chrome's ground. The samples are drawn in the sheet's units and
 * shown at the scale that makes them read at the words' size.
 */

import {
  CALLOUT_FONT_SIZE,
  CALLOUT_R,
  CATEGORY_LETTERS,
  CHANGE_HUE,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_PAD,
  CHROME_STROKE_WIDTH,
  EVIDENCE_LIGHT,
  FONT_FAMILY,
  GHOST_DASH,
  GHOST_PAD,
  GHOST_STROKE,
  IFR_HUE,
  INTEGRITY_CLOSED_OPACITY,
  INTEGRITY_CLOSED_WIDTH,
  INTEGRITY_GAP_WIDTH,
  INTEGRITY_PAD,
  LEGEND_FONT_SIZE,
  LEGEND_KEY_PITCH,
  LEGEND_PAD,
  LEGEND_ROW,
  LEGEND_SAMPLE_R,
  LEGEND_SLOT,
  LIFR_HUE,
  MAX_RULES,
  MUTANT_NOTCH_DEPTH,
  MUTANT_NOTCH_WIDTH,
  MVFR_HUE,
  ORGANELLE_FILL,
  ORGANELLE_STROKE,
  ORGANELLE_STROKE_WIDTH,
  STANDING_STORM_FILL,
  STANDING_STORM_SCALE,
  STITCH_LENGTH,
  STITCH_SPACING,
  STITCH_TEAR,
  STITCH_UNLIT,
  STITCH_WIDTH,
  VFR_HUE,
  outlineOf,
} from 'scene';
import { useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { LEGEND, SHAPE_KEY_WORDS, over } from '../hud.js';
import type { Registry } from '../registry.js';
import { legendType } from '../screen.js';
import { BOLT } from './glyphs.js';
import { useLive } from './live.js';

/** The tokens the inset is drawn with, at rest: the shape its live view takes. */
const LOOK = {
  CALLOUT_FONT_SIZE,
  CALLOUT_R,
  CATEGORY_LETTERS,
  CHANGE_HUE,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_PAD,
  CHROME_STROKE_WIDTH,
  EVIDENCE_LIGHT,
  FONT_FAMILY,
  GHOST_DASH,
  GHOST_PAD,
  GHOST_STROKE,
  IFR_HUE,
  INTEGRITY_CLOSED_OPACITY,
  INTEGRITY_CLOSED_WIDTH,
  INTEGRITY_GAP_WIDTH,
  INTEGRITY_PAD,
  LEGEND_FONT_SIZE,
  LEGEND_KEY_PITCH,
  LEGEND_PAD,
  LEGEND_ROW,
  LEGEND_SAMPLE_R,
  LEGEND_SLOT,
  LIFR_HUE,
  MUTANT_NOTCH_DEPTH,
  MUTANT_NOTCH_WIDTH,
  MVFR_HUE,
  ORGANELLE_FILL,
  ORGANELLE_STROKE,
  ORGANELLE_STROKE_WIDTH,
  STANDING_STORM_FILL,
  STANDING_STORM_SCALE,
  STITCH_LENGTH,
  STITCH_SPACING,
  STITCH_TEAR,
  STITCH_UNLIT,
  STITCH_WIDTH,
  VFR_HUE,
};
type Look = typeof LOOK;

/** The category scale the first row draws, each block solid in its hue with its letters on it (C11). */
const CATEGORIES: readonly (readonly [string, keyof Look])[] = [
  ['VFR', 'VFR_HUE'],
  ['MVFR', 'MVFR_HUE'],
  ['IFR', 'IFR_HUE'],
  ['LIFR', 'LIFR_HUE'],
];

const TOP = -Math.PI / 2;
const BOTTOM = Math.PI / 2;
/** How much of the sample skin the lit arc takes, from the top clockwise. */
const ARC_SHARE = 0.4;
/** The stitch sample's three statuses, as the map writes them, left to right. */
const STITCHES: readonly string[] = ['passed', 'not-run', 'failed'];

/** A ring of points as a path. */
const pathOf = (ring: readonly (readonly [number, number])[]): string => {
  const [first, ...rest] = ring;
  if (first === undefined) return '';
  return `M${String(first[0])} ${String(first[1])}${rest.map(([x, y]) => `L${String(x)} ${String(y)}`).join('')}Z`;
};

/** The point `radius` out from the origin at `angle`. */
const onRing = (angle: number, radius: number): readonly [number, number] => [radius * Math.cos(angle), radius * Math.sin(angle)];

/** A sample's file: a disc at the sample radius, base tissue unless stained. */
const File = ({ look, fill = look.ORGANELLE_FILL }: { readonly look: Look; readonly fill?: string }): ReactElement => (
  <circle r={look.LEGEND_SAMPLE_R} fill={fill} stroke={look.ORGANELLE_STROKE} strokeWidth={look.ORGANELLE_STROKE_WIDTH} />
);

/** A sample's skin: a ring past the file at the evidence pad, in `stroke` at `width`. */
const Skin = ({ look, stroke, width }: { readonly look: Look; readonly stroke: string; readonly width: number }): ReactElement => (
  <circle r={look.LEGEND_SAMPLE_R + look.INTEGRITY_PAD} fill="none" stroke={stroke} strokeWidth={width} />
);

/** The world's dim hairline, flat: the evidence light at the hairline's strength over the chrome's ground. */
const Hairline = ({ look }: { readonly look: Look }): ReactElement => <Skin look={look} stroke={over(look.EVIDENCE_LIGHT, look.CHROME_GROUND, look.INTEGRITY_CLOSED_OPACITY)} width={look.INTEGRITY_CLOSED_WIDTH} />;

/** A stitch's ink by its status: the evidence light for a pass, IFR for a tear, unlit grey for a test not run. */
const stitchStroke = (status: string, look: Look): string => (status === 'passed' ? look.EVIDENCE_LIGHT : status === 'failed' ? look.IFR_HUE : look.STITCH_UNLIT);

/** One stitch across the sample's edge on its spoke; torn, it breaks either side of the edge. */
const Stitch = ({ look, angle, status }: { readonly look: Look; readonly angle: number; readonly status: string }): ReactElement => {
  const half = look.STITCH_LENGTH / 2;
  const r = look.LEGEND_SAMPLE_R;
  const spans: readonly (readonly [number, number])[] = status === 'failed' ? [[-half, -look.STITCH_TEAR / 2], [look.STITCH_TEAR / 2, half]] : [[-half, half]];
  return (
    <>
      {spans.map(([from, to]) => {
        const [x1, y1] = onRing(angle, r + from);
        const [x2, y2] = onRing(angle, r + to);
        return <line key={from} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stitchStroke(status, look)} strokeWidth={look.STITCH_WIDTH} />;
      })}
    </>
  );
};

/** The notch a mutant cuts: a wedge from past the skin to inside the file, at the top. */
const Notch = ({ look }: { readonly look: Look }): ReactElement => {
  const outer = look.LEGEND_SAMPLE_R + look.INTEGRITY_PAD + look.INTEGRITY_GAP_WIDTH / 2;
  const half = look.MUTANT_NOTCH_WIDTH / 2;
  const [bx, by] = onRing(TOP, outer);
  const [tx, ty] = [-Math.sin(TOP) * half, Math.cos(TOP) * half];
  return <path d={pathOf([[bx - tx, by - ty], onRing(TOP, look.LEGEND_SAMPLE_R - look.MUTANT_NOTCH_DEPTH), [bx + tx, by + ty]])} fill={look.EVIDENCE_LIGHT} />;
};

/** Each mark's sample, drawn about the origin in the sheet's units; the category's is a scale of flat blocks instead. */
const sampleOf = (id: string, look: Look): ReactNode => {
  switch (id) {
    case 'lit-arc':
      return (
        <>
          <File look={look} />
          <Hairline look={look} />
          <circle r={look.LEGEND_SAMPLE_R + look.INTEGRITY_PAD} fill="none" stroke={look.EVIDENCE_LIGHT} strokeWidth={look.INTEGRITY_GAP_WIDTH} pathLength={1} strokeDasharray={`${String(ARC_SHARE)} 1`} transform="rotate(-90)" />
        </>
      );
    case 'hairline':
      return (
        <>
          <File look={look} />
          <Hairline look={look} />
        </>
      );
    case 'notch':
      return (
        <>
          <File look={look} />
          <Hairline look={look} />
          <Notch look={look} />
        </>
      );
    case 'stitches':
      return (
        <>
          <File look={look} />
          {STITCHES.map((status, index) => (
            <Stitch key={status} look={look} angle={BOTTOM + (index - 1) * look.STITCH_SPACING} status={status} />
          ))}
        </>
      );
    case 'red-bolt':
      return <path d={BOLT} fill={look.IFR_HUE} />;
    case 'grey-bolt':
      return <path d={BOLT} fill={look.STANDING_STORM_FILL} transform={`scale(${String(look.STANDING_STORM_SCALE)})`} />;
    case 'ghost':
      return (
        <>
          <File look={look} />
          <circle r={look.LEGEND_SAMPLE_R + look.GHOST_PAD} fill="none" stroke={look.GHOST_STROKE} strokeDasharray={look.GHOST_DASH} />
        </>
      );
    case 'stain':
      return <File look={look} fill={look.CHANGE_HUE} />;
    case 'unmeasured':
      return (
        <>
          <File look={look} />
          <Hairline look={look} />
          <Skin look={look} stroke={look.EVIDENCE_LIGHT} width={look.INTEGRITY_GAP_WIDTH} />
        </>
      );
    default:
      return null;
  }
};

/** A sample in its slot: an SVG of the slot's size in the sheet's units, shown at the screen's scale, its origin at the centre. */
const Sample = ({ look, scale, width = look.LEGEND_SLOT, children }: { readonly look: Look; readonly scale: number; readonly width?: number; readonly children: ReactNode }): ReactElement => (
  <svg width={width * scale} height={look.LEGEND_ROW * scale} viewBox={`${String(-width / 2)} ${String(-look.LEGEND_ROW / 2)} ${String(width)} ${String(look.LEGEND_ROW)}`} aria-hidden="true" style={{ flex: 'none' }}>
    {children}
  </svg>
);

/** The numbered balloon a legend row wears: the number in a ring of the chrome's ink, on its ground. */
const Balloon = ({ number, look, scale }: { readonly number: number; readonly look: Look; readonly scale: number }): ReactElement => (
  <span
    data-balloon={number}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      width: 2 * look.CALLOUT_R * scale,
      height: 2 * look.CALLOUT_R * scale,
      boxSizing: 'border-box',
      borderRadius: '50%',
      border: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_INK}`,
      background: look.CHROME_GROUND,
      color: look.CHROME_INK,
      font: `bold ${String(look.CALLOUT_FONT_SIZE * scale)}px ${look.FONT_FAMILY}`,
    }}
  >
    {number}
  </span>
);

/** The key of the seven shapes (D146): one file at each rule count, 0 to 6 from the left, drawn by the scene's `outlineOf` at rest, then the words. */
const ShapeKey = ({ look, scale }: { readonly look: Look; readonly scale: number }): ReactElement => {
  const forms = useMemo(() => Array.from({ length: MAX_RULES + 1 }, (_, rules) => outlineOf(`legend-key-${String(rules)}`, { x: 0, y: 0, r: LEGEND_SAMPLE_R }, rules)), []);
  const style = { fill: look.ORGANELLE_FILL, stroke: look.ORGANELLE_STROKE, strokeWidth: look.ORGANELLE_STROKE_WIDTH };
  return (
    <div data-key="shapes" style={{ display: 'flex', alignItems: 'center', gap: look.LEGEND_PAD * scale }}>
      <span style={{ display: 'inline-flex' }}>
        {forms.map((outline, rules) => (
          <Sample key={rules} look={look} scale={scale} width={look.LEGEND_KEY_PITCH}>
            <g data-rules={rules}>
              {rules === 0 ? <circle r={look.LEGEND_SAMPLE_R} {...style} /> : <path d={pathOf(outline.ring)} {...style} />}
              {outline.bulbs.map((bulb) => (
                <circle key={`${String(bulb.x)},${String(bulb.y)}`} cx={bulb.x} cy={bulb.y} r={bulb.r} {...style} />
              ))}
            </g>
          </Sample>
        ))}
      </span>
      <span>{SHAPE_KEY_WORDS}</span>
    </div>
  );
};

/** The legend inset, read live from the registry. */
export const Legend = ({ registry }: { readonly registry: Registry }): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  const { text, scale } = legendType(look);
  const row = { display: 'flex', alignItems: 'center', gap: look.LEGEND_PAD * scale, height: look.LEGEND_ROW * scale } as const;
  return (
    <aside
      data-legend
      aria-label="legend"
      style={{
        position: 'fixed',
        left: look.CHROME_PAD,
        bottom: look.CHROME_PAD,
        padding: look.LEGEND_PAD * scale,
        boxSizing: 'border-box',
        background: look.CHROME_GROUND,
        color: look.CHROME_INK,
        border: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_MUTED}`,
        fontFamily: look.FONT_FAMILY,
        fontSize: text,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ fontVariant: 'small-caps', color: look.CHROME_MUTED }}>legend</div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {LEGEND.map((mark, index) => (
          <li key={mark.id} data-mark={mark.id} style={row}>
            <Balloon number={index + 1} look={look} scale={scale} />
            {mark.id === 'category' ? (
              <span style={{ display: 'inline-flex', gap: look.CHROME_STROKE_WIDTH }}>
                {CATEGORIES.map(([letters, token]) => (
                  <span key={letters} style={{ padding: `0 ${String((look.LEGEND_PAD / 2) * scale)}px`, lineHeight: `${String(2 * text)}px`, background: look[token], color: look.CATEGORY_LETTERS, fontWeight: 'bold' }}>
                    {letters}
                  </span>
                ))}
              </span>
            ) : (
              <Sample look={look} scale={scale}>
                {sampleOf(mark.id, look)}
              </Sample>
            )}
            <span>{mark.words}</span>
          </li>
        ))}
      </ol>
      <ShapeKey look={look} scale={scale} />
    </aside>
  );
};
