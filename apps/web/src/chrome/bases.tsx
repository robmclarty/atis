/**
 * bases: the base selector in served mode (§8, D99), a flat strip under the
 * HUD offering the trunk, the last tag, the head's parent and the working
 * tree, the base the map was built over pressed. A press asks the serving CLI
 * to rebuild the map over that base with `POST /base` and the run's token
 * (C13, D134); once it answers with the new map the page reads it afresh, and
 * where the new base's terrain is cached the ground is the one it drew
 * before (P2). A refusal is written beside the buttons in the IFR hue, its
 * words the CLI's, and nothing else moves. A fixture has no server to ask, so
 * it shows no selector (D93). The brutalist material (D12), every token read
 * live through the registry (D156).
 */

import type { MapJson } from 'core';
import { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_STROKE_WIDTH, FONT_FAMILY, HUD_BLOCK_GAP, HUD_FONT_SIZE, IFR_HUE } from 'scene';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { BASE_CHOICES, baseUrl, currentBase } from '../bases.js';
import type { BaseChoice, PostBase } from '../bases.js';
import type { Registry } from '../registry.js';
import { useLive } from './live.js';

/** The tokens the strip is drawn with, at rest: the shape its live view takes. */
const LOOK = { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_STROKE_WIDTH, FONT_FAMILY, HUD_BLOCK_GAP, HUD_FONT_SIZE, IFR_HUE };

/** The page's own request: a JSON `POST` from its own origin, which the browser names in the `Origin` header the CLI checks (D134). */
const postBase: PostBase = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body });

/** Read the page afresh, once the CLI holds the new map. */
const reloadPage = (): void => location.reload();

export type BasesProps = {
  readonly map: MapJson;
  readonly registry: Registry;
  /** The run's token (D134). */
  readonly token: string;
  readonly post?: PostBase;
  readonly reload?: () => void;
};

/** Where a press stands: idle, asking for a base, or refused with the CLI's words. */
type Asking = { readonly kind: 'idle' } | { readonly kind: 'asking'; readonly id: BaseChoice['id'] } | { readonly kind: 'refused'; readonly words: string };

export const Bases = ({ map, registry, token, post = postBase, reload = reloadPage }: BasesProps): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  const [asking, setAsking] = useState<Asking>({ kind: 'idle' });
  const current = currentBase(map);
  const ask = (choice: BaseChoice): void => {
    setAsking({ kind: 'asking', id: choice.id });
    post(baseUrl(token), JSON.stringify(choice.body))
      .then(async (response) => {
        if (response.ok) {
          reload();
          return;
        }
        setAsking({ kind: 'refused', words: (await response.text()).trim() || `the server answered ${String(response.status)}` });
      })
      .catch((error: unknown) => setAsking({ kind: 'refused', words: error instanceof Error ? error.message : String(error) }));
  };
  return (
    <nav
      data-bases={current ?? 'other'}
      aria-label="bases"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: look.HUD_BLOCK_GAP,
        padding: `0 ${String(look.CHROME_PAD)}px ${String(look.CHROME_PAD)}px`,
        background: look.CHROME_GROUND,
        color: look.CHROME_MUTED,
        fontFamily: look.FONT_FAMILY,
        fontSize: look.HUD_FONT_SIZE,
        pointerEvents: 'auto',
      }}
    >
      <span>against</span>
      {BASE_CHOICES.map((choice) => {
        const on = choice.id === current;
        return (
          <button
            type="button"
            key={choice.id}
            data-base={choice.id}
            aria-pressed={on}
            disabled={asking.kind === 'asking'}
            onClick={() => ask(choice)}
            style={{
              font: 'inherit',
              whiteSpace: 'nowrap',
              color: look.CHROME_INK,
              background: 'transparent',
              border: `${String(look.CHROME_STROKE_WIDTH)}px solid ${on ? look.CHROME_INK : look.CHROME_MUTED}`,
              outline: on ? `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_INK}` : 'none',
              borderRadius: 0,
              padding: '0 6px',
              cursor: 'pointer',
            }}
          >
            {choice.label}
          </button>
        );
      })}
      {asking.kind === 'asking' && <span data-base-asking>rebuilding…</span>}
      {asking.kind === 'refused' && (
        <span data-base-refused style={{ color: look.IFR_HUE }}>
          {asking.words}
        </span>
      )}
    </nav>
  );
};
