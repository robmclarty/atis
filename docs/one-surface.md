# One surface

The record of the session that turns the world from five zoom levels into one
lit surface you inspect by clicking. It holds the detail model, the words the
new panels use, the contracts the parallel tracks build against, who owns which
file, what is parked and how to bring it back, and the session's decisions.

The token tables live in [design.md](design.md). The founding record,
[SPEC.md](../SPEC.md), is left as it was written; where this session departs
from it, this file says so.

This file was written before the parallel tracks started, so the contracts
below are what they were told to build against. The close-out track finishes
it with what was built.

## The detail model

There is one level. The wheel only magnifies. Nothing opens, cross-fades or
changes mode because of the zoom, and the tab opens on the lit map fitted to
the screen.

### Always drawn

From the farthest zoom to the nearest, from the first frame:

- the starfield, the band rules and the band captions;
- every module's body, with its membrane, its relief and the dark starless
  ground round it;
- the reach glow and its bloom;
- every file in its round-to-spiky outline, with all its weather marks: the
  stain, the hairline, the lit arc, the notches, the stitches, the ghost ring,
  the crossing and the halo;
- the bolts, the lines between modules, and the numbered notice boxes.

Pan, wheel zoom toward the pointer, tilt, rotate, fly-to and the minimap are
untouched. None of them reads a level.

### Resolves by size on the screen

More detail appears as a thing grows on the screen, by a pixel threshold held
as a live token, and each fades in rather than switching on
(D206 (detail-by-size)):

- A file's functions are drawn inside it on the map as granules, and fade in
  as a granule's radius passes from `LEVELS.granuleFrom` to
  `LEVELS.granuleFull` pixels.
- A file's name is written once its radius on the screen passes
  `LEVELS.fileNameFrom` pixels. Names are placed when the camera rests, under
  the labels' existing collision rule and budget.

Set the thresholds to `0` and everything is drawn at every size. Set
`LEVELS.fileNameFrom` very high and a name is written only when asked for.

### Named when

A thing's name is written when it is under the pointer; while it is selected;
while the pointer is over a notice row, a tree row or an inspector row that
names it; when an agent highlights it; and when it is large enough on the
screen. A module's name comes from the hover tag, the tree and the inspector's
header.

### A click selects

A click on a file selects the file. A click on a module's ground selects the
module. A click on open space clears the selection. The camera does not move
(D207 (click-selects)).

The selection gets a steady ring, keeps its name written, lights its row in the
tree and opens the inspector on it. Escape clears the selection, and with
nothing selected it walks out as it always did. Flying is always asked for: a
tree row, a notice row, the inspector's fly-to button, Enter, or an agent's
highlight.

Selecting a module also opens it in place as the living slide, the cream ground
with its files shaped, pulsing and drifting and their functions inside them
(D205 (open-on-select)). The selection opens it, never the zoom and never the
share of the screen the module fills. Selecting another module moves the slide
there. Clearing the selection closes it. A click on a file inside an open slide
selects the file and keeps its module's slide open. While a slide is open it
hides the weather marks on its files and rests them at gathered places; that is
known and accepted for this session. `LEVELS.openOnSelect` at `0` turns this
off, and a click then only rings and names.

### What moves

The camera, the settle on load, the membrane's ripple, the lines' sway, a
notice's flare and the scrubber's cross-fade. Files float and outlines pulse
only inside a slide a selection opened.

### The side panels

Two panels in the chrome say in words what the map shows in marks
(D208 (side-panels)).

The inspector stands at the right, beside the notice column, and lies over the
map: the map is not fitted again beside it (D215 (inspector-overlay)).

- With nothing selected it is the map view: a reading built from the map's
  structure alone, so it works where no check ran. The largest modules and
  files, the most depended-on, the most outward-reaching, imports past an
  interface, unreachable files, the longest functions, the outside packages,
  then the departures from the approved shape.
- For a module: its facts, its file list, its exports with the names a change
  reached lit, and its wiring as a tab.
- For a file: its facts; its functions, behind a toggle that rests off; its
  code, read-only, when atis serves the page; and its diff when it changed.
- A fact that was not measured is shown muted with the reason, never as a
  number.

The folder tree stands in the right-hand column between the notices and the
shore rail. A row under the pointer rings its file or module on the map, the
map's pointer lights the row, and a click on a row selects and flies there.

