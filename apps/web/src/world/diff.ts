/**
 * diff: §6's diff level drawn (LOD4, D102). Past LOD4's gate a changed file
 * the file level has opened gives way to its diff, on a sheet of the flat
 * chrome as the plate's share of the free screen, standing on its foot
 * centred left of the rail, so the HUD above keeps clear of the sheet's head,
 * and the plate cross-fades to it as the level's plan eases it (step 28,
 * C12). The sheet heads with the file's path as the map writes it (D120), a link
 * that opens it at its first hunk in the reader's editor, and the PR's link
 * when the page knows one. Under them runs the diff, each hunk's head a link
 * to its line, an added line in the change hue (hue is state, C11), a
 * deleted one in the muted ink. With no server, or while the diff is on its
 * way, it shows the hunks' line ranges and says why there is no more (C2).
 * Its every token is read live through the registry (D156). The sheet takes
 * the pointer while it is mostly shown, so its links click and the wheel
 * scrolls it, and it is built again only when what it shows, its size or its
 * look changes.
 */

import { CHANGE_HUE, CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_RULE, CHROME_STROKE_WIDTH, FILE_PLATE_SCREEN, FONT_FAMILY, HUD_FONT_SIZE, SCREEN_TYPE_UP } from 'scene';

import type { DiffLevel, DiffRow } from '../diff.js';

/** The tokens the sheet is drawn with, at rest: the shape its live view takes (D156). */
export const DIFF_LOOK = { CHANGE_HUE, CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_PAD, CHROME_RULE, CHROME_STROKE_WIDTH, FILE_PLATE_SCREEN, FONT_FAMILY, HUD_FONT_SIZE, SCREEN_TYPE_UP };
export type DiffLook = typeof DIFF_LOOK;

export type DiffSheet = {
  readonly element: HTMLElement;
  /** Draw `level` on its sheet for a canvas this tall, `free` pixels of it left of the rail, at `shown`; nothing when it is absent or `shown` is 0. */
  readonly render: (height: number, free: number, level: DiffLevel | undefined, shown: number) => void;
};

/** The sheet takes the pointer from this much shown, so a link half faded in still clicks and one fading out lets the camera have the wheel back. */
const TAKES_POINTER = 0.5;

const element = (tag: string, style: Partial<CSSStyleDeclaration>, words?: string): HTMLElement => {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (words !== undefined) node.textContent = words;
  return node;
};

/** A link out of the page: a web page in a tab of its own, an editor's scheme handed to the editor with the world left where it is. */
const linkTo = (href: string, words: string, color: string): HTMLAnchorElement => {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = words;
  link.style.color = color;
  if (/^https?:/i.test(href)) {
    link.target = '_blank';
    link.rel = 'noreferrer';
  }
  return link;
};

/** One row of the diff: a hunk's head as a link to its line where it has one, an added line in the change hue, a deleted one muted. */
const rowOf = (row: DiffRow, look: DiffLook): HTMLElement => {
  if (row.kind === 'hunk') {
    const head = row.href === undefined ? element('div', { color: look.CHROME_MUTED }, row.text) : linkTo(row.href, row.text, look.CHROME_MUTED);
    head.style.display = 'block';
    head.dataset['diffRow'] = 'hunk';
    head.dataset['line'] = String(row.line);
    return head;
  }
  const color = row.kind === 'added' ? look.CHANGE_HUE : row.kind === 'deleted' ? look.CHROME_MUTED : look.CHROME_INK;
  const line = element('div', { color }, row.text);
  line.dataset['diffRow'] = row.kind;
  if (row.kind !== 'deleted') line.dataset['line'] = String(row.line);
  return line;
};

/** The sheet's markup for `level`: its head, then the diff, or the hunks' ranges and why there is no more. */
const lay = (level: DiffLevel, look: DiffLook): readonly HTMLElement[] => {
  const rule = `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}`;
  const head = element('header', { padding: `${String(look.CHROME_PAD)}px`, borderBottom: rule, display: 'flex', flexWrap: 'wrap', gap: `${String(look.CHROME_PAD)}px`, alignItems: 'baseline' });
  const title = element('strong', { overflowWrap: 'anywhere', marginRight: 'auto' }, level.title);
  title.dataset['diffTitle'] = '';
  head.append(title);
  if (level.editor !== undefined) {
    const editor = linkTo(level.editor, 'open in the editor', look.CHROME_INK);
    editor.dataset['editor'] = '';
    head.append(editor);
  }
  if (level.pr !== undefined) {
    const pr = linkTo(level.pr, 'open the PR', look.CHROME_INK);
    pr.dataset['pr'] = '';
    head.append(pr);
  }
  const body = element('div', { flex: '1', overflow: 'auto', padding: `${String(look.CHROME_PAD)}px`, whiteSpace: 'pre' });
  if (level.rows.length > 0) {
    body.append(...level.rows.map((row) => rowOf(row, look)));
    return [head, body];
  }
  const note = element('p', { margin: `0 0 ${String(look.CHROME_PAD)}px`, color: look.CHROME_MUTED, whiteSpace: 'normal' }, level.note);
  note.dataset['diffNote'] = '';
  const ranges = element('ul', { listStyle: 'none', margin: '0', padding: '0' });
  ranges.append(
    ...level.ranges.map((range) => {
      const item = element('li', {}, range);
      item.dataset['range'] = '';
      return item;
    }),
  );
  body.append(note, ranges);
  return [head, body];
};

export const createDiffSheet = (look: DiffLook): DiffSheet => {
  const sheet = element('section', { position: 'fixed', left: '0', top: '0', display: 'none', flexDirection: 'column', boxSizing: 'border-box', pointerEvents: 'none' });
  sheet.dataset['diffSheet'] = '';
  let laid: { readonly level: DiffLevel; readonly box: string; readonly look: string } | undefined;

  const render: DiffSheet['render'] = (height, free, level, shown) => {
    const visible = level !== undefined && shown > 0;
    sheet.style.display = visible ? 'flex' : 'none';
    if (!visible) return;
    const wide = Math.round(look.FILE_PLATE_SCREEN * free);
    const tall = Math.round(look.FILE_PLATE_SCREEN * height);
    const box = `${String(wide)} ${String(tall)} ${String(free)} ${String(height)}`;
    const seen = JSON.stringify(look);
    if (laid?.level !== level || laid.box !== box || laid.look !== seen) {
      Object.assign(sheet.style, {
        width: `${String(wide)}px`,
        height: `${String(tall)}px`,
        transform: `translate(${String(Math.round((free - wide) / 2))}px, ${String(height - tall - look.CHROME_PAD)}px)`,
        background: look.CHROME_GROUND,
        border: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}`,
        color: look.CHROME_INK,
        font: `${String(look.HUD_FONT_SIZE + look.SCREEN_TYPE_UP)}px/1.4 ${look.FONT_FAMILY}`,
      });
      sheet.replaceChildren(...lay(level, look));
      sheet.dataset['file'] = level.path;
      laid = { level, box, look: seen };
    }
    sheet.style.opacity = String(shown);
    sheet.style.pointerEvents = shown >= TAKES_POINTER ? 'auto' : 'none';
  };
  return { element: sheet, render };
};
