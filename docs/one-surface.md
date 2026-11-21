# One surface

The record of the session that turned the world from five zoom levels into one
lit surface you inspect by clicking. It holds the detail model, the words the
new panels use, the contracts the parallel tracks built against, what was
built, what is parked and how to bring it back, the session's decisions, what
was deferred, and the parts of the founding record this departs from.

The token tables live in [design.md](design.md). The founding record,
[SPEC.md](../SPEC.md), is left as it was written; where this session departs
from it, [what this supersedes](#what-this-supersedes) says so.

The first version of this file was written before the parallel tracks started,
as the contracts they were told to build against. The close-out brought it to
what the code does once all six were merged. Where a track built something
other than its contract said, the contract here is the one the code keeps, and
the decision that moved it is named.

## The detail model

There is one level. The wheel only magnifies. Nothing opens, cross-fades or
changes mode because of the zoom, and the tab opens on the lit map.

A page that names no zoom and no centre opens framed on the ground the world
draws, filling `WALK.share` of the free screen (D222 (terrain-frame)). The
layout also holds the shore's strip above the terrain, which the world never
draws, so the whole-layout fit opened a map small in the lower part of the
screen under empty sky. `?zoom=1` is still that whole-layout fit, so it is no
longer the same as naming no zoom.

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

- A file's functions are drawn inside it on the map as round granules, and
  fade in as a granule's radius passes from `LEVELS.granuleFrom` to
  `LEVELS.granuleFull` pixels. Below the lower bound a granule is not drawn at
  all. They need per-function data in the map: a map that read none draws
  none and says so (D293 (granules-unmeasured)), and so does a map past 5,000
  placed files (D292 (granules-off-composites)).
- A file's name is written once its radius on the screen passes
  `LEVELS.fileNameFrom` pixels, about 36 pixels across at rest. Names are laid
  when the labels are placed, which is when the camera rests, the hover
  moves, a token moves or a block of the chrome moves. They take the room
  left after every label that was asked for (D233 (asked-before-sized)),
  under one budget at every zoom, `LEVELS.fileNameBudget`
  (D235 (names-one-budget), D245 (name-budget-token)), and none is written
  under a block of the chrome: the right-hand column, the HUD, the legend,
  the minimap or the inspector (D246 (names-off-chrome)). Each fades in over
  0.3 s.

Set the thresholds to `0` and everything is drawn at every size. Set
`LEVELS.fileNameBudget` to `0` and no name is written unasked. Setting
`LEVELS.fileNameFrom` very high silences the names too, but it also stops the
breadcrumb ending in a file, since a view moved by hand stands at the file
under its centre from the same radius (D230 (file-stop-by-size)).

### Named when

A thing's name is written when it is under the pointer; while it is selected;
while the pointer is over a notice row, a tree row or an inspector row that
names it; when an agent highlights it; and when it is large enough on the
screen. A module's name comes from the hover tag, the tree and the inspector's
header.

### A click selects

A click on a file selects the file. A click on a module's ground selects the
module. A click on open space clears the selection. The camera does not move
(D207 (click-selects)). A click selects what the hover rings, so a file
answers a click as far past its edge as it answers the pointer
(D224 (click-as-hover)).

The selection gets a steady ring, keeps its name written, lights its row in the
tree and opens the inspector on it. Escape clears the selection, and with
nothing selected it walks out as it always did (D225 (escape-clears)). Flying
is always asked for: a tree row, a notice row, the inspector's `fly to`
button, Enter, an arrow key, or an agent's highlight.

The keys walk from the selection, and from where the camera last stood when
nothing is selected (D231 (keys-walk-selection)). Enter walks in and selects
where it lands. An arrow carries a selection to its neighbour, and only moves
the camera when nothing is selected. An agent's highlight and each stop of a
tour select what they fly to.

Selecting a module also opens it in place as the living slide, the cream ground
with its files shaped, pulsing and drifting and their functions inside them
(D205 (open-on-select)). The selection opens it, never the zoom and never the
share of the screen the module fills. The open module is read off the
selection every frame (D220 (slide-by-selection)):

- Selecting another module moves the slide there.
- Clearing the selection closes it, and its files come home by the clock, in
  about 0.3 s whatever the zoom (D221 (home-by-time)).
- A click on a file inside an open slide selects the file and keeps its
  module's slide open.
- A module of one file opens the slide of the package it floats on, and is
  ringed there at its one file, whose tag stays written
  (D247 (single-as-its-file)).
- A package whose files all sit in its folders has no file a slide would
  show, so it opens none and is only ringed.

While a slide is open it hides the weather marks on its files and rests them at
gathered places; that is known and accepted for this session.
`LEVELS.openOnSelect` at `0` turns the slide off, and a click then only rings
and names.

### What moves

The camera, the settle on load, the membrane's ripple, the lines' sway, a
notice's flare and the scrubber's cross-fade. Files float and outlines pulse
only inside a slide a selection opened.

### The side panels

Two panels in the chrome say in words what the map shows in marks
(D208 (side-panels)).

The inspector stands at the right, beside the notice column, and lies over the
map: the map is not fitted again beside it (D215 (inspector-overlay)). It
starts at the foot of the HUD's row of grade blocks
(D263 (below-the-grades)).

- With nothing selected it is one thin tab, `map`, at the column's edge
  (D261 (map-tab)). Opened, it is the map view: a reading built from the map's
  structure alone, so it reads the same where no check ran
  (D251 (reading-no-checks)). The largest modules and files, the most
  depended-on, the most outward-reaching, imports past an interface,
  unreachable files, the longest functions, the outside packages listed whole
  (D252 (packages-whole)), then the departures from the approved shape. Where
  the manifests alone named the entry points, the unreachable list is headed
  `files no manifest's entry point reaches` and says why, and such a file's
  own `reachable` fact is muted (D338 (reach-by-manifests)).
- For a module: its facts, its file list, the modules it holds, its exports
  with the names a change reached lit, and its wiring as a tab. Its counts are
  its whole contour's (D250 (contour-counts)), in the files and lines the head
  holds (D332 (counts-of-head)). Its departures are its own and those of every
  module it holds, and a module that is gone is listed on the package it stood
  in (D270 (departures-by-contour)).
- For a file: its facts; its diff when it changed; its code, read-only, when
  atis serves the page from a repository; and its functions, behind a toggle
  that rests off and stands beneath whichever tab is shown
  (D264 (functions-beneath)).
- A fact that was not measured is shown muted with the reason, never as a
  number.

The right-hand column is one scroll of three parts, the notices, the folder
tree and the shore rail, each under a header that stays at the top and folds
its part (D278 (column-folds)). In the tree a row under the pointer rings its
file or module on the map, the map's pointer and the selection open the way to
a row and light it (D279 (pointing-opens)), and a click on a row selects and
flies there. A closed directory wears what it hides: its changed files, its
ghosts, its notices' boxes and its departures (D277 (closed-wears-hidden)).

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
| loose files | the `directory` cell at a package's own path | the files at a package's root that sit in none of its folders (D255 (loose-files)) |
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

The eight kinds of departure are written `module added`, `module removed`,
`more files`, `more lines`, `interface widened`, `more imports past the
interface`, `more fan out` and `outside package added`. A module's kind is
written `package`, `module, a folder with an interface file`, `module, a
single file` or `module, a directory with no interface file`.

The lines the panels and the status line write for a state, each exactly:

- `no approved shape yet: run atis approve`, muted, in the tree's header and
  the inspector, on a map that carries no approved block;
- `since approved 3c0ee0a: 2 departures`, `1 departure` or `no departures` in
  the tree's header, and `since approved working tree: …` for a shape approved
  from the working tree;
- `none: the map keeps its approved shape`, or `the package` or `the module`,
  in the inspector;
- `structure only: no checks ran` on the status line, on a map no check was
  read for;
- `2 departures from the approved shape`, or `1 departure from …`, on the
  status line, and nothing there for a map that keeps its shape or has none
  (D339 (departures-in-status));
- `live` on the status line while a watch follows the repository, and
  `live · rebuilding` while it measures a map (D336 (watch-says)); a run with
  no `--watch` says neither;
- `N on the map · M not` and `not on the map` in the tree, and `≠N` on a row
  that wears departures.

## The contracts

These were frozen before the tracks forked, so that each could build in its
own files against the others' work before it existed. They are written here
as the code keeps them. The line and the map's approved block stand as they
were frozen, but for one sentence of the block's guard
(D334 (removed-off-head)); the tokens, the approved document and the file's
answer each gained something a track found it needed, and say what.

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
- The tree and the inspector are both the chrome's side, so the line cannot
  tell one's pointing from the other's. Each panel remembers what it pointed
  at and lets go only of that (D265 (own-pointing)), or a row left in the
  tree would drop what a focused row of the inspector points at.
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
| the world, on Enter, on an arrow with a selection held, on an agent's highlight and at a tour's stop | `nav.select(next, 'fly')` |
| the world, as the hover moves | `nav.point(target, 'world')`, and `nav.point(undefined, 'world')` when it leaves |
| the world, once | `nav.steer({ …, select, point })`: ring the selection and fly when asked; ring what the chrome points at |
| a tree row, an inspector row or a notice's row with a stop, on a click | `nav.select(selected, 'fly')` |
| a tree or inspector row, under the pointer or holding the focus | `nav.point(target, 'chrome')`, and on leaving `nav.point(undefined, 'chrome')`, only for what that panel pointed at |
| a panel, to draw | `nav.selected()` and `nav.pointed()` through `nav.subscribe` |

Every caller builds the selection it sets with `selectedOf(map, target)`, the
world included, and never from a pick's own cell. A file floating in an open
slide is picked with the slide's cell, which for a single-file module is the
package it floats in, and the line holds two selections of one file in two
cells apart: built both ways, one file would read as two selections.

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
`registry.view(LEVELS, 'LEVELS')`, `registry.view(HOVER, 'HOVER')`,
`registry.view(WALK, 'WALK')` and `registry.view(PANEL, 'PANEL')`. Each has
its row in [design.md](design.md), which a test holds to the registry in both
directions.

Every token a track read was declared before the tracks forked, so that none
of them would edit `materials.ts`, `registry.ts` or the design tables. Five
were added after: the world track added `LEVELS.fileNameBudget`, being the
tables' owner by then (D245 (name-budget-token)), and the close-out made four
of the inspector's baked looks live, `PANEL.codeLeading`,
`PANEL.readingRows`, `PANEL.functionsShare` and `PANEL.amber`.

| Token | Rests at | Meaning | Read by |
| --- | --- | --- | --- |
| `LEVELS.gates` | `[{ enter: 0, exit: 0 }, { enter: 6, exit: 5 }, { enter: 1000000, exit: 1000000 }, { enter: 1000000, exit: 1000000 }]` | the zoom at which each old level is entered and left; parked, see below. The first is read whatever `LEVELS.autoOpen` says; the other three only while it is `0` | the world |
| `LEVELS.cellOpen` | `0.6` | the share of the free screen at which a module opened as a slide by zoom; read only while `LEVELS.autoOpen` is above `0` | the world |
| `LEVELS.cellClose` | `0.45` | the share a slide opened by zoom held open at | the world |
| `LEVELS.cellHome` | `0.15` | the share at which the files of a slide closed by zoom are back home | the world |
| `LEVELS.compositeOpen` | `0.35` | past 5,000 files, the share at which a package drawn as one body opens into its modules; not parked | the world |
| `LEVELS.compositeClose` | `0.25` | the share at which it closes back into one body | the world |
| `LEVELS.autoOpen` | `0` | the one switch for the old levels: at `0` no slide opens by screen share and a click opens none by the old rule; above `0` the scene's own `LOD_GATES` are read in place of `LEVELS.gates` past its first gate (D240 (far-zoom-lit)), a slide opens by screen share, and none opens by a selection | the world |
| `LEVELS.openOnSelect` | `1` | above `0`, selecting a module opens it as the living slide in place; at `0`, and while `LEVELS.autoOpen` is above `0`, a selection is only ringed and named | the world |
| `LEVELS.fileNameFrom` | `18` | the radius on the screen, in pixels, from which a file's name is written unasked, and from which a view moved by hand stands at the file under its centre (D230 (file-stop-by-size)) | the world |
| `LEVELS.fileNameBudget` | `80` | the most names written unasked at once, at any zoom, a noticed file's among them; at `0` none is written unasked (D245 (name-budget-token)) | the world |
| `LEVELS.granuleFrom` | `1.5` | the radius on the screen, in pixels, at which a function's granule starts to show | the granules' mesh |
| `LEVELS.granuleFull` | `4` | the radius at which it shows whole | the granules' mesh |
| `HOVER.ink` | `#e6edf3` | the ink of the outline round the thing under the pointer, and round what a row of the chrome points at (D234 (pointed-ring)) | the world; the tree, for the pointed row's outline |
| `HOVER.width` | `1.5` | that outline's width, in pixels | the world |
| `HOVER.slop` | `4` | how far past its edge, in pixels, a file answers the pointer and a click | the world |
| `HOVER.tagGap` | `14` | how far from the pointer the hover's tag stands, in pixels | the world |
| `HOVER.selectInk` | `#e6edf3` | the ink of the steady ring round the selection | the world; the tree, for the selected row's fill |
| `HOVER.selectWidth` | `2.5` | that ring's width, in pixels | the world |
| `HOVER.clickSlop` | `4` | how far, in pixels, a press may move and still be a click | the world |
| `HOVER.clickMs` | `400` | how long, in milliseconds, a press may last and still be a click | the world |
| `WALK.share` | `0.8` | the share of the free screen a stop the camera flies to fills, and the share the ground fills as the tab opens (D222 (terrain-frame)) | the world |
| `WALK.fileContext` | `6` | how many of a file's radii of ground a file stop is framed with | the world |
| `WALK.fieldZoom` | `1.7` | how many times the zoom the field is framed at a view that came to rest may stand and still be at the field, whatever lies under its centre (D219 (field-by-zoom), D223 (field-over-frame)) | the world |
| `PANEL.inspectorWidth` | `420` | the inspector's width, in pixels | the inspector; the browser test, for its window |
| `PANEL.codeSize` | `11` | the type size of its code and its diff, in pixels | the inspector |
| `PANEL.codeLeading` | `1.45` | the leading of a line of its code and its diff, a share of `PANEL.codeSize` | the inspector |
| `PANEL.readingRows` | `5` | the most rows each ranked list of the map view shows; the outside packages are listed whole | the inspector |
| `PANEL.functionsShare` | `40%` | the most of the panel's height a file's functions take beneath its tab before they scroll | the inspector |
| `PANEL.amber` | `#e9a93c` | the mark of an outside package a lesser advisory names | the inspector |
| `PANEL.treeRow` | `16` | the height of one tree row, in pixels | the tree |
| `PANEL.treeIndent` | `10` | how far each depth of the tree is set in, in pixels | the tree |

The granules read four more tokens that were there before the session:
`NUCLEUS_FILL`, `NUCLEUS_PAD` and `NUCLEUS_MOST`, which size a granule on the
map as they size one on a slide, and `INTERIOR.granuleShade`, which darkens
its ink on both. Moving any of them moves both.

The planet's tokens are gone: `PLANET` and its 24 names left `materials.ts`,
the registry and the design tables with the planet (D213 (planet-goes)). A
`PLANET.*` override a tab still holds in its store is dropped as stale.

### The names on the page

Names a test, an agent or a later session may rely on.

On the canvas, `#world`:

| Attribute | Reads |
| --- | --- |
| `data-lod` | `1` under zoom 6 and `2` from it; never `0`, `3` or `4` at rest. With `LEVELS.autoOpen` above `0` it reaches `3` and `4`, and still never `0` |
| `data-selected` | the selection's target, a file's path or a module's cell id; absent with none |
| `data-pointed` | the target pointed at, where the map holds it; absent with none |
| `data-pointed-by` | `world` or `chrome`, whichever side points; absent with `data-pointed` |
| `data-open` | the cell whose slide is open; on the one surface it follows the selection |
| `data-nuclei` | how many granules are laid, `14` on the demo; `off: composites` on a map past 5,000 placed files; `off: no function data` where no placed file carries function data; `0` where function data names no function |

`data-planet` is gone with the planet.

Elsewhere:

- `[data-hover] [data-ring="selected" | "pointed" | "hover"]` are the three
  rings the world draws.
- `[data-labels] [data-target]` carries `data-named="size"` on a name written
  for its size. A label that was asked for carries no `data-named`.
- `[data-crumbs]` reads the kind of the stop the breadcrumb shows, `field`
  while the view rests under `WALK.fieldZoom` with nothing selected, and
  `data-crumbs-of` says whose stop it is, `selection` or `walk`.
- The inspector is `button[data-inspector="closed"]` while it is the thin
  tab, and `aside[data-inspector="map" | "module" | "file"]` with
  `data-inspector-target` once open. Its rows are
  `[data-inspector-row="<target>"]` and its tabs `[data-inspector-tab]`.
  Every other mark it carries is a `data-inspector-…` attribute in
  `apps/web/src/chrome/inspector.tsx` or `chrome/code.tsx`.
- `[data-column]` is the right-hand column's one scroll. Its children are
  `section[aria-label="notices" | "tree" | "shore"]`, each under a header
  button `[data-fold="notices" | "tree" | "shore"]` with `aria-expanded`.
- `[data-tree] [data-row="<path>"]` is a tree row, a button, with
  `data-row-kind` (`directory`, `file` or `shore`), `data-target` where it
  has one, `data-selected`, `data-pointed` and `data-muted`.
  `[data-tree] [data-approved]` is the header's line about the approved shape.
- The status line carries `[data-structure-only]`, `[data-departed="<count>"]`
  on a map with departures, `[data-live]` under a watch and
  `[data-rebuilding]` while the watch measures a map.

In the page's address, beside the framing a redrawn page already carried
(`zoom`, `tilt`, `centre`):

- `?select=<target>` opens the page with a file, by its path, or a module,
  by its cell's id, selected, where the map holds it, and leaves the camera
  where the rest of the address puts it (D337 (selection-carried)).

A fold is opened from outside the chrome by a document event
(D285 (unfold-by-event)):

```ts
document.dispatchEvent(new CustomEvent('atis:unfold', { detail: 'shore' }));
```

The detail is `shore`, `tree` or `notices`. The fold is drawn open before
`dispatchEvent` returns, so a block inside it can be queried on the next line.
It must be dispatched from an event handler or from outside React, never while
React is rendering. The world's `revealGroup` sends it before it looks for a
shore group's block, so an agent's highlight of a shore notice opens a shore
the reader folded by hand.

Other names from the same work:

- `apps/web/src/registry.ts` exports `STORE_KEY`, `'atis.tokens'`, the key the
  tab's session store keeps overrides under.
- `apps/web/src/__tests__/browser.ts` exports `WEB`, `DEMO`, `launch()`,
  `serve(body?, plugins?)`, `serveDiff(path, token, body)`,
  `withTokens(page, overrides)` and `legacy(page)`, which stands on
  `withTokens`. It is not a test file, so each export must stay imported by a
  test or the dead-code check goes red.

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
  readonly cell?: string;
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
  it: a commit's full sha, or `working-tree`. It is never empty. A panel
  writes the first seven characters of a sha, `since approved 3c0ee0a`, and
  for `working-tree` the words `since approved working tree`.
- `kind` is one of the eight.
- `target` is the module's path, a cell's `path` and not its `id`. An id
  carries the cell's kind, so a directory that gains an interface file
  changes id and is still the same module. For `dependency-added` the target
  is the outside package's name. It is never empty.
- `cell` says which module at that path is meant (D218 (departure-cell)). A
  path does not name one module: a workspace member is a `package` cell, and
  the loose files at its root are a `directory` cell with the same path, as
  `package:.` and `directory:.` are in a repo of one package. 15 of the
  fixture maps hold such a pair. By how core places a file, no other two
  kinds share a path.
  - For every kind but `module-removed` and `dependency-added`, `cell` is the
    id of a cell of this map, and that cell's `path` is `target`. A reader
    selects it with `selectedOf(map, departure.cell)` and never looks the
    module up by its path.
  - For `module-removed`, `cell` is the id the module had in the approved
    shape, its kind and its path joined by a colon as `directory:src/gone`,
    and the head holds no file of a cell with that id
    (D334 (removed-off-head)). Either the terrain has no such cell, or it has
    one whose every file the map's change deleted: a change map's terrain
    keeps the place of a deleted file, so a module deleted on a branch is
    told removed at once, under the id of the cell still standing there. The
    guard refuses the kind only for a cell that still holds a file the change
    did not delete, its own or one of a cell it holds. Another cell may still
    stand at the path: the directory half of a pair can go while the package
    stays. A reader writes the row muted, and selects the cell only where
    `selectedOf(map, departure.cell)` finds one.
  - For `dependency-added` there is no `cell`: the departure is about no
    module.
- `why` is the reason in words, never empty.
- `was` and `now` are the count the kind is about, as approved and as the map
  has it: files, lines, the interface's size, imports past the interface, or
  fan out. Each is a non-negative number where set, and is left out where
  that side was not measured, never written as a zero.
- `names` are strings, sorted: an interface's new exports, for one.
- The list is sorted by `target`, then by `kind`, then by `cell`, each as `<`
  orders two strings and an absent `cell` as the empty string, with one of a
  kind for a cell. So `kleur` sorts before `src/foo`, under one target
  `fan-out-up` before `files-grown`, and under one target and kind
  `directory:.` before `package:.`.

`Approved` and `assertApproved` are deliberately not exported from
`schema.ts`. They are free for the approved document.

### The approved document

Built by the core track in `libs/core/src/approved.ts`, kept by the CLI
track's `atis approve`. The owner decided it lives privately
(D212 (approved-private)): at `<git-common-dir>/atis/approved.json`, where
`<git-common-dir>` is what `git rev-parse --git-common-dir` answers, so nothing
lands in the working tree. It is one file for the repository, shared by all
its worktrees, and each approval takes the place of the one before with no
undo. There is no committed copy and no button in the tab this session.

```ts
{
  schema_version: 1,
  kind: 'atis.approved',
  approved_at: string,          // the approved map's meta.head
  over?: string,                // the approved map's meta.merge_base
  approved_on?: string,         // the moment of approval, ISO; the CLI's
  modules: [                    // sorted by path, then by kind
    {
      path: string,
      kind: CellKind,
      band: number,
      files: number,            // files the head holds in the contour
      loc: number,              // their lines
      interface_size: number,
      exports?: string[],       // sorted
      fan_in?: number,
      fan_out?: number,
      through?: number,
      past?: number,
    },
  ],
  dependencies?: string[],      // outside package names, sorted
}
```

Three keys were added to the contract the tracks were handed, and two became
optional:

- `over` is the commit the approved map's terrain was cut from: a change's
  merge base, or the head itself on a whole-repo map (D308 (same-terrain)).
  `approvedOf` always writes it. The guard accepts a document with none, which
  then shares no terrain with any map.
- `approved_on` is stamped by the CLI, after `over`, since core's document
  holds no clock (D320 (approved-time)). Core's guard ignores it, as it
  ignores any key it does not know. Nothing reads it yet but `--show`.
- `files` and `loc` count what the head holds inside the module's contour,
  short of the files the map's own change deleted. A module with none left is
  not listed (D300 (held-at-head)).
- `exports` and `dependencies` are absent where the map read none; an
  interface that counts no name writes `exports: []`, which is known
  (D301 (unread-lists)).

The functions the other tracks call, all exported from `libs/core`:

- `approvedOf(map)` reduces a map to the document. It holds no clock, so one
  map gives one document byte for byte.
- `assertApproved(value)` guards a document read from disk.
- `departuresOf(doc, map, limits = DEPARTURE_LIMITS)` reduces the later map as
  `approvedOf` does and compares the two (D305 (one-reduction)). It matches a
  module of the document to a cell of the map by its path and by whether its
  kind is `package`, never by its id and never by the path alone. The two
  together name one module on each side: a path is shared only by a `package`
  and a `directory` (D218 (departure-cell)), so a `directory` that became a
  `folder` is still matched, and a package is never compared with the loose
  files at its root. Each departure carries the `cell` the block's guard
  requires: the map's cell's id, or for `module-removed` the document's
  `kind:path`. A field missing on either side yields no departure, never a
  zero.
- `withApproved(map, doc)` returns the map with
  `approved: { at: doc.approved_at, departures }`, in the order the map's guard
  requires. With no document it returns the map unchanged.
- `sharesTerrain(doc, map)` says whether the document and the map can be
  compared in every count (D308 (same-terrain)).
- `DEPARTURE_LIMITS` is how much growth is told (D303 (departure-limits)):
  files and fan out at 3 more and a quarter more, lines at 100 more and a
  quarter more, and one more exported name or one more import past an
  interface at once. Thresholds in `atis.config.json` are deferred.

What is compared, and when:

- Read from the head on every map, and so always compared: a module's files,
  a module added or removed, the names a barrel or a single file exports,
  imports past an interface, and the outside packages.
- Read from the terrain: a module's lines, its fan out, and the names of an
  interface with no barrel, which is found by who imports it. These three are
  compared only between terrains that share: both cut from one commit, or
  each its head's own, as two whole-repo maps are. Elsewhere they yield
  nothing, never a number. Switching base in the tab, running
  `atis --whole-repo` after approving from a change, and starting the next
  branch after a merge all leave them out until the owner approves again. The
  terminal says so in one line (D324 (unshared-said)); the tab cannot, since
  the block has no field for it.
- Over one base, a file the change only edited moves no line count and no fan
  out, because a change map's terrain is its base's tree with the files the
  change added. So `lines-grown` and `fan-out-up` are told for new files
  alone, however much an old file grew (D309 (no-diff-estimate)). This is the
  watch's common case, and the exact fix is in `libs/core/src/map.ts`.
- An interface widens by its names (D302 (interface-by-name)): a renamed
  export of equal count is no departure.
- A module that shrank, lost files or only renamed an export is no departure.
  There is no kind for shrinking.
- A renamed directory, or a renamed module of one file, reads as one module
  removed and one added, since a module is matched by its path. A directory
  that gains an interface file is the same module under a new id.
- A package's contour holds its modules' files, so growth inside one module
  can be told for its package as well: one change can give two departures of
  one kind.
- A shape approved from the working tree and then mapped at the commit under
  it tells `module-removed` for a module only the tree held. That is correct,
  and a test pins it.

How the CLI keeps to it:

- `atis approve` takes the flags a map takes, `--base`, `--last-commit`,
  `--last-tag`, `--head`, `--working-tree` and `--whole-repo`, and approves
  the map those flags would draw (D323 (approve-as-mapped)). With none it
  approves the head's change over the trunk, as a bare `atis` maps it.
- Every map built after, by every run but `atis fingerprint`, reads the kept
  file and carries the block.
- A kept file that will not read tells no departure: the map is built without
  the block, the run exits 0, and one line on stderr gives the path and the
  reason (D321 (approved-unreadable)).
- Every build runs `assertMap` with the block attached, and a block the guard
  refuses is left off and said on stderr (D322 (approved-guarded)), since the
  page would otherwise drop the whole map.
- `atis approve --show` prints the kept file byte for byte
  (D325 (show-as-kept)). With none kept it prints nothing, says
  `no approved shape yet: run atis approve` on stderr and exits 0.
- An older frame of a `--range` map carries no block
  (D333 (departures-of-head)): the run holds the range's head alone against
  the shape.

### The panels

Both panels were mounted as stubs that rendered nothing before the tracks
forked, and each track filled in its own file and kept these props.

```tsx
// apps/web/src/chrome/inspector.tsx
export type InspectorProps = {
  readonly map: MapJson;
  readonly registry: Registry;
  readonly nav: Nav;
  readonly token?: string | undefined;
  readonly pr?: string | undefined;
};

// apps/web/src/chrome/tree.tsx
export type TreeProps = {
  readonly map: MapJson;
  readonly registry: Registry;
  readonly nav: Nav;
};
```

- `map` is the map as the frame the scrubber stands at shows it, the same one
  the column is given.
- `nav` is required on both: the selection lives on it.
- `token` is the run's token when atis serves the page, and none for a
  fixture. `pr` is the pull request's link when the page was told one.
- The inspector is mounted in `apps/web/src/chrome/frame.tsx` straight after
  the column, and the tree in `apps/web/src/chrome/column.tsx` between the
  notices and the shore rail, where the column was handed a line.
- The chrome takes the link as an optional prop, `pr`, and two more,
  `live?: boolean | undefined` and `rebuilding?: boolean | undefined`, which
  `apps/web/src/main.ts` sets from what the run's watch says on the socket
  (D336 (watch-says)): `live` once it has said anything and until the socket
  closes, `rebuilding` while its last word was that. Both are false on a run
  with no watch, whose socket is open all the same, and on a page with no
  socket. `Status` in `apps/web/src/chrome/status.tsx` writes `live` and
  `rebuilding` for them, `structure only: no checks ran` from
  `state.map.meta.instruments`, and the count of departures from
  `state.map.approved` (D339 (departures-in-status)).
- Both are exported through `apps/web/src/chrome/index.ts`. The inspector's
  code sheet, `chrome/code.tsx`, and the column's fold, `chrome/fold.tsx`, are
  not: a test reaches them through the panels.

The pure models behind them are `apps/web/src/inspector.ts`
(`inspect(map, selected)`), `apps/web/src/reading.ts` (`readingOf(map, most)`),
`apps/web/src/source.ts` (`loadSource`, `createAnswers`) and
`apps/web/src/tree.ts` (`treeOf(map)`), each tested with no DOM.

### The file's text from the server

The inspector's code tab reads one file's text from the local server. The
owner allowed it for any file the map lists: on loopback, with the run's
token, read from git's objects, as JSON only (D211 (file-text)).

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
| `absent` | the server answered 404: the map it holds does not list that path, or the head holds no file there |
| `large` | the server answered 413: the file is over the size cap |
| `binary` | the server answered 415: the file holds a NUL byte |

There is no eighth state. A request that fails any other way reads as
`absent`.

The answers are kept by map and by path, and a map a watch pushed, or a frame
the scrubber stepped to, is another map and is asked afresh
(D253 (read-is-ask)). While that answer is on its way the path's last answer
stands in for it, and `loading` only for a path never answered
(D335 (answer-stands)), so the sheet of code or diff a reader is in stays
mounted with its scroll and its focus. The diff's answer is kept the same
way.

What the route holds to:

- It never joins the request's path onto the disk, never chooses a content
  type from the file's extension, and sends `nosniff`. Only the 200 is JSON; a
  refusal is plain text and names no path.
- The path must be one the held map names, a file on the terrain or a shore
  group's file. A path with an empty, `.` or `..` part or a NUL is refused
  whatever the map names (D311 (file-blob)).
- All three readings are `git cat-file`, for the type, the size and the
  bytes, never `git show`, which reads `..` in a file's name as a range of
  commits and answered another branch's log for a file named
  `src/a..private` (D311 (file-blob)).
- Only a blob the head's object holds at the path is a file. A directory, a
  submodule, a file the change deleted and a path only on disk are 404. A
  symlink answers the link's own text.
- The cap is 1 MiB of the blob, read before the bytes (D310 (file-cap)).
- A working-tree head is read from the tree sha `workingTree()` computed,
  which rides beside the map and never inside `map.json`
  (D312 (tree-beside-map)). A working-tree map with no tree serves no text.
- The text is always the head's, as git holds it, and never the disk's. Under
  a working-tree head with no `--watch`, an edit made after the map was built
  is not shown until the map is built again. Bytes that are not valid UTF-8
  and hold no NUL are served with replacement characters.
- The route is served only when the run reads a repository. A `--png` capture
  and a fixture serve none.

What the page does with `at`:

- `at` is the held map's `meta.head` whenever that head is a commit, the full
  sha, and a test holds the two equal on a served run.
- The code tab marks changed lines and function starts only on text read at
  the map's own commit (D271 (marks-of-own-commit)). On a frame of another
  commit, as an older frame of a range is, the text is the head's, so it is
  shown with no mark and one muted line saying why.
- A working-tree map names no commit to compare, so its text is marked as it
  comes.
- The diff tab does not compare: on an older frame it shows what
  `/diff/<path>` answers for the head the server holds.

The server's read-only paths are now six: the page, its assets, `/map.json`,
`/check/<slot>`, `/diff/<path>` and `/file/<path>`.

### The watch

Not a contract between tracks, but what the tab's `live` stands on. A watching
run says what its watch is doing on the socket, beside the maps it pushes
(D336 (watch-says)):

```json
{ "kind": "watch", "state": "following" }
{ "kind": "watch", "state": "rebuilding" }
```

`following` goes to each page as it connects, before the map held;
`rebuilding` to every page as a rebuild starts, and `following` again as it
ends, with a map before it or, where the rebuild failed, with none. A run with
no watch sends neither, and its page never says `live`. The page drops a state
it does not know.

While the head is the working tree, by `--working-tree` or once the page has switched
its base to it, the watch's signature gains a term that moves with uncommitted
content: a hash of git's status listing with each listed path's size and
modified time (D313 (watch-working-term)). The approved document's stamp is a
term of every signature, so approving rebuilds and pushes the map with its
block (D314 (approved-stamp)).

- It costs one `git status` every 500 ms.
- A file that is written all the time and not ignored, as a dev server's log
  is, keeps the signature moving. Once it has moved at every tick for ten
  ticks the map is rebuilt as it stands, and after a rebuild nothing is handed
  on until as long has passed as the rebuild took (D328 (watch-bounds)). The
  terminal says so once. The cure is to ignore the file.
- Where git cannot list the working tree the term is the fixed word `unread`,
  commits are still followed, and the terminal says once that an edit that
  stages nothing is not.
- A push over unchanged ground lays the granules again from the pushed map
  (D330 (granules-follow-push)).
- A map on other ground, a file added or gone or a cell changed, is drawn
  afresh: the page reloads at the framing the reader stood at, with the
  selection's target in its address, and selects it again where the new map
  holds it (D337 (selection-carried)).
- An edit is noticed in about a second, one tick to see it and one for it to
  hold still. The rest of the wait is the rebuild. On this repository, 182
  files on the map, an uncommitted edit reached the tab 9 to 10 seconds
  after the write in the review's run, in Chrome on WebGPU, where one
  `--working-tree --out` build took 5 seconds; and 3.7 seconds in the last
  pass's own run of the built atis, headless on WebGL 2 on a quieter
  machine, with `rebuilding` on the status line 0.8 seconds after the write.

## Who owned which file

While the six tracks ran in parallel there was one owner per file, so that
they would not meet in a merge. They did not: the six branches merged into
`one-surface` with no conflict, and no two had changed one file. The table is
kept as the record of who built what. It binds nobody now.

Each track worked in its own worktree, a sibling of the repo and never inside
it, since vitest would sweep an inner worktree's tests into the main check.

| Track | Owned |
| --- | --- |
| 1 world | `apps/web/src/world/**` except `world/nuclei.ts`; `apps/web/src/selection.ts` and its test; `apps/web/src/opened.ts` and its test; `apps/web/src/asked.ts`, `hover.ts`, `walk.ts`, `view.ts`, `watch.ts`, `highlight.ts` and their tests; `apps/web/src/chrome/crumbs.tsx` and its test; and, once the ground was laid, `apps/web/src/nav.ts`, `materials.ts`, `registry.ts`, `dev/patch.ts`, their tests, `chrome/frame.tsx`, `main.ts`, the token tables of `docs/design.md`, and the browser tests `world.test.ts`, `select.test.ts` and their helper `browser.ts` |
| 2 inspector | `apps/web/src/inspector.ts`, `reading.ts` and `source.ts`; `apps/web/src/chrome/inspector.tsx` and `chrome/code.tsx`; `apps/web/src/chrome/wiring.tsx` and `chrome/status.tsx`; and their tests |
| 3 tree | `apps/web/src/tree.ts`; `apps/web/src/chrome/tree.tsx`, `chrome/column.tsx`, `chrome/notices.tsx`, `chrome/rail.tsx` and the new `chrome/fold.tsx`; and their tests |
| 4 granules | `libs/scene/src/nuclei.ts` and its test; `libs/scene/src/interior.ts` and its test; one export line in `libs/scene/src/index.ts`; `apps/web/src/world/nuclei.ts` |
| 5 core | `libs/core/src/approved.ts` and its test; one export line in `libs/core/src/index.ts` |
| 6 cli | `apps/atis/src/**`, sources and tests |
| 7 close-out | the merges into `one-surface`; the wiring between tracks; `README.md` and `apps/atis/README.md`; this file; the prose of `docs/design.md`; `cspell.json`; and any file, for a red check |

`libs/core/src/schema.ts`, its test and `apps/web/src/chrome/index.ts` were
frozen, with no owner until the close-out. The close-out edited the first two
once, to loosen the guard on a removed module (D334 (removed-off-head)).

Rules that held while they ran, kept here because a later session with
parallel tracks will want them:

- Only one track commits to `apps/web/src/world/draw.ts`. The granules track
  handed over a mesh and the wiring was done at the close-out.
- Only one track runs the browser tests and only one the CLI's tests. Several
  headless browsers at once contend and time out.
- A track whose new file has no importer yet checks without the dead-code
  slot, and does not add a test that only imports the file, or a baseline, to
  turn it green.
- `pnpm build` runs once, at the very end. The `atis` on the owner's path
  points at this repo's build, so a build mid-session changes the tool in his
  hands.
- No track creates `checkride.baseline.json`, pushes, or commits to `main`.

## What is parked and how to bring it back

The slide a module opened as by zoom, the file's plate and the diff's sheet
are parked, not deleted (D204 (parked-levels)). Their code and tests are all
still there, and nothing on the normal path reaches them. They are parked by
the values their tokens rest at, and one token brings them all back in a
running tab with no build, as the owner decided.

| To get back | Set |
| --- | --- |
| the old levels: a slide opening when a module fills `LEVELS.cellOpen` of the free screen, a click opening one by the old rule, the file's plate at zoom 24 and the diff's sheet at zoom 80, and no slide opened by a selection | `LEVELS.autoOpen` to `1` |
| a click that only rings and names, with no slide, on the one surface | `LEVELS.openOnSelect` to `0` |

While `LEVELS.autoOpen` is above `0` the world reads the scene's own
`LOD_GATES`, which this session did not touch, in place of `LEVELS.gates`
past its first gate (D240 (far-zoom-lit)):

```json
[{"enter":6,"exit":5},{"enter":24,"exit":20},{"enter":80,"exit":66}]
```

The first gate stays `LEVELS.gates`' own, `0`, so the far zoom is the lit map
with the switch on as with it off. The scene's first gate, entered at 1.7 and
left at 1.45, is where the planet stood, and with the planet deleted nothing
is left to draw there but an unlit map.

How to do it: run `pnpm --filter web dev`, open the tab on a map, press
`tokens` at the bottom right, and set the one row. An override lasts for
the tab's session. Reset the tokens, or open a fresh tab, before judging the
one surface again: a stale override brings the old behaviour back and looks
like a bug.

The dev server reads a map only from inside this checkout: `?map=/@fs/<path>`
for a map written anywhere else is answered 403, which is Vite's rule and not
atis's. So to compare old and new on another repository, use the tab atis
serves for it. That tab is a published build and shows no `tokens` button.
Two ways in:

- The panel opens there by its key combination (D156 (dev-panel)), which the
  docs do not name; it is `opens` in `apps/web/src/chrome/frame.tsx`.
- Or write the override into the tab's session store by hand, in the
  browser's console, and reload:
  `sessionStorage.setItem('atis.tokens', '{"LEVELS.autoOpen":1}')`.
  `sessionStorage.removeItem('atis.tokens')` and a reload take it back. The
  second way was run on a served tab at the close-out and opened the slide
  by zoom with nothing selected.

What the switch does not bring back, and what it does that it did not before:

- The planet. It is deleted, not parked.
- The tab still opens at the old whole-layout fit while the switch is on, and
  `WALK.fieldZoom` is measured over that fit (D223 (field-over-frame)).
- A click both selects and runs the old open-by-click rule, and Escape takes
  one more press when something is selected. Known and left, for a mode kept
  only for comparison.

`LEVELS.gates` is still a live token, and moves the one surface's own gates
while `LEVELS.autoOpen` is `0`. Its first gate set by hand, to
`{ "enter": 1.7, "exit": 1.45 }` for one, shows the unlit far field; its last
two set to the scene's bring back the plate and the sheet and no slide by
zoom. That is a way to look at one old level alone, not the way back.

In a browser test, `legacy(page)` from `apps/web/src/__tests__/browser.ts`
writes the one token into the tab's store before the page loads. Every test
of a parked path calls it.

Parking shows. The dev panel still lists slide and plate tokens that move
nothing at rest; `data-lod` still steps at zoom 6, where the scene's budget
of asked labels grows and, past 5,000 files, every package stands open; and
the legend still says granules show in an opened cell when they now show on
the map too. Deleting the parked code is the first
job of a follow-up session, once the owner has judged the one surface on real
repos.

The planet is different: the owner decided it goes, and it is gone from the
web app (D213 (planet-goes)): its canvas, its tokens, its section of the
design tables and its browser case. The scene library's pure model,
`libs/scene/src/planet.ts`, stays with its test, since the inspector's list of
outside packages uses its rule for a package's hue. Outside packages have no
place on the map now; that list is where they are shown.

## What was built

Six tracks ran in parallel from one commit and were merged in the order of
what the owner sees: core, world, inspector, tree, granules, CLI. The
close-out then wired the seams between them.

The ground, before the tracks forked. The levels parked by their tokens' rest
values, so the lit surface was on the screen at once; every token the tracks
would read, declared; the line's selection and pointing; the map's approved
block and its guard; the two panel stubs; the browser tests' shared helpers
with `legacy(page)`.

The world. A click selects a file, a module or nothing, and the camera does
not move. The selection has a steady ring and keeps its name. Selecting a
module opens its slide in place at any zoom. The map and the chrome point at
each other over the line. File names appear by size, under a live budget and
clear of the chrome. Enter, the arrows and Escape walk from the selection. A
highlight and a tour's stop select what they fly to. The breadcrumb and the
HUD's reach read the selection. The tab opens framed on the terrain. The
planet is deleted.

The inspector. The pure models of a module, a file and the map view; the
panel over the map with its thin `map` tab, a module's facts, files, exports
and wiring, a file's facts, diff and code, and the functions toggle; the
answers store that asks the server for a file's text and its diff; and
`structure only: no checks ran` and `live` on the status line.

The tree. The pure model that folds the terrain's files and the shore groups'
files into directories; the rows, lit both ways through the line; the
column as one scroll of notices, tree and shore under headers that fold; and
a notice's row selecting what it leads to.

The granules. The scene's pure `nucleiOf(map)`, which lays every placed
file's functions at rest by the rule a slide lays them; and the world's one
instanced mesh of them, faded by size on the screen. The demo map and five
scanned fixtures carry function data: the demo 14 functions, `go-1` 1,284,
`javascript-1` 1,976, `python-1` 1,350, `shell-1` 931 and `terraform-1` 9.
The plan said only the demo did. Every other fixture reads
`off: no function data`.

The core. `approvedOf`, `assertApproved`, `departuresOf`, `withApproved`,
`sharesTerrain` and `DEPARTURE_LIMITS`, pure, with the demo map's golden
unmoved.

The CLI. The `/file/<path>` route; the watch that follows the working tree's
uncommitted edits, with its bounds; `atis approve` and `--show`; and a run
named a directory inside the repository reading it from its root
(D329 (repo-root)), where it used to exit 2 and leave a wrong terrain in the
cache.

The close-out, between the tracks:

- The granules' mesh wired into the world, seen on both backends, WebGPU in
  Chrome and WebGL 2, on the demo and on `javascript-1`, so the plan's cut
  line for the track was not needed. On a quiet file the granules are faint,
  as the track predicted.
- Names by size kept off the inspector, and a press on the map giving the
  keys back to it (D331 (press-returns-keys)).
- Browser cases for what no track could drive alone: a tree row pointing at
  the map and selecting with a flight, the map lighting a tree row, a click
  on a changed file opening the inspector on its facts and its diff, and
  `data-nuclei` on a map with functions and on one without.
- A folded shore opened before a group's block is revealed in it; a notice's
  row selecting with no second, bare visit; a tree row letting go only of
  what the tree pointed at.
- A module's files and lines counted one way by the inspector and the
  approved shape (D332 (counts-of-head)).
- The head's departures left off a range's older frames
  (D333 (departures-of-head)).
- A module deleted on a branch told removed at once
  (D334 (removed-off-head)).
- Four of the inspector's baked looks made live tokens.

The last pass, after two reviews of the finished build, one driving a served
run in a browser and one reading the integration:

- The sheets of code and diff kept through a pushed map and a scrubber's
  step, with their scroll and focus (D335 (answer-stands)).
- `live` said only under a watch, and `rebuilding` while a map is measured
  (D336 (watch-says)).
- The selection carried through a page a watch draws afresh
  (D337 (selection-carried)), the first half of the step the plan cut.
- A file's reachability muted, and the list headed by what it is, where the
  manifests alone named the entry points (D338 (reach-by-manifests)).
- The count of departures in the status line
  (D339 (departures-in-status)).

What the reviews found and the last pass left is under
[Deferred](#deferred), each with what was seen.

Not built, of what the plan listed: framing a flight in the screen left of
the open inspector. It is under [Deferred](#deferred).

## The decisions

Numbered on from the last decision the founding record's build took. Code
comments cite them as written here, number and slug together. Each track was
handed a block of numbers and did not use all of it; the unused ones are
listed under each block and are not to be reused, so that a number means one
thing wherever it is found.

### The ground: D204 to D219

- **D204 (parked-levels).** The zoom-opened slide, the file's plate and the
  diff's sheet are parked by the values their tokens rest at, not deleted.
  `LEVELS.gates` rests out of the camera's reach and `LEVELS.autoOpen` at `0`.
  The owner is not yet sure those levels should go and wants to compare them
  with the one surface on a real repo first. `LEVELS.autoOpen` is the one
  switch: above `0` the world reads the scene's own gates and opens a slide by
  zoom, and opens none by a selection.
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
  guard holds the eight kinds, the targets and cells against the terrain, and
  the list's order.
- **D211 (file-text).** The local server may return the read-only text of any
  file the map lists: on loopback, with the run's token, read from git's
  objects by sha, as JSON only. The page holds each answer in one of seven
  states.
- **D212 (approved-private).** The approved shape is written by
  `atis approve` under the git directory, where nothing lands in the working
  tree. No committed copy and no button in the tab this session.
- **D213 (planet-goes).** The planet is deleted from the web app. It was
  hidden by a gate first, so the one surface was on the screen at once, and
  then deleted by the world track. The scene library's pure model stays.
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
- **D218 (departure-cell).** A departure names the cell it is about beside
  its target's path. A path does not name one module: a workspace member is a
  `package` cell and the loose files at its root a `directory` cell with the
  same path, in 15 of the fixture maps. Keyed by path alone, two true
  departures of one kind for such a pair were rejected by the map's guard, and
  the tab would have shown no map after `atis approve` on a real repo. The
  approved document is matched by path and by whether the kind is `package`.
- **D219 (field-by-zoom).** A view that came to rest under `WALK.fieldZoom`
  times the zoom the field is framed at stands at the field, whatever lies
  under its centre. The far field's level said so until it was parked; with
  the first gate at `0` the breadcrumb named the module under the middle of
  the screen with the whole map in view, and Enter walked in from there. The
  token rests at the zoom that level gave way at, `1.7`.

### The world: D220 to D249

- **D220 (slide-by-selection).** On the one surface the open cell is read off
  the selection every frame, not moved by click events. A selected module
  holds its own slide open; a module of one file, its package's; and none
  where the slide would show no files. A selected file opens nothing and keeps
  the slide it floats on.
- **D221 (home-by-time).** A slide a selection closed brings its files home
  over the scheduler's cross-fade, by the clock. Under `LEVELS.autoOpen` they
  still come home by the share of the screen.
- **D222 (terrain-frame).** A page that names no zoom and no centre opens
  framed on the ground the world draws, at `WALK.share` of the free screen,
  centred, and Escape to the field flies there. `fitFrame` and what zoom 1
  means are unchanged.
- **D223 (field-over-frame).** `WALK.fieldZoom` is measured over the zoom the
  field is framed at, which is the whole-layout fit only under the old levels.
- **D224 (click-as-hover).** A click selects what the hover rings, picked with
  `HOVER.slop`, and nothing at the far field.
- **D225 (escape-clears).** Escape closes a slide the old levels opened, else
  clears the selection, else walks out.
- **D230 (file-stop-by-size).** A view moved by hand stands at the file under
  its centre once that file is drawn at `LEVELS.fileNameFrom` pixels or more,
  and at its module while smaller. No level says so now.
- **D231 (keys-walk-selection).** The keys walk from the selection, else from
  the walk's stop. Enter selects where it lands; an arrow carries a selection
  to the sibling; a highlight and a tour's stop select what they fly to.
- **D232 (reach-by-module).** The HUD's reach opens on the selected module
  first, else on the open cell.
- **D233 (asked-before-sized).** Labels that are asked for are placed first,
  and names by size take the room left. A file with several notices is named
  once.
- **D234 (pointed-ring).** What a row of the chrome points at is outlined in
  `HOVER.ink` at `HOVER.width`, steady, with no tag. The canvas names what is
  pointed at and by which side.
- **D235 (names-one-budget).** Names by size take one budget at every zoom,
  not the one that stepped with the level.
- **D240 (far-zoom-lit).** With `LEVELS.autoOpen` above `0` the scene's gates
  stand in for all but the first, which stays `LEVELS.gates`' own, so the far
  zoom is the lit map with the planet gone.
- **D245 (name-budget-token).** The budget of names by size is the live token
  `LEVELS.fileNameBudget`, resting at 80, where the collision rule is what
  caps the names and not the count. It caps every name written unasked, a
  noticed file's included. At `0` none is written unasked, and the
  breadcrumb's file stop is unaffected. It is the one token a track added to
  the ground's set, by the track that owned the tables.
- **D246 (names-off-chrome).** A name written unasked is placed under no
  block of the chrome: the right-hand column, the HUD, the legend, the minimap
  and, since the close-out, the inspector. The labels are laid again when
  those boxes move. A noticed file under a block still gets its label, at the
  nearest clear place outside it.
- **D247 (single-as-its-file).** While its package's slide shows, a selected
  or pointed-at module of one file is ringed in its file's body, and that
  file's tag stays written. The selection itself is still the module.

Unused: D226 to D229, D236 to D239, D241 to D244, D248 and D249.

### The inspector: D250 to D274

- **D250 (contour-counts).** A module is counted and listed by its whole
  contour, its held modules' files included, as the map counts its fans and
  what goes through and past its interface.
- **D251 (reading-no-checks).** The map view's reading uses no rule, clone
  family, health count, evidence or verdict, so it reads the same with and
  without checks. An audit adds only an outside package's hue.
- **D252 (packages-whole).** The list of outside packages is whole, never
  cut, ranked worst hue first, then by importers, then by name. It is their
  only place on the screen now.
- **D253 (read-is-ask).** In the answers store, reading an answer asks for it
  once. It is keyed by the map object, so a pushed map, and a step of the
  scrubber, ask afresh.
- **D254 (reading-of-head).** A file the change deleted is left out of the
  reading's lists of files and functions. Its last clause, that a module's
  own counts stay the map's, was amended by D332 (counts-of-head).
- **D255 (loose-files).** The directory cell at a package's own path is
  written `loose files`: in the trail, in the package's held modules, and
  after the path on a departure's row.
- **D260 (wiring-hosted).** Handed a cell, the wiring plate is that module's
  whatever the world has open, in the panel's flow at the size it was laid,
  scrolled inside the panel's width and not shrunk to it.
- **D261 (map-tab).** With nothing selected the panel is one thin `map` tab
  half way down the column's edge. Once opened, the map view comes back when
  a selection is cleared, until it is closed.
- **D262 (panel-keys).** With the focus inside the panel, Escape clears the
  selection or folds the map view away, the arrows step the focus or scroll a
  focused sheet, and Enter is left to a button or a link and prevented
  elsewhere. An open legend takes Escape first.
- **D263 (below-the-grades).** The panel starts at the foot of the HUD's row
  of grade blocks, measured and followed as the row wraps. A HUD block's
  parts or the legend, opened beneath that row, are covered on their right by
  an open panel.
- **D264 (functions-beneath).** A file's functions list stands beneath
  whichever tab is shown, behind a toggle that rests off and holds from file
  to file. It is not a tab.
- **D265 (own-pointing).** The panel remembers what it pointed at and lets go
  only of that, also when the view changes or the panel goes. The tree does
  the same since the close-out.
- **D270 (departures-by-contour).** A module shows the departures about its
  own cell and about every module it holds, each row selecting the cell it
  names. A module that is gone is told with the innermost package whose path
  holds its own; a package that is gone, with the map alone.
- **D271 (marks-of-own-commit).** The code tab marks changed lines and
  function starts only on text read at the map's own commit. Where the map
  names a commit and the answer's `at` is another, the text is shown bare
  with one muted line saying so. A working-tree map's text is marked as it
  comes.
- **D272 (focus-stays).** A row or a step of the head that swaps the view
  while the focus is inside the panel leaves the focus on the panel itself.
  The panel takes no focus it was not left.

Unused: D256 to D259, D266 to D269, D273 and D274.

### The tree: D275 to D289

- **D275 (tree-row-target).** A row's target is a file's id, or the cell at a
  directory's path, the package where a package and a directory share it.
  Both cells of such a pair light the row, a module of one file lights the
  file's row, and a module at the repo's root is the one top row, named for
  the repo.
- **D276 (chain-row).** A chain of directories each holding one directory and
  nothing else is one row, unless a link is a module or wears a departure of
  its own.
- **D277 (closed-wears-hidden).** A closed directory wears everything beneath
  it: its count of changed files, its count of ghosts, its notices' boxes and
  its departures. An open one wears only its own.
- **D278 (column-folds).** The column is one scroll. The notices, the tree
  and the shore each stand under a sticky header that folds them, each part
  keeping its own fold, and a row leading to a shore group opens the shore
  first. The notice list's own scroll and its cap at half the column went
  with it.
- **D279 (pointing-opens).** A moved selection, or the world's pointing,
  opens the directories above the row and leaves them open, scrolls to it and
  lights it. The chrome's own pointing lights only. A directory that already
  stood open is still recorded as opened, so a later frame does not close it
  over the row.
- **D280 (shore-row).** A shore file's row is muted, says not on the map in
  its title and label, shows its group, and a click reveals the group's block
  in the shore rail. A directory with nothing on the map says so on its row.
- **D281 (notice-selects).** A notice's row with a stop selects it with a
  flight. The bare visit it kept beside the selection while the breadcrumb's
  test asserted one was dropped at the close-out.
- **D282 (tree-keys).** The arrows and Enter inside the tree are the tree's,
  and their default is prevented. One row takes Tab.
- **D283 (lost-departure).** A departure is worn by its module's row; a
  removed module's by the nearest row still standing; an outside package's by
  no row, counted in the header only.
- **D284 (opens-on-map-change).** A directory opens unasked only when it
  holds a changed file on the map, and the repo's root with it. By the plan's
  rule, any change, `corpus-6` opened on 52 changeset notes the map cannot
  light.
- **D285 (unfold-by-event).** A fold is drawn open before the document event
  `atis:unfold` returns, whoever dispatched it. The event's name and the
  fold's name are the whole contract, so the world reveals a folded shore's
  group with one line and no import of the chrome.
- **D286 (row-key).** A tree row's React key is its kind with its path, and a
  key press finds its row by its position, because a change that swaps a file
  for a directory lists one path as both. Lookups by path alone, for
  lighting, scrolling and stepping out, still treat the pair as one path.

Unused: D287 to D289.

### The granules: D290 to D299

- **D290 (nucleus-by-number).** `nucleusOf` takes the line count its fill is
  measured against as a number, and the file as the three fields it reads,
  so a file at rest on the map, which has no slide, is laid by the same rule
  as a body on a slide.
- **D291 (granules-per-module).** A file's granules on the map are filled
  against the largest file of the file's own module, meaning the cell whose
  slide shows it, so a file reads as full on the map as on its slide.
- **D292 (granules-off-composites).** On a map whose packages stand as
  composites, past 5,000 placed files, no granule is laid and the reason
  given is `composites`.
- **D293 (granules-unmeasured).** A map none of whose placed files carries
  function data gives the reason `no function data` in place of an empty
  list, so the canvas never reports 0 for functions nobody read. Function
  data that names no function reads `0`.
- **D294 (granules-round).** Granules on the map are round only: a fan of 12
  segments sized by one radius, with no dents and no radii texture. A
  function that breaks a threshold is still marked in the scene's record, for
  a later look.
- **D295 (granules-over-marks).** The granules are drawn after the files and
  the marks and before the bolts and the slide, so a stain never covers a
  function. Their lift only keeps them clear of the skin, the one mesh that
  writes depth; it orders nothing among the others.
- **D298 (granules-blot-bloom).** A granule writes opaque black to the
  emissive target, as the files and the marks write it. It adds no light, and
  because only the colour target blends in the pass, it blots the light under
  its disc from the moment it has any size, ahead of its ink, the same on
  both backends. So a stained file's bloom steps down a little as its
  granules resolve.
- **D299 (granules-over-ribbons).** A granule lies over a ribbon where a
  ribbon's bow crosses a file. The marks and the ribbons share one draw
  order, so nothing can be drawn between them without a change to the
  ribbons.

Withdrawn: D296 (granules-dim-bloom), which said a granule dims the bloom
beneath it by its own opacity. The renderer does not blend the emissive
target, and D298 (granules-blot-bloom) says what happens. The number appears
in the body of one commit, 858861b, and nowhere in the code. Unused: D297.

### The core: D300 to D309

- **D300 (held-at-head).** A module's `files` and `loc` in the approved
  document are what the head holds inside its contour. Files the map's own
  change deleted count for neither, and a module with none left is not
  listed.
- **D301 (unread-lists).** `exports` and `dependencies` are optional on the
  approved document, absent where the map read none. A list either side lacks
  yields no departure.
- **D302 (interface-by-name).** An interface widens by its names. `was` and
  `now` count names and `names` are the ones gained; a rename of equal count
  is no departure, and `interface_size` alone widens nothing.
- **D303 (departure-limits).** `DEPARTURE_LIMITS` is one exported constant
  keyed by the five growth kinds, each a count and a ratio that must both be
  passed: files 3 and 1.25, lines 100 and 1.25, fan out 3 and 1.25, an
  interface's names 1 and 1, imports past an interface 1 and 1.
- **D304 (removed-off-terrain).** A module is told removed only when the
  terrain holds no cell matching it. Amended by D334 (removed-off-head),
  which asks it of the head and not of the terrain.
- **D305 (one-reduction).** `departuresOf` reduces the later map with the
  reduction `approvedOf` uses and compares the two, so a count is held
  against the same count read the same way.
- **D308 (same-terrain).** The document carries `over`, the commit its map's
  terrain was cut from. Lines, fan out, and the names of an interface with no
  barrel on either side are compared only between terrains that share: both
  cut from one commit, or each its head's own. Elsewhere they yield nothing.
  Held against a map over another base they told what the approved change
  itself had edited. `sharesTerrain(doc, map)` answers which it is.
- **D309 (no-diff-estimate).** Over one base, a file a change only edited
  moves no line count and no fan out, so those are told for new files alone.
  The diff's added and deleted lines are not used to estimate it; the exact
  fix belongs in `libs/core/src/map.ts`.

Unused: D306 and D307.

### The CLI: D310 to D329

- **D310 (file-cap).** A file's text is capped at 1 MiB of the blob, read
  from git before the bytes. Past it the answer is 413, and a file of exactly
  1 MiB is served. It is a limit of the server, not a live token.
- **D311 (file-blob).** Only a blob the head's object holds at the path is a
  file. A directory, a submodule, a file the change deleted and a path only
  on disk are 404. A symlink answers the link's own text. A path with an
  empty, `.` or `..` part or a NUL is refused whatever the map names. All
  three readings are `git cat-file`, never `git show`, which reads `..` in a
  file's name as a range of commits.
- **D312 (tree-beside-map).** The working tree's tree sha rides beside the
  map, not inside `map.json`, and is replaced with each map held. A
  working-tree map with no tree serves no text. A head or a tree that is not
  a full sha is never handed to git.
- **D313 (watch-working-term).** While the head is the working tree the
  watch's signature has one more term: a hash of git's status listing with
  each listed path's modified time and size, the path stamped as itself where
  it is a symlink. A page's switch into the working tree adds the term, which
  costs one redundant rebuild. A status git refuses, or one past 64 MiB,
  makes the term the fixed word `unread`, and the run says once that an edit
  that stages nothing is not followed.
- **D314 (approved-stamp).** The approved document's stamp is a term of every
  signature, whatever the head.
- **D320 (approved-time).** The kept file is core's document with
  `approved_on`, the ISO time of approval, stamped by the CLI and placed
  after `over`.
- **D321 (approved-unreadable).** A kept file that is not JSON, or that the
  guard refuses, tells no departure: the map is built without the block, the
  run exits 0, and one line on stderr gives the path and the reason.
  `atis approve --show` exits 2 on it.
- **D322 (approved-guarded).** Every build runs the map's guard with the
  block attached. A block it refuses is left off and said on stderr.
- **D323 (approve-as-mapped).** `atis approve` takes `--base`,
  `--last-commit`, `--last-tag`, `--head`, `--working-tree` and
  `--whole-repo`, with the misuse pairs a map run refuses. With none it
  approves the head's change over the trunk. It takes no `--range` and no
  `--out`.
- **D324 (unshared-said).** When the approved shape and the map share no
  terrain, one line on stderr names the two commits and says lines, fan out
  and interfaces with no barrel were not compared. A run that writes a file
  prints it every time; a served run at its start and then only when it
  changes.
- **D325 (show-as-kept).** `--show` prints the kept file byte for byte. With
  none kept, stdout is empty, stderr says
  `no approved shape yet: run atis approve`, and the run exits 0.
- **D328 (watch-bounds).** A signature that has moved at every tick for ten
  ticks is handed on as it stands, and after a rebuild no move is handed on
  until as long has passed as the rebuild took. The served run says once when
  a move is first handed on unsettled.
- **D329 (repo-root).** A run named a directory inside a working tree reads
  the repository from that tree's root, in both measures, in `atis approve`
  and in the served run. At the root the path stays as typed.

Unused: D315 to D319, D326 and D327.

### The close-out: D330 to D339

- **D330 (granules-follow-push).** A map a watch pushes over unchanged ground
  takes the place of the granules' mesh: the old one is removed and disposed
  of and one is laid from the pushed map, since a file's functions can change
  with the ground unchanged.
- **D331 (press-returns-keys).** A press on the map takes the focus off
  whatever in the chrome held it, so the arrows, Enter and Escape are the
  map's again. A panel keeps the focus after a row's click
  (D272 (focus-stays)), and the world does not leave it to the browser to move it.
  In Chrome the browser does move it; no test can tell the two apart.
- **D332 (counts-of-head).** A module's files and lines in the inspector, in
  the rows of the modules it holds and in the map view's list of largest
  modules are what the head holds, the count the approved shape takes
  (D300 (held-at-head)), so a departure's `was` and `now` are the numbers the
  facts beside it give. The fact says how many the change deleted, as
  `3 · 1 deleted by the change`. The file list is still the whole contour, a
  deleted file among them, marked. It amends the last clause of
  D254 (reading-of-head).
- **D333 (departures-of-head).** An older frame of a range carries no
  approved block. The run holds the range's head alone against the approved
  shape, so a panel standing at an older commit lists none of another
  commit's departures.
- **D334 (removed-off-head).** A module is told removed once the head holds
  no file of it. The guard refuses `module-removed` only for a cell that
  still holds a file the change did not delete, its own or one of a cell it
  holds. Before, the guard refused it for any cell the terrain still held, so
  a module deleted on a branch was not told removed until a map was cut over
  a later base, while one born and deleted on the branch was told at once. It
  amends D304 (removed-off-terrain). All 29 fixture maps that pass the guard
  were held against two documents each, and none was refused.
- **D335 (answer-stands).** While a map's own answer for a file's text or
  diff is on its way, the answer the path last had over any map stands in
  for it, and `loading` only for a path never answered. Every map a watch
  pushes and every frame the scrubber steps to is another map, asked afresh
  (D253 (read-is-ask)); before, its first read was `loading`, so the sheet
  was unmounted and came back at its top, and a sheet that held the focus
  dropped it to the page, where the next arrow walked the selection to a
  sibling. A text of another commit is shown bare until its own lands
  (D271 (marks-of-own-commit)).
- **D336 (watch-says).** A watching run says what its watch is doing on the
  socket, `following` or `rebuilding`, and the page says `live` only once it
  has heard it, and `rebuilding` beside it while a map is measured. Before,
  `live` meant the socket was open, and the socket opens on every served
  run, so a run with no `--watch` said it and never followed. `rebuilding`
  is there because a rebuild takes seconds and the tab otherwise looks as if
  it missed the edit. The measure holds the process, so the word is sent and
  the loop turned once before it starts.
- **D337 (selection-carried).** A page a watch draws afresh names the
  selection's target in its address, `?select=`, beside the zoom and the
  centre, and selects it on the line before the chrome and the world are
  drawn, where the new map holds it. The inspector opens on it, the tree
  brings its row into view and a module's slide opens; the camera stays
  where the address puts it. A target the new map lacks selects nothing. The
  open tab of the inspector, the functions' toggle and the column's folds
  are not carried.
- **D338 (reach-by-manifests).** Where the entry points were read from the
  manifests alone, a file none of them reaches is not said to be
  unreachable: its `reachable` fact is muted with why, and the map view
  heads its list `files no manifest's entry point reaches`. A manifest names
  no page's script, so on a clone with no local fallow the whole of a Vite
  app read as unreachable, 86 of 182 files on this repository. A file an
  entry does reach still says `yes`, and a map fallow read is unchanged.
- **D339 (departures-in-status).** A map that departs from its approved
  shape says by how many in the status line. With six notices the tree's
  header, which carries the count, starts below a 900-pixel window, and the
  inspector lists departures last, so the count was on no first frame. The
  line reads the run's head, on an older frame of a range as well, where the
  panels list none (D333 (departures-of-head)).

The next free number is D340.

## Deferred

What the plan put off, with what the tracks and the close-out reported as not
done or left as it is. Grouped by what a follow-up would open.

### Deleting the parked code

The level plan and its type, the gate that opens a cell by its share of the
screen, the slide as zoom opens it, the file's plate and the diff's sheet in
the world, the fade of the surface through five materials, the scene's planet
model, and their tokens, design tables and roughly 80 tests. It changes
nothing on the screen and is the largest rewrite in the survey. It wants an
explicit deletion list, because the dead-code check cannot see leftovers in
`libs/scene`. It waits on the owner judging the one surface on real repos.

### The camera and the selection

- The rest of what a redrawn page drops. The selection is carried
  (D337 (selection-carried)); the inspector's open tab, the functions'
  toggle and the column's folds are not, and a page reloaded by a switch of
  base in the strip under the HUD carries no selection at all.
- Framing a flight in the screen left of the open inspector. Today `fly to`
  frames a module in the middle of the free screen, so part of it lies under
  the panel.
- The inspector reserving its own screen, with the map fitted again beside
  it, and any panel on the left. The free screen is one constant claim at the
  right through the camera's fit, the minimap's outline and zoom toward the
  pointer; a mistake there shifts all three.
- A token of its own for the opening frame's share, which borrows
  `WALK.share` from the flights.
- Names by size are laid only when the labels are placed, so they can appear
  a moment after a turn of the wheel stops.
- A name is the file's base name, so on `corpus-6` at zoom 3, 15 of 36 names
  read `index.ts`. Naming an index file with its folder is in
  `libs/scene/src/labels.ts` and would also move the still sheet's labels.
- A slide opened by a selection over a package drawn as one body, on a map
  past 5,000 files, has not been looked at. No fixture is that large.
- The selected module's ring does not follow its slide's dark membrane
  exactly, and a file with two notices has its name written on both sides of
  its ring. Both were seen by eye at the close-out and left.
- A slide's right-hand column of tags is laid against the column's edge
  alone, so for a module in the middle of the free screen it lies under the
  open inspector, which a selection always opens. Names by size and the
  bands' labels keep off the panel (D246 (names-off-chrome)); the tags do
  not. Read from the code, in `apps/web/src/world/draw.ts` where the
  interior is handed its margins; not looked at in a browser.
- A module whose files sit in distant depth bands opens as a long thin
  strip the height of the map, with its files at the ends and the ring as
  two lines beside it. Seen on
  `apps/atis/fixtures/check-targets/api/internal/greet` on this repository.
- Deep zoom over open ground is a black frame, with no star, rule or name,
  about 600 pixels of wheel from the fit. The breadcrumb reads `field`
  there, so Escape has nowhere to walk out to and does nothing; only the
  minimap says where the camera is. Escape at the field returning to the
  opening frame would cure it.
- The hover's tag is drawn across a name already written for the file's
  size, and near the open inspector it runs under the panel and is cut off.
  In a frame flown to, three names by size, `go.ts`, `gotest.ts` and
  `python.ts`, were drawn on top of one another: the names by size and the
  asked labels are not held to one collision pass.
- At the largest zoom a file's outline and its granules show their straight
  sides.

### The lines and the look of the surface

- Standing lines between modules on every map. Today's bright lines exist
  only for imports a change added. It needs core to write module-to-module
  import edges, a change to the map's format; the same data would add a new
  import between modules and a new cycle to the departures.
- A constant dark clearing round every module whatever its history, standing
  module names on the map, and a live token for the skin's displacement. All
  three are calls to make after seeing a young repo. `RELIEF.bodyPad` widens
  the clearings live meanwhile.
- Files pulsing or drifting on the map for the selected module, outside a
  slide.
- Crisp membranes at close zoom. The skin's membranes and reach are textures
  at 4 or more layout units a texel and look soft when magnified, now that no
  slide covers them. A vector layer for the membranes is a large job.
- The starfield turning to dust at the far zoom on very wide layouts.
- The lines for added imports scale with the zoom. At about zoom 14 on a
  change map, where names and granules read well, they are bands some 15
  pixels wide across most of the frame. A cap on their width in screen
  pixels, as a live token, would hold them. Whether the build before this
  session did the same was not compared.
- At the far zoom on a tall layout, `fixtures/corpus-6` fully zoomed out, a
  hard-edged, darker rectangle with fewer stars stands round the map and
  well above its topmost module. It did not show on this repository's own
  wide map. The planet used to cover that range of zoom.

### The granules

- Dents on a granule for a function that breaks a rule; the scene already
  marks which.
- Granules past 5,000 placed files, and granules in the still SVG.
- Letting a granule dim the bloom in step with its ink, where today it cuts
  its disc out at once. It needs a blend mode on the emissive target in
  `apps/web/src/world/draw.ts`, which also changes the slide's bodies and the
  stars, so it wants a look at the frames.
- Drawing the ribbons over the granules, by raising the ribbons' draw order.
- A token of the map's own for a granule's ink. At rest it is the file's
  fill darkened by `INTERIOR.granuleShade`, about 1.19 to 1 against an
  unstained file, so granules on quiet files are faint.
- Their cost near 5,000 files, measured in Node only: about 0.5 to 0.7 s to
  lay, when the world starts and on each frame a `NUCLEUS` token is dragged.
  The cost on the GPU is unmeasured, and every granule's vertices run at
  every zoom, the far ones where none shows included.
- Baked in `apps/web/src/world/nuclei.ts`: the lift above the skin, the draw
  order and the 12 segments of a disc.
- Every push over the same ground lays the mesh and makes its material
  again (D330 (granules-follow-push)), a push where only the weather, the
  notices or the approved block moved included, as after `atis approve`
  under a watch. It is the 0.5 to 0.7 s above, inside the socket's message
  handler, with the pipeline compiled again. A signature of the function
  data the mesh was laid from would skip it.
- `restyle`, `move` and the comparison of what is shown each allocate a
  little every frame; nothing is allocated per granule.

### The inspector

- Code for a shore file, and syntax highlighting.
- On an older frame of a range the panels say
  `no approved shape yet: run atis approve`, which is not quite true there:
  a shape may be approved, and the frame is simply not held against it. It
  wants a line of its own.
- On an older frame the diff tab shows the head's diff, and the functions'
  `open` links use that frame's line numbers against the working file, so
  they may land a few lines off.
- A working-tree map cannot be compared with its answer, so a map a watch
  pushed, whose answer lags, is marked from the newer hunks.
- A removed module is placed by its path under the innermost package of the
  present map. Where its real workspace member holds no file now, it is told
  with an outer package or with the map alone.
- A box in the hosted wiring plate is not clickable; only rows select. A
  package's wiring tab draws only the wires that end in its own files, while
  its files, its counts and its departures cover its whole contour.
- After the focus lands on the panel itself, the first arrow goes to the
  head's `map` step and not to the first row of the body.
- The `mutants` fact for a file with many is a long wall of
  `line N NoCoverage`.
- A file shows two counts of lines that differ and neither says what it
  counts: the `lines` fact is the map's count, 386 for
  `apps/web/src/world/skin.ts`, and the code tab's head counts the text's
  lines, 415.
- With no health report every function's row carries its own
  `no health report was read`, which doubles the list's height. It wants
  saying once, at the list's head.
- In the map view the departures are the last list, under every outside
  package, 18 on this repository. The status line now carries their count
  (D339 (departures-in-status)); listing them first when there are any is
  still to do.
- Every row of the panel is drawn again each time the pointing moves, the
  plain rows of functions and of outside packages included, since each reads
  the pointed target from one context. The tree's rows were narrowed to the
  two a move touches; the inspector's were not.
- The tally of what the head holds is taken once for each model and once for
  each reading, each a pass over the map's files; unmeasured on a large map.
- Still baked: the step a focused sheet scrolls by, the width of a changed
  line's edge, the thin tab's place and padding, and the flat buttons'
  padding.

### The tree

- Windowing: a reader who opens every directory on a 7,000-file map gets
  every row in the page.
- A renamed file's old path is not written on its row.
- A notice's row is not reachable from the keyboard.
- A path listed both as a file and as a directory lights both of its rows.
- The world's pointer moving over the map scrolls the column to each file's
  row and leaves open the directories it opened, as the plan specified. If
  that feels restless on a real repo, the rule is in one place, `newsOf` in
  `apps/web/src/chrome/tree.tsx`.
- On the default run the tree starts below the fold. At 1440 by 900 six
  notices fill the column, and the tree's header measured at 902 pixels
  down, so no row shows until the reader scrolls or folds the notices, and a
  reload sends the column back to its top unless something is selected. The
  notices are as long as their rows by decision (D278 (column-folds)); a cap
  on their share, or folding them past a few rows, is a call for the owner.
- A click on a notice selects, and the tree answers a moved selection by
  scrolling the one column to its row, so the list the reader was working
  down is pushed out of view. Read from the code, not looked at in a
  browser.

### The structure reading

- Import cycles named from atis's own scan where no check ran.
- The whole repository read over the working tree.
- A fixture map with no instruments.
- Departures as ranked notices, as an overlay, or as a block of the HUD,
  which is held block for block to the still sheet.
- Entry points a manifest does not name. With no local fallow they are read
  from the manifests alone, and a page's script in an `index.html`, as a
  Vite app has, is no entry there, so everything it reaches is listed as not
  reached. The panels now say so in place of calling those files unreachable
  (D338 (reach-by-manifests)); reading such entries is in the CLI's scan and
  moves what the map says of every such repository.
- On every committed fixture map but the demo, `imports past an interface` is
  muted, because those maps were written before the map carried that count.
  Regenerating the fixtures would fill the list.

### The approved shape

- Lines and fan out read from the head on a change map, in
  `libs/core/src/map.ts`, with interfaces that have no barrel found from the
  head's edges. It makes `lines-grown`, `fan-out-up` and every
  `interface-widened` exact on every map and lets `sharesTerrain` go. It
  moves the demo map's golden.
- A place in the map's `approved` block to say that lines, fan out and
  interfaces with no barrel were not compared. Today only the terminal says
  it.
- A committed copy of the document; an Approve button in the tab, which
  would be a third write on the local server; limits in `atis.config.json`;
  an MCP tool for departures, where a test pins exactly three tools.
- A count of departures in the run's one-line summary.
- Anything that reads `approved_on`.

### The watch and the local server

- The tab follows an uncommitted edit in 4 to 10 seconds on this repository,
  by how busy the machine is, not the second the plan's by-hand check hoped
  for. About one second is the noticing; the rest is the rebuild and what
  the page does with the map, and where it goes was not measured. The status
  line says `rebuilding` through it (D336 (watch-says)). A cheaper rebuild
  for a working-tree edit is the real cure.
- A rebuild blocks the server while it runs, so the code tab stalls; the
  cache never evicts; and the tab reloads in full when a file is added or an
  export changes, keeping the camera and the selection and nothing else.
- A rebuild asked for by the strip under the HUD, a switch of base, is not
  told as `rebuilding`: only the watch's own are.
- Each rebuild of the working tree writes the tree's objects into the
  repository unreferenced. The watch's rest limits how often. Git prunes them
  on its own schedule, and `git prune` clears them sooner.
- The line that says the watch is restless does not name the file that keeps
  moving.
- `atis mcp --repo` given a directory inside the repository was not looked at
  for the fault D329 (repo-root) fixed elsewhere.
- A terrain an older atis cached from a run inside a subdirectory may still
  be wrong for that commit; `--no-cache` on the next run writes it again.

### The legend's words

Rewording the legend, and folding cell, organelle and nucleus into the
astronomical picture. The legend's words are held equal to the still SVG's, so
this moves eight golden images. Until then the legend says granules show in an
opened cell, and they show on the map as well.

### Proofs

- The frame budget in [design.md](design.md) was measured before this session
  and has not been measured again.
- The intermediate commits of the CLI's close-out and of the wiring were not
  each checked alone; the tips were.
- Six heavy sweeps now name a 60-second limit of their own: the HUD's
  block-for-block case, the still sheet's every-block-fits case, the scene's
  400-function nucleus case and three of the lanes' sweeps. They sat near
  vitest's 5-second default and timed out under the full check on a busy
  machine. Four more ran at 3.3 to 3.9 s in that run and are the next to
  time out: the tree's pointer case, the scene's continuous-spectrum case
  and two of the chrome's.
- The last pass's five fixes are held by unit, jsdom and browser cases, and
  were then driven once on the built atis, headless, on a scratch clone with
  no `node_modules`: `live` under `--working-tree --watch` and not without
  it, `rebuilding` after an edit, the code's sheet keeping its scroll and
  focus through the push, the selection kept through the redraw a new file
  brings, the muted `reachable` fact, and the tokens panel opened by its
  key. That run is in no test.
- The core track reported that three corpus fixtures, `checkride-pr2`,
  `fascicle-pr4` and `fascicle-pr5`, do not pass today's map guard, from
  before this session.
- The by-hand run the plan ends on, `atis --working-tree --watch` on a real
  repository after `pnpm build`, then `atis approve`, is the owner's.

### The founding record and the looks still baked

- Amending [SPEC.md](../SPEC.md) itself.
- In a development build the minimap is drawn over the tokens panel's last
  rows, and the `tokens` button over the tree's.
- Tokens for the looks still baked: the column's 260-pixel width, the zoom's
  bounds, the scene's label budget for asked labels, and the height of the
  stars' plane. The notice list's share of the column, which the plan listed
  here, is gone with the list's own scroll (D278 (column-folds)).

## What this supersedes

[SPEC.md](../SPEC.md) is the founding record and is left untouched. This
session departs from it in three places, and adds to it in a fourth.

**§5.6, the look: "revealed by zoom".** The founding look withholds: far away
there is nothing but lights, and each step closer reveals a layer in another
material, the dark field, the luminous surface, the stained slide, one file,
the diff. Now the surface is lit from the farthest zoom, and the zoom reveals
nothing but size. Of the five materials the surface is the map; the stained
slide is a selected module's; the far field, the plate and the sheet are
reached by no zoom at rest (D204 (parked-levels), D206 (detail-by-size)). The
two rule sets, an organic world and a brutalist chrome, stand as written, and
the new panels are chrome. The planet, which a later build decision stood
over the far field, is deleted (D213 (planet-goes)).

**§6, levels of detail and navigation.** The table of five levels, "LODs
cross-fade at zoom thresholds", and "click a cell to fly into it" are
superseded. There is one level; a click selects and the camera stays
(D207 (click-selects)); a module opens by being selected
(D205 (open-on-select)); flying is asked for. What levels 2 to 4 showed is
rehomed: a file's functions to the map as granules, a module's files, exports
and wiring and a file's hunks, coverage, mutants and diff to the inspector.
"There is no mode switch and nothing reloads" still holds, and is truer than
it was: the gate that opened a cell by its share of the screen was a switch
of mode. The breadcrumb, the keyboard's walk and the HUD on every level stand.

**§6's last sentence, and the HUD-only chrome: no panels.** "The goal is that
the reviewer travels through the change rather than opening panels" is
superseded. There are two panels, the inspector and the folder tree
(D208 (side-panels)), because travelling tied what could be read to where the
camera was. §7's HUD is unchanged and still held block for block to the
still sheet.

**§10, non-goals: "not a general codebase explorer".** atis now also reads a
repository's shape with no change in hand: the map view's reading of its
structure, the folder tree, any file's text read-only on a served run, and
the approved shape with the departures from it. That is for reviewing what a
repository has become, an AI-written one as much as any, and it is more of an
explorer than the founding record allowed. What the rest of §10 rules out
still holds: no gate, no network at runtime but the one command typed, no
LLM required, no measure of a person, no free-perspective 3D, VR or city
metaphor, and no diagram to arrange. Nothing in it edits code.

**§9.2, the map: an addition.** `map.json` gains one optional root block,
`approved` (D210 (approved-block)). A map of a repository that never approves
does not change by a byte, and the schema's version did not move.
