/**
 * crumbs: the HUD's breadcrumb (§6, step 39), a flat line under the status
 * line that reads the walk's stop down from the field, `field › libs/core ›
 * src/pm › index.ts`, at every stop: one the keyboard or a notice's row flew
 * to, and one the reviewer moved to by hand. The stop it reads is the world's,
 * over the line between them (`nav.ts`). While a cell is open as a slide, a
 * flat button at the line's end spreads its exploded view or gathers it
 * (step 40). It is the brutalist material (D12): one monospace face, the
 * stop it stands at in ink and the way down to it in the muted grey, nothing
 * that glows, read live through the registry (D156).
 */

import { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, FONT_FAMILY, HUD_FONT_SIZE } from 'scene';
import { Fragment, useMemo, useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';
import type { MapJson } from 'core';

import type { Nav } from '../nav.js';
import type { Registry } from '../registry.js';
import { createWalk } from '../walk.js';
import { useLive } from './live.js';

/** The tokens the line is drawn with, at rest: the shape its live view takes. */
const LOOK = { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, FONT_FAMILY, HUD_FONT_SIZE };

/** What stands between two crumbs. */
const BETWEEN = ' › ';

export const Crumbs = ({ map, registry, nav }: { readonly map: MapJson; readonly registry: Registry; readonly nav: Nav }): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  const walk = useMemo(() => createWalk(map), [map]);
  const stop = useSyncExternalStore(nav.subscribe, nav.stop, nav.stop);
  const opened = useSyncExternalStore(nav.subscribe, nav.opened, nav.opened);
  const crumbs = walk.crumbs(stop);
  return (
    <nav
      data-crumbs={stop.kind}
      aria-label="breadcrumb"
      style={{ margin: 0, padding: `0 ${String(look.CHROME_PAD)}px ${String(look.CHROME_PAD)}px`, background: look.CHROME_GROUND, color: look.CHROME_MUTED, fontFamily: look.FONT_FAMILY, fontSize: look.HUD_FONT_SIZE, whiteSpace: 'nowrap', pointerEvents: 'auto' }}
    >
      {crumbs.map((crumb, index) => (
        <Fragment key={`${String(index)}:${crumb}`}>
          {index > 0 && BETWEEN}
          <span data-crumb={index} style={index === crumbs.length - 1 ? { color: look.CHROME_INK } : undefined}>
            {crumb}
          </span>
        </Fragment>
      ))}
      {opened !== undefined && (
        <button
          type="button"
          data-explode={opened.exploded ? 'on' : 'off'}
          onClick={() => nav.explode()}
          style={{ marginLeft: look.CHROME_PAD, font: 'inherit', color: look.CHROME_INK, background: 'transparent', border: `1px solid ${look.CHROME_MUTED}`, padding: '0 6px', cursor: 'pointer' }}
        >
          {opened.exploded ? 'gather' : 'explode'}
        </button>
      )}
    </nav>
  );
};
