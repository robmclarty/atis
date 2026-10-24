/**
 * frame: the chrome's root, the flat DOM the world is framed by (§7, D12),
 * drawn with React (D91). It holds the status line, and once the map is read
 * the HUD's grade blocks over it (§7), the legend inset at the bottom left
 * (D87), and the right-hand column, the ranked notices over the shore rail
 * (§5.4, D153); and, behind a switch, the dev panel (D156): off and absent by
 * default, its code fetched only when it is first opened. A development build shows a toggle for it; a published
 * build opens it only through a key combination, which the docs never name.
 * `--png` and a glance reading press nothing, so they never see it.
 */

import { CHROME_MUTED, FONT_FAMILY } from 'scene';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import type { DevPanel } from '../dev/index.js';
import type { MapState } from '../load.js';
import type { Registry } from '../registry.js';
import { Column } from './column.js';
import { Hud } from './hud.js';
import { Legend } from './legend.js';
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

export type ChromeProps = {
  readonly state: MapState;
  readonly registry: Registry;
  /** A development build shows the toggle; a published one does not. */
  readonly dev: boolean;
  readonly load?: LoadPanel;
};

export const Chrome = ({ state, registry, dev, load = loadPanel }: ChromeProps): ReactElement => {
  const [open, setOpen] = useState(false);
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
        {state.status === 'ready' && <Hud map={state.map} registry={registry} />}
        <Status state={state} registry={registry} />
        {open && (
          <Suspense fallback={null}>
            <Panel registry={registry} onClose={() => setOpen(false)} />
          </Suspense>
        )}
      </div>
      {state.status === 'ready' && <Column map={state.map} registry={registry} />}
      {state.status === 'ready' && <Legend registry={registry} />}
      {dev && (
        <button type="button" data-dev-toggle onClick={() => setOpen((was) => !was)} style={TOGGLE}>
          tokens
        </button>
      )}
    </>
  );
};