Reading by clicking rather than by zooming separates two things the levels
tied together. Before, to read a file's functions the camera had to be parked
on it, and the slide then hid that file's weather and moved its neighbours.
Now the map shows the same picture at any magnification and the words for one
thing stand beside it.

## The words on the screen

The new panels use plain nouns (D216 (plain-nouns)). The code keeps its older
names, and the legend keeps its words, which are held equal to the still
sheet's.

| On the screen | In the code | What it is |
| --- | --- | --- |
| package | a cell of kind `package` | a workspace package, the outermost body |
| module | a cell of any kind: `package`, `folder`, `single` or `directory` | a body on the map with a membrane; what a click on ground selects |
| file | an organelle | one source file placed on the map |
| function | a nucleus's granule; `FileFunction` in the map | one function inside a file |
| outside package | a `Dependency` in the map's weather | a package the repo imports and does not hold |
| not on the map | a shore group's file | a file the map lists beside the terrain: docs, config, tests, build output |
| approved shape | the approved document | the structure the owner accepted with `atis approve` |
| departures | `map.approved.departures` | the ways the map now differs from the approved shape |

Beside them the panels use the map's own words (band, interface, reach,
through and past an interface, fan in and fan out) and the weather's (changed,
added, reach, notice, ghost, stitch, untested lines, mutant). The words cell,
organelle and nucleus are not written in a new panel.

## The frozen contracts

Every track builds against these. A track that needs one changed asks the
world track's owner, who is the integrator; it does not edit the file.

### The line: selection and pointing

`apps/web/src/nav.ts`, decision D209 (selection-line). The line between the
chrome and the world keeps the selection and what is pointed at. It keeps them
itself, so a panel reads and sets both on a line no world steers.

```ts
/** A stop that is not the field: a module, or a file. `Stop` is `walk.ts`'s. */
export type Selected = Exclude<Stop, { readonly kind: 'field' }>;
//   { readonly kind: 'cell'; readonly cell: string }
// | { readonly kind: 'organelle'; readonly path: string; readonly cell: string }

export type Move = 'fly' | 'stay';
export type PointFrom = 'world' | 'chrome';
export type Pointed = { readonly target: string; readonly from: PointFrom };

export const targetOf: (selected: Selected) => string;
export const selectedOf: (map: MapJson, target: string) => Selected | undefined;

// New members of Nav:
readonly selected: () => Selected | undefined;
readonly select: (next: Selected | undefined, move: Move) => void;
readonly pointed: () => Pointed | undefined;
readonly point: (target: string | undefined, from: PointFrom) => void;

// New optional members of Steering:
readonly select?: (selected: Selected | undefined, move: Move) => void;
readonly point?: (target: string | undefined) => void;
```

A target string is a file's path or a module's cell id, such as
`libs/core/src/pm/tools.ts` or `folder:libs/core/src/pm`, as notices and the
hover already write them. `selectedOf` looks a target up in a map, a file
before a module, and answers none for a target the terrain holds neither of, a
shore file's among them. `targetOf` goes the other way.

What `select` does:

- A selection that moved is kept, every listener of `subscribe` hears it, and
  then the world is asked through `steering.select` with the same two
  arguments.
- A selection that did not move is heard by nobody. The world is asked again
  only when the move is `fly` and something is selected, so a second click on
  the same tree row still flies there.
- `select(undefined, …)` clears it.
- The line flies nowhere by itself. With `fly`, the world's `steering.select`
  does the flying.

What `point` does:

- It keeps the target and the side that pointed. Either side's pointing takes
  the other's place.
- A side lets go only of what it pointed at itself:
  `point(undefined, 'chrome')` does nothing while the world is the one
  pointing. The pointer leaving a row for the map sends the row's leave and
  the map's enter in no fixed order, and this makes the order not matter.
- A pointing that moved is heard by every listener.
- The world is asked through `steering.point` for what the chrome points at,
  and with none once the chrome points at nothing, the world having taken its
  place included. The world is never asked back for its own pointing.

Things to rely on:

- `selected()` and `pointed()` return the same object until the value moves,
  so both are safe as snapshots for React's `useSyncExternalStore`:
  `useSyncExternalStore(nav.subscribe, nav.selected, nav.selected)`.
- The selection is not cleared when the scrubber steps or a watch pushes a
  map. A reader holds it to the map it draws, and treats a selection that map
  no longer holds as none.
- A world that starts steering later is not told the selection again. It
  reads `nav.selected()` when it starts.
