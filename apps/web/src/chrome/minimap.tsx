/**
 * minimap: the body in miniature at the chrome's bottom left (D154), so a
 * reviewer zoomed into one cell keeps where it sits. It draws the scene's
 * minimap as it comes: the body's silhouette flat in one grey, each reached
 * cell's own ground tinted by its luminance, each cell's skin drawn round in
 * a hairline, every file wide enough to hold a pixel as a flat disc, the
 * changed files as dots in the change hue, a deleted one hollow, each notice
 * target's run of numbered boxes, and the view's outline on the ground as
 * the world last showed it. The comment's still and the fingerprint are this
 * drawing zoomed in (`libs/svg`, D175).
 * A click on it centres the view there, and a drag keeps the view under the
 * pointer. It is the brutalist material (D12): a hairline frame on the
 * chrome's ground, every ink flat and nothing that glows, read live through
 * the registry (D156).
 */

import { CATEGORY_LETTERS, CHANGE_HUE, CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_STROKE_WIDTH, FONT_FAMILY, IFR_HUE, LIFR_HUE, MINIMAP, MVFR_HUE, NOTICE_BOX, NOTICE_BOX_GAP, NOTICE_NUMERAL_SIZE, REACH_GLOW, SECONDARY_BOX_WIDTH, VFR_HUE, minimapOf, runAt, toInset, toLayout } from 'scene';
import type { Point } from 'scene';
import { useMemo, useRef, useSyncExternalStore } from 'react';
import type { PointerEvent, ReactElement } from 'react';
import type { MapJson } from 'core';

import { over } from '../hud.js';
import type { Nav } from '../nav.js';
import { categoryHue } from '../notices.js';
import type { Registry } from '../registry.js';
import { NoticeBox } from './box.js';
import { useLive } from './live.js';

/** The scene's tokens the inset is drawn with, at rest: the shape its live view takes. */
const LOOK = {
  CATEGORY_LETTERS,
  CHANGE_HUE,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_STROKE_WIDTH,
  FONT_FAMILY,
  IFR_HUE,
  LIFR_HUE,
  MVFR_HUE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  NOTICE_NUMERAL_SIZE,
  REACH_GLOW,
  SECONDARY_BOX_WIDTH,
  VFR_HUE,
};

/** Rings as one SVG path, each a closed run of points. */
const pathOf = (rings: readonly (readonly Point[])[]): string => rings.map((ring) => `M${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`).join('');

export const Minimap = ({ map, registry, nav }: { readonly map: MapJson; readonly registry: Registry; readonly nav: Nav }): ReactElement | null => {
  useLive(registry);
  const look = registry.view(LOOK);
  const size = registry.view(MINIMAP, 'MINIMAP');
  const drawn = useMemo(() => minimapOf(map, { width: size.width, height: size.height, pad: size.pad }), [map, size.width, size.height, size.pad]);
  const outline = useSyncExternalStore(nav.subscribe, nav.outline, nav.outline);
  const dragging = useRef(false);
  if (drawn === undefined) return null;
  const { frame } = drawn;
  const hue = categoryHue(map.weather.checks.category, look);

  /** Centre the view on the layout point under the pointer. */
  const centreOn = (event: PointerEvent<SVGSVGElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    nav.lookAt(toLayout(frame, [event.clientX - box.left, event.clientY - box.top]));
  };
  const view = outline?.map((point): Point => toInset(frame, point));

  return (
    <aside
      data-minimap
      aria-label="minimap"
      style={{
        position: 'relative',
        width: frame.width,
        height: frame.height,
        boxSizing: 'content-box',
        background: look.CHROME_GROUND,
        border: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_MUTED}`,
        overflow: 'hidden',
        pointerEvents: 'auto',
        cursor: 'crosshair',
        touchAction: 'none',
      }}
    >
      <svg
        width={frame.width}
        height={frame.height}
        style={{ display: 'block' }}
        onPointerDown={(event) => {
          dragging.current = true;
          // The drag keeps the pointer past the inset's edge, where a browser can hold it.
          if ('setPointerCapture' in event.currentTarget) event.currentTarget.setPointerCapture(event.pointerId);
          centreOn(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) centreOn(event);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        <path data-silhouette d={pathOf(drawn.silhouette)} fill={size.body} />
        {drawn.reach.map((reach) => (
          <path key={reach.cell} data-reach={reach.cell} data-hops={reach.hops} d={pathOf(reach.rings)} fillRule="evenodd" fill={over(look.REACH_GLOW, size.body, reach.luminance * size.reachShare)} />
        ))}
        <path data-skins d={pathOf(drawn.silhouette)} fill="none" stroke={size.skin} strokeWidth={look.CHROME_STROKE_WIDTH} />
        {drawn.files.map((file) => (2 * file.r < size.fileFloor ? null : <circle key={file.path} data-file={file.path} cx={file.x} cy={file.y} r={file.r} fill={size.file} />))}
        {drawn.changed.map((file) =>
          file.kind === 'deleted' ? (
            <circle key={file.path} data-changed={file.path} data-kind={file.kind} cx={file.x} cy={file.y} r={Math.max(file.r, size.changedR)} fill="none" stroke={look.CHANGE_HUE} strokeWidth={look.CHROME_STROKE_WIDTH} />
          ) : (
            <circle key={file.path} data-changed={file.path} data-kind={file.kind} cx={file.x} cy={file.y} r={Math.max(file.r, size.changedR)} fill={look.CHANGE_HUE} />
          ),
        )}
        {view !== undefined && <polygon data-view points={view.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke={size.view} strokeWidth={size.viewWidth} />}
      </svg>
      {drawn.notices.map((run) => {
        // The run hangs off the target's lower right, as the world hangs it past the ring, so the dot under it still shows.
        const [left, top] = runAt(run, size);
        return (
          <div key={run.target} data-run={run.target} style={{ position: 'absolute', left, top, display: 'flex', gap: look.NOTICE_BOX_GAP / 2, pointerEvents: 'none' }}>
            {run.marked.map(({ rank, tier }) => (
              <NoticeBox key={rank} rank={rank} tier={tier} look={look} hue={hue} side={look.NOTICE_BOX} numeral={look.NOTICE_NUMERAL_SIZE} />
            ))}
          </div>
        );
      })}
    </aside>
  );
};
