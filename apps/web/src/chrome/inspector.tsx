/**
 * inspector: the panel beside the notice column that says what is selected
 * (D208 (side-panels)): a module's facts, files, exports and wiring, a file's
 * facts, functions, code and diff, and with nothing selected a reading of the
 * map from its structure alone. It reads the selection and what is pointed at
 * over the line to the world, and selects and points through it too (D209
 * (selection-line)), so it is drawn and tested with no world. The run's token
 * is what a served file's text and diff are asked with, none for a fixture,
 * and the PR's link stands beside a diff when the page was told one.
 *
 * It lies over the map, at the rail's left edge, and claims none of the free
 * screen (D215 (inspector-overlay)): the map is fitted as it was. It stands
 * beneath the HUD's row of grade blocks, which runs to the rail too, so a
 * selection never covers a grade (D263 (below-the-grades)). With
 * nothing selected it is one thin tab, `map`, which opens the map view, so
 * it covers nothing unasked (D261 (map-tab)). Its words are `inspector.ts`'s
 * and `reading.ts`'s models, written as they come: a fact the map did not
 * measure is the dash and its reason in the muted ink, never a number (C2).
 *
 * A row that names a module or a file is a button: a click selects it and
 * asks the world to fly there, and while the pointer or the focus rests on
 * it the world rings it; a row the pointer is over on the map is lit here.
 * It is the brutalist material (D12): one monospace face, hard edges,
 * nothing that glows, in the shared tokens read live through the registry
 * (D156), its width and its code's size the `PANEL` tokens.
 *
 * While the focus is inside it the keys are its own (D262 (panel-keys)):
 * Escape clears the selection, or folds the map view away; the arrows step
 * the focus through its rows, or scroll a sheet of code that has it; and
 * Enter is a button's or a link's to take, and goes nowhere else. Each is
 * marked handled, so the camera does not walk under a panel being read. A
 * row whose click swaps the view goes with it, and the focus it held is
 * kept in the panel (D272 (focus-stays)).
 */

import {
  CATEGORY_LETTERS,
  CHANGE_HUE,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_PAD,
  CHROME_RULE,
  CHROME_STROKE_WIDTH,
  FONT_FAMILY,
  IFR_HUE,
  LIFR_HUE,
  MUTED_DASH,
  MVFR_HUE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  NOTICE_LEADING,
  NOTICE_NUMERAL_SIZE,
  NOTICE_SMALL_SIZE,
  NOTICE_TEXT_SIZE,
  SCREEN_TYPE_UP,
  SECONDARY_BOX_WIDTH,
  VFR_HUE,
} from 'scene';
import type { StarHue } from 'scene';
import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, KeyboardEvent, ReactElement, ReactNode } from 'react';
import { editorLink } from 'core';
import type { MapJson } from 'core';

import { diffLevelOf } from '../diff.js';
import { RAIL_WIDTH } from '../fit.js';
import { LOOSE_FILES, counted, inspect, runsIn } from '../inspector.js';
import type { Crumb, Departures, Fact, FileChange, FileModel, FunctionRow, Measured, ModuleModel, NoticeMark } from '../inspector.js';
import { PANEL } from '../materials.js';
import type { PanelLook } from '../materials.js';
import { selectedOf, targetOf } from '../nav.js';
import type { Nav, Selected } from '../nav.js';
import { categoryHue } from '../notices.js';
import { readingOf } from '../reading.js';
import type { ReadingList, ReadingRow } from '../reading.js';
import type { Registry } from '../registry.js';
import { screenType } from '../screen.js';
import { createAnswers, editorOf, otherCommitNote } from '../source.js';
import type { Answers, SourceAnswer } from '../source.js';
import { ownsKey } from '../walk.js';
import { NoticeBox } from './box.js';
import { Code, Diff, Out } from './code.js';
import { useLive } from './live.js';
import { WiringPlate } from './wiring.js';

/** The tokens the panel is drawn with, at rest: the shape its live view takes. */
const LOOK = {
  CATEGORY_LETTERS,
  CHANGE_HUE,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_PAD,
  CHROME_RULE,
  CHROME_STROKE_WIDTH,
  FONT_FAMILY,
  IFR_HUE,
  LIFR_HUE,
  MVFR_HUE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  NOTICE_LEADING,
  NOTICE_NUMERAL_SIZE,
  NOTICE_SMALL_SIZE,
  NOTICE_TEXT_SIZE,
  SCREEN_TYPE_UP,
  SECONDARY_BOX_WIDTH,
  VFR_HUE,
};
type Look = typeof LOOK;

/** What stands between two steps of the way down to the selection. */
const BETWEEN = ' › ';

/** The dot between the parts of one line. */
const MIDDLE = '·';

/** How far an arrow scrolls a sheet of code that has the focus, in pixels. */
const SCROLL_STEP = 40;

/** A module's tabs and a file's, in the order they stand. A file's diff stands only where the change touched it. */
const MODULE_TABS = ['facts', 'files', 'exports', 'wiring'] as const;
const FILE_TABS = ['facts', 'diff', 'code'] as const;
type ModuleTab = (typeof MODULE_TABS)[number];
type FileTab = (typeof FILE_TABS)[number];

/** A file's text where none is asked for, since the change deleted the file: one value, so a reader sees the same answer. */
const NOT_ASKED: SourceAnswer = { status: 'absent' };

/** No hunks and no functions, one value each, so a file with none hands its code the same lists at every draw. */
const NO_HUNKS: FileChange['hunks'] = [];
const NO_FUNCTIONS: readonly FunctionRow[] = [];