- `hover`, `opened`, `open`, `explode`, `wire` and every other member are as
  they were. A notice row still calls `hover`; a tree row and an inspector
  row call `point`.

Who calls what:

| Caller | Calls |
| --- | --- |
| the world, on a click | `nav.select(next, 'stay')`, or `nav.select(undefined, 'stay')` on open space and on Escape |
| the world, as the hover moves | `nav.point(target, 'world')`, and `nav.point(undefined, 'world')` when it leaves |
| the world, once | `nav.steer({ …, select, point })`: ring the selection and fly when asked; ring what the chrome points at |
| a tree or inspector row, on a click | `nav.select(selected, 'fly')` |
| a tree or inspector row, under the pointer | `nav.point(target, 'chrome')`, and `nav.point(undefined, 'chrome')` on leaving |
| a panel, to draw | `nav.selected()` and `nav.pointed()` through `nav.subscribe` |

A panel under test makes its own line and needs no world:

```ts
const nav = createNav();
// render <Tree map={DEMO} registry={createRegistry()} nav={nav} />
nav.select(selectedOf(DEMO, 'libs/core/src/pm/tools.ts'), 'stay');
nav.point('folder:libs/core/src/pm', 'world');
// the tree lights both rows; a row's click is read back from nav.selected()
```

### The tokens

`apps/web/src/materials.ts`, read through the registry as
`registry.view(LEVELS, 'LEVELS')`, `registry.view(HOVER, 'HOVER')` and
`registry.view(PANEL, 'PANEL')`. Every token a track reads is already
declared, with its row in [design.md](design.md), so no track edits
`materials.ts`, `registry.ts` or the design tables.

| Token | Rests at | Meaning | Read by |
| --- | --- | --- | --- |
| `LEVELS.gates` | `[{ enter: 0, exit: 0 }, { enter: 6, exit: 5 }, { enter: 1000000, exit: 1000000 }, { enter: 1000000, exit: 1000000 }]` | the zoom at which each old level is entered and left; parked, see below | the world, already |
| `LEVELS.cellOpen` | `0.6` | the share of the free screen at which a module opened as a slide by zoom; read only while `LEVELS.autoOpen` is above `0` | the world, already |
| `LEVELS.cellClose` | `0.45` | the share a slide opened by zoom held open at | the world, already |
| `LEVELS.cellHome` | `0.15` | the share at which a closed slide's files are back home | the world, already |
| `LEVELS.compositeOpen` | `0.35` | past 5,000 files, the share at which a package drawn as one body opens into its modules; not parked | the world, already |
| `LEVELS.compositeClose` | `0.25` | the share at which it closes back into one body | the world, already |
| `LEVELS.autoOpen` | `0` | the switch for the old opening by zoom: at `0` no slide opens by screen share and a click opens none by the old rule | the world, already |
| `LEVELS.openOnSelect` | `1` | above `0`, selecting a module opens it as the living slide in place; at `0` a selection is only ringed and named | the world track |
| `LEVELS.fileNameFrom` | `18` | the radius on the screen, in pixels, from which a file's name is written unasked | the world track |
| `LEVELS.granuleFrom` | `1.5` | the radius on the screen, in pixels, at which a function's granule starts to show | the granules track |
| `LEVELS.granuleFull` | `4` | the radius at which it shows whole | the granules track |
| `HOVER.ink` | `#e6edf3` | the ink of the outline round the thing under the pointer | the world, already |
| `HOVER.width` | `1.5` | that outline's width, in pixels | the world, already |
| `HOVER.slop` | `4` | how far past its edge, in pixels, a file answers the pointer | the world, already |
| `HOVER.tagGap` | `14` | how far from the pointer the hover's tag stands, in pixels | the world, already |
| `HOVER.selectInk` | `#e6edf3` | the ink of the steady ring round the selection | the world track |
| `HOVER.selectWidth` | `2.5` | that ring's width, in pixels | the world track |
| `HOVER.clickSlop` | `4` | how far, in pixels, a press may move and still be a click | the world track |
| `HOVER.clickMs` | `400` | how long, in milliseconds, a press may last and still be a click | the world track |
| `PANEL.inspectorWidth` | `420` | the inspector's width, in pixels | the inspector track |
| `PANEL.codeSize` | `11` | the type size of its code and its diff, in pixels | the inspector track |
| `PANEL.treeRow` | `16` | the height of one tree row, in pixels | the tree track |
| `PANEL.treeIndent` | `10` | how far each depth of the tree is set in, in pixels | the tree track |

