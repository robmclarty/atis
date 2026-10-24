/**
 * frame: the chrome's root, the flat DOM the world is framed by (§7, D12),
 * drawn with React (D91). It holds the status line, and once the map is read
 * the HUD's grade blocks over it (§7), the legend inset at the bottom left
 * (D87) over the minimap in the corner (D154), and the right-hand column, the ranked notices over the shore rail
 * (§5.4, D153); and, behind a switch, the dev panel (D156): off and absent by
 * default, its code fetched only when it is first opened. A development build shows a toggle for it; a published
 * build opens it only through a key combination, which the docs never name.
 * `--png` and a glance reading press nothing, so they never see it.
 */

import { CHROME_MUTED, CHROME_PAD, FONT_FAMILY } from 'scene';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import type { DevPanel } from '../dev/index.js';
import type { MapState } from '../load.js';
import { createNav } from '../nav.js';
import type { Nav } from '../nav.js';
import type { Registry } from '../registry.js';
import { Column } from './column.js';
import { Hud } from './hud.js';
import { Legend } from './legend.js';
import { useLive } from './live.js';
import { Minimap } from './minimap.js';
import { Status } from './status.js';

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

/** The chrome's bottom-left corner: the legend over the minimap, a pad apart and a pad in from the edges. It takes no pointer events of its own. */
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
};

export const Chrome = ({ state, registry, nav: given, dev, token, load = loadPanel }: ChromeProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const own = useMemo(() => createNav(), []);
  const nav = given ?? own;
  const Panel = useMemo(() => lazy(() => load().then((module) => ({ default: module.DevPanel }))), [load]);

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
        {state.status === 'ready' && <Hud map={state.map} registry={registry} token={token} />}
        <Status state={state} registry={registry} />
        {open && (
          <Suspense fallback={null}>
            <Panel registry={registry} onClose={() => setOpen(false)} />
          </Suspense>
        )}
      </div>
      {state.status === 'ready' && <Column map={state.map} registry={registry} />}
      {state.status === 'ready' && (
        <Corner registry={registry}>
          <Legend registry={registry} />
          <Minimap map={state.map} registry={registry} nav={nav} />
        </Corner>
      )}
      {dev && (
        <button type="button" data-dev-toggle onClick={() => setOpen((was) => !was)} style={TOGGLE}>
          tokens
        </button>
      )}
    </>
  );
};
