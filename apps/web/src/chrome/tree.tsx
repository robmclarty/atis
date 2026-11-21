/**
 * tree: the folder tree in the chrome's right-hand column, between the
 * notices and the shore rail (D208 (side-panels)): every file the map lists
 * under its directories, a row for each, lit where the map points and
 * pointing the map where a row is under the pointer. It reads the selection
 * and what is pointed at over the line to the world, and selects and points
 * through it too (D209 (selection-line)), so it is drawn and tested with no
 * world.
 *
 * A row is a button `PANEL.treeRow` high, set in by `PANEL.treeIndent` for
 * each directory above it. A directory that holds a change on the map opens
 * unasked (D284 (opens-on-map-change)), and the rest stay closed, their rows
 * never made, so a map of thousands of files opens on a few rows. A press on a file's row, or on a module's,
 * selects it and flies there; one on a directory that is no module opens or
 * closes it, as the mark at any directory's head does. A row under the
 * pointer, or holding the focus, points the map at what it names. When the
 * selection moves, or the map's own pointer comes to rest on something, the
 * directories above its row open, the row is brought into view, and it is
 * lit: the selection in the selection's ink, what is pointed at outlined in
 * the hover's (D279 (pointing-opens)). A file on the shore is not on the
 * map: its row is muted, says so, names its group, and a press brings that
 * group's block in the rail into view (D280 (shore-row)).
 *
 * Under the tree's header stands the line that says how far the map departs
 * from the approved shape, or, muted, that none was approved
 * (D210 (approved-block)). The arrows walk the rows and Enter presses one,
 * and neither reaches the world, so the camera stands still under a focused
 * tree (D282 (tree-keys)). It is the brutalist material (D12): one monospace
 * face, hard edges, nothing that glows.
 */

import {
  CATEGORY_LETTERS,
  CHANGE_HUE,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_RULE,
  CHROME_STROKE_WIDTH,
  FONT_FAMILY,
  GHOST_STROKE,
  IFR_HUE,
  LIFR_HUE,
  MVFR_HUE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  NOTICE_NUMERAL_SIZE,
  NOTICE_SMALL_SIZE,
  NOTICE_TEXT_SIZE,
  ORGANELLE_FILL,
  SCREEN_TYPE_UP,
  SECONDARY_BOX_WIDTH,
  SHORE_BLOCK_GAP,
  SHORE_BLOCK_PAD,
  SHORE_GRID_CELL,
  VFR_HUE,
} from 'scene';
import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, KeyboardEvent, ReactElement } from 'react';
import type { MapJson } from 'core';

import { HOVER, PANEL } from '../materials.js';
import { selectedOf, targetOf } from '../nav.js';
import type { Nav, Pointed, Selected } from '../nav.js';
import { categoryHue } from '../notices.js';
import type { Registry } from '../registry.js';
import { screenType } from '../screen.js';
import { approvedLine, departureWords, lineOf, nudge, rowsShown, startsOpen, treeOf, wornBy } from '../tree.js';
import type { DirectoryNode, TreeModel, TreeNode, TreeRow } from '../tree.js';
import { NoticeBox } from './box.js';
import { Fold, foldMark, useFold } from './fold.js';
import { useLive } from './live.js';
import { markPaint, revealShore } from './rail.js';

export type TreeProps = {
  /** The map as the frame the scrubber stands at shows it. */
  readonly map: MapJson;
  readonly registry: Registry;
  /** The line to the world (`nav.ts`): the selection and the pointing are read from it and set through it. */
  readonly nav: Nav;
};

/** The tokens the tree is drawn with, at rest: the shape its live view takes. */
const LOOK = {
  CATEGORY_LETTERS,
  CHANGE_HUE,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_RULE,
  CHROME_STROKE_WIDTH,
  FONT_FAMILY,
  GHOST_STROKE,
  IFR_HUE,
  LIFR_HUE,
  MVFR_HUE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  NOTICE_NUMERAL_SIZE,
  NOTICE_SMALL_SIZE,
  NOTICE_TEXT_SIZE,
  ORGANELLE_FILL,
  SCREEN_TYPE_UP,
  SECONDARY_BOX_WIDTH,
  SHORE_BLOCK_GAP,
  SHORE_BLOCK_PAD,
  SHORE_GRID_CELL,
  VFR_HUE,
};

/** The fold the tree stands under, by name, and the name its header is written with. */
const TREE = 'tree';

