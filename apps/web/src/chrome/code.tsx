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
 * Where in the file the risk sits is marked too (D348 (line-strip)): a
 * changed line no test ran carries a bar beside its number and a line a
 * mutant is still alive on a diamond, both in the evidence light, and the
 * head counts them in words. Down the sheet's right side runs the file's
 * strip, its lines to scale with the same marks, the lines in view drawn as
 * a window on it; a press on it scrolls the sheet there. A text of another
 * commit takes none of these either.
 *
 * The diff is `diff.ts`'s level for the file: its rows once the server
 * answered, each hunk's head a link to its line, else the hunks' line ranges
 * from the map and why there is no more.
 */

import { editorLink } from 'core';
import type { Hunk } from 'core';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement, ReactNode, RefObject } from 'react';

import type { DiffLevel, DiffRow } from '../diff.js';
import { codeLines, editorOf, sourceNote } from '../source.js';
import type { SourceAnswer } from '../source.js';
import { lineAt, stripMarked, stripOf } from '../strip.js';
import type { MutantMark, Span, Strip } from '../strip.js';
import { FileStrip } from './strip.js';

/** The tokens the text is drawn with: the shape of the live view the inspector hands in. */
export type TextLook = {
  readonly CHANGE_HUE: string;
  readonly CHROME_GROUND: string;
  readonly CHROME_INK: string;
  readonly CHROME_MUTED: string;
  readonly CHROME_PAD: number;
  readonly CHROME_RULE: string;
  readonly CHROME_STROKE_WIDTH: number;
  readonly EVIDENCE_LIGHT: string;
  readonly FONT_FAMILY: string;
};

/** How many characters of a git object's sha the tab writes. */
const SHORT_SHA = 7;

/** How wide the mark down a changed line's edge is, in pixels. */
const EDGE = 2;

/** What stands beside the number of a changed line no test ran, and of a line a mutant is still alive on (D348 (line-strip)): two shapes, so neither is told by its ink alone. */
const UNTESTED_MARK = '▌';
const MUTANT_MARK = '◆';

/** How many characters the two marks take beside a line's number. */
const MARKS = 2;

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
const sheetOf = (look: TextLook, size: number, leading: number): CSSProperties => ({ flex: '1 1 auto', minWidth: 0, minHeight: 0, overflow: 'auto', margin: 0, fontFamily: look.FONT_FAMILY, fontSize: size, lineHeight: leading, whiteSpace: 'pre', tabSize: 2 });

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
  /** The file's functions by the line each starts on, with the lines each spans and how deep it nests; none where the head scan read none. */
  readonly functions: readonly { readonly name: string; readonly line: number; readonly lines: number; readonly depth: number }[];
  /** The changed lines no test ran, and the mutants still alive, none of either where the map measured none or could not say (C2). */
  readonly untested: readonly number[];
  readonly mutants: readonly MutantMark[];
  /** The line to bring into view once the text is shown, as a press on the facts' strip asks; a new value asks again. */
  readonly jump?: { readonly line: number } | undefined;
  /** Why the text takes no mark from the map, where it is another commit's (D271 (marks-of-own-commit)): said under the head, with `hunks` and `functions` then handed empty. */
  readonly apart?: string | undefined;
  readonly look: TextLook;
  /** The text's size in pixels, `PANEL.codeSize`. */
  readonly size: number;
  /** The leading of a line, a share of its size, `PANEL.codeLeading`. */
  readonly leading: number;
  /** How wide the strip down the sheet's side is, in pixels, `PANEL.stripWidth`. */
  readonly stripWidth: number;
};

/** Scroll a sheet so a line of the strip's stands half way down it. */
const bring = (sheet: HTMLElement | null, strip: Pick<Strip, 'lines'>, line: number): void => {
  if (sheet !== null) sheet.scrollTop = ((line - 1) / strip.lines) * sheet.scrollHeight - sheet.clientHeight / 2;
};

/**
 * The strip down a sheet's side (D348 (line-strip)): the file's lines to
 * scale, the lines the sheet shows drawn as a window on them, read off the
 * sheet as it scrolls and as it is resized. It keeps that window itself, so
 * a scroll draws the strip again and not the sheet's rows.
 */