export type InspectorProps = {
  /** The map as the frame the scrubber stands at shows it. */
  readonly map: MapJson;
  readonly registry: Registry;
  /** The line to the world (`nav.ts`): the selection and the pointing are read from it and set through it. */
  readonly nav: Nav;
  /** The run's token when the map is served (D134); none for a fixture, whose files no server reads. */
  readonly token?: string | undefined;
  /** The PR the page was told of, when it was. */
  readonly pr?: string | undefined;
};

/** What every part of the panel is drawn with and acts through. */
type Ui = {
  readonly map: MapJson;
  readonly look: Look;
  readonly type: ReturnType<typeof screenType>;
  /** The panel's own tokens, read live: its code's leading, its lists' rows, its functions' share and its amber. */
  readonly panel: PanelLook;
  /** The map's category hue, which a primary notice's box is solid in. */
  readonly hue: string;
  /** Select what a row names and ask the world to fly there. */
  readonly choose: (selected: Selected) => void;
  /** Point at what the row under the pointer names, or let go of it with none. */
  readonly point: (target: string | undefined) => void;
};

/** The target pointed at, from either side, which lights the row that names it. Its own store, so a pointer crossing the map draws the rows again and not a sheet of code. */
const Pointing = createContext<string | undefined>(undefined);

const PointingOf = ({ nav, children }: { readonly nav: Nav; readonly children: ReactNode }): ReactElement => {
  const pointed = useSyncExternalStore(nav.subscribe, nav.pointed, nav.pointed);
  return <Pointing value={pointed?.target}>{children}</Pointing>;
};

/** A flat button of the chrome: the panel's face, a hairline frame, no fill. */
const buttonOf = (look: Look, on = false): CSSProperties => ({
  flex: 'none',
  margin: 0,
  padding: '0 6px',
  font: 'inherit',
  color: on ? look.CHROME_GROUND : look.CHROME_INK,
  background: on ? look.CHROME_INK : 'transparent',
  border: `${String(look.CHROME_STROKE_WIDTH)}px solid ${on ? look.CHROME_INK : look.CHROME_MUTED}`,
  cursor: 'pointer',
});

/** A line the panel says in place of rows: in the ink where the map measured none, in the muted grey where it could not say. */
const Says = ({ ui, muted, children }: { readonly ui: Ui; readonly muted: boolean; readonly children: ReactNode }): ReactElement => (
  <p {...(muted ? { 'data-inspector-muted': '' } : { 'data-inspector-none': '' })} style={{ margin: 0, color: muted ? ui.look.CHROME_MUTED : ui.look.CHROME_INK, overflowWrap: 'anywhere' }}>
    {children}
  </p>
);

/** One block of a view under its heading, with what the heading adds at its right. */
const Section = ({ ui, id, title, adds, children }: { readonly ui: Ui; readonly id: string; readonly title: string; readonly adds?: string | undefined; readonly children: ReactNode }): ReactElement => (
  <section data-inspector-section={id} style={{ marginBottom: ui.look.CHROME_PAD }}>
    <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: ui.look.CHROME_PAD, margin: `0 0 ${String(ui.look.CHROME_PAD / 4)}px`, fontSize: 'inherit', fontWeight: 'bold', fontVariant: 'small-caps' }}>
      <span>{title}</span>
      {adds !== undefined && adds !== '' && (
        <span data-inspector-adds style={{ color: ui.look.CHROME_MUTED, fontWeight: 'normal', fontVariant: 'normal' }}>
          {adds}
        </span>
      )}
    </h4>
    {children}
  </section>
);

/** A path with a place to break after each slash, so a long one wraps between its segments before it wraps inside one. */
const pathWords = (path: string): ReactNode =>
  path.split('/').map((segment, at, segments) => (
    // A path's segments have no name of their own and never move, so each is known by its place.
    <Fragment key={at}>
      {segment}
      {at < segments.length - 1 && (
        <>
          /<wbr />
        </>
      )}
    </Fragment>
  ));

/** A row's name, which takes the room the row has and breaks where it must: a path between its segments first. */
const Words = ({ children }: { readonly children: ReactNode }): ReactElement => <span style={{ flex: '1 1 auto', minWidth: 0, overflowWrap: 'anywhere' }}>{typeof children === 'string' ? pathWords(children) : children}</span>;

/** What a row says past its name, at its right edge. */
const Tail = ({ color, children }: { readonly color: string; readonly children: ReactNode }): ReactElement => <span style={{ flex: 'none', color, whiteSpace: 'nowrap' }}>{children}</span>;

/** A second line under a row's name, in the small type and the muted ink. */
const Under = ({ ui, children, ...marks }: { readonly ui: Ui; readonly children: ReactNode } & Readonly<Record<`data-${string}`, string>>): ReactElement => (
  <span {...marks} style={{ display: 'block', fontSize: ui.type.small, color: ui.look.CHROME_MUTED, fontWeight: 'normal' }}>
    {children}
  </span>
);

/**
 * One row. Where it names a module or a file it is a button: a click
 * selects that and flies there, and the pointer or the focus resting on it
 * points at it, which the world rings (D209 (selection-line)); it is lit
 * while either side points at what it names. A row that names no place on
 * the map, an outside package's or a module's that is gone, is plain.
 */