/** What a row of a file the shore holds says of it, and a directory that holds no file on the map. */
const NOT_ON_THE_MAP = 'not on the map';

/** What an added file's name is written with, wherever the map writes it (D120). */
const ADDED = '+';

/** The mark a module's departures from the approved shape are counted behind. */
const DEPARTS = '≠';

/** Everything a row is drawn with: the live looks, the type's sizes and the category's hue. One object, new whenever a token moves, so a row is drawn again then and not otherwise. */
type Paint = {
  readonly look: typeof LOOK;
  readonly panel: typeof PANEL;
  readonly hover: typeof HOVER;
  readonly type: ReturnType<typeof screenType>;
  readonly hue: string;
};

/** What a row asks of the tree: to be pressed, to open or close, to point the map at its target or let go of it, and to take the focus. */
type Asks = {
  readonly press: (node: TreeNode) => void;
  readonly toggle: (node: DirectoryNode) => void;
  readonly point: (target: string | undefined) => void;
  readonly focus: (node: TreeNode) => void;
};

/** The target a row names on the map; none for a shore file's and for a directory that is no module. */
const targetIn = (node: TreeNode): string | undefined => (node.kind === 'shore' ? undefined : node.target);

/** Whether nothing a row names is on the map: a shore file, or a directory holding only such files. */
const offTheMap = (node: TreeNode): boolean => node.kind === 'shore' || (node.kind === 'directory' && node.counts.placed === 0);

/** A row's name as it is written: a directory's with a slash after it, an added file's with a plus before it (D120). */
const wordsOf = (node: TreeNode): string => {
  if (node.kind === 'directory') return `${node.name}/`;
  return node.badges.change === 'added' ? `${ADDED}${node.name}` : node.name;
};

/** A row's title, its whole path, with what a shore file's row says: that it is not on the map, and the group that holds it. */
const titleOf = (node: TreeNode): string => {
  if (node.kind === 'shore') return `${node.path}: ${NOT_ON_THE_MAP} (${node.group})`;
  return offTheMap(node) ? `${node.path}: ${NOT_ON_THE_MAP}` : node.path;
};

/** The kind of mark a file's row leads with; none for a file the change left alone. */
const markOf = (node: TreeNode): string | undefined => node.badges.change ?? (node.badges.ghost ? 'ghost' : undefined);

/** The head of a row, one indent wide: the mark that opens and closes a directory, or a file's change as the rail marks it. */
const Lead = ({ node, open, paint, asks }: { readonly node: TreeNode; readonly open: boolean; readonly paint: Paint; readonly asks: Asks }): ReactElement => {
  const slot: CSSProperties = { flex: 'none', width: paint.panel.treeIndent, display: 'inline-flex', justifyContent: 'center' };
  if (node.kind === 'directory') {
    return (
      <span
        data-twisty
        aria-hidden="true"
        onClick={(event) => {
          // The mark opens and closes; the row's own press, which selects a module, is not reached.
          event.stopPropagation();
          asks.toggle(node);
        }}
        style={slot}
      >
        {foldMark(open)}
      </span>
    );
  }
  const mark = markOf(node);
  const side = paint.look.SHORE_GRID_CELL;
  return <span style={slot}>{mark !== undefined && <span data-row-mark={mark} style={{ width: side, height: side, boxSizing: 'border-box', borderRadius: '50%', ...markPaint(mark, paint.look) }} />}</span>;
};

/** A count behind a mark painted as the rail paints one: the changed files a closed directory hides, or its ghosts. */
const Hidden = ({ kind, count, what, ink, paint }: { readonly kind: string; readonly count: number; readonly what: string; readonly ink: string; readonly paint: Paint }): ReactElement => {
  const side = paint.look.SHORE_GRID_CELL;
  return (
    <span data-row-hides={kind} title={`${String(count)} ${what} within`} style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 2, color: ink }}>
      <span style={{ width: side, height: side, boxSizing: 'border-box', borderRadius: '50%', ...markPaint(kind, paint.look) }} />
      {count}
    </span>
  );
};