Other frozen names from the same work:

- `apps/web/src/registry.ts` exports `STORE_KEY`, `'atis.tokens'`, the key the
  tab's session store keeps overrides under.
- `apps/web/src/__tests__/browser.ts` exports `WEB`, `DEMO`, `launch()`,
  `serve(body?, plugins?)`, `serveDiff(path, token, body)` and `legacy(page)`.
  It is not a test file, so each export must stay imported by a test or the
  dead-code check goes red.
- On the canvas, `data-lod` reads `1` under zoom 6 and `2` from it, and never
  `0`, `3` or `4` at rest. The world track adds `data-selected`; the granules
  track's mesh is reported as `data-nuclei`, which reads `off: composites` on
  a map past 5,000 files.

### The map's approved block

`libs/core/src/schema.ts`, decision D210 (approved-block). An optional key at
the map's root, guarded by `assertMap` when it is there.

```ts
export const DEPARTURE_KINDS = [
  'module-added',
  'module-removed',
  'files-grown',
  'lines-grown',
  'interface-widened',
  'past-interface-up',
  'fan-out-up',
  'dependency-added',
] as const;

export type DepartureKind = (typeof DEPARTURE_KINDS)[number];

export type Departure = {
  readonly kind: DepartureKind;
  readonly target: string;
  readonly why: string;
  readonly was?: number;
  readonly now?: number;
  readonly names?: readonly string[];
};

export type ApprovedBlock = { readonly at: string; readonly departures: readonly Departure[] };

// On MapJson:
readonly approved?: ApprovedBlock;
```

What the block means and what the guard holds it to:

- Absent, no shape was approved. A map of a repo that never approves does not
  change by a byte, and the demo map's golden did not move. A reader writes
  the muted line `no approved shape yet: run atis approve`.
- Present with no departures, the map keeps its approved shape. That is a
  different statement from absent.
- `at` is the head the shape was approved at, as that map's `meta.head` wrote
  it: a commit's full sha, or `working-tree`. It is never empty. The tree's
  header writes the first seven characters of a sha.
- `kind` is one of the eight.
- `target` is the module's path, a cell's `path` and not its `id`. An id
  carries the cell's kind, so a directory that gains an interface file
  changes id and is still the same module. For `dependency-added` the target
  is the outside package's name. It is never empty.
- Every kind but `module-removed` and `dependency-added` must name a path
  some cell of the terrain has, so a reader finds the module with
  `map.terrain.cells.find((cell) => cell.path === target)` and selects it by
  that cell's id. `module-removed` must name a path no cell has.
- `why` is the reason in words, never empty.
- `was` and `now` are the count the kind is about, as approved and as the map
  has it: files, lines, the interface's size, imports past the interface, or
  fan out. Each is a non-negative number where set, and is left out where
  that side was not measured, never written as a zero.
- `names` are strings, sorted: an interface's new exports, for one.
- The list is sorted by `target` and then by `kind`, each as `<` orders two
  strings, with one of a kind for a target. So `kleur` sorts before
  `src/foo`, and under one target `fan-out-up` before `files-grown`.

`Approved` and `assertApproved` are deliberately not exported from
`schema.ts`. They are free for the approved document.

### The approved document

Built by the core track in `libs/core/src/approved.ts`, written by the CLI
track's `atis approve`. Recorded here so the tree, the inspector and the CLI
agree on it before it exists. The owner decided it lives privately
(D212 (approved-private)): at `<git-common-dir>/atis/approved.json`, where
`<git-common-dir>` is what `git rev-parse --git-common-dir` answers, so nothing
lands in the working tree. There is no committed copy and no button in the tab
this session.

```ts
{
  schema_version: 1,
  kind: 'atis.approved',
  approved_at: string,          // the approved map's meta.head
  modules: [                    // sorted by path
    {
      path: string,
      kind: CellKind,
      band: number,
      files: number,
      loc: number,
      interface_size: number,
      exports: string[],
      fan_in?: number,
      fan_out?: number,
      through?: number,
      past?: number,
    },
  ],
  dependencies: string[],       // outside package names
}
```

The four functions the other tracks call:

- `approvedOf(map)` reduces a map to the document. It holds no clock.
- `assertApproved(value)` guards a document read from disk.
- `departuresOf(doc, map, limits)` compares, matching modules by path. A field
  missing on either side yields no departure, never a zero.
