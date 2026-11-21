/**
 * code: a file's text and its diff as the inspector's tabs show them (D208
 * (side-panels)). Both are read-only, one plain monospace face at
 * `PANEL.codeSize`, with no highlighter: the colour on a line is state alone
 * (C11), the change hue on a line the change wrote and the muted grey on one
 * it deleted.
 *
 * The code is the file's text as the local server read it from git (D211
 * (file-text)), a row to a line under its number. A line the change wrote is
 * marked down its edge from the file's hunks, a line the change removed
 * lines after is ruled beneath, and the line a function starts on has its
 * number as a link that opens the file there in the reader's editor, through
 * core's `editorLink`. A text read at another commit than the map's takes no
 * such mark and says so (D271 (marks-of-own-commit)). A fixture has no server, and an answer that is not
 * the text says what it is in words, so the tab never shows an empty box
 * (C2). The sheet of rows takes the focus, so the keyboard scrolls it.
 *
 * The diff is `diff.ts`'s level for the file: its rows once the server
 * answered, each hunk's head a link to its line, else the hunks' line ranges
 * from the map and why there is no more.
 */

import { editorLink } from 'core';
import type { Hunk } from 'core';
import { useMemo } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import type { DiffLevel, DiffRow } from '../diff.js';
import { codeLines, editorOf, sourceNote } from '../source.js';
import type { SourceAnswer } from '../source.js';

/** The tokens the text is drawn with: the shape of the live view the inspector hands in. */
export type TextLook = {
  readonly CHANGE_HUE: string;
  readonly CHROME_GROUND: string;
  readonly CHROME_INK: string;
  readonly CHROME_MUTED: string;
  readonly CHROME_PAD: number;
  readonly CHROME_STROKE_WIDTH: number;
  readonly FONT_FAMILY: string;
};

/** How many characters of a git object's sha the tab writes. */
const SHORT_SHA = 7;

/** The leading of a line of code, a share of its size. */
const LEADING = 1.45;

/** How wide the mark down a changed line's edge is, in pixels. */
const EDGE = 2;

/** A link out of the page: a web page in a tab of its own, an editor's scheme handed to the editor with the world left where it is. */
export const Out = ({ href, color, children, ...marks }: { readonly href: string; readonly color: string; readonly children: ReactNode } & Readonly<Record<`data-${string}`, string>>): ReactElement => (
  <a href={href} {...(/^https?:/i.test(href) ? { target: '_blank', rel: 'noreferrer' } : {})} {...marks} style={{ color }}>
    {children}
  </a>
);

/** What a tab says where it has no text to show, in the muted ink. */
const Says = ({ look, children, ...marks }: { readonly look: TextLook; readonly children: ReactNode } & Readonly<Record<`data-${string}`, string>>): ReactElement => (
  <p {...marks} style={{ margin: 0, color: look.CHROME_MUTED, overflowWrap: 'anywhere' }}>
    {children}
  </p>
);

/** The scrolled sheet a text's rows stand on: one face, no wrapping, so a line is a line. */
const sheetOf = (look: TextLook, size: number): CSSProperties => ({ flex: '1 1 auto', minHeight: 0, overflow: 'auto', margin: 0, fontFamily: look.FONT_FAMILY, fontSize: size, lineHeight: LEADING, whiteSpace: 'pre', tabSize: 2 });

/** The gutter a row's number stands in, `digits` characters wide, held at the sheet's left edge as the text scrolls under it. */
const gutterOf = (look: TextLook, digits: number, color: string): CSSProperties => ({
  flex: 'none',
  position: 'sticky',
  left: 0,
  width: `${String(digits + 1)}ch`,
  paddingRight: '1ch',
  boxSizing: 'content-box',
  textAlign: 'right',
  background: look.CHROME_GROUND,
  color,
  userSelect: 'none',
});

/** How many digits the largest of some line numbers takes. */
const digitsOf = (lines: readonly number[]): number => String(Math.max(1, ...lines)).length;

export type CodeProps = {
  readonly path: string;
  /** The file's text as the page holds it, in one of the contract's seven states. */
  readonly answer: SourceAnswer;
  /** The change's hunks in the file, none for a file it did not touch. */
  readonly hunks: readonly Hunk[];
  /** The file's functions by the line each starts on, none where the head scan read none. */
  readonly functions: readonly { readonly name: string; readonly line: number }[];
  /** Why the text takes no mark from the map, where it is another commit's (D271 (marks-of-own-commit)): said under the head, with `hunks` and `functions` then handed empty. */
  readonly apart?: string | undefined;
  readonly look: TextLook;
  /** The text's size in pixels, `PANEL.codeSize`. */
  readonly size: number;
};

