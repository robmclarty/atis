/**
 * radar: the health radar drawn in the flat chrome (D103, §7), opened with
 * the Health Δ block's parts, so it is one click from the HUD. It charts one
 * changed file at a time, the file the change's worst notice names first,
 * and a picker charts another. A toggle switches it between categorised,
 * each spoke within or over its D9 threshold on two rings, and raw, each
 * spoke at its number's reach of the largest the map holds, written at its
 * end. The outline joins the spokes that have a reading, in ink; a spoke the
 * map holds no reading for is a dotted muted line with the dash at its end
 * and the reason as its title, never a point (C2). Nothing glows (D12), and
 * every token is read live through the registry (D156).
 */

import { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_RULE, CHROME_STROKE_WIDTH, FONT_FAMILY, LEADER_DASH } from 'scene';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type { MapJson } from 'core';

import { firstRadarFile, radarFiles, radarOf, spokeWords } from '../radar.js';
import type { RadarSpoke } from '../radar.js';
import type { Registry } from '../registry.js';
import { useLive } from './live.js';

/** The tokens the radar is drawn with, at rest: the shape its live view takes. */
const LOOK = { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_RULE, CHROME_STROKE_WIDTH, FONT_FAMILY, LEADER_DASH };

/** The chart's size in CSS pixels, wider than tall for the words at the spokes' ends, and the share of its half height the spokes run to. */
const WIDE = 440;
const TALL = 280;
const SPOKE_SHARE = 0.62;
/** Where a categorised reading stands on its spoke: within its threshold on the inner ring, over it on the outer. */
const WITHIN = 0.5;
const OVER = 1;

/** The two ways the radar reads. */
type Mode = 'categorised' | 'raw';

/** How far out a spoke's reading stands, 0 to 1, or none when it has no reading in this mode. */
const reachOf = (spoke: RadarSpoke, mode: Mode): number | undefined => {
  if (mode === 'raw') return 'muted' in spoke.raw ? undefined : spoke.raw.reach;
  return 'muted' in spoke.category ? undefined : spoke.category.over ? OVER : WITHIN;
};

/** Why a spoke has no reading in this mode, or none when it has one. */
const mutedOf = (spoke: RadarSpoke, mode: Mode): string | undefined => {
  const reading = mode === 'raw' ? spoke.raw : spoke.category;
  return 'muted' in reading ? reading.muted : undefined;
};