- `withApproved(map, doc)` returns the map with
  `approved: { at: doc.approved_at, departures }`, in the order the map's guard
  requires. With no document it returns the map unchanged.

### The panel stubs

Both panels are mounted and exported now and render nothing. Each track fills
in its own file and keeps these props.

```tsx
// apps/web/src/chrome/inspector.tsx
export type InspectorProps = {
  readonly map: MapJson;
  readonly registry: Registry;
  readonly nav: Nav;
  readonly token?: string | undefined;
  readonly pr?: string | undefined;
};
export const Inspector = (_props: InspectorProps): ReactElement | null => null;

// apps/web/src/chrome/tree.tsx
export type TreeProps = {
  readonly map: MapJson;
  readonly registry: Registry;
  readonly nav: Nav;
};
export const Tree = (_props: TreeProps): ReactElement | null => null;
```

- `map` is the map as the frame the scrubber stands at shows it, the same one
  the column is given.
- `nav` is required on both: the selection lives on it.
- `token` is the run's token when atis serves the page, and none for a
  fixture. `pr` is the pull request's link when the page was told one.
- The inspector is mounted in `apps/web/src/chrome/frame.tsx` straight after
  the column:
  `<Inspector map={map} registry={registry} nav={nav} token={token} pr={pr} />`.
- The tree is mounted in `apps/web/src/chrome/column.tsx` between the notices
  and the shore rail, where the column was handed a line:
  `{nav !== undefined && <Tree map={map} registry={registry} nav={nav} />}`.
- The chrome takes the link as a new optional prop, `pr`, and
  `apps/web/src/main.ts` passes it.
- Both are exported through `apps/web/src/chrome/index.ts`.

### The file's text from the server

The inspector's code tab reads one file's text from the local server. The
owner allowed it for any file the map lists: on loopback, with the run's
token, read from git's objects, as JSON only (D211 (file-text)). The CLI track
builds the route and the inspector track reads it; both hold to this.

The request is `GET /file/<path>?token=<token>`, each segment of the path
escaped as the diff's address escapes it.

The answer to a request that succeeds is JSON:

```ts
{
  path: string,    // the path asked for, as the map writes it
  text: string,    // the file's text
  at: string,      // the git object it was read from: the head's full sha,
                   // or the working tree's tree sha
  root: string,    // the repository's absolute path
  editor: string,  // the editor's link template, as the diff's answer carries
}
```

The page holds each file's answer in one of seven states:

| State | When |
| --- | --- |
| `unserved` | the page has no token, as a fixture has none; no request is made |
| `loading` | the request is on its way |
| `ready` | the server answered 200 with the JSON above, naming the path asked for |
| `refused` | the server answered 403: the token is wrong or missing, or the request's host is not this run's |
| `absent` | the server answered 404: the map it holds does not list that path |
| `large` | the server answered 413: the file is over the size cap |
| `binary` | the server answered 415: the file holds a NUL byte |

There is no eighth state. A request that fails any other way reads as
`absent`.

The route never joins the request's path onto the disk, never chooses a
content type from the file's extension, and sends `nosniff`.

## Who owns which file

One owner per file at a time, so the tracks do not meet in a merge. Paths are
from the repo's root. Each parallel track works in its own worktree, a sibling
of the repo and never inside it: `../atis-wt-world`, `../atis-wt-inspector`,
`../atis-wt-tree`, `../atis-wt-granules`, `../atis-wt-core` and
`../atis-wt-cli`.