const Row = ({ ui, selects, muted = false, children }: { readonly ui: Ui; readonly selects: Selected | undefined; readonly muted?: boolean; readonly children: ReactNode }): ReactElement => {
  const pointed = useContext(Pointing);
  const { look } = ui;
  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: look.CHROME_PAD / 2,
    width: '100%',
    boxSizing: 'border-box',
    margin: 0,
    padding: `1px ${String(look.CHROME_PAD / 2)}px`,
    border: 0,
    background: 'transparent',
    color: muted ? look.CHROME_MUTED : look.CHROME_INK,
    font: 'inherit',
    textAlign: 'left',
  };
  if (selects === undefined) {
    return (
      <div data-inspector-row="" {...(muted ? { 'data-inspector-muted': '' } : {})} style={style}>
        {children}
      </div>
    );
  }
  const target = targetOf(selects);
  const lit = pointed === target;
  return (
    <button
      type="button"
      data-inspector-row={target}
      {...(lit ? { 'data-inspector-pointed': '' } : {})}
      onClick={() => ui.choose(selects)}
      onMouseEnter={() => ui.point(target)}
      onMouseLeave={() => ui.point(undefined)}
      onFocus={() => ui.point(target)}
      onBlur={() => ui.point(undefined)}
      style={{ ...style, cursor: 'pointer', ...(lit ? { background: look.CHROME_RULE } : {}) }}
    >
      {children}
    </button>
  );
};

/** Facts as a list, a label to a value: a fact the map did not measure is the dash and why, in the muted ink, never a number (C2). */
const Facts = ({ ui, facts }: { readonly ui: Ui; readonly facts: readonly Fact[] }): ReactElement => (
  <dl data-inspector-facts style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: ui.look.CHROME_PAD, rowGap: 2, margin: `0 0 ${String(ui.look.CHROME_PAD)}px` }}>
    {facts.map((fact) => (
      <Fragment key={fact.label}>
        <dt style={{ color: ui.look.CHROME_MUTED }}>{fact.label}</dt>
        <dd data-inspector-fact={fact.label} {...('muted' in fact ? { 'data-inspector-muted': '' } : {})} style={{ margin: 0, color: 'muted' in fact ? ui.look.CHROME_MUTED : ui.look.CHROME_INK, overflowWrap: 'anywhere' }}>
          {'muted' in fact ? `${MUTED_DASH} ${fact.muted}` : fact.value}
        </dd>
      </Fragment>
    ))}
  </dl>
);

/** The notices on the selection, each its numbered box as the list draws it, its kind, why it was raised, and the thresholds that raised it. */
const Notices = ({ ui, notices }: { readonly ui: Ui; readonly notices: readonly NoticeMark[] }): ReactElement | null =>
  notices.length === 0 ? null : (
    <Section ui={ui} id="notices" title="notices" adds={String(notices.length)}>
      {notices.map((notice) => (
        <div key={notice.rank} data-inspector-notice={notice.rank} style={{ display: 'flex', alignItems: 'flex-start', gap: ui.look.CHROME_PAD / 2, marginBottom: ui.look.CHROME_PAD / 4 }}>
          <NoticeBox rank={notice.rank} tier={notice.tier} look={ui.look} hue={ui.hue} side={ui.type.box} numeral={ui.type.numeral} />
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <span style={{ display: 'block', fontSize: ui.type.small, fontVariant: 'small-caps' }}>{notice.kind}</span>
            <span style={{ display: 'block' }}>{notice.why}</span>
            {notice.thresholds !== '' && <Under ui={ui}>{notice.thresholds}</Under>}
          </span>
        </div>
      ))}
    </Section>
  );

/**
 * The departures from the approved shape (D210 (approved-block)), the
 * map's or one module's with the modules it holds (D270
 * (departures-by-contour)): the muted line where no shape was approved, that
 * the shape is kept where it is, else a row to a departure, which selects
 * its module. A module that is gone has no place to select and is written
 * muted. The loose files at a package's root stand at the package's own
 * path, so their row says which of the two it is about (D255 (loose-files)),
 * and a row is known by its cell, which tells the two apart (D218
 * (departure-cell)).
 */
const DepartureList = ({ ui, departures, kept }: { readonly ui: Ui; readonly departures: Departures; readonly kept: string }): ReactElement => (
  <Section ui={ui} id="departures" title="departures" adds={departures.approved ? departures.words : undefined}>
    {!departures.approved ? (
      <Says ui={ui} muted>
        {departures.words}
      </Says>
    ) : departures.rows.length === 0 ? (
      <Says ui={ui} muted={false}>
        {kept}
      </Says>
    ) : (
      departures.rows.map((row) => (
        <Row key={`${row.kind}\n${row.target}\n${row.cell ?? ''}`} ui={ui} selects={row.selects} muted={row.gone}>
          <Words>
            <span data-inspector-departure={row.kind} {...(row.loose ? { 'data-inspector-loose': '' } : {})} style={{ display: 'block' }}>
              {[row.words, row.target, ...(row.loose ? [LOOSE_FILES] : [])].join(` ${MIDDLE} `)}
            </span>
            <Under ui={ui}>{[row.why, ...(row.names.length === 0 ? [] : [row.names.join(', ')])].join(` ${MIDDLE} `)}</Under>
          </Words>
          {row.count !== undefined && <Tail color={row.gone ? ui.look.CHROME_MUTED : ui.look.CHROME_INK}>{row.count}</Tail>}
        </Row>
      ))
    )}
  </Section>
);

/** The ink each of a package's hues is written in, by the scene's rule for its star (D170): the state hues, `PANEL.amber` for a lesser advisory, the ink for one an audit read clean, the muted grey for one no audit read. */
const packageInk = (hue: StarHue, look: Look, amber: string): string => {
  if (hue === 'ifr') return look.IFR_HUE;
  if (hue === 'amber') return amber;
  if (hue === 'change') return look.CHANGE_HUE;
  return hue === 'clean' ? look.CHROME_INK : look.CHROME_MUTED;
};