const SheetStrip = ({ sheet, strip, look, thickness }: { readonly sheet: RefObject<HTMLDivElement | null>; readonly strip: Strip; readonly look: TextLook; readonly thickness: number }): ReactElement => {
  const [shown, setShown] = useState<Span | undefined>(undefined);
  useEffect(() => {
    const element = sheet.current;
    if (element === null) return undefined;
    const read = (): void => {
      const tall = Math.max(1, element.scrollHeight);
      const next = { from: lineAt(strip, element.scrollTop / tall), to: lineAt(strip, (element.scrollTop + element.clientHeight - 1) / tall) };
      setShown((was) => (was?.from === next.from && was.to === next.to ? was : next));
    };
    read();
    element.addEventListener('scroll', read, { passive: true });
    const watching = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(read);
    watching?.observe(element);
    return () => {
      element.removeEventListener('scroll', read);
      watching?.disconnect();
    };
  }, [sheet, strip]);
  return <FileStrip strip={strip} look={look} across={false} thickness={thickness} shown={shown} onLine={(line) => bring(sheet.current, strip, line)} />;
};

/** `3 untested`, `1 mutant alive`: what the head counts of a text's marks, none where it has none. */
const markWords = (untested: number, mutants: number): readonly string[] => [...(untested === 0 ? [] : [`${String(untested)} untested`]), ...(mutants === 0 ? [] : [`${String(mutants)} ${mutants === 1 ? 'mutant' : 'mutants'} alive`])];

/** A file's text, read-only, a row to a line; or what the answer is, in words, where it is not the text. */
export const Code = ({ path, answer, hunks, functions, untested, mutants, jump, apart, look, size, leading, stripWidth }: CodeProps): ReactElement => {
  const text = answer.status === 'ready' ? answer.source.text : undefined;
  const lines = useMemo(() => (text === undefined ? [] : codeLines(text, hunks)), [text, hunks]);
  const starts = useMemo(() => new Map(functions.map((fn) => [fn.line, fn.name] as const)), [functions]);
  const strip = useMemo(() => stripOf({ lines: lines.length, functions, hunks, untested, mutants }), [lines.length, functions, hunks, untested, mutants]);
  const bare = useMemo(() => new Set(strip.untested.flatMap((span) => Array.from({ length: span.to - span.from + 1 }, (_, at) => span.from + at))), [strip]);
  const alive = useMemo(() => new Set(strip.mutants.map((mutant) => mutant.line)), [strip]);
  const sheet = useRef<HTMLDivElement | null>(null);
  // A press on the facts' strip asks for a line: it is brought into view once the text is on the sheet.
  useEffect(() => {
    if (jump !== undefined && text !== undefined) bring(sheet.current, strip, jump.line);
  }, [jump, text, strip]);
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
          {[`read at ${answer.source.at.slice(0, SHORT_SHA)}`, `${String(lines.length)} ${lines.length === 1 ? 'line' : 'lines'}`, ...markWords(bare.size, strip.mutants.length)].join(' · ')}
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
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: look.CHROME_PAD / 2 }}>
          <div ref={sheet} data-inspector-code={path} data-inspector-sheet tabIndex={0} style={sheetOf(look, size, leading)}>
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
                  {...(bare.has(line.line) ? { 'data-inspector-untested': '' } : {})}
                  {...(alive.has(line.line) ? { 'data-inspector-mutant': '' } : {})}
                  style={{
                    display: 'flex',
                    width: 'max-content',
                    minWidth: '100%',
                    boxSizing: 'border-box',
                    borderLeft: `${edge} ${line.changed ? look.CHANGE_HUE : 'transparent'}`,
                    ...(line.cut ? { borderBottom: `${String(look.CHROME_STROKE_WIDTH)}px dashed ${look.CHANGE_HUE}` } : {}),
                  }}
                >
                  <span style={gutterOf(look, digits + MARKS, ink)}>
                    {href === undefined ? (
                      String(line.line)
                    ) : (
                      <Out href={href} color={ink} data-inspector-function-link={name ?? ''}>
                        {String(line.line)}
                      </Out>
                    )}
                    <span aria-hidden="true" data-inspector-marks style={{ display: 'inline-block', width: `${String(MARKS)}ch`, textAlign: 'left', color: look.EVIDENCE_LIGHT }}>
                      {`${bare.has(line.line) ? UNTESTED_MARK : ''}${alive.has(line.line) ? MUTANT_MARK : ''}`}
                    </span>
                  </span>
                  <span style={{ color: look.CHROME_INK }}>{line.text}</span>
                </div>
              );
            })}
          </div>
          {stripMarked(strip) && <SheetStrip sheet={sheet} strip={strip} look={look} thickness={stripWidth} />}
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
  /** The leading of a line, a share of its size, `PANEL.codeLeading`. */
  readonly leading: number;
};

/** A changed file's diff, read-only: its rows once it is served, else its hunks' line ranges and why there is no more. */
export const Diff = ({ level, look, size, leading }: DiffProps): ReactElement => {
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
        <div data-inspector-diff={level.path} data-inspector-sheet tabIndex={0} style={sheetOf(look, size, leading)}>
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
