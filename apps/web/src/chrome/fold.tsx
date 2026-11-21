/**
 * fold: the header each part of the chrome's column stands under
 * (D278 (column-folds)): the notices, the folder tree and the shore, one
 * under the next in a single scrolled column. A press on a header folds its
 * part away or brings it back, and the header stays at the column's top
 * while its part scrolls under it, so a long tree is folded from anywhere in
 * it. Each part keeps its own fold, so one drawn alone, as a test draws it,
 * still folds. A fold opens when it is asked for by name on the document,
 * and is drawn open before that asking returns (D285 (unfold-by-event)),
 * which is how a row that leads to a shore group brings the shore back
 * before it scrolls there, and how the world, which imports nothing of the
 * chrome, can do the same for an agent's highlight.
 * It is the brutalist material (D12): the column's own face, a hard rule,
 * nothing that glows.
 */

import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { flushSync } from 'react-dom';

/** The tokens a fold's header is drawn with. */
type FoldLook = {
  readonly CHROME_GROUND: string;
  readonly CHROME_INK: string;
  readonly CHROME_RULE: string;
  readonly CHROME_STROKE_WIDTH: number;
  readonly SHORE_BLOCK_PAD: number;
};

/**
 * The event a fold hears on the document to open: its detail is the fold's
 * name, `notices`, `tree` or `shore`. The name is the whole contract, so a
 * caller outside the chrome dispatches it bare (D285 (unfold-by-event)).
 */
const UNFOLD = 'atis:unfold';

/** The mark a header leads with, and a directory's row in the tree: what it holds is open, or folded away. */
export const foldMark = (open: boolean): string => (open ? '▾' : '▸');

/** Open a fold by its name, wherever it is drawn. It is drawn open before this returns, so what it holds can be scrolled to at once. */
export const unfold = (name: string): void => {
  document.dispatchEvent(new CustomEvent(UNFOLD, { detail: name }));
};

/** A part's fold: whether it is open, which it is until it is folded, and the press that folds it or opens it again. */
export const useFold = (name: string): readonly [boolean, () => void] => {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const hear = (event: Event): void => {
      if (!(event instanceof CustomEvent) || event.detail !== name) return;
      // Drawn at once, not on React's next turn: whoever asked scrolls to what the fold holds on its next line. It is asked from an event's handler or from outside React, as a socket's message is, never while React is drawing.
      flushSync(() => setOpen(true));
    };
    document.addEventListener(UNFOLD, hear);
    return () => document.removeEventListener(UNFOLD, hear);
  }, [name]);
  return [open, () => setOpen((was) => !was)];
};

/** A part's header: its name in small caps behind the fold's mark, and what the part says of itself at the right. */
export const Fold = ({ name, open, onToggle, look, children }: { readonly name: string; readonly open: boolean; readonly onToggle: () => void; readonly look: FoldLook; readonly children?: ReactNode }): ReactElement => (
  <header style={{ position: 'sticky', top: 0, zIndex: 1, background: look.CHROME_GROUND, borderBottom: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}` }}>
    <button
      type="button"
      data-fold={name}
      aria-expanded={open}
      onClick={onToggle}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        width: '100%',
        boxSizing: 'border-box',
        padding: look.SHORE_BLOCK_PAD,
        font: 'inherit',
        color: look.CHROME_INK,
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontVariant: 'small-caps' }}>
        {foldMark(open)} {name}
      </span>
      {children}
    </button>
  </header>
);