const ReadingRowOf = ({ ui, row }: { readonly ui: Ui; readonly row: ReadingRow }): ReactElement => (
  <Row ui={ui} selects={row.selects}>
    {row.hue !== undefined && <span data-inspector-hue={row.hue} aria-hidden="true" style={{ flex: 'none', alignSelf: 'center', width: ui.type.small * 0.6, height: ui.type.small * 0.6, background: packageInk(row.hue, ui.look, ui.panel.amber) }} />}
    <Words>
      <span style={{ display: 'block' }}>{pathWords(row.words)}</span>
      {(row.tail !== undefined || row.muted !== undefined) && (
        <Under ui={ui} {...(row.muted === undefined ? {} : { 'data-inspector-muted': '' })}>
          {[...(row.tail === undefined ? [] : [row.tail]), ...(row.muted === undefined ? [] : [row.muted])].join(` ${MIDDLE} `)}
        </Under>
      )}
    </Words>
    <Tail color={ui.look.CHROME_MUTED}>{row.count}</Tail>
  </Row>
);

/** One list of the map view: its rows, how many of how many it shows, and with none which of the two it means: the map measured none, or could not say and why (C2). */
const ReadingListOf = ({ ui, list }: { readonly ui: Ui; readonly list: ReadingList }): ReactElement => (
  <Section ui={ui} id={list.id} title={list.title} adds={list.rows.length < list.of ? `${String(list.rows.length)} of ${String(list.of)}` : undefined}>
    {list.empty !== undefined && (
      <Says ui={ui} muted={false}>
        {list.empty}
      </Says>
    )}
    {list.muted !== undefined && (
      <Says ui={ui} muted>
        {list.muted}
      </Says>
    )}
    {list.rows.map((row) => (
      <ReadingRowOf key={`${row.words}\n${row.tail ?? ''}`} ui={ui} row={row} />
    ))}
    {list.note !== undefined && (
      <Under ui={ui} data-inspector-note="">
        {list.note}
      </Under>
    )}
  </Section>
);

/** The map view: the structure's lists in their order, then the departures from the approved shape. */
const MapView = ({ ui }: { readonly ui: Ui }): ReactElement => {
  // Each ranked list is cut to `PANEL.readingRows`, read live.
  const most = ui.panel.readingRows;
  const reading = useMemo(() => readingOf(ui.map, most), [ui.map, most]);
  return (
    <>
      {reading.lists.map((list) => (
        <ReadingListOf key={list.id} ui={ui} list={list} />
      ))}
      <DepartureList ui={ui} departures={reading.departures} kept="none: the map keeps its approved shape" />
    </>
  );
};

/** The tabs of a view, the one shown pressed; `children` stand at the row's end. */
const Tabs = <T extends string>({ ui, tabs, shown, show, children }: { readonly ui: Ui; readonly tabs: readonly T[]; readonly shown: T; readonly show: (tab: T) => void; readonly children?: ReactNode }): ReactElement => (
  <div role="tablist" data-inspector-tabs style={{ flex: 'none', display: 'flex', gap: ui.look.CHROME_PAD / 2, padding: `0 ${String(ui.look.CHROME_PAD)}px ${String(ui.look.CHROME_PAD / 2)}px`, borderBottom: `${String(ui.look.CHROME_STROKE_WIDTH)}px solid ${ui.look.CHROME_RULE}` }}>
    {tabs.map((tab) => (
      <button key={tab} type="button" role="tab" aria-selected={tab === shown} data-inspector-tab={tab} onClick={() => show(tab)} style={buttonOf(ui.look, tab === shown)}>
        {tab}
      </button>
    ))}
    {children}
  </div>
);

/** The room a tab's content stands in, scrolled where it is taller. */
const Body = ({ ui, tab, children }: { readonly ui: Ui; readonly tab: string; readonly children: ReactNode }): ReactElement => (
  <div role="tabpanel" data-inspector-body={tab} style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: ui.look.CHROME_PAD }}>
    {children}
  </div>
);

/** A module's files, each a row: its name below the module, what the change did to it in the change hue (C11), the notices on it, and its lines. */
const ModuleFiles = ({ ui, model }: { readonly ui: Ui; readonly model: ModuleModel }): ReactElement => (
  <Section ui={ui} id="files" title="files" adds={String(model.files.length)}>
    {model.files.length === 0 && (
      <Says ui={ui} muted={false}>
        it holds no file
      </Says>
    )}
    {model.files.map((file) => (
      <Row key={file.path} ui={ui} selects={file.selects}>
        <Words>{file.words}</Words>
        {file.change !== undefined && (
          <span data-inspector-change={file.change} style={{ flex: 'none', color: ui.look.CHANGE_HUE }}>
            {file.change}
          </span>
        )}
        {file.notices.map((rank) => {
          const tier = ui.map.notices[rank - 1]?.tier;
          return tier === undefined ? null : <NoticeBox key={rank} rank={rank} tier={tier} look={ui.look} hue={ui.hue} side={ui.type.box} numeral={ui.type.numeral} />;
        })}
        <Tail color={ui.look.CHROME_MUTED}>{counted(file.lines, 'line')}</Tail>
      </Row>
    ))}
  </Section>
);

/** A module's interface: each exported name, in the ink where the reach crossed the module's membrane by it and muted where it did not (D181), with the files it carried the reach to. */
const ModuleExports = ({ ui, model }: { readonly ui: Ui; readonly model: ModuleModel }): ReactElement => {
  const { names, unlit, count } = model.exports;
  return (
    <Section ui={ui} id="exports" title="exports" adds={String(count)}>
      {'muted' in names ? (
        <Says ui={ui} muted>
          {names.muted}
        </Says>
      ) : (
        <>
          {names.value.length === 0 && (
            <Says ui={ui} muted={false}>
              it exports no name
            </Says>
          )}
          {unlit !== undefined && (
            <Says ui={ui} muted>
              {unlit}
            </Says>
          )}
          {names.value.map((row) => (
            <div key={row.name} data-inspector-export={row.name} {...(row.lit ? { 'data-inspector-lit': '' } : {})} style={{ marginBottom: row.lit ? ui.look.CHROME_PAD / 4 : 0 }}>
              <div style={{ padding: `1px ${String(ui.look.CHROME_PAD / 2)}px`, color: row.lit ? ui.look.CHROME_INK : ui.look.CHROME_MUTED, fontWeight: row.lit ? 'bold' : 'normal', overflowWrap: 'anywhere' }}>{row.name}</div>
              {row.reached.map((path) => (
                <Row key={path} ui={ui} selects={selectedOf(ui.map, path)}>
                  <Words>
                    <Under ui={ui}>reached {path}</Under>
                  </Words>
                </Row>
              ))}
            </div>
          ))}
        </>
      )}
    </Section>
  );
};