export const HealthRadar = ({ map, registry, size }: { readonly map: MapJson; readonly registry: Registry; readonly size: number }): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  const files = useMemo(() => radarFiles(map), [map]);
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<Mode>('categorised');
  const path = picked !== undefined && files.includes(picked) ? picked : firstRadarFile(map);
  const radar = useMemo(() => (path === undefined ? undefined : radarOf(map, path)), [map, path]);
  const frame = {
    margin: `0 ${String(look.CHROME_PAD)}px`,
    padding: look.CHROME_PAD,
    boxSizing: 'border-box' as const,
    background: look.CHROME_GROUND,
    color: look.CHROME_INK,
    borderLeft: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}`,
    borderRight: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}`,
    borderBottom: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}`,
    fontFamily: look.FONT_FAMILY,
    fontSize: size,
    pointerEvents: 'auto' as const,
  };
  if (radar === undefined) {
    return (
      <section data-radar="" style={frame}>
        <p data-empty style={{ margin: 0, color: look.CHROME_MUTED }}>
          the change placed no file on the terrain to chart
        </p>
      </section>
    );
  }
  const [cx, cy] = [WIDE / 2, TALL / 2];
  const spokeLength = cy * SPOKE_SHARE;
  const angleOf = (index: number): number => (index / radar.spokes.length) * Math.PI * 2 - Math.PI / 2;
  const at = (index: number, reach: number): readonly [number, number] => [cx + Math.cos(angleOf(index)) * spokeLength * reach, cy + Math.sin(angleOf(index)) * spokeLength * reach];
  const points = radar.spokes.flatMap((spoke, index) => {
    const reach = reachOf(spoke, mode);
    return reach === undefined ? [] : [{ id: spoke.id, at: at(index, reach) }];
  });
  const stroke = look.CHROME_STROKE_WIDTH;
  const button = (pressed: boolean): Readonly<Record<string, string | number>> => ({
    font: 'inherit',
    background: pressed ? look.CHROME_INK : 'transparent',
    color: pressed ? look.CHROME_GROUND : look.CHROME_INK,
    border: `${String(stroke)}px solid ${look.CHROME_INK}`,
    borderRadius: 0,
    padding: `0 ${String(look.CHROME_PAD / 2)}px`,
    cursor: 'pointer',
  });
  return (
    <section data-radar={radar.path} data-mode={mode} style={frame}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: look.CHROME_PAD / 2, alignItems: 'center' }}>
        <span style={{ color: look.CHROME_MUTED }}>health radar</span>
        <select
          data-radar-file
          aria-label="file to chart"
          value={radar.path}
          onChange={(event) => setPicked(event.currentTarget.value)}
          style={{ font: 'inherit', maxWidth: '100%', background: look.CHROME_GROUND, color: look.CHROME_INK, border: `${String(stroke)}px solid ${look.CHROME_RULE}`, borderRadius: 0 }}
        >
          {files.map((file) => (
            <option key={file} value={file}>
              {file}
            </option>
          ))}
        </select>
        {(['categorised', 'raw'] as const).map((each) => (
          <button key={each} type="button" data-radar-mode={each} aria-pressed={mode === each} onClick={() => setMode(each)} style={button(mode === each)}>
            {each}
          </button>
        ))}
      </div>
      <svg width={WIDE} height={TALL} viewBox={`0 0 ${String(WIDE)} ${String(TALL)}`} role="img" aria-label={`health radar of ${radar.path}, ${mode}`} style={{ display: 'block', maxWidth: '100%', overflow: 'visible' }}>
        {[WITHIN, OVER].map((ring) => (
          <circle key={ring} cx={cx} cy={cy} r={spokeLength * ring} fill="none" stroke={look.CHROME_RULE} strokeWidth={stroke} />
        ))}
        {radar.spokes.map((spoke, index) => {
          const muted = mutedOf(spoke, mode);
          const [x, y] = at(index, OVER);
          const [wx, wy] = at(index, OVER + 0.14);
          const cos = Math.cos(angleOf(index));
          const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
          return (
            <g key={spoke.id} data-spoke={spoke.id} data-muted={muted}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={muted === undefined ? look.CHROME_RULE : look.CHROME_MUTED} strokeWidth={stroke} strokeDasharray={muted === undefined ? undefined : look.LEADER_DASH} strokeLinecap="round" />
              <text x={wx} y={wy} textAnchor={anchor} dominantBaseline="middle" fontSize={size} fontFamily={look.FONT_FAMILY} fill={muted === undefined ? look.CHROME_INK : look.CHROME_MUTED}>
                {muted !== undefined && <title>{muted}</title>}
                <tspan x={wx} dy="-0.6em">
                  {spoke.label}
                </tspan>
                <tspan data-words x={wx} dy="1.2em">
                  {spokeWords(spoke, mode === 'raw')}
                </tspan>
              </text>
            </g>
          );
        })}
        {points.length > 2 && <polygon data-outline points={points.map(({ at: [x, y] }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke={look.CHROME_INK} strokeWidth={stroke * 1.5} />}
        {points.map(({ id, at: [x, y] }) => (
          <circle key={id} data-reading={id} cx={x} cy={y} r={stroke * 2} fill={look.CHROME_INK} />
        ))}
      </svg>
      <p style={{ margin: 0, color: look.CHROME_MUTED }}>{mode === 'raw' ? 'each spoke runs to the largest the map holds for it' : 'inner ring: within its D9 threshold, outer: over it'}</p>
    </section>
  );
};
