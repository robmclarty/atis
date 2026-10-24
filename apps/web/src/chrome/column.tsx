/**
 * column: the chrome's right-hand column (§5.4, §7): the ranked list of
 * notices at its head and the shore rail beneath it (D153), one flat column
 * on the chrome's ground with a hard rule where it meets the world, in the
 * brutalist material (D12). The list takes up to half the column and scrolls
 * past that; the rail takes the rest and scrolls on its own. The world is
 * fitted into the screen left of it (`fit.ts`).
 */

import { CHROME_GROUND, CHROME_INK, CHROME_RULE, CHROME_STROKE_WIDTH, FONT_FAMILY } from 'scene';
import type { ReactElement } from 'react';
import type { MapJson } from 'core';

import { RAIL_WIDTH } from '../fit.js';
import type { Nav } from '../nav.js';
import type { Registry } from '../registry.js';
import { useLive } from './live.js';
import { Notices } from './notices.js';
import { Rail } from './rail.js';

/** The tokens the column is drawn with, at rest: the shape its live view takes. */
const LOOK = { CHROME_GROUND, CHROME_INK, CHROME_RULE, CHROME_STROKE_WIDTH, FONT_FAMILY };

export const Column = ({ map, registry, nav }: { readonly map: MapJson; readonly registry: Registry; readonly nav?: Nav | undefined }): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  return (
    <aside
      data-column
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: RAIL_WIDTH,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        background: look.CHROME_GROUND,
        color: look.CHROME_INK,
        borderLeft: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}`,
        fontFamily: look.FONT_FAMILY,
        pointerEvents: 'auto',
      }}
    >
      <Notices map={map} registry={registry} nav={nav} />
      <Rail map={map} registry={registry} />
    </aside>
  );
};
