/**
 * frame: the chrome's root, the flat DOM the world is framed by (§7, D12),
 * drawn with React (D91). It holds the status line, and once the map is read
 * the HUD's grade blocks over it (§7), with the legend folded into its `key` block (D87, D166), on a map of a range the
 * scrubber under them, every block drawn from the frame it stands at (D100), on a whole repo's map its overlay toggles
 * (D101), in served mode the base selector (D99, C13), and the breadcrumb
 * under it (§6), the minimap in the bottom-left corner (D154), and the right-hand column, the ranked notices over the shore rail
 * (§5.4, D153); over them all, the open cell's wiring plate while it is toggled on (step 41); and, behind a switch, the dev panel (D156): off and absent by
 * default, its code fetched only when it is first opened. A development build shows a toggle for it; a published
 * build opens it only through a key combination, which the docs never name.
 * `--png` and a glance reading press nothing, so they never see it.
 */

import { CHROME_MUTED, CHROME_PAD, FONT_FAMILY } from 'scene';
import { Suspense, lazy, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import type { PostBase } from '../bases.js';
import type { DevPanel } from '../dev/index.js';
import { frameMap } from '../frames.js';
import type { MapState } from '../load.js';
import { createNav } from '../nav.js';
import type { Nav } from '../nav.js';
import { shownOverlay } from '../overlays.js';
import type { Registry } from '../registry.js';
import { Bases } from './bases.js';
import { Column } from './column.js';
import { Crumbs } from './crumbs.js';
import { Hud } from './hud.js';
import { useLive } from './live.js';
import { Minimap } from './minimap.js';
import { OverlayToggles } from './overlays.js';
import { Scrubber } from './scrubber.js';
import { Status } from './status.js';
import { WiringPlate } from './wiring.js';

/** What opening the panel loads: the dev module, or whatever a test hands in. */
export type PanelModule = { readonly DevPanel: typeof DevPanel };
export type LoadPanel = () => Promise<PanelModule>;

/** The panel's code, fetched only when it is first opened; Vite splits the import into a chunk of its own. */
const loadPanel: LoadPanel = () => import('../dev/index.js');

/** The key combination that opens the panel in any build. */
const opens = (event: KeyboardEvent): boolean => event.ctrlKey && event.altKey && event.shiftKey && event.code === 'KeyT';

/** The chrome's left column: the status line, and the panel beneath it when open. It takes no pointer events of its own, so the world beneath keeps them. */
const COLUMN: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', height: '100vh', pointerEvents: 'none' };

const TOGGLE: CSSProperties = {
  position: 'fixed',
  right: 8,
  bottom: 8,
  font: `11px ${FONT_FAMILY}`,
  color: CHROME_MUTED,
  background: 'transparent',
  border: `1px solid ${CHROME_MUTED}`,
  padding: '1px 6px',
  cursor: 'pointer',
};

/** The chrome's bottom-left corner: the minimap, a pad in from the edges. It takes no pointer events of its own. */
const Corner = ({ registry, children }: { readonly registry: Registry; readonly children: ReactNode }): ReactElement => {
  useLive(registry);
  const { CHROME_PAD: pad } = registry.view({ CHROME_PAD });
  return <div style={{ position: 'fixed', left: pad, bottom: pad, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: pad, pointerEvents: 'none' }}>{children}</div>;
};

export type ChromeProps = {
  readonly state: MapState;
  readonly registry: Registry;
  /** The line to the world (`nav.ts`); a chrome drawn with no world makes its own, which no world steers. */
  readonly nav?: Nav;
  /** A development build shows the toggle; a published one does not. */
  readonly dev: boolean;
  /** The run's token when the map is served (D134), which the raw check output a HUD part links to requires; none for a fixture. */
  readonly token?: string | undefined;
  readonly load?: LoadPanel;
  /** The base selector's request and the page's reload, injected so a test needs no server. */
  readonly post?: PostBase;
  readonly reload?: () => void;
};

export const Chrome = ({ state, registry, nav: given, dev, token, load = loadPanel, post, reload }: ChromeProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const own = useMemo(() => createNav(), []);
  const nav = given ?? own;
  const Panel = useMemo(() => lazy(() => load().then((module) => ({ default: module.DevPanel }))), [load]);
  // The frame of a range the scrubber stands at, and the map as that frame shows it; the map itself for one change.
  const at = useSyncExternalStore(nav.subscribe, nav.frame, nav.frame);
  const ranged = state.status === 'ready' ? state.map : undefined;
  const map = useMemo(() => (ranged === undefined ? undefined : frameMap(ranged, at)), [ranged, at]);
  // The overlay a whole repo's map shows, as the toggles asked (D101).
  const asked = useSyncExternalStore(nav.subscribe, nav.overlay, nav.overlay);
  const overlay = map === undefined ? undefined : shownOverlay(map, asked);
  // The cell the world has open, which the HUD's reach opens on (D186).
  const opened = useSyncExternalStore(nav.subscribe, nav.opened, nav.opened);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!opens(event)) return;
      event.preventDefault();
      setOpen((was) => !was);
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <div style={COLUMN}>
        {map !== undefined && <Hud map={map} registry={registry} token={token} overlay={overlay} cell={opened?.cell} />}
        {ranged !== undefined && <Scrubber map={ranged} registry={registry} nav={nav} />}
        {map !== undefined && <OverlayToggles map={map} registry={registry} nav={nav} />}
        {ranged !== undefined && token !== undefined && <Bases map={ranged} registry={registry} token={token} {...(post === undefined ? {} : { post })} {...(reload === undefined ? {} : { reload })} />}
        <Status state={state} registry={registry} />
        {map !== undefined && <Crumbs map={map} registry={registry} nav={nav} />}
        {open && (
          <Suspense fallback={null}>
            <Panel registry={registry} onClose={() => setOpen(false)} />
          </Suspense>
        )}
      </div>
      {map !== undefined && <Column map={map} registry={registry} nav={nav} />}
      {map !== undefined && (
        <Corner registry={registry}>
          <Minimap map={map} registry={registry} nav={nav} />
        </Corner>
      )}
      {map !== undefined && <WiringPlate map={map} registry={registry} nav={nav} />}
      {dev && (
        <button type="button" data-dev-toggle onClick={() => setOpen((was) => !was)} style={TOGGLE}>
          tokens
        </button>
      )}
    </>
  );
};