const ModuleFacts = ({ ui, model }: { readonly ui: Ui; readonly model: ModuleModel }): ReactElement => (
  <>
    <Facts ui={ui} facts={model.facts} />
    {model.holds.length > 0 && (
      <Section ui={ui} id="holds" title="modules it holds" adds={String(model.holds.length)}>
        {model.holds.map((held) => (
          <Row key={targetOf(held.selects)} ui={ui} selects={held.selects}>
            <Words>{held.words}</Words>
            <Tail color={ui.look.CHROME_MUTED}>
              {counted(held.files, 'file')}, {counted(held.lines, 'line')}
            </Tail>
          </Row>
        ))}
      </Section>
    )}
    <Notices ui={ui} notices={model.notices} />
    <DepartureList ui={ui} departures={model.departures} kept={`none: the ${model.noun} keeps its approved shape`} />
  </>
);

/** A measured list in words: `none` where it was measured empty, and the reason, for the muted ink, where it was not measured. */
const listed = <T,>(label: string, measured: Measured<readonly T[]>, words: (value: readonly T[]) => string): Fact => ('muted' in measured ? { label, muted: measured.muted } : { label, value: measured.value.length === 0 ? 'none' : words(measured.value) });

/** What the change did to a file as facts: the lines it wrote, those of them no test ran, and the mutants on them. */
const changeFacts = (change: FileChange): readonly Fact[] => [
  ...(change.ranges.length === 0 ? [] : [{ label: 'changed', value: change.ranges.join(', ') }]),
  listed('untested lines', change.untested, runsIn),
  listed('mutants', change.mutants, (mutants) => mutants.map((mutant) => `line ${String(mutant.line)} ${mutant.status}`).join(', ')),
];

const FileFacts = ({ ui, model }: { readonly ui: Ui; readonly model: FileModel }): ReactElement => (
  <>
    <Facts ui={ui} facts={model.facts} />
    {model.change !== undefined && (
      <Section ui={ui} id="change" title="the change" adds={`+${String(model.change.added)} −${String(model.change.deleted)}`}>
        <Facts ui={ui} facts={changeFacts(model.change)} />
        {model.change.unnamed !== undefined && (
          <Under ui={ui} data-inspector-note="">
            {model.change.unnamed}
          </Under>
        )}
      </Section>
    )}
    <Notices ui={ui} notices={model.notices} />
  </>
);

/** What a function's row says of the thresholds it breaks: which, that it breaks none, or why nothing can be said (C2). */
const breachWords = (breaches: FunctionRow['breaches']): string => {
  if ('muted' in breaches) return `${MUTED_DASH} ${breaches.muted}`;
  return breaches.value.length === 0 ? 'breaks no threshold' : `breaks ${breaches.value.join(', ')}`;
};

/**
 * A file's functions beneath its tab, while the toggle has them shown: each
 * its name, set in by how deep it nests, the line it starts on and its size,
 * the thresholds it breaks, and where the run is served a link that opens
 * the file at it in the reader's editor. They stand under whichever tab is
 * shown, so the code or the diff is read with them beside it, and the
 * toggle holds from file to file (D264 (functions-beneath)). The editor's
 * template comes with the file's text, so on a served run listing them asks
 * for that text, once.
 */
const Functions = ({ ui, model, answers }: { readonly ui: Ui; readonly model: FileModel; readonly answers: Answers }): ReactElement => {
  const gone = model.change?.kind === 'deleted';
  const read = (): SourceAnswer => (gone ? NOT_ASKED : answers.source(ui.map, model.path));
  const source = useSyncExternalStore(answers.subscribe, read, read);
  const editor = editorOf(source, undefined);
  const { functions } = model;
  const { look } = ui;
  return (
    <div data-inspector-functions-list style={{ flex: 'none', maxHeight: ui.panel.functionsShare, overflowY: 'auto', padding: look.CHROME_PAD, borderTop: `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}` }}>
      <Section ui={ui} id="functions" title="functions" adds={'muted' in functions ? undefined : String(functions.value.length)}>
        {'muted' in functions ? (
          <Says ui={ui} muted>
            {functions.muted}
          </Says>
        ) : functions.value.length === 0 ? (
          <Says ui={ui} muted={false}>
            the file holds no function
          </Says>
        ) : (
          functions.value.map((fn) => {
            const href = editor === undefined ? undefined : editorLink(editor.editor, { root: editor.root, path: model.path, line: fn.line });
            const breaks = !('muted' in fn.breaches) && fn.breaches.value.length > 0;
            return (
              <Row key={`${fn.name}\n${String(fn.line)}`} ui={ui} selects={undefined}>
                <Words>
                  <span data-inspector-function={fn.name} style={{ display: 'block', paddingLeft: fn.depth * look.CHROME_PAD }}>
                    {fn.name}
                  </span>
                  <span data-inspector-breaches style={{ display: 'block', paddingLeft: fn.depth * look.CHROME_PAD, fontSize: ui.type.small, color: breaks ? look.CHROME_INK : look.CHROME_MUTED }}>{breachWords(fn.breaches)}</span>
                </Words>
                <Tail color={look.CHROME_MUTED}>
                  line {String(fn.line)} {MIDDLE} {counted(fn.lines, 'line')}
                </Tail>
                {href !== undefined && (
                  <Out href={href} color={look.CHROME_INK} data-inspector-editor={fn.name}>
                    open
                  </Out>
                )}
              </Row>
            );
          })
        )}
      </Section>
    </div>
  );
};