| Track | Owns |
| --- | --- |
| 1 world | `apps/web/src/world/**` except `world/nuclei.ts`; `apps/web/src/selection.ts` and `__tests__/selection.test.ts` (new); `apps/web/src/opened.ts` and `__tests__/opened.test.ts`; `apps/web/src/asked.ts`, `hover.ts`, `walk.ts`, `view.ts`, `watch.ts`, `highlight.ts` and their tests; `apps/web/src/chrome/crumbs.tsx` and `__tests__/crumbs.test.tsx`; and, now that the ground is laid, `apps/web/src/nav.ts`, `__tests__/nav.test.ts`, `materials.ts`, `registry.ts`, `dev/patch.ts`, `__tests__/registry.test.ts`, `__tests__/patch.test.ts`, `chrome/frame.tsx`, `main.ts`, the token tables of `docs/design.md`, `__tests__/world.test.ts`, `__tests__/browser.ts` and `__tests__/select.test.ts` (new) |
| 2 inspector | `apps/web/src/inspector.ts`, `reading.ts` and `source.ts` (new); `apps/web/src/chrome/inspector.tsx` and `chrome/code.tsx` (new); `apps/web/src/chrome/wiring.tsx` and `chrome/status.tsx`; `apps/web/src/__tests__/inspector.test.ts`, `inspector.test.tsx`, `reading.test.ts`, `source.test.ts` (new), `wiring.test.tsx` and `status.test.tsx` |
| 3 tree | `apps/web/src/tree.ts` (new); `apps/web/src/chrome/tree.tsx`, `chrome/column.tsx`, `chrome/notices.tsx` and `chrome/rail.tsx`; `apps/web/src/__tests__/tree.test.ts`, `tree.test.tsx` (new), `notices.test.tsx` and `rail.test.tsx` |
| 4 granules | `libs/scene/src/nuclei.ts` and `libs/scene/src/__tests__/nuclei.test.ts` (new); `libs/scene/src/interior.ts` and `__tests__/interior.test.ts`; one export line in `libs/scene/src/index.ts`; `apps/web/src/world/nuclei.ts` (new) |
| 5 core | `libs/core/src/approved.ts` and `libs/core/src/__tests__/approved.test.ts` (new); one export line in `libs/core/src/index.ts` |
| 6 cli | `apps/atis/src/**`, sources and tests |
| 7 close-out | the merges into `one-surface`; `README.md` and `apps/atis/README.md`; this file; the prose of `docs/design.md`; `cspell.json`; and any file, for a red check, once nothing else is running |

Frozen, with no owner until the close-out: `libs/core/src/schema.ts`,
`libs/core/src/__tests__/schema.test.ts` and `apps/web/src/chrome/index.ts`.

Applied from the owner's amendments:

- The world track owns `apps/web/src/opened.ts` and its test. The plan listed
  them under nobody, and opening a slide by selection (D205 (open-on-select))
  needs its own way through them.
- Only the world track commits to `apps/web/src/world/draw.ts`. The granules
  track hands over a mesh and the world track wires it in.
- Only the world track runs the browser tests, only the CLI track runs the
  CLI's tests, and the full check runs on the ground and at the close-out.
  Several headless browsers at once contend and time out.
- `pnpm build` runs once, at the very end. The `atis` on the owner's path
  points at this repo's build, so a build mid-session changes the tool in his
  hands.
- No track creates `checkride.baseline.json`, pushes, or commits to `main`.

The merge order is by what the owner sees: the core track; the world track
once a click selects and the breadcrumb follows it; the inspector; the tree;
the granules and the rest of the world track; the CLI track.

## What is parked and how to bring it back

The slide a module opened as by zoom, the file's plate and the diff's sheet
are parked, not deleted (D204 (parked-levels)). Their code and tests are all
still there, and nothing on the normal path reaches them. They are parked by
the values three tokens rest at, so the dev panel brings them back in a
running tab with no build.

| To get back | Set |
| --- | --- |
| a slide opening by zoom, when a module fills `LEVELS.cellOpen` of the free screen, and a click opening one by the old rule | `LEVELS.autoOpen` to `1` |
| the file's plate at zoom 24 and the diff's sheet at zoom 80 | `LEVELS.gates` to the old values below |
| the planet at the far zoom, until the world track deletes it | `LEVELS.gates` to the old values below |
| all of the old levels as they were | both of the above, and `LEVELS.openOnSelect` to `0` |
| a click that only rings and names, with no slide | `LEVELS.openOnSelect` to `0` |

The old gate values, as the dev panel takes them:

```json
[{"enter":1.7,"exit":1.45},{"enter":6,"exit":5},{"enter":24,"exit":20},{"enter":80,"exit":66}]
```

They are the scene's own `LOD_GATES`, which this session did not touch.

How to do it: run `pnpm --filter web dev`, open the tab on a map, press
`tokens` at the bottom right, and edit the three rows. An override lasts for
the tab's session. Reset the tokens, or open a fresh tab, before judging the
one surface again: a stale override brings the old behaviour back and looks
like a bug.

What each switch does alone:

- `LEVELS.autoOpen` gates only the slide: its opening by zoom, and the old
  click that opened a module which would hold open. The plate and the sheet
  are parked by the two deep gates alone.
