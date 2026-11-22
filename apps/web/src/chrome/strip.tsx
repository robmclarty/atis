/**
 * strip: one file's lines drawn to scale (D348 (line-strip)), `strip.ts`'s
 * model as the inspector shows it: across the top of a file's facts, and
 * down the side of its code, where it is the sheet's scroll map too. Four
 * lanes run the strip's length, each one kind of mark, so a mark is told by
 * where it lies as well as by its ink: the functions as outlined blocks, set
 * in by how deep each nests; the lines the change wrote, in the change hue;
 * the changed lines no test ran, in the evidence light the plate's strip drew
 * them in (D71); and each mutant still alive, a tick of that light. A mark
 * too short to see at the strip's size keeps a hairline, so one changed line
 * in a long file still shows.
 *
 * A press on the strip names the line under it, which the code tab scrolls
 * to; the lines the sheet shows are drawn as a window on it. The brutalist
 * material (D12): flat fills, hard edges, nothing that glows.
 */

import type { MouseEvent, ReactElement } from 'react';

import { lineAt } from '../strip.js';
import type { Span, Strip } from '../strip.js';

/** The tokens a strip is drawn with: the shape of the live view the inspector hands in. */
export type StripLook = {
  readonly CHANGE_HUE: string;
  readonly CHROME_INK: string;
  readonly CHROME_MUTED: string;
  readonly CHROME_RULE: string;
  readonly EVIDENCE_LIGHT: string;
};

/** Each lane's two edges across the strip, as shares of its thickness. */
const LANES = { functions: [0, 0.4], changed: [0.46, 0.62], untested: [0.66, 0.82], mutants: [0.86, 1] } as const;

/** How far a function's block is set in for each function that holds it, a share of the strip's thickness. */
const NEST = 0.08;

/** The deepest a block is set in, so the deepest function keeps a block. */
const NEST_MOST = 3;

export type StripProps = {
  readonly strip: Strip;
  readonly look: StripLook;
  /** Whether the strip lies across the panel, its lines running left to right, or down the side of a sheet, top to bottom. */
  readonly across: boolean;
  /** How thick the strip is, in pixels: its height where it lies across, its width where it runs down. */
  readonly thickness: number;
  /** The lines the sheet beside it shows, drawn as a window on the strip; none where there is no sheet. */
  readonly shown?: Span | undefined;
  /** Take the line a press on the strip names; with none the strip is only read. */
  readonly onLine?: ((line: number) => void) | undefined;
};

export const FileStrip = ({ strip, look, across, thickness, shown, onLine }: StripProps): ReactElement => {
  const { lines } = strip;
  /** A box along the strip from one line to another, both counted, between two shares of its thickness. */
  const box = (span: Span, [near, far]: readonly [number, number]): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } => {
    const along = span.from - 1;
    const long = span.to - span.from + 1;
    return across ? { x: along, y: near, width: long, height: far - near } : { x: near, y: along, width: far - near, height: long };
  };
  // A hairline that keeps its width on the screen, so a mark of one line in a long file is still drawn.
  const hair = { strokeWidth: 1, vectorEffect: 'non-scaling-stroke' } as const;
  const press = (event: MouseEvent<SVGSVGElement>): void => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const share = across ? (event.clientX - bounds.left) / Math.max(1, bounds.width) : (event.clientY - bounds.top) / Math.max(1, bounds.height);
    onLine?.(lineAt(strip, share));
  };
  return (
    <svg
      data-strip={across ? 'across' : 'down'}
      data-strip-lines={lines}
      role="img"
      aria-label={`the file's ${String(lines)} lines to scale`}
      viewBox={across ? `0 0 ${String(lines)} 1` : `0 0 1 ${String(lines)}`}
      preserveAspectRatio="none"
      {...(onLine === undefined ? {} : { onClick: press })}
      style={{ flex: 'none', display: 'block', ...(across ? { width: '100%', height: thickness } : { width: thickness, height: '100%' }), background: look.CHROME_RULE, cursor: onLine === undefined ? 'default' : 'pointer' }}
    >
      {strip.functions.map((fn) => {
        const inset = Math.min(fn.depth, NEST_MOST) * NEST;
        return <rect key={`${fn.name}\n${String(fn.from)}`} data-strip-function={fn.name} {...box(fn, [LANES.functions[0] + inset, LANES.functions[1]])} fill="none" stroke={look.CHROME_MUTED} {...hair} />;
      })}
      {strip.changed.map((span) => (
        <rect key={span.from} data-strip-changed={span.from} {...box(span, LANES.changed)} fill={look.CHANGE_HUE} stroke={look.CHANGE_HUE} {...hair} />
      ))}
      {strip.untested.map((span) => (
        <rect key={span.from} data-strip-untested={span.from} {...box(span, LANES.untested)} fill={look.EVIDENCE_LIGHT} stroke={look.EVIDENCE_LIGHT} {...hair} />
      ))}
      {/* Two mutants may stand on one line, so each is known by its place. */}
      {strip.mutants.map((mutant, at) => (
        <rect key={at} data-strip-mutant={mutant.line} {...box({ from: mutant.line, to: mutant.line }, LANES.mutants)} fill={look.EVIDENCE_LIGHT} stroke={look.EVIDENCE_LIGHT} {...hair} />
      ))}
      {shown !== undefined && <rect data-strip-shown={`${String(shown.from)}-${String(shown.to)}`} {...box(shown, [0, 1])} fill="none" stroke={look.CHROME_INK} {...hair} />}
    </svg>
  );
};
