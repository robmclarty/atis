/**
 * parts: the panel a HUD block opens beneath the row (§7, step 36), in the
 * brutalist material (D12): flat on the chrome's ground, a hairline frame,
 * one monospace face, each part a heading over its lines. In served mode a
 * red slot's heading carries a link to its raw output at `/check/<slot>`
 * with the run's token (D93, D134); a fixture with no server shows the parts
 * without it.
 */

import { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_RULE, CHROME_STROKE_WIDTH, FONT_FAMILY, NOTICE_LEADING } from 'scene';
import type { ReactElement } from 'react';

import type { Parts } from '../parts.js';
import type { Registry } from '../registry.js';
import { useLive } from './live.js';

/** The tokens the panel is drawn with, at rest: the shape its live view takes. */
const LOOK = { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_RULE, CHROME_STROKE_WIDTH, FONT_FAMILY, NOTICE_LEADING };

/** The link to a slot's raw output, when the run is served. */
export const rawOutputHref = (slot: string, token: string): string => `/check/${encodeURIComponent(slot)}?token=${encodeURIComponent(token)}`;

export const PartsPanel = ({ parts, token, size, registry }: { readonly parts: Parts; readonly token: string | undefined; readonly size: number; readonly registry: Registry }): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  return (
    <section
      data-parts={parts.block}
      style={{
        maxHeight: '40vh',
        overflowY: 'auto',
        margin: `0 ${String(look.CHROME_PAD)}px`,
        padding: look.CHROME_PAD,
        boxSizing: 'border-box',
        background: look.CHROME_GROUND,
        color: look.CHROME_INK,
        border: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}`,
        fontFamily: look.FONT_FAMILY,
        fontSize: size,
        lineHeight: look.NOTICE_LEADING,
        pointerEvents: 'auto',
      }}
    >
      {parts.empty !== undefined && (
        <p data-empty style={{ margin: 0, color: look.CHROME_MUTED }}>
          {parts.empty}
        </p>
      )}
      {parts.parts.map((part) => (
        <div key={part.heading} data-part style={{ marginBottom: look.CHROME_PAD / 2 }}>
          <h4 style={{ margin: 0, fontSize: 'inherit', fontWeight: 'bold' }}>
            {part.heading}
            {part.slot !== undefined && token !== undefined && (
              <a data-raw={part.slot} href={rawOutputHref(part.slot, token)} target="_blank" rel="noreferrer" style={{ marginLeft: look.CHROME_PAD, color: look.CHROME_MUTED, fontWeight: 'normal' }}>
                raw output
              </a>
            )}
          </h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: `0 0 0 ${String(look.CHROME_PAD)}px` }}>
            {part.lines.map((line) => (
              <li key={line} style={{ overflowWrap: 'anywhere' }}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
};