/** A file's text, read-only, a row to a line; or what the answer is, in words, where it is not the text. */
export const Code = ({ path, answer, hunks, functions, apart, look, size }: CodeProps): ReactElement => {
  const text = answer.status === 'ready' ? answer.source.text : undefined;
  const lines = useMemo(() => (text === undefined ? [] : codeLines(text, hunks)), [text, hunks]);
  const starts = useMemo(() => new Map(functions.map((fn) => [fn.line, fn.name] as const)), [functions]);
  if (answer.status !== 'ready') {
    return (
      <Says look={look} data-inspector-code-note={answer.status}>
        {sourceNote(answer)}
      </Says>
    );
  }
  const editor = editorOf(answer, undefined);
  const link = (line: number): string | undefined => (editor === undefined ? undefined : editorLink(editor.editor, { root: editor.root, path, line }));
  const top = link(1);
  const digits = digitsOf([lines.length]);
  const edge = `${String(EDGE)}px solid`;
  return (
    <>
      <div data-inspector-code-head style={{ display: 'flex', gap: look.CHROME_PAD, alignItems: 'baseline', marginBottom: look.CHROME_PAD / 2, color: look.CHROME_MUTED }}>
        <span style={{ marginRight: 'auto' }}>
          read at {answer.source.at.slice(0, SHORT_SHA)} · {String(lines.length)} {lines.length === 1 ? 'line' : 'lines'}
        </span>
        {top !== undefined && (
          <Out href={top} color={look.CHROME_INK} data-inspector-editor="">
            open in the editor
          </Out>
        )}
      </div>
      {apart !== undefined && (
        <p data-inspector-code-apart style={{ margin: `0 0 ${String(look.CHROME_PAD / 2)}px`, color: look.CHROME_MUTED, overflowWrap: 'anywhere' }}>
          {apart}
        </p>
      )}
      {lines.length === 0 ? (
        <Says look={look} data-inspector-code-note="empty">
          the file is empty
        </Says>
      ) : (
        <div data-inspector-code={path} data-inspector-sheet tabIndex={0} style={sheetOf(look, size)}>
          {lines.map((line) => {
            const name = starts.get(line.line);
            const href = name === undefined ? undefined : link(line.line);
            const ink = line.changed ? look.CHANGE_HUE : look.CHROME_MUTED;
            return (
              <div
                key={line.line}
                data-inspector-line={line.line}
                {...(line.changed ? { 'data-inspector-changed': '' } : {})}
                {...(line.cut ? { 'data-inspector-cut': '' } : {})}
                {...(name === undefined ? {} : { 'data-inspector-function': name })}
                style={{
                  display: 'flex',
                  width: 'max-content',
                  minWidth: '100%',
                  boxSizing: 'border-box',
                  borderLeft: `${edge} ${line.changed ? look.CHANGE_HUE : 'transparent'}`,
                  ...(line.cut ? { borderBottom: `${String(look.CHROME_STROKE_WIDTH)}px dashed ${look.CHANGE_HUE}` } : {}),
                }}
              >
                <span style={gutterOf(look, digits, ink)}>
                  {href === undefined ? (
                    String(line.line)
                  ) : (
                    <Out href={href} color={ink} data-inspector-function-link={name ?? ''}>
                      {String(line.line)}
                    </Out>
                  )}
                </span>
                <span style={{ color: look.CHROME_INK }}>{line.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

/** The ink a diff's row is written in: the change hue for a line it added, the muted grey for one it deleted and for a hunk's head. */
const inkOf = (row: DiffRow, look: TextLook): string => (row.kind === 'added' ? look.CHANGE_HUE : row.kind === 'context' ? look.CHROME_INK : look.CHROME_MUTED);

export type DiffProps = {
  /** The file's diff level, from `diffLevelOf`. */
  readonly level: DiffLevel;
  readonly look: TextLook;
  /** The text's size in pixels, `PANEL.codeSize`. */
  readonly size: number;
};

/** A changed file's diff, read-only: its rows once it is served, else its hunks' line ranges and why there is no more. */
export const Diff = ({ level, look, size }: DiffProps): ReactElement => {
  const digits = digitsOf(level.rows.flatMap((row) => (row.kind === 'deleted' ? [] : [row.line])));
  return (
    <>
      {(level.editor !== undefined || level.pr !== undefined) && (
        <div data-inspector-diff-head style={{ display: 'flex', gap: look.CHROME_PAD, justifyContent: 'flex-end', marginBottom: look.CHROME_PAD / 2 }}>
          {level.editor !== undefined && (
            <Out href={level.editor} color={look.CHROME_INK} data-inspector-editor="">
              open in the editor
            </Out>
          )}
          {level.pr !== undefined && (
            <Out href={level.pr} color={look.CHROME_INK} data-inspector-pr="">
              open the PR
            </Out>
          )}
        </div>
      )}
      {level.rows.length === 0 ? (
        <>
          <Says look={look} data-inspector-diff-note="">
            {level.note}
          </Says>
          <ul data-inspector-ranges style={{ listStyle: 'none', margin: `${String(look.CHROME_PAD / 2)}px 0 0`, padding: 0 }}>
            {level.ranges.map((range) => (
              <li key={range}>{range}</li>
            ))}
          </ul>
        </>
      ) : (
        <div data-inspector-diff={level.path} data-inspector-sheet tabIndex={0} style={sheetOf(look, size)}>
          {/* A diff's rows have no name of their own and never move, so each is known by its place. */}
          {level.rows.map((row, at) => (
            <div key={at} data-inspector-diff-row={row.kind} {...(row.kind === 'deleted' ? {} : { 'data-inspector-line': row.line })} style={{ display: 'flex', width: 'max-content', minWidth: '100%', color: inkOf(row, look) }}>
              {row.kind === 'hunk' ? (
                row.href === undefined ? (
                  row.text
                ) : (
                  <Out href={row.href} color={look.CHROME_MUTED}>
                    {row.text}
                  </Out>
                )
              ) : (
                <>
                  <span style={gutterOf(look, digits, look.CHROME_MUTED)}>{row.kind === 'deleted' ? '' : String(row.line)}</span>
                  <span>{row.text}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};