/** What a row wears at its right (D277 (closed-wears-hidden)): the changed files and ghosts a closed directory hides, the notices' boxes, and the departures from the approved shape. */
const Marks = ({ node, open, paint }: { readonly node: TreeNode; readonly open: boolean; readonly paint: Paint }): ReactElement => {
  const worn = wornBy(node, open);
  const { look, type, hue } = paint;
  return (
    <>
      {worn.changed > 0 && <Hidden kind="changed" count={worn.changed} what="changed" ink={look.CHANGE_HUE} paint={paint} />}
      {worn.ghosts > 0 && <Hidden kind="ghost" count={worn.ghosts} what="ghosts" ink={look.GHOST_STROKE} paint={paint} />}
      {worn.notices.length > 0 && (
        <span data-row-notices style={{ flex: 'none', display: 'inline-flex', gap: look.NOTICE_BOX_GAP }}>
          {worn.notices.map(({ rank, tier }) => (
            <NoticeBox key={rank} rank={rank} tier={tier} look={look} hue={hue} side={type.box} numeral={type.numeral} />
          ))}
        </span>
      )}
      {worn.departures > 0 && (
        <span data-departures={worn.departures} title={`${departureWords(worn.departures)} from the approved shape`} style={{ flex: 'none' }}>
          {DEPARTS}
          {worn.departures}
        </span>
      )}
    </>
  );
};

/** What a row says of itself at its far right, muted: how many files a directory holds, that none of them is on the map, or the group a shore file is in. */
const Tail = ({ node, paint }: { readonly node: TreeNode; readonly paint: Paint }): ReactElement | null => {
  if (node.kind === 'file') return null;
  const words = node.kind === 'shore' ? node.group : offTheMap(node) ? `${String(node.counts.files)} · ${NOT_ON_THE_MAP}` : String(node.counts.files);
  return (
    <span data-row-tail style={{ flex: 'none', color: paint.look.CHROME_MUTED, fontVariant: node.kind === 'shore' ? 'small-caps' : undefined }}>
      {words}
    </span>
  );
};

type RowProps = {
  readonly row: TreeRow;
  /** Whether a directory's row is open; false for a file's. */
  readonly open: boolean;
  readonly selected: boolean;
  readonly pointed: boolean;
  /** Whether Tab lands on this row: one row of the tree does, and the arrows reach the rest. */
  readonly tabbable: boolean;
  readonly paint: Paint;
  readonly asks: Asks;
};

/** How a row is set and lit: the selection in the selection's ink with the ground's ink on it, what is pointed at outlined in the hover's, a row with nothing on the map in the muted grey. */
const rowStyle = ({ row, selected, pointed, paint }: RowProps): CSSProperties => {
  const { look, panel, hover } = paint;
  return {
    display: 'flex',
    alignItems: 'center',
    gap: look.SHORE_BLOCK_GAP / 2,
    width: '100%',
    height: panel.treeRow,
    boxSizing: 'border-box',
    padding: `0 ${String(look.SHORE_BLOCK_PAD)}px 0 ${String(look.SHORE_BLOCK_PAD + row.depth * panel.treeIndent)}px`,
    font: 'inherit',
    lineHeight: `${String(panel.treeRow)}px`,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    color: selected ? look.CHROME_GROUND : offTheMap(row.node) ? look.CHROME_MUTED : look.CHROME_INK,
    background: selected ? hover.selectInk : 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    outline: pointed ? `${String(look.CHROME_STROKE_WIDTH)}px solid ${hover.ink}` : undefined,
    outlineOffset: -look.CHROME_STROKE_WIDTH,
    // A row the focus scrolls to stops under the tree's header, which stays at the column's top, not behind it.
    scrollMarginTop: 2 * panel.treeRow,
  };
};