- `LEVELS.gates` set back with `LEVELS.autoOpen` still `0` brings back the
  planet, the plate and the sheet, and no slide by zoom.
- `LEVELS.autoOpen` at `1` with the gates parked opens a slide by screen share
  at any zoom, with no planet.

In a browser test, `legacy(page)` from `apps/web/src/__tests__/browser.ts`
writes all three into the tab's store before the page loads. Every test of a
parked path calls it.

Parking shows. The dev panel still lists slide and plate tokens that move
nothing at rest, and `data-lod` still steps at zoom 6, where the label budget
grows. Deleting the
parked code is the first job of a follow-up session, once the owner has judged
the one surface on real repos.

The planet is different: the owner decided it goes (D213 (planet-goes)). It is
hidden by the first gate resting at `0` until the world track deletes it from
the web app. The scene library's planet model stays, since the inspector's
list of outside packages uses its rule for a package's hue.

## The decisions

Numbered on from the last decision the founding record's build took. Code
comments cite them as written here, number and slug together.

- **D204 (parked-levels).** The zoom-opened slide, the file's plate and the
  diff's sheet are parked by the values their tokens rest at, not deleted.
  `LEVELS.gates` rests out of the camera's reach and `LEVELS.autoOpen` at `0`.
  The owner is not yet sure those levels should go and wants to compare them
  with the one surface on a real repo first.
- **D205 (open-on-select).** Selecting a module opens it in place as the
  living slide, by `LEVELS.openOnSelect`, resting at `1`. The owner likes the
  oscillating cells and wants them a click away. The selection opens and
  closes it; the zoom never does.
- **D206 (detail-by-size).** What the levels showed resolves by its size on
  the screen: function granules inside every file on the map, and a file's
  name once the file is large enough, each by a pixel threshold held as a live
  token and each fading in.
- **D207 (click-selects).** A click selects a file, a module, or nothing. The
  camera does not move. The selection is ringed steadily in `HOVER.selectInk`
  and keeps its name. Flying is always asked for.
- **D208 (side-panels).** Two panels in the chrome: the inspector beside the
  notice column, and the folder tree in that column between the notices and
  the shore rail. Their sizes are the `PANEL` tokens.
- **D209 (selection-line).** The selection and the pointing are kept on the
  line between the chrome and the world, not in the world. Either side sets
  them and both hear them, and a panel is built and tested with no world.
  A side lets go only of what it pointed at.
- **D210 (approved-block).** The map carries its departures from the approved
  shape in an optional root block, `approved`, absent where nothing was
  approved. A departure's target is the module's path, not its cell id. The
  guard holds the eight kinds, the targets against the terrain, and the
  list's order.
- **D211 (file-text).** The local server may return the read-only text of any
  file the map lists: on loopback, with the run's token, read from git's
  objects by sha, as JSON only. The page holds each answer in one of seven
  states.
- **D212 (approved-private).** The approved shape is written by
  `atis approve` under the git directory, where nothing lands in the working
  tree. No committed copy and no button in the tab this session.
- **D213 (planet-goes).** The planet is deleted from the web app. It is hidden
  by a gate first, so the one surface is on the screen at once, and deleted by
  the world track. The scene library's pure model stays.
- **D214 (lines-stay).** Both kinds of line between modules stay as they are:
  the cyan ribbons for imports a change added, and the blue-grey necks that
  join one module's files. Standing lines for every import on every map are
  deferred.
- **D215 (inspector-overlay).** The inspector lies over the map, and the map
  is not fitted again beside it. The free screen stays one constant claim at
  the right, which the camera's fit, the minimap's outline and zoom toward the
  pointer all share. Outside packages become a list in the inspector's map
  view, and a package drawn as one body past 5,000 files stays as it is.
- **D216 (plain-nouns).** The new panels write package, module, file and
  function, with the map's and the weather's words, and approved shape and
  departures for the baseline and its differences. The legend keeps its
  words, which are held equal to the still sheet's.
- **D217 (skin-stays).** The raised skin is kept exactly as it is. The glow
  does not depend on it, and flattening it would cost a star mask and edits in
  five vertex stages to gain nothing seen from overhead.

The next free number is D218.

## What this supersedes

[SPEC.md](../SPEC.md) describes five levels of detail with cross-fades between
them, says the world has no panels, and says atis is not a general codebase
explorer. This session departs from all three. The close-out track writes the
sections here once the work is merged, and leaves the founding record alone.
