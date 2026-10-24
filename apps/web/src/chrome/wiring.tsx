/**
 * wiring: an opened cell's wiring drawn as a plate in the technical-drawing
 * chrome (§6's LOD2 overlay, step 41), from the scene's layout
 * (`libs/scene/src/wiring.ts`). While the breadcrumb's toggle has the open
 * cell wired, a flat plate in the screen left of the rail draws each home as
 * a frame, the opened cell's in ink and every other in a dotted phantom line
 * as a drawing marks what lies beyond the part; each file as a box on the
 * chrome's ground, outlined in the change hue where the change touched it
 * (hue is state, C11) and dashed where it was renamed (D40); and each wire as
 * a thin square-cornered ink line with an arrowhead at the file it imports.
 * Nothing glows (D12). The plate is laid when the toggle turns on, its
 * spacing read live through the registry (D156), and one that could not be
 * laid says why rather than show nothing (C2).
 */

import { CHANGE_HUE, CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_STROKE_WIDTH, FONT_FAMILY, LEADER_DASH, RENAME_DASH, WIRING_SPACING, cellWiring, layWiring } from 'scene';
import type { Plate, Wiring, WiringSpacing } from 'scene';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';
import type { MapJson } from 'core';

import { RAIL_WIDTH } from '../fit.js';
import type { Nav } from '../nav.js';
import type { Registry } from '../registry.js';
import { useLive } from './live.js';

/** The tokens the plate is drawn with, at rest: the shape its live view takes. */
const LOOK = { CHANGE_HUE, CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_STROKE_WIDTH, FONT_FAMILY, LEADER_DASH, RENAME_DASH };

/** The arrowhead every wire ends on. */
const ARROW = 'atis-wiring-arrow';

/** How a plate is laid: the scene's layout, or whatever a test hands in. */
export type LayPlate = (wiring: Wiring, spacing: WiringSpacing) => Promise<Plate>;

/** A wiring's plate as laid, or why it could not be. */
type Laid = { readonly wiring: Wiring; readonly plate: Plate } | { readonly wiring: Wiring; readonly failed: string };

export type WiringPlateProps = {
  readonly map: MapJson;
  readonly registry: Registry;
  readonly nav: Nav;
  readonly lay?: LayPlate;
};

export const WiringPlate = ({ map, registry, nav, lay = layWiring }: WiringPlateProps): ReactElement | null => {
  useLive(registry);
  const look = registry.view(LOOK);
  const live = registry.view(WIRING_SPACING, 'WIRING');
  const { fontSize, pad, nodeGap, layerGap, framePad } = live;
  const spacing = useMemo((): WiringSpacing => ({ fontSize, pad, nodeGap, layerGap, framePad }), [fontSize, pad, nodeGap, layerGap, framePad]);
  const opened = useSyncExternalStore(nav.subscribe, nav.opened, nav.opened);
  const cell = opened?.wired === true ? opened.cell : undefined;
  const wiring = useMemo(() => (cell === undefined ? undefined : cellWiring(map, cell)), [map, cell]);
  const [laid, setLaid] = useState<Laid | undefined>();

  useEffect(() => {
    if (wiring === undefined) return undefined;
    let current = true;
    void lay(wiring, spacing).then(
      (plate) => {
        if (current) setLaid({ wiring, plate });
      },
      (error: unknown) => {
        if (current) setLaid({ wiring, failed: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      current = false;
    };
  }, [wiring, spacing, lay]);

  if (wiring === undefined || laid?.wiring !== wiring) return null;
  const row = fontSize + 2 * pad;
  const path = wiring.homes.find((home) => home.inside)?.text ?? wiring.cell;
  const stroke = look.CHROME_STROKE_WIDTH;
  return (
    <figure
      data-wiring={wiring.cell}
      style={{
        position: 'fixed',
        left: `calc((100vw - ${String(RAIL_WIDTH)}px) / 2)`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        margin: 0,
        padding: look.CHROME_PAD,
        maxWidth: `calc(100vw - ${String(RAIL_WIDTH + 2 * look.CHROME_PAD)}px)`,
        boxSizing: 'border-box',
        background: look.CHROME_GROUND,
        border: `${String(stroke)}px solid ${look.CHROME_MUTED}`,
        color: look.CHROME_INK,
        fontFamily: look.FONT_FAMILY,
        fontSize,
        pointerEvents: 'none',
      }}
    >
      <figcaption style={{ color: look.CHROME_MUTED, fontVariant: 'small-caps', marginBottom: pad }}>wiring · {path}</figcaption>
      {'failed' in laid ? (
        <p data-wiring-failed style={{ margin: 0, color: look.CHROME_MUTED }}>
          the wiring could not be laid out: {laid.failed}
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${String(laid.plate.width)} ${String(laid.plate.height)}`}
          width={laid.plate.width}
          height={laid.plate.height}
          style={{ display: 'block', maxWidth: '100%', maxHeight: `calc(100vh - ${String(4 * look.CHROME_PAD + row)}px)`, height: 'auto' }}
          fontFamily={look.FONT_FAMILY}
          fontSize={fontSize}
        >
          <defs>
            <marker id={ARROW} viewBox="0 0 6 6" refX={6} refY={3} markerWidth={6} markerHeight={6} orient="auto">
              <path d="M0 0 L6 3 L0 6 Z" fill={look.CHROME_INK} />
            </marker>
          </defs>
          {laid.plate.homes.map((home) => (
            <g key={home.id} data-wiring-home={home.id} data-inside={home.inside ? 'yes' : 'no'}>
              <rect x={home.x} y={home.y} width={home.width} height={home.height} fill="none" stroke={home.inside ? look.CHROME_INK : look.CHROME_MUTED} strokeWidth={stroke} strokeLinecap="round" {...(home.inside ? {} : { strokeDasharray: look.LEADER_DASH })} />
              <text x={home.x + framePad} y={home.y + (row + framePad) / 2} dominantBaseline="central" fill={look.CHROME_MUTED}>
                {home.text}
              </text>
            </g>
          ))}
          {laid.plate.lines.map((line) => (
            <polyline key={`${line.from}\n${line.to}`} data-wiring-line={`${line.from} → ${line.to}`} points={line.points.map(([x, y]) => `${String(x)},${String(y)}`).join(' ')} fill="none" stroke={look.CHROME_INK} strokeWidth={stroke} markerEnd={`url(#${ARROW})`} />
          ))}
          {laid.plate.files.map((file) => (
            <g key={file.id} data-wiring-file={file.id} {...(file.change === undefined ? {} : { 'data-change': file.change })}>
              <rect x={file.x} y={file.y} width={file.width} height={file.height} fill={look.CHROME_GROUND} stroke={file.change === undefined ? look.CHROME_MUTED : look.CHANGE_HUE} strokeWidth={stroke} {...(file.change === 'renamed' ? { strokeDasharray: look.RENAME_DASH } : {})} />
              <text x={file.x + pad} y={file.y + file.height / 2} dominantBaseline="central" fill={look.CHROME_INK}>
                {file.text}
              </text>
            </g>
          ))}
        </svg>
      )}
    </figure>
  );
};