/**
 * A file's code tab: its text from the server, or for a file the change
 * deleted, which has none at the head, that said and nothing asked. The
 * map's hunks and function lines mark the text only where it was read at
 * the map's own commit (D271 (marks-of-own-commit)): on a frame the scrubber
 * stands at the server still answers from the head it holds, and that text
 * is shown bare, with why.
 */
const CodeTab = ({ ui, model, answers, size }: { readonly ui: Ui; readonly model: FileModel; readonly answers: Answers; readonly size: number }): ReactElement => {
  const gone = model.change?.kind === 'deleted';
  const read = (): SourceAnswer => (gone ? NOT_ASKED : answers.source(ui.map, model.path));
  const answer = useSyncExternalStore(answers.subscribe, read, read);
  const functions = 'muted' in model.functions ? NO_FUNCTIONS : model.functions.value;
  if (gone) {
    return (
      <Says ui={ui} muted>
        the change deleted the file, so it has no text at the head
      </Says>
    );
  }
  const apart = otherCommitNote(ui.map.meta.head, answer);
  const own = apart === undefined;
  return <Code path={model.path} answer={answer} hunks={own ? (model.change?.hunks ?? NO_HUNKS) : NO_HUNKS} functions={own ? functions : NO_FUNCTIONS} apart={apart} look={ui.look} size={size} leading={ui.panel.codeLeading} />;
};

/** A changed file's diff tab: `diff.ts`'s level for it, from the server's answer, none on a fixture, and the PR the page was told of. */
const DiffTab = ({ ui, model, answers, pr, size }: { readonly ui: Ui; readonly model: FileModel; readonly answers: Answers; readonly pr: string | undefined; readonly size: number }): ReactElement | null => {
  const read = (): ReturnType<Answers['diff']> => answers.diff(ui.map, model.path);
  const answer = useSyncExternalStore(answers.subscribe, read, read);
  const changed = useMemo(() => ui.map.weather.changed.find((file) => file.path === model.path), [ui.map, model.path]);
  const level = useMemo(() => (changed === undefined ? undefined : diffLevelOf(changed, answer, pr)), [changed, answer, pr]);
  return level === undefined ? null : <Diff level={level} look={ui.look} size={size} leading={ui.panel.codeLeading} />;
};