/** One row. Drawn again only when what it shows moves, so the pointer crossing the map redraws two rows and not the tree. */
const Row = memo((props: RowProps): ReactElement => {
  const { row, open, selected, pointed, tabbable, paint, asks } = props;
  const { node } = row;
  const target = targetIn(node);
  return (
    <button
      type="button"
      data-row={node.path}
      data-row-kind={node.kind}
      data-target={target}
      data-depth={row.depth}
      data-open={(node.kind === 'directory' && open) || undefined}
      data-selected={selected || undefined}
      data-pointed={pointed || undefined}
      data-muted={offTheMap(node) || undefined}
      aria-expanded={node.kind === 'directory' ? open : undefined}
      aria-current={selected || undefined}
      aria-label={node.kind === 'shore' ? `${node.name}, ${NOT_ON_THE_MAP}` : undefined}
      title={titleOf(node)}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => asks.press(node)}
      onFocus={() => asks.focus(node)}
      onBlur={() => asks.point(undefined)}
      onMouseEnter={() => asks.point(target)}
      onMouseLeave={() => asks.point(undefined)}
      style={rowStyle(props)}
    >
      <Lead node={node} open={open} paint={paint} asks={asks} />
      <span data-row-name style={{ flex: '0 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {wordsOf(node)}
      </span>
      <span style={{ flex: 1 }} />
      <Marks node={node} open={open} paint={paint} />
      <Tail node={node} paint={paint} />
    </button>
  );
});

/** The directories a reader opened or closed by hand, or the tree opened to show a row; one it holds nothing for opens as the map has it. */
type Toggled = ReadonlyMap<string, boolean>;

const isOpen = (toggled: Toggled, node: DirectoryNode): boolean => toggled.get(node.path) ?? startsOpen(node);

/** These directories open, whatever they were; the same record back when they all are already. */
const opening = (toggled: Toggled, paths: readonly string[]): Toggled => {
  const shut = paths.filter((path) => toggled.get(path) !== true);
  if (shut.length === 0) return toggled;
  const next = new Map(toggled);
  for (const path of shut) next.set(path, true);
  return next;
};

/** Scroll the column until a row shows under the tree's header; nothing where the tree is drawn outside a column. */
const bring = (row: Element): void => {
  const column = row.closest('[data-column]');
  if (column === null) return;
  const head = row.closest('[data-tree]')?.querySelector('header')?.getBoundingClientRect().height ?? 0;
  column.scrollTop += nudge(column.getBoundingClientRect(), row.getBoundingClientRect(), head);
};

/** What the tree last heard on the line. */
type Heard = { readonly selected: Selected | undefined; readonly pointed: Pointed | undefined };

/** The target the line's news leads to: the selection's when it moved, else what the world's pointer came to rest on; none when neither moved, and for the chrome's own pointing, whose row is under the pointer already. */
const newsOf = (was: Heard, now: Heard): string | undefined => {
  if (now.selected !== was.selected) return now.selected === undefined ? undefined : targetOf(now.selected);
  return now.pointed !== was.pointed && now.pointed?.from === 'world' ? now.pointed.target : undefined;
};

/** The keys the tree takes, so the world's walk never hears them (D282 (tree-keys)). */
const KEYS: ReadonlySet<string> = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']);

/** The rows of a model as its directories stand, the place of each by its path, and the record of what was opened and closed with its setter. */
const useRows = (model: TreeModel): { readonly rows: readonly TreeRow[]; readonly places: ReadonlyMap<string, number>; readonly toggled: Toggled; readonly setToggled: (next: (was: Toggled) => Toggled) => void } => {
  const [toggled, setToggled] = useState<Toggled>(() => new Map());
  const rows = useMemo(() => rowsShown(model, (node) => isOpen(toggled, node)), [model, toggled]);
  const places = useMemo(() => new Map(rows.map((row, index) => [row.node.path, index] as const)), [rows]);
  return { rows, places, toggled, setToggled };
};

/** The folder tree for a map, read live from the registry and lit from the line. */
export const Tree = ({ map, registry, nav }: TreeProps): ReactElement => {
  const version = useLive(registry);
  const look = registry.view(LOOK);
  const hue = categoryHue(map.weather.checks.category, look);
  // The registry's version is what moves when a token does: the views read live, and a new object has every row drawn again.
  const paint = useMemo<Paint>(() => ({ look: registry.view(LOOK), panel: registry.view(PANEL, 'PANEL'), hover: registry.view(HOVER, 'HOVER'), type: screenType(registry.view(LOOK)), hue }), [registry, version, hue]);
  const model = useMemo(() => treeOf(map), [map]);
  const { rows, places, toggled, setToggled } = useRows(model);
  const selected = useSyncExternalStore(nav.subscribe, nav.selected, nav.selected);
  const pointed = useSyncExternalStore(nav.subscribe, nav.pointed, nav.pointed);
  const [open, toggle] = useFold(TREE);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [revealed, setRevealed] = useState<{ readonly path: string } | undefined>(undefined);
  const list = useRef<HTMLDivElement>(null);
  const placed = useRef(places);
  placed.current = places;
  const heard = useRef<Heard>({ selected: undefined, pointed: undefined });

  // The selection moving, or the world's pointer coming to rest: open the directories above its row and ask for it to be brought into view (D279 (pointing-opens)).
  useEffect(() => {
    const hear = (): void => {
      const now: Heard = { selected: nav.selected(), pointed: nav.pointed() };
      const target = newsOf(heard.current, now);
      heard.current = now;
      const path = target === undefined ? undefined : model.index.get(target);
      if (path === undefined) return;
      setToggled((was) => opening(was, lineOf(model, path)));
      setRevealed({ path });
    };
    hear();
    return nav.subscribe(hear);
  }, [nav, model, setToggled]);

  // Once the rows are drawn with those directories open, the row is there to scroll to.
  useEffect(() => {
    const index = revealed === undefined ? undefined : placed.current.get(revealed.path);
    const row = index === undefined ? undefined : list.current?.children[index];
    if (row !== undefined) bring(row);
  }, [revealed]);

  const asks = useMemo<Asks>(() => {
    const select = (target: string): void => {
      // The selection is built from the map by the row's target, as every caller builds one (D209 (selection-line)).
      const next = selectedOf(map, target);
      if (next !== undefined) nav.select(next, 'fly');
    };
    const toggleRow = (node: DirectoryNode): void => setToggled((was) => new Map(was).set(node.path, !isOpen(was, node)));
    return {
      press: (node) => {
        if (node.kind === 'shore') return revealShore(node.group);
        if (node.kind === 'file') return select(node.target);
        if (node.target === undefined) return toggleRow(node);
        setToggled((was) => opening(was, [node.path]));
        return select(node.target);
      },
      toggle: toggleRow,
      point: (target) => nav.point(target, 'chrome'),
      focus: (node) => {
        setCursor(node.path);
        nav.point(targetIn(node), 'chrome');
      },
    };
  }, [map, nav, setToggled]);

  const selectedRow = selected === undefined ? undefined : model.index.get(targetOf(selected));
  const pointedRow = pointed === undefined ? undefined : model.index.get(pointed.target);
  // The one row Tab lands on: the row last focused, else the selection's, else the first.
  const tab = [cursor, selectedRow].find((path) => path !== undefined && places.has(path)) ?? rows[0]?.node.path;

  const focusAt = (index: number | undefined): void => {
    const row = index === undefined ? undefined : list.current?.children[index];
    if (row instanceof HTMLElement) row.focus();
  };

  /** Where a key leads from a row: the arrows up and down to the row before and after, right into a directory, opening it first, left out of one, closing it first, and Enter the row's own press. */
  const step = (key: string, { node }: TreeRow, index: number): void => {
    const directory = node.kind === 'directory' ? node : undefined;
    const shown = directory !== undefined && isOpen(toggled, directory);
    if (key === 'Enter') return asks.press(node);
    if (key === 'ArrowDown') return focusAt(index + 1);
    if (key === 'ArrowUp') return focusAt(index - 1);
    if (key === 'ArrowRight') return directory === undefined ? undefined : shown ? focusAt(index + 1) : asks.toggle(directory);
    return directory !== undefined && shown ? asks.toggle(directory) : focusAt(places.get(model.parents.get(node.path) ?? ''));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || !KEYS.has(event.key)) return;
    const at = event.target instanceof Element ? event.target.closest('[data-row]') : null;
    const index = places.get(at?.getAttribute('data-row') ?? '');
    const row = index === undefined ? undefined : rows[index];
    if (row === undefined || index === undefined) return;
    // The world's walk hears no key a handler here has taken (`world/draw.ts`), so the camera stands still.
    event.preventDefault();
    step(event.key, row, index);
  };

  const line = approvedLine(model);
  return (
    <section data-tree aria-label="tree" style={{ color: look.CHROME_INK, fontFamily: look.FONT_FAMILY, fontSize: paint.type.small, borderBottom: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}` }}>
      <Fold name={TREE} open={open} onToggle={toggle} look={look}>
        <span style={{ color: look.CHROME_MUTED }}>
          {model.counts.placed} on the map · {model.counts.files - model.counts.placed} not
        </span>
      </Fold>
      {open && (
        <>
          <div data-approved data-muted={line.muted || undefined} style={{ padding: look.SHORE_BLOCK_PAD, color: line.muted ? look.CHROME_MUTED : look.CHROME_INK }}>
            {line.words}
          </div>
          <div data-rows ref={list} onKeyDown={onKeyDown}>
            {rows.map((row) => (
              <Row
                key={row.node.path}
                row={row}
                open={row.node.kind === 'directory' && isOpen(toggled, row.node)}
                selected={row.node.path === selectedRow}
                pointed={row.node.path === pointedRow}
                tabbable={row.node.path === tab}
                paint={paint}
                asks={asks}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
