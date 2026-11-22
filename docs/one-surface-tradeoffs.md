# One surface: what main gives up

Written on 2026-11-21, before `one-surface` was merged into `main`, so the
merge is made knowing its costs. [one-surface.md](one-surface.md) is the
record of what was built and decided; this page is only the other side of the
ledger: what `main` had that it no longer has, what it has that is worse, and
what is now owed.

The short version: the map is easier to read and to inspect, and atis now
reviews a repository's shape as well as a change. In exchange the founding
look is gone, the opening frame says less by itself, the code is a third
larger with a dormant copy of the old levels inside it, and nothing about the
new view's speed or its verdicts has been measured.

## Gone for good

These were deleted, and the old-levels switch does not bring them back.

- **The planet.** The tab no longer opens far off on the repository as a
  dark planet. Its canvas, tokens and tests are deleted (D213 (planet-goes)).
- **Outside packages on the map.** Each dependency was a star round the
  planet, sized by how many files import it and coloured by its advisories,
  so a package with a serious advisory was a red star on the opening frame.
  They are now a list in the inspector's `map` tab, one click away and easy
  to miss.
- **Darkness as the message.** The founding look withheld: a calm change was
  a dark field with a few faint lights, and each step closer revealed a
  layer. Now the surface is lit from the farthest zoom, and a calm change
  and a busy one differ by their marks alone.
- **Travel as the way to read.** The founding record's goal was that "the
  reviewer travels through the change rather than opening panels". There are
  now two panels, and reading a module or a file happens in one of them.

Since the merge, two of these were partly bought back (2026-11-21). The
outside packages hang as stars round the map again, hued by their advisories
(D354 (package-stars)), with a `Deps` block in the HUD, a pip on each file
that imports a seriously advised package and a whole-repo overlay (D352
(deps-block), D353 (advisory-pip), D355 (advisories-overlay)). And the file
plate's picture of where the risk sits in a file is in the inspector as a
strip of the file's lines, on the map as lit functions, and behind a `plate`
button (D348 (line-strip), D349 (granules-carry-evidence), D350
(plate-by-ask)). The planet, the darkness and travel as the way to read stay
gone. The cost is more on the screen: three more legend rows, one more HUD
block on every still, and stars that are no longer only decoration.

## Parked, one switch away

The slide a module opened as by filling the screen, the file's plate and the
diff's sheet are off by default and still in the code (D204
(parked-levels)). Setting `LEVELS.autoOpen` to `1` in the tokens panel brings
them back in a running tab.

What the switch does not restore: the planet, so the far zoom under it is the
lit map; and the old click, since a click now also selects.

This is a debt as well as a comfort. The parked code, its tokens and roughly
80 tests stay until a follow-up deletes them, the tokens panel lists rows
that move nothing at rest, and a stale override in a tab brings the old
behaviour back and looks like a bug.

## Behaviour that changed under your hands

- **A click selects and the camera stays.** On `main` a click could open the
  module under it. Now it rings the thing, opens the inspector, and a
  clicked module comes alive in place (D205 (open-on-select)). Flying is
  always asked for: a notice, a tree row, `fly to`, Enter.
- **Zoom opens nothing.** Reading a file's functions or its diff by zooming
  into it no longer works at rest; they are in the inspector.
- **The right column is one scroll.** On `main` the notices and the shore
  each had their place on the first frame. The folder tree now sits between
  them, so the shore's groups start below the fold, and with six notices so
  does the tree.
- **The inspector lies over the map.** It covers the right 420 pixels of the
  map while something is selected, and `fly to` can land a module partly
  under it.
- **The opening frame is framed differently.** It fits the ground the world
  draws, not the whole layout, so a map opens larger than it did.
- **`--png` captures the lit map**, not the planet. The image `--comment`
  posts is the minimap's still and is unchanged.
- **Escape has an order.** It closes an old-levels slide, then clears the
  selection, then walks out.

## Principles relaxed

Each of these was a rule on `main` and is now bent. None was reversed
lightly, and each is worth judging on real repositories.

- **The attention budget.** At most six notices, everything else calm. The
  six still stand, but file names written by size, function granules, a
  folder tree and an inspector now share the screen with them.
- **Words only when asked.** Names appear unasked once a file is large
  enough on the screen (D206 (detail-by-size)).
- **Delta, not state.** The default is still a change, but the structure
  reading, the tree and the approved shape are about what the repository is,
  not what moved.
- **Not a codebase explorer.** The founding record ruled it out. atis now
  shows any file's text, a tree of the repository and a reading of its
  structure, which is more of an explorer than was allowed. That puts it in
  a crowded field, where the change-verdict niche had no rival.
- **One renderer's worth of meaning.** The still SVG and the world drew the
  same marks. The world now also draws granules, names by size and a
  selection that the still sheet has no word for, and the legend still
  describes an opened cell.

## Costs taken on

| Cost | On `main` | Now |
| --- | --- | --- |
| Size of the change | | 108 commits, 92 files, about 16,200 lines added and 1,000 removed; about 6,800 of the added lines are code outside tests and docs |
| Tests | 1,386 in 105 files | 1,645 in 127 files |
| Full check | 139 s | 165 s on a quiet machine, and it fails on timeouts under load more readily; six heavy cases were given 60-second limits |
| Local server | serves the map, a changed file's diff and the socket | also serves the text of any file the map lists, read from git objects behind the run's token; a new read path to keep safe |
| State outside the tree | the terrain cache under the git directory | also `approved.json` there, read by every later map |

Other costs with no number:

- **Speed is unmeasured.** The frame budget in [design.md](design.md) was
  measured with the planet as the opening frame. Names by size, granules and
  two panels that redraw as the pointer moves have never been measured, and
  the budget script still sweeps toward a level that means something else
  now.
- **The founding record no longer describes the product.**
  The founding spec is left as written and has moved to
  [founding-spec.md](founding-spec.md), with a note at its head saying it is
  the record and not the spec; [one-surface.md](one-surface.md) lists the
  four places it is superseded. A new reader has to read both.
- **Parking shows in the code.** `LEVELS.gates` rests at `0` and
  `1000000`, and `data-lod` still steps at zoom 6.

## Still unproven

`main` had not proved these either, but the merge does not change that, and
it adds to the list.

- **The verdict.** The glance test has never passed. One surface makes the
  map readable enough to test again; it does nothing for whether the
  category and the notices tell a hold from a merge.
- **Large repositories.** The 5,000-file map opens and reads after the last
  fixes, but it is a synthetic one. Granules past 5,000 files were driven
  only on the demo with the cap lowered, since no large map carries function
  data.
- **Live review.** An edit reaches the tab in roughly 4 to 10 seconds, and a
  new file redraws the page.
- **The approved shape.** One added file is not a departure, and line and
  fan-out departures register for new files only when maps share a base.

## Going back

The merge is one commit on `main`. Reverting it restores `main` exactly as
it was at `ce5933a`, and `pnpm build` there puts the old `atis` back on the
PATH. Nothing was pushed. An approved shape, if one was recorded, is a file
under the git directory that the old build never reads.