/** The way down to the selection as the panel's head: each step a button, the map's clearing the selection for the map view, a module's or the file's selecting it. */
const Trail = ({ ui, trail, toMap }: { readonly ui: Ui; readonly trail: readonly Crumb[]; readonly toMap: () => void }): ReactElement => {
  const pointed = useContext(Pointing);
  return (
    <nav data-inspector-trail aria-label="selection" style={{ flex: '1 1 auto', minWidth: 0, overflowWrap: 'anywhere', color: ui.look.CHROME_MUTED }}>
      {trail.map((crumb, at) => {
        const { selects } = crumb;
        const target = selects === undefined ? undefined : targetOf(selects);
        const last = at === trail.length - 1;
        return (
          <Fragment key={target ?? 'map'}>
            {at > 0 && BETWEEN}
            <button
              type="button"
              data-inspector-step={target ?? 'map'}
              onClick={selects === undefined ? toMap : () => ui.choose(selects)}
              {...(target === undefined ? {} : { onMouseEnter: () => ui.point(target), onMouseLeave: () => ui.point(undefined), onFocus: () => ui.point(target), onBlur: () => ui.point(undefined) })}
              style={{ margin: 0, padding: 0, border: 0, background: target !== undefined && pointed === target ? ui.look.CHROME_RULE : 'transparent', font: 'inherit', fontWeight: last ? 'bold' : 'normal', color: last ? ui.look.CHROME_INK : ui.look.CHROME_MUTED, cursor: 'pointer', textAlign: 'left' }}
            >
              {crumb.words}
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
};

/** The HUD's row of grade blocks, by the mark `hud.tsx` draws it with. */
const GRADES = '[data-hud]';

/**
 * How far down the page the HUD's row of grade blocks reaches, in pixels,
 * which is where the panel starts (D263 (below-the-grades)). The row runs to
 * the rail and wraps as the screen narrows, so its foot is measured and
 * followed as it moves; nought where there is no row, or nothing to measure
 * it with, and the panel then starts at the top.
 */
const useGradesFoot = (): number => {
  const [foot, setFoot] = useState(0);
  useEffect(() => {
    const row = document.querySelector(GRADES);
    if (row === null || typeof ResizeObserver === 'undefined') return undefined;
    const measure = (): void => setFoot(Math.ceil(row.getBoundingClientRect().bottom));
    const watching = new ResizeObserver(measure);
    watching.observe(row);
    measure();
    return () => watching.disconnect();
  }, []);
  return foot;
};

/** The four arrows, and which way each steps: on to the next row, or back to the one before. */
const ARROWS: Readonly<Record<string, 1 | -1>> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

/** What the focus steps through inside the panel: its buttons, its links and its sheets of code. */
const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex="0"]';

/** Take an arrow inside the panel: scroll the sheet of code that has the focus, else step the focus to the next row or the one before, stopping at either end. */
const arrow = (root: HTMLElement, target: EventTarget, key: string): void => {
  const step = ARROWS[key] ?? 1;
  if (target instanceof HTMLElement && target.hasAttribute('data-inspector-sheet')) {
    if (key === 'ArrowUp' || key === 'ArrowDown') target.scrollTop += step * SCROLL_STEP;
    else target.scrollLeft += step * SCROLL_STEP;
    return;
  }
  const stops = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const at = stops.findIndex((stop) => stop === target);
  // From the panel itself, which holds the focus after a press on its ground, either way lands on its first stop.
  (at === -1 ? stops[0] : stops[at + step])?.focus();
};

/** A selected module under the panel's head: its tabs, and the one shown. */
const ModuleView = ({ ui, model, registry, nav, tab, show, width }: { readonly ui: Ui; readonly model: ModuleModel; readonly registry: Registry; readonly nav: Nav; readonly tab: ModuleTab; readonly show: (tab: ModuleTab) => void; readonly width: number }): ReactElement => (
  <>
    <Tabs ui={ui} tabs={MODULE_TABS} shown={tab} show={show} />
    <Body ui={ui} tab={tab}>
      {tab === 'facts' && <ModuleFacts ui={ui} model={model} />}
      {tab === 'files' && <ModuleFiles ui={ui} model={model} />}
      {tab === 'exports' && <ModuleExports ui={ui} model={model} />}
      {tab === 'wiring' && <WiringPlate map={ui.map} registry={registry} nav={nav} cell={model.selected.cell} width={width} />}
    </Body>
  </>
);

/** A file's tabs: its diff stands only where the change touched it, and on any other file the facts show in its place. */
const fileTabsOf = (model: FileModel): readonly FileTab[] => FILE_TABS.filter((tab) => tab !== 'diff' || model.change !== undefined);

type FileViewProps = {
  readonly ui: Ui;
  readonly model: FileModel;
  readonly answers: Answers;
  readonly pr: string | undefined;
  /** The size of the code and the diff, `PANEL.codeSize`. */
  readonly size: number;
  readonly tab: FileTab;
  readonly show: (tab: FileTab) => void;
  /** Whether the file's functions are listed beneath its tab, which rests off, and the toggle that lists them. */
  readonly functions: boolean;
  readonly toggle: () => void;
};

/** A selected file under the panel's head: its tabs with the functions' toggle at their end, the tab shown, and the functions beneath it while the toggle is on. */
const FileView = ({ ui, model, answers, pr, size, tab, show, functions, toggle }: FileViewProps): ReactElement => (
  <>
    <Tabs ui={ui} tabs={fileTabsOf(model)} shown={tab} show={show}>
      <button type="button" data-inspector-functions={functions ? 'on' : 'off'} aria-pressed={functions} onClick={toggle} style={{ ...buttonOf(ui.look, functions), marginLeft: 'auto' }}>
        functions
      </button>
    </Tabs>
    <Body ui={ui} tab={tab}>
      {tab === 'facts' && <FileFacts ui={ui} model={model} />}
      {tab === 'diff' && <DiffTab ui={ui} model={model} answers={answers} pr={pr} size={size} />}
      {tab === 'code' && <CodeTab ui={ui} model={model} answers={answers} size={size} />}
    </Body>
    {functions && <Functions ui={ui} model={model} answers={answers} />}
  </>
);

/** The thin tab the panel is with nothing selected and the map view folded away: it stands at the rail's edge, half way down, and opens the map view. */
const MapTab = ({ ui, open }: { readonly ui: Ui; readonly open: () => void }): ReactElement => (
  <button
    type="button"
    data-inspector="closed"
    aria-label="open the map view"
    aria-expanded={false}
    onClick={open}
    style={{
      ...buttonOf(ui.look),
      position: 'fixed',
      right: RAIL_WIDTH,
      top: '50%',
      transform: 'translateY(-50%)',
      padding: '6px 1px',
      writingMode: 'vertical-rl',
      background: ui.look.CHROME_GROUND,
      borderRight: 0,
      fontFamily: ui.look.FONT_FAMILY,
      fontSize: ui.type.text,
      pointerEvents: 'auto',
    }}
  >
    map
  </button>
);

export const Inspector = ({ map, registry, nav, token, pr }: InspectorProps): ReactElement => {
  useLive(registry);
  const look = registry.view(LOOK);
  const panel = registry.view(PANEL, 'PANEL');
  const selected = useSyncExternalStore(nav.subscribe, nav.selected, nav.selected);
  // A selection the map no longer holds, as a scrubbed frame's or a pushed map's may not, reads as none (D209 (selection-line)).
  const model = useMemo(() => inspect(map, selected), [map, selected]);
  const answers = useMemo(() => createAnswers(token), [token]);
  const [mapOpen, setMapOpen] = useState(false);
  const [moduleTab, setModuleTab] = useState<ModuleTab>('facts');
  const [fileTab, setFileTab] = useState<FileTab>('facts');
  const [functions, setFunctions] = useState(false);
  const top = useGradesFoot();

  // What this panel points at, so it lets go of that alone: the tree points from the chrome's side too, and its row may have taken the pointing since (D265 (own-pointing)).
  const mine = useRef<string | undefined>(undefined);
  const point = useCallback(
    (target: string | undefined): void => {
      if (target !== undefined) {
        mine.current = target;
        nav.point(target, 'chrome');
        return;
      }
      const was = mine.current;
      mine.current = undefined;
      const now = nav.pointed();
      if (was !== undefined && now?.from === 'chrome' && now.target === was) nav.point(undefined, 'chrome');
    },
    [nav],
  );

  // The view a row or a step asked for while the focus was inside the panel: the focus is kept in the panel once it shows (D272 (focus-stays)).
  const aside = useRef<HTMLElement | null>(null);
  const wanted = useRef<Selected | 'map' | undefined>(undefined);
  const choose = useCallback(
    (next: Selected): void => {
      const now = nav.selected();
      // The selection it already holds, as the fly to asks for, swaps no view, so there is no focus to keep.
      const moves = now === undefined || targetOf(now) !== targetOf(next);
      if (moves && aside.current?.contains(document.activeElement) === true) wanted.current = next;
      nav.select(next, 'fly');
    },
    [nav],
  );

  const fileShown: FileTab = model.kind === 'file' && fileTabsOf(model).includes(fileTab) ? fileTab : 'facts';
  const shown = model.kind === 'map' ? `map ${String(mapOpen)}` : `${targetOf(model.selected)} ${model.kind === 'module' ? moduleTab : fileShown}`;
  // A row that goes while the pointer rests on it never sees the pointer leave, so what it pointed at is let go when the view changes and when the panel goes.
  useEffect(() => () => point(undefined), [shown, point]);

  // A row's button goes with the view its click swaps, and the focus it held would fall to the page, where the next arrow walks the camera. The panel takes it, so the keys stay its own (D262 (panel-keys)).
  const at = model.kind === 'map' ? undefined : targetOf(model.selected);
  useEffect(() => {
    const want = wanted.current;
    wanted.current = undefined;
    const root = aside.current;
    // The view that came is the one asked for: the map view with nothing selected, else the selection's own.
    const arrived = want !== undefined && at === (want === 'map' ? undefined : targetOf(want));
    if (arrived && root !== null && !root.contains(document.activeElement)) root.focus({ preventScroll: true });
  }, [shown, at]);

  const ui: Ui = { map, look, type: screenType(look), panel, hue: categoryHue(map.weather.checks.category, look), choose, point };
  if (model.kind === 'map' && !mapOpen) return <MapTab ui={ui} open={() => setMapOpen(true)} />;

  const close = (): void => (model.kind === 'map' ? setMapOpen(false) : nav.select(undefined, 'stay'));
  const toMap = (): void => {
    if (aside.current?.contains(document.activeElement) === true) wanted.current = 'map';
    setMapOpen(true);
    nav.select(undefined, 'stay');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    // A key something before the panel already took, as an open legend takes Escape, is left alone.
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Enter') {
      // A button's or a link's Enter is its own, and the world leaves that one be; any other would walk the camera in.
      if (!ownsKey(event.target, event.key)) event.preventDefault();
    } else if (Object.hasOwn(ARROWS, event.key) && !ownsKey(event.target, event.key)) {
      event.preventDefault();
      arrow(event.currentTarget, event.target, event.key);
    }
  };
  const rule = `${String(look.CHROME_STROKE_WIDTH)}px solid ${look.CHROME_RULE}`;

  return (
    <aside
      ref={aside}
      data-inspector={model.kind}
      {...(model.kind === 'map' ? {} : { 'data-inspector-target': targetOf(model.selected) })}
      aria-label="inspector"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={{
        position: 'fixed',
        top,
        right: RAIL_WIDTH,
        bottom: 0,
        width: panel.inspectorWidth,
        maxWidth: `calc(100vw - ${String(RAIL_WIDTH)}px)`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        background: look.CHROME_GROUND,
        color: look.CHROME_INK,
        borderLeft: rule,
        borderTop: rule,
        fontFamily: look.FONT_FAMILY,
        fontSize: ui.type.text,
        lineHeight: look.NOTICE_LEADING,
        outline: 'none',
        pointerEvents: 'auto',
      }}
    >
      <PointingOf nav={nav}>
        <header data-inspector-head style={{ flex: 'none', display: 'flex', alignItems: 'flex-start', gap: look.CHROME_PAD / 2, padding: look.CHROME_PAD }}>
          {model.kind === 'map' ? (
            <strong style={{ flex: '1 1 auto' }}>
              map <span style={{ color: look.CHROME_MUTED, fontWeight: 'normal' }}>{MIDDLE} read from its structure alone</span>
            </strong>
          ) : (
            <Trail ui={ui} trail={model.trail} toMap={toMap} />
          )}
          {model.kind !== 'map' && (
            <button type="button" data-inspector-fly onClick={() => choose(model.selected)} style={buttonOf(look)}>
              fly to
            </button>
          )}
          <button type="button" data-inspector-close aria-label={model.kind === 'map' ? 'fold the map view away' : 'clear the selection'} onClick={close} style={buttonOf(look)}>
            close
          </button>
        </header>
        {model.kind === 'map' && (
          <div data-inspector-body="map" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: look.CHROME_PAD, borderTop: rule }}>
            <MapView ui={ui} />
          </div>
        )}
        {model.kind !== 'map' && (
          <div data-inspector-title style={{ flex: 'none', padding: `0 ${String(look.CHROME_PAD)}px ${String(look.CHROME_PAD / 2)}px`, fontSize: ui.type.small, color: look.CHROME_MUTED, overflowWrap: 'anywhere' }}>
            {model.kind === 'module' ? `${model.noun} ${MIDDLE} ${model.path}` : `file ${MIDDLE} ${model.title}`}
          </div>
        )}
        {model.kind === 'module' && <ModuleView ui={ui} model={model} registry={registry} nav={nav} tab={moduleTab} show={setModuleTab} width={panel.inspectorWidth - 2 * look.CHROME_PAD - look.CHROME_STROKE_WIDTH} />}
        {model.kind === 'file' && <FileView ui={ui} model={model} answers={answers} pr={pr} size={panel.codeSize} tab={fileShown} show={setFileTab} functions={functions} toggle={() => setFunctions((was) => !was)} />}
      </PointingOf>
    </aside>
  );
};
