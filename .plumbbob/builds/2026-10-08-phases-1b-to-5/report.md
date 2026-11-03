# Report: atis phases 1b to 5, in waves

Built 2026-10-09 to 2026-11-01: 127 steps in 34 ranges, out of numeric order. The plan
committed 87 steps; refine passes and confirmed blockers added the other 40 (steps 88 to 127).
The step-by-step history is the build-log's `## Log`; this report adds the why, the harvest
and what is left.

## What shipped

atis went from one still SVG to a tool a reviewer opens. `atis` with no flags reads the
change against the trunk, serves a three.js world of the repository in a browser tab, and
keeps the still SVG as the fixture format and the PR image's fallback. It reads TypeScript,
JavaScript, Go, Python, Terraform and shell, installs from a packed tarball, and an agent can
point at the open map over MCP.

- **Wave 0, phase 1 finished (steps 1 to 21 and 89 to 92).** A changed file no coverage
  report names reads as unmeasured, never calm. Interface notices split by what moved and
  weigh by who reads the moved names, and inferred export shapes are compared with the type
  checker. `dead`, `health`, mutants and unmeasured lines are held to the lines the change
  touched. The SVG gained a legend inset, a practice map, cells' own dents and clone
  families, and added versus modified stains. A precision corpus of twelve outside PRs was
  scored on its tuning half (4 of 6) and its held-out half, and the second blind retake was
  read on the SVG.
- **Wave 1, phase 1b (step 22).** The materials spike's verdict and the motion tokens are
  recorded in `docs/design.md`.
- **Wave 2, phase 2, and wave 2b (steps 23 to 47, 88, 93 to 114).** A pure `libs/scene` turns `map.json`
  into everything the world draws, and `apps/web` draws it: the field, cells and their
  files, weather, notices, the HUD with clickable parts, a continuous camera, picking,
  fly-to and a keyboard walk, opened cells with drifting files, wiring overlays, reduced
  motion, a minimap, a hidden dev panel over every token, a shore rail, and a dark planet
  under its dependencies' stars at the far zoom. Rob judged it on atis's own map one range
  at a time in wave 2b (D166 (legibility-first)): no two skins cross, labels show only when asked, and
  the legend sits off the world. It holds 60 fps at 5,000 files. Glance round two was not
  read.
- **Wave 3, phase 3 (steps 48 to 66, 115 to 117).** The terrain is cached per base commit
  and relaxed from the nearest cached ancestor. The base side is measured by the repo's own
  fallow, for Health Δ, introduced findings and improvements. Runs read the trunk, named
  bases, a range scrubbed over one terrain, the working tree, and the whole repo with its
  overlays. A file opens into its functions, hunks and coverage, with its diff or an editor
  link, and the HUD opens a health radar. Package lanes wrap into rows, and cells collapse
  into composites past 5,000 files. An editor link whose scheme would run a script is refused.
- **Wave 4, phase 4 (steps 67 to 73, 118).** atis gained subcommands, `--png` captured
  headless, `--watch` pushing new weather to the tab, the README fingerprint, `--comment`
  through `gh`, and a package that bundles the workspace and installs. The user's README
  has the legend and the fingerprint.
- **Wave 5, phase 5 (steps 74 to 87, 119 to 127).** `atis mcp` serves `highlight`,
  `reach` and `explain`, and reach follows exported names through the files that import
  them. An opt-in tour, written by a model through fascicle, plays its stops in the world.
  Producers run per language and merge their scans: TypeScript reads JavaScript too, and Go,
  Python, Terraform and shell each fill the same scan, with each language's evidence read as
  checkride writes it. One reviewed PR per new language is rendered under `fixtures/`, and
  `docs/producers.md` is the contract a new producer fills. The last range moved every file
  atis writes into the git directory, out of the reviewed repo's working tree.

## Decisions and why

The calls that shaped the build most. All of them are in [intent.md](intent.md#decisions).

**How the build ran**

- [D79 (waves)](intent.md#d79): six waves in phase order, each sharpened at the boundary
  before it, because Rob asked for every remaining phase and later waves could not be sharp
  until the earlier ones landed.
- [D144 (working-system-first)](intent.md#d144) and
  [D166 (legibility-first)](intent.md#d166): the second retake's fail parked its encodings
  instead of tuning them, and the world was made legible on a map Rob knows before wave 3
  built on it, because Rob judges whether the shapes mean anything by using atis on code he
  understands.
- [D88 (precision-corpus)](intent.md#d88) and [D127 (tuning-loop)](intent.md#d127): the
  precision corpus is scored once on its tuning half and judged only on its held-out half,
  so the encodings are not tuned harder to six fixtures the builder chose.

**What the map means**

- [D80 (unmeasured-not-closed)](intent.md#d80): a changed file no coverage report names is
  a gap of unknown size, never VFR, because that silence was the one fake calm the last
  build left on a map.
- [D81 (interface-move-kinds)](intent.md#d81), [D82 (moved-name-readers)](intent.md#d82)
  and [D118 (inferred-shapes)](intent.md#d118): an interface notice says what moved, weighs
  by who reads the moved names, and compares inferred shapes with the type checker, because
  `interface-change` sat in the top three on every refreshed retake map for shapes the scan
  could not compare.
- [D140 (changed-file-reds)](intent.md#d140), [D98 (base-side-structure)](intent.md#d98)
  and [D143 (untested-mutants)](intent.md#d143): a red is the change's only where it meets
  the change's lines or is new or worse than at the base, and a mutant no test reached is
  named apart from one that survived.

**The world**

- [D90 (scene-lib)](intent.md#d90), [D91 (web-stack)](intent.md#d91) and
  [D86 (svg-stays-the-fixture)](intent.md#d86): everything short of a GPU call is a pure
  library both renderers read, so the still SVG and the world draw one map the same way.
- [D92 (serve-and-open)](intent.md#d92) and [D134 (loopback-trust)](intent.md#d134): the
  world is served on loopback with a per-run token and checked `Host` and `Origin`, because
  v1 is a command that opens a tab and the tab holds a repository's code.
- [D147 (alive-motion)](intent.md#d147), [D153 (shore-rail)](intent.md#d153),
  [D168 (labels-on-demand)](intent.md#d168), [D171 (sibling-cells-apart)](intent.md#d171)
  and [D170 (planet-far-field)](intent.md#d170): motion that means something, the shore off
  the terrain, no text unasked, no crossing skins and a planet at the far zoom, each from a
  range stop where Rob could not read the world as it was.

**Speed and delivery**

- [D96 (terrain-cache)](intent.md#d96), [D97 (incremental-relayout)](intent.md#d97) and
  [D172 (cached-layout-reuse)](intent.md#d172): the base side is cached per commit and a
  new base relaxes from the nearest cached one, so the terrain holds still across bases and
  a cached run's first frame lands about 2 s after the command
  ([D150 (first-frame-target)](intent.md#d150) makes that a measured target, not a gate).
- [D105 (png-capture)](intent.md#d105), [D108 (pr-comment)](intent.md#d108) and
  [D109 (installable-package)](intent.md#d109): the PR image is the same render as the
  world, posting is an explicit networked command, and the package bundles the workspace so
  it names no private dependency.
- [D190 (files-in-git-dir)](intent.md#d190): atis writes nothing in the working tree,
  because its cache under `.atis/` turned svelte's own `format` check red.

**Agents and languages**

- [D110 (mcp-tools)](intent.md#d110), [D138 (mcp-finds-tab)](intent.md#d138) and
  [D111 (symbol-reach)](intent.md#d111): an agent points at the open map through a stdio
  MCP server that finds the serving run, and reach carries the names that moved.
- [D177 (tour-provider)](intent.md#d177): the tour is its own package on Node 24, using the
  logged-in Claude Code CLI by default, and atis never imports it.
- [D114 (producers-compose)](intent.md#d114), [D184 (javascript-terrain)](intent.md#d184),
  [D176 (other-language-evidence)](intent.md#d176) and
  [D180 (check-targets)](intent.md#d180): each language is a producer writing one scan
  shape, the scan decides kinds and barrels so core holds no language's rules, and evidence
  is read by each check's adapter through checkride's own parsers.
- [D187 (nested-barrel-cells)](intent.md#d187) and
  [D189 (tests-folder-is-tests)](intent.md#d189): a nested barrel is a module of its own and
  a `tests/` folder is tests, because svelte and a Python project drew their modules wrong
  without them.

## Parked & harvested

110 items were parked, and every one is harvested: 34 blockers, 76 tangents and no pivot signals. Rob confirmed each class at a step boundary or on a range's stop card. Every blocker became a decision, a step, or both; the tangents that remain future work are grouped by kind under [Deferred tangents](#deferred-tangents). The why is the one the stop's record kept for P80 to P87 and P105 to P110, and the builder's own clause for the rest.

| Park | What it is | Why it matters | Settled |
| --- | --- | --- | --- |
| P1 · Dependency notice never singularises | new-dependency's why reads '1 new dependencies' for a single package; it never singularises (libs/core/src/notices.ts dependencyCandidates) | a reader sees `1 new dependencies` for a single added package, a slip that makes the notice read carelessly | tangent: a singular-plural slip in one notice's why, cosmetic, and no step depends on it |
| P2 · Package and folder teeth doubled | a package cell's dents are the union of its nested folders' (core's assembleCells), so where a package's skin runs along its folder's the two sets of teeth sit side by side; weigh drawing a package's own-file rules only | a reader sees two rows of teeth side by side where a package's skin runs along its folder's, so the rules read doubled | tangent: the teeth still count the rules inside each skin, and own-file-only teeth are a legibility call for the tuning refine, not a fault the precision scoring touches |
| P3 · Members fall outside smoothed skins | a member's own centre can fall outside its skin once the cut is simplified and smoothed (13 to 20 per retake map, re-skinned at step 13; one on 3 of 8 crowded synthetic fields); the ladder's members-in check holds only the raw marching ring | a file can draw outside its own cell's smoothed skin, so a reader may count it in a neighbouring cell | tangent: it predates this range and no notice reads a skin, so it can be weighed at the tuning refine before the blind reading |
| P4 · Corpus-4 notices miss the finding | corpus-4 missed criterion 5 (tuning half, D127): survived mutants on the flagged checkbox builders' length checks reach none of its six notices, outranked by dead reds and an unmeasured barrel | a reader is steered to dead-code reds and an unmeasured barrel, and never to the surviving mutants on the flagged length checks | blocker: D127 sends every miss to the one refine pass, as an open question beside P6 and P7, which caused it |
| P5 · Corpus-5 notices miss the loop | corpus-5 missed criterion 5 (tuning half, D127): the flagged loop is fully covered and mutation did not finish, so no notice bears on it; its top three are dead and health reds and an interface change the truth does not name | a reader of that map finds nothing pointing at the flagged loop, since the map may hold no evidence on it at all | blocker: D127 sends every miss to the refine pass, which may judge that no map holds evidence on the flagged loop |
| P6 · Reds crowd the top three | health and dead reds on changed files hold 9 of the tuning six's 18 top-three rows and bear on none of the six findings (docs/glance-test.md, tuning half) | half the top-three rows go to health and dead-code reds that bear on no finding, pushing real hits down or out | blocker: it displaced corpus-4's hit and demoted corpus-1's, so the refine should settle it first |
| P7 · Untested barrel reads as gap | a package barrel no test imports reads as an unmeasured gap with high reach (corpus-4's notice 2), though its added lines are exports | a barrel whose added lines are only exports takes a top notice as an unmeasured gap, crowding out a real finding | blocker: it took corpus-4's notice 2, so it rides with P6 into the refine |
| P8 · Uncovered mutants read as survived | a NoCoverage mutant is counted and worded as survived (all 88 of corpus-6's, 12 of corpus-1's 14), so the notice overstates what the tests did | the notice says the tests let mutants survive when no test ran them at all, overstating what the tests did | tangent: every hit stands either way, so it is a wording fix the refine can fold in or leave |
| P9 · Re-exports land on line 1 | fallow 3.35 writes every re-export's import (cycle edges, boundary violations) at line 1, col 0, so D140 keeps the file rule there; corpus-4's 14 barrel cycles stay on the change through packages/builders/src/index.ts until the scan supplies a re-export's real line or D98's base side lands | a reader sees a barrel's cycles counted on the change whenever the barrel file is touched, since no finding carries its real line | tangent: C2 holds a finding fallow gives no line to its file, D98's base side replaces the rule in wave 3, and D127 judges the fixes on the held-out maps as they stand, so it waits for step 20's reading to say whether it matters |
| P10 · Practice balloons crowd other marks | the practice map's balloon lines crowd other marks: balloon 1's line crosses the Other block the HUD wrapped beneath the category, balloon 5's lies along the very stitch it names, and balloon 8's ends at notice box 4; each still lands on its own mark (libs/svg/src/practice.ts) | a reader following a balloon's line may misread which mark it names where it crosses a block, a stitch or a notice box | tangent: each balloon still lands on its own mark, and round two's practice map is the world's, not this SVG's |
| P11 · Category reads IFR everywhere | second retake: the category read IFR on all five maps, both holds and all three merges: a health or dupes red on a touched function still turns the Gate red though its notice says present at head (corpus-12, corpus-11), and uncovered changed lines reaching three or more modules make any change to a widely read file IFR (corpus-7, corpus-8, corpus-10) | a reader gets IFR on holds and merges alike, so the category stops telling a risky change from a routine one | tangent: a tuning of the category deferred under P15, and wave 3's base side (steps 51 and 52) is what tells a breach the change made from one present at head |
| P12 · Interface notices lead every map | second retake: an interface notice leads all six held-out maps and holds 15 of their 18 top-three rows; weighed by its readers on a published package it outranks everything, and on corpus-7 it kept the flagged uncovered lines out of all six notices | on a published package an interface notice outranks everything, so a flagged gap like corpus-7's uncovered lines can drop out of the notices | tangent: a ranking tune deferred under P15, and the world lets a reader open every notice, not just the top three |
| P13 · Large sheets draw too small | second retake: a large repo's sheet draws too small to read when fit to a screen: corpus-7's 1834 by 4215 sheet drew at 0.23, its 9-unit HUD and notice text about 2 points tall, and Rob could not see corpus-12 at 0.62 | on a large repo the still map's HUD and notice text shrink to about 2 points, so a reader cannot read them | tangent: the world's continuous zoom (step 37) answers it for a reader, and the still map's size can wait for wave 4's PNG and comment |
| P14 · Unreported tests draw as unrun | second retake: files under test/ that no test run reports (e2e site pages, tsc type tests, a helper) and vitest's focused status draw as unlit stitches, tests not run: 57 of corpus-8's 87, on an approved merge Rob held partly on stitches | e2e pages, type tests and helpers read as tests that did not run, and Rob held an approved merge partly on those stitches | tangent: a false mark worth fixing, but in the stitch reader, which no step in waves 1 or 2 depends on, so it can ride a later fix |
| P15 · Working system before tuning | Rob, after the second retake: on most of the five maps he couldn't zoom in or see details; build a coherent, working system on real code he understands first, and refine and tune the encodings later, so range 6's stop defers the four encodings instead of running D119's refine before wave 1 | without zoom or detail Rob could not judge the encodings, so every refine waits until atis works on code he knows | blocker: it changes what range 6's stop does, so fold it now as D144 (working-system-first): the second retake's encodings stay parked as tangents, and no refine runs before wave 1, amending D119; range 6's stop drops its refine clause |
| P16 · World membranes lack teeth | The world's cell membranes carry no teeth yet: the SVG's dented ring (one tooth per rule, step 12) lives in libs/svg/src/terrain.ts, so step 25's tissue grid lays the plain contour; step 32 should move dentedRing into libs/scene so tissue() lays the dented ring both renderers draw (D86, D146) | a reader of the world sees plain cell membranes with no rule teeth, so the two renderers disagree on what a cell shows | blocker: step 32's done-when draws the world's membranes from the tissue grid with no teeth, while D86 and D146 keep a cell's teeth in both renderers; the fold moves the dented ring into `libs/scene` at step 32 |
| P17 · Shore blocks lack file grid | The shore's open blocks name their changed files but drop the spike's grid: D153 has a touched group open on its files, one small square per file with the changed ones lit, then their names, and the SVG draw the same blocks; step 96 followed D158's narrower 'changed files named', so a 50-file group with one change reads like a 1-file group. Add the grid to the band (from shoreRail's count and changed files) in a small SVG step built ahead of step 32, so the world's rail draws the same grid | a 50-file shore group with one change reads like a 1-file group, so a reader cannot tell how much of it moved | blocker: D153 opens a touched shore group on a grid of its files with the changed ones lit, and step 96 drew names alone; the fold adds a small SVG step for the grid ahead of step 32, so the world's rail draws the same blocks |
| P18 · Repeated labels on shared targets | A target with several notices wears one label per notice (demo's index.ts four times, retake-3's createOptionsProxy.ts three), since step 27's labelsFor places each notice's label on its own; weigh one label per target with its run of ranks, in libs/scene/src/labels.ts | a reader sees the same file named up to four times in one place, where one label with its ranks would do | tangent: one label per notice at a shared target is step 27's own placement, in libs/scene, and a later range can re-cut it once you have seen it |
| P19 · HUD words derived twice | The HUD's block words and the legend's list are derived twice, in libs/svg/src/chrome.ts and legend.ts and again in apps/web/src/hud.ts, held together by hud.test.tsx's parity over every fixture; weigh one derivation in libs/scene for both renderers, as shoreRail and noticeAnchors are (D86, D90) | every change to the HUD's words or legend is made twice, in `libs/svg` and `apps/web`, with only a parity test keeping them in step | tangent: the HUD words are derived twice but a test holds them together on every fixture, so one derivation in scene can wait for a quiet step |
| P20 · Camera motion is baked in | The camera's smoothing (SMOOTH_S, DRAG_SMOOTH_S) and its zoom bounds are baked in apps/web/src/world/camera.ts, and camera-controls' wheel notch zooms 1.85x; move them into the motion tokens the dev panel moves when step 44 records the world's own, after Rob has tried the camera on a trackpad and a mouse | the camera's smoothing, zoom bounds and 1.85x wheel notch cannot be tuned from the dev panel, only by editing `camera.ts` | tangent: the camera's smoothing and bounds belong with the motion tokens step 44 records, after you have tried the camera on both devices |
| P21 · Labels ignore camera tilt | labelsFor takes an axis-aligned viewport in layout units, so under a rotated or tilted camera the labels are placed in the overhead frame's estimate and hung from their true anchors; weigh a placement in screen space, projecting each anchor, in libs/scene/src/labels.ts | under a rotated or tilted camera, labels are spaced for the overhead view, so on screen they may overlap or leave gaps | tangent: label placement under rotation and tilt is an estimate that holds in the overhead frame, and a screen-space placement is scene's to add later |
| P22 · Membrane omits export names | The map records a cell's interface as a count alone (interface_size), so the opened cell's membrane writes 'index.ts · 3 exports' and never the names; weigh recording the barrel's export names in the map (D85 schema bump, from the scan's ScannedFile.exports) so the membrane can write them | a reader opening a cell learns how many exports its barrel has but not which ones, the interface the membrane is meant to show | blocker: §6 and step 40's done-when put the barrel's exports on the membrane, and the map carries only their count, so the names need a small core step before the membrane can write them |
| P23 · Opened cell hides evidence marks | Under an opened cell's slide the surface's evidence marks on its files (the gap ring, mutant notches, stitches, ghosts) give way with the stains, and the slide redraws only the stain with its unstained share; weigh drawing the evidence round each body on the slide, in apps/web/src/world/interior.ts from the scene's weatherOf | a reader opening a cell loses the gap ring, mutant notches, stitches and ghosts on its files, seeing only the stains | tangent: the done-when asked for the stains alone, and round two's blind reading in the world will say whether the evidence is missed inside a cell before anything is redrawn there |
| P24 · Cell gate overshoots small maps | LOD2's gate at 6x the fit zoom opens a cell only once it is framed closer than a screen can hold on a small map: the demo's pm folder spans 151 of the layout's 660 units, so at the gate it stands over two screens tall and Enter's 80% framing never reaches the gate; weigh gating the cell level by the cell's size on screen rather than the zoom alone, or lowering the gate, when step 44 records the world's tokens (LOD_GATES in libs/scene/src/lod.ts) | on a small map a cell opens only when it stands far taller than the screen, so framing it with Enter never opens it | tangent: the cell level's gate is a token step 44 records and the dev panel moves, so its size on a small map is tuned there, not fixed now |
| P25 · Tags slide under the chrome | An opened cell's tag columns pull in to the screen's edges when the slide is wider than the screen, where the legend and the minimap already stand at the bottom left and the HUD at the top left, so a left tag can land under them; weigh keeping the columns clear of the chrome's corner, in tagsOf (libs/scene/src/interior.ts) or by passing the chrome's claims as the screen's margins | when a slide is wider than the screen, a left tag can land under the legend, minimap or HUD and go unread | tangent: a chrome layout polish the blind reading can judge, since the columns only meet the corner when a slide is wider than the screen |
| P26 · Barrel named four times | the opened pm cell writes index.ts four times round its barrel at LOD2 (zoom 8 centred on it, 1280x800): the slide's tag and what look like one label per notice on that target, where D148 gives a target one label and a run of boxes (.playwright-mcp/101/demo-pm-barrel-slide.png) | inside the opened cell the barrel's name appears four times, cluttering the slide where one label with a run of boxes was meant | tangent: the repeated label shows at LOD2 only, and the reading sees the opening frame |
| P27 · Large cold builds take minutes | core's buildMap takes 274 s on step 43's 5,000-file synthetic map (1.8 s at 500, 32 s at 2,000, worse than n²), most of it in bubblesets-js's outline routing (outcode, intersectsLine) under the membranes pass: a first, uncached run of atis on a repo that size waits minutes, which wave 3's cache (steps 48 to 50) hides from the second run only | a user's first uncached run of atis on a repo of thousands of files waits minutes before the map appears | tangent: a first uncached run's cost on a very large repo, for wave 3's refine beside the cache |
| P28 · First cell open stutters | on step 43's 5,000-file map the zoom sweep keeps one frame of 40 to 50 ms where the first cell opens at LOD2 (114 fps over the sweep, both backends); warming the slide's materials before the first frame left it at 34 to 42 ms, so it is not their shader compile; the long-animation-frame entry names no script over 5 ms | a user zooming into a large map sees one slow frame of 40 to 50 ms as the first cell opens, once per session | tangent: one frame a session; the sweep's rate holds |
| P29 · Type-test files read as source | classifyFile reads a *.tst.ts type-test file (tstyche's naming) as source, since it matches neither *.test.* nor *.spec.*, so such a file lands on the terrain as a cell's organelle; one round-two fixture's change carries one | a `*.tst.ts` type test lands on the terrain as a cell's organelle, so a reader takes a test for source | tangent: one type-test file on one map, cheap to add to `classifyFile` when the rules are next opened |
| P30 · Multi-line edits escape coverage | patch coverage counts a changed line as executable only where a coverage statement starts, so an edit on the continuation lines of a multi-line condition or object literal counts as nothing: on one round-two map six changed files read 0 changed executable lines though several carry logic edits, and the mutants disagree, placing six survivors on one of those files' changed lines | logic edits on a multi-line statement's later lines read as no gap, a false calm the surviving mutants on them contradict | blocker: a gap on a multi-line statement reads as no gap, a false calm (C2) the round-two maps carry |
| P31 · JSON files enter patch coverage | a changed package.json lands in weather.evidence.patch_coverage (0 executable lines) on one round-two map, because the istanbul file carries keys for JSON files a test imported; patch coverage could keep to source files as classifyFile reads them | a changed `package.json` sits in patch coverage with zero executable lines, data noise though it draws nothing on the map | tangent: a JSON file with no executable line draws nothing, and it can ride with P30's fix |
| P32 · Yarn prettier script rewrites tree | checkride's format slot runs yarn prettier --check . under yarn, and yarn runs a repo's own root script named prettier when there is one; with --write in that script prettier 3.8 rewrites the tree and exits 0, so the slot reformats the worktree mid-run and passes (a checkride fix, found generating a round-two fixture) | checkride's format slot can rewrite a reviewed repo's worktree mid-run and still pass on the tree it rewrote | tangent: checkride's fix, not atis's, and the fixture procedure now works round it |
| P33 · Rules folders land on shore | the default config shore row's rules/** matches a source folder named rules at any depth, so changed TypeScript source lands on the shore: on two round-two maps 3 of 3 and 4 of 9 changed source files sit there, and the first map's terrain is 4 files in 2 cells; corpus-12 already lost one file to it. Anchor the row (to the repo or member root, or to non-source files) and regenerate those two maps before step 47's reading | changed TypeScript source in any `rules/` folder moves off the terrain onto the shore, so a map can lose most of its change | blocker: a reading of two maps whose change sits on the shore measures the classifier, not the encodings |
| P34 · Opened cell float glitches | inside an opened cell the wander glitches (Rob, at range 14's stop): a body vanishes at the bottom and reappears at the top, a click on a body makes bodies vanish (the pointer seems to act on them), and they move too fast; the float should be gradual and ethereal | bodies vanish and reappear, react to clicks and race about, so a reader cannot follow an opened cell's files | blocker: the float glitches and races, so an opened cell cannot be read; one step after step 47 fixes it |
| P35 · Cells move only up close | an opened cell moves only from about zoom 7, already close, so a whole cell is never seen moving, and the wander, measured in the cell's radius, races across the screen when zoomed further: open a cell where it fits the screen and scale its motion to the screen (Rob, at range 14's stop) | a reader never sees a whole cell in motion, and zoomed further in the wander races across the screen | blocker: a cell seen moving only when already close is half the feature; it rides in P34's step |
| P36 · Zoom levels do not connect | zoom 6's static surface and zoom 7's moving cell do not connect, so the switch is jarring and it is hard to tell what moved: let the surface draw each file where it last floated, static in its last known place, so the two levels read as one (Rob, at range 14's stop) | the switch from the still surface to the moving cell is jarring, and a reader cannot tell which file moved where | blocker: holding each file where it last floated joins the two levels; it rides in P34's step |
| P37 · Spike's cell look preferred | Rob liked the materials spike's individual cell shapes and their animation (the morph and its pulse, not the floating) better than the world's: set the world's opened cell beside the spike's frames and bring its look back | the world's opened cell lacks the spike's shapes and morphing pulse that Rob liked better, a look already drawn in the spike's frames | tangent: a look to match against the spike's frames when the world is tuned, unless you want it in P34's step |
| P38 · Blank and comment lines executable | patch coverage counts a blank or comment line inside a multi-line statement as executable (30 of the 149 lines D163's span reading added on the round-two maps, 12 blank and 18 comments, all on statements that ran), and a comment inside a callback no test called takes the hits of the call around it; the scan could hand core the lines that hold code, so only those count | blank and comment lines inside a statement count as code, and a comment in an uncalled callback can read covered | tangent: all 30 lines read covered on statements that ran, 29 on maps covered whole, so a covered share moves by one line on one map, and the fix is the scan's |
| P39 · Round two went unread | round two, not read: ten seconds in the world's opening frame with input off leaves only the far field's points of light and the chrome; Rob could judge none of the three maps he saw ("couldn't zoom in"), so D95's protocol needs a reading the world can carry (the reader's own zoom, a longer window, a map the reader knows) or round two deferred until atis works on Rob's repos | a ten-second opening frame with input off showed only points of light, so the blind reading gave no verdict on the world | tangent: no step ahead builds on round two's verdict, so D95's rewrite or a deferral can wait for the refine you choose to run, with the lean to defer until atis works on your repos |
| P40 · Far field shows only dots | round two: at LOD0 the world withholds the tissue, the cells and every mark the inset keys (§5.6), so a change's opening frame is a few dots on black; Rob: "each map started at max zoom and i could only see dots, with hardly any information" | a reader starts with hardly any information on screen, and must zoom before the change says anything | tangent: the withholding far field is §5.6's settled look, and changing it is tuning the encodings before the system works end to end |
| P41 · Notice list shows few rows | round two: the notice list takes at most half the column (LIST_SHARE, apps/web/src/chrome/notices.tsx) and scrolls, so the opening frame at 1512 by 982 shows 1 to 4 of a map's six rows whole | a reader may miss the lower notices at first glance, since two to five of the six sit below the list's fold | tangent: a chrome share to tune once you use the world on code you know, and the list scrolls whenever input is on |
| P42 · Reduced-motion test failed once | the world smoke test's reduced-motion frame compare (two frames 1.5 s apart in an opened cell) failed once under the full check's coverage run at step 103, and passed in four solo runs, three full suite runs and the next check; nothing in the frame was saved, so what differed is unknown | an unexplained red in the full check can stop a step, and with no frame saved its cause cannot be found | tangent: one failure in about ten runs, never reproduced, and nothing ahead builds on it |
| P43 · Own map reads as broken | Rob at step 103's pause, on atis's own map: 'i honestly don't know what i'm looking at; the whole thing feels broken' — the opening frame is three dots on black, the surface a blurred mass with white reach pools over 51 cells, cells overlap (apps/atis's skin crosses apps/web/src/world), other cells' labels and the legend sit over the opened slide, and the slowed float barely reads as motion | on a map of code he knows Rob could not tell what he was looking at, and every later range builds on this world | blocker: the world does not read on a map Rob knows, and every range ahead builds on it, so a legibility stretch goes ahead of range 16 |
| P44 · Own map's legibility faults | guided read of atis's own map at step 103's pause: the 19 brightest marks are reach crossings the legend never keys, the legend covers the world's left third and one of the three changed files, apps/atis's skin overlaps apps/web/src/world, the bloom blurs the surface, three tertiary notices flag plumbbob build logs, Size counts fixture JSON lines, and the frame Rob was sent to held none of the change | a reader's eye goes to unkeyed marks and noise notices while the legend hides part of the change and cells overlap | blocker: these are the concrete faults behind P43 (an unkeyed loudest mark, the legend over the world, overlapping cells, the bloom, noise notices), and they belong in the same stretch |
| P45 · Loose files each get cells | core makes every file directly in apps/web/src its own single-file cell (19 of them, beside 4 folders), so the apps/web package holds no file of its own and its opened slide is a cream sheet of 23 holes with nothing on it; a package's loose source files might share one cell | opening `apps/web` shows an empty cream sheet of 23 holes, so a reader learns nothing about the package from inside it | tangent: single-file cells are checkride's module convention, which core follows on purpose, and P46 carries the fix without regrouping cells |
| P46 · Package slides show no modules | modules float inside their package: on checkride-shaped repos most cells are single-file modules (56 of 69 on atis's map), so an opened package is its barrel and a sheet of holes and no module ever floats; let a package's slide draw the files of the single-file cells it holds as bodies, with looseness measured against the package, which needs core to record each file's ties within its package (a schema bump) and reshapes D157 and step 40's holes | an opened package on a checkride-shaped repo shows only its barrel and holes, so the interior view says nothing about its modules | blocker: the opened interior cannot show a checkride-shaped repo, where most cells are single-file modules, so no module ever floats |
| P47 · Reduced-motion test flakes | the world smoke test's reduced-motion frame flakes about one run in five at HEAD: two frames of the opened pm folder 1.5 s apart differ (`still.equals(later)`), with its layers over the world still shown | about one run in five goes red on an unchanged tree, costing a rerun and blunting trust in the smoke test | tangent: it flakes at HEAD without this range, and a rerun clears it, so it blocks nothing ahead |
| P48 · Package wiring omits its modules | an opened package's wiring overlay (`cellWiring`) counts only edges at the package's own files, so a package of modules such as `apps/web` shows none of its modules' wiring (D167) | pressing `w` on a package of modules such as `apps/web` shows none of its modules' wiring, so the overlay may read as broken | tangent: no step names a package's wiring and the stop judges the float, so it waits unless `w` on `apps/web` reads as broken |
| P49 · Noticed files named twice | on atis's own map a noticed file on an opened package's slide wears its notice label beside the slide as well as its tag in the column (apps/web's registry.ts and materials.ts): weigh letting the tag carry the notice's rank and dropping the label while the slide is open (libs/scene/src/labels.ts, apps/web/src/world/labels.ts) | an opened slide names each noticed file twice, a doubled word the tag alone could carry with its rank | tangent: the doubled name is legible and §6 keeps every notice's label, so letting the tag carry the rank is a refinement for later |
| P50 · Wedge-shaped hole in slide | apps/web's opened slide on atis's own map draws the hole for apps/web/src/world as a wedge with a straight edge across the slide, where that folder's skin runs outside its package's: check it is gone once step 108 keeps a package's cells together | a reader sees a hole that is not the folder's shape, a trace of the overlap the package layout should end | tangent: step 108 is built to end the overlap behind it, and range 29's stop judges exactly that on this map |
| P51 · Labels only on demand | Rob at range 28's stop: hide the world's inline labels (file and notice labels, a slide's tags) unless their file is hovered or its cell is expanded, so the shapes read | always-on labels crowd the world's shapes, so the shapes do not read under the words | blocker: step 110 in range 30, ahead of 109, so D166's judgment sees the labels on demand |
| P52 · Space ground with faint rules | Rob at range 28's stop: drop the depth bands from the world's background for a ground like outer space, and mark the bands' rough boundaries with 1px horizontal rules over the 3D, translucent and only just visible | the depth bands fill the world's background, where Rob wants an outer-space ground that marks depth with barely visible rules | blocker: step 111 in range 30, ahead of 109, so D166's judgment sees the space ground and its rules |
| P53 · Repo as a dark planet | Rob at range 28's stop: at the far zoom draw the repo as a dark planet, its files as night lights on a sphere, with the outside dependencies it uses as distant stars coloured by health (red, yellow) that rim-light its silhouette; zooming in, the planet fills the frame and becomes the world as it is now | the far zoom shows a reader little, where a planet of night lights and health-lit dependency stars would give the repo a whole-world view | blocker: steps 112 and 113 in a new range 31 after range 30, so range 16 builds on the planet's far field |
| P54 · Sibling cells still overlap | sibling cells inside one package still cross: 7 pairs in apps/web on atis's own map (chrome x world, world x nav, registry, view); D166 asks that cells not overlap, and step 108 kept to packages | cells that cross inside `apps/web` blur which files belong to which cell, against the rule that cells do not overlap | blocker: D166 names "cells do not overlap" and range 30's stop judges D166 met, yet 7 to 9 sibling pairs inside `apps/web` still cross and no step addresses it |
| P55 · Edgeless file drags a tendril | apps/web/src/vite-env.d.ts, which nothing imports and which imports nothing, lands on the deepest band, so apps/web's skin hangs a tendril through the whole abyss; read where depth puts a file with no edges | one file with no edges hangs `apps/web`'s skin through the whole abyss, a tendril that draws the eye for nothing | tangent: one edge-less file's depth makes a tendril, honest about where depth puts it, and cosmetic beside the crossings |
| P56 · Growth shifts every lane right | step 49's relaxation from a cached layout now runs lane by lane, and a package whose terrain grows slides every lane to its right; its displacement bound should hold lane places, or measure within lanes | one growing package slides every lane to its right, so ground a reader knows moves between runs far from the change | tangent: it is step 49's own displacement bound to design, and wave 3 is sharpened at its boundary |
| P57 · Reduced-motion flake on clean HEAD | world.test.ts's reduced-motion browser test is flaky before step 114 too (2 of 8 runs red on HEAD 245e5ad): two frames 1.5 s apart in an opened cell differ under reduced motion; find what still moves, or what Chrome re-rasters | two of eight runs went red on an untouched HEAD, so a red world test could not be trusted to mean a fault | tangent: step 114 made the first frame pair judge the world's own canvas, which removes the flake's cause, and the test has passed every run since |
| P58 · Added files can cross siblings | an added file whose folder's room is spent still lands beside its own and can cross a sibling's skin (1 of 80 seeded layouts, fields seed 30); D32 pins the terrain, so more growth room or a relayout of the ground D32 forbids are the ways out | a new file can cross a neighbouring cell's skin, so a reader may place it in the wrong folder | tangent: one seeded layout in eighty and none on atis's own maps, and D32 pins the terrain; worth a step only if a real change shows it |
| P59 · Planet hover names nothing | hover on the planet: name a city light's file, or a star's package with its importers and health; the far zoom hovers nothing on the flat ground under it now (planet-far-field, step 113) | a reader at the far zoom cannot learn which file a city light is or which package a star stands for | tangent: a hover on the planet is new reach for the far zoom, nothing in this range needs it, and the far zoom works without it |
| P60 · Git log test nears timeout | the readLog test on this repo (git.test.ts) takes 4-5 s under the full check, against vitest's 5 s default timeout, and flaked once in step 48's run; git log --numstat over 135 commits costs ~1.8 s alone, which step 50's log timings and D50's --history cap should look at | the `readLog` test runs close to vitest's 5 s limit under the full check, so a loaded run can turn it red | tangent: step 49 gave the test a minute and step 50's cache and `--history` took the log's cost off cached runs, so nothing is left to plan |
| P61 · Cached first frame too slow | a cached run reuses its base's layout: pin the ground the change did not touch where the base put it, place only the change's files, recut only the skins near them, and scan the head without extracting the whole tree, so actual's cached first frame (11.2 s, 6.8 s of it the map's build) reaches about 2 s (C14 world-budget, D136 first-frame-clock); trades step 49's relaxed ground for a pinned one | a cached run on a large repo like `actual` still waits about 11 s for its first frame, far past the 2 s target | blocker: wave 3's own outcome is a cached first frame within 2 s, and `actual` sits at 11.2 s until a cached run reuses its base's layout; it becomes step 115, a bare range of its own after range 16, since its pause holds the pinned-or-relaxed ground call |
| P62 · Improved and renamed marks unkeyed | key the calm-positive stain of an improved file and a renamed file's leader in both legends: steps 53 and 54 draw both marks, and neither legend keys them yet, as neither keys the rename's dashed outline | a reader meets an improved file's calm stain and a rename's leader with no legend row to say what they mean | tangent: keying marks in the legend is look work for later tuning, and no legend keys the rename's dashed outline either |
| P63 · Git stderr leaks to terminal | git.ts's showFile runs git show without piping stderr, so a manifest the change added prints git's 'fatal: path … exists on disk, but not in <sha>' to the terminal on every run; seen mapping d80907b at step 54 | a user sees git's `fatal:` line on every run of a change that adds a manifest, alarming though the map is right | tangent: stderr noise that existed before this range; the map is right, so a small fix can come whenever |
| P64 · Unused shore skins still cut | core still cuts a skin per shore group though no renderer has drawn one since the shore moved to a rail (D153 shore-rail): 1.7 s of actual's cold layout, and 0.3 s of every change that adds a doc to a big docs block | every run pays for skins nothing draws, 1.7 s of `actual`'s cold layout and 0.3 s on big docs changes | tangent: a perf cut that changes every golden map's contours, and nothing in range 17 needs it |
| P65 · Huge package draws no skin | actual's package:packages/desktop-client has no skin at all: Bubble Sets finds no ring round its 877 files, so the world draws that package without a membrane | on a very large package like `actual`'s `desktop-client`, the world draws no membrane, so a reader cannot see where it ends | tangent: it shows only on a corpus repo's 877-file package and predates the hold, not on the maps Rob knows |
| P66 · Checker extractions slow cached runs | the checker's extractions (D118 inferred-shapes) cost 0.4 to 0.9 s of every cached corpus run and 1.1 s of atis's own; reading its program from git's objects, as the head scan now does, would drop them | every cached run spends 0.4 to 1.1 s extracting files for the checker, a cost reading from git's objects would drop | tangent: atis already draws a little over 2 s, and the checker's program is D118's seam, not range 17's |
| P67 · Page side eats the budget | actual's world takes 1.1 s from the map's arrival to its first frame (C14 world-budget), so the command keeps only 0.9 s of a 2 s first frame; actual's last second is on the page side, in apps/web | the page alone takes over half of a 2 s first frame on a large repo, leaving the command under one second | tangent: C14 holds from the map's arrival and the 2 s from the command is a target (D150), so the page side can wait for a perf pass |
| P68 · Long ranges have no cap | A long range has no cap: `--range` writes a whole weather frame per commit and runs the reviewed repo's fallow on each commit's extraction once (cached after), so a hundred-commit range is a hundred frames in map.json and a slow first run; decide whether to cap or thin long ranges | a hundred-commit `--range` writes a hundred frames into `map.json` and runs fallow per commit, so its first run is slow and the map heavy | tangent: a long range costs one cached fallow run per commit, and nothing ahead of wave 4 depends on capping it |
| P69 · Scrubber test flaked under load | the world's range-scrubber test (step 58) read 6 notice boxes for frame 0 once under the full suite's load and passed alone and on rerun: it counts [data-labels] marks as soon as data-scrub reads settled, so the labels may redraw a beat after the frame settles | the scrubber test can count labels before they redraw, so a loaded full suite may go red with no fault in the world | tangent: the scrubber smoke test's one flake under the full suite's load; step 64 fixed the race it most likely was, and it has not recurred |
| P70 · Repo map legend mislabels hatching | on a repo map the still map's legend still keys a change's marks: its hatching row reads 'how much of it was rewritten lately' while hatching there means the drawn overlay (trouble spots or recent heat), and no row keys an overlay's ring or echo | a repo map's reader misreads hatching as recent rewriting when it shows the overlay, and finds no key for its ring or echo | tangent: a repo map's still legend keys a change's marks; a copy fix for the next pass over the overlays, which nothing in wave 4 builds on |
| P71 · Scrubber flake seen twice | the world smoke test's range scrubber case flaked once under the full suite's load (6 label marks at frame 0, expected 0) and passed alone three times | a loaded full suite can turn the scrubber test red with no fault in the world, the same flake seen before | tangent: the same scrubber flake as P69, parked twice |
| P72 · PR link needs a parameter | the served run tells the page the branch's PR, so the diff sheet's PR link shows without a ?pr= parameter (step 71's gh lookup knows it) | a user must add `?pr=` by hand to see the diff sheet's PR link, though the `gh` lookup already knows the PR | tangent: belongs to step 71's gh lookup, and the refine before range 19 can fold it there |
| P73 · Radar mutes complexity spokes | record each changed file's raw cyclomatic, cognitive and CRAP (its functions' worst) in the map, so the health radar's raw view stops muting its three complexity spokes | a reader switching the health radar to raw sees its cyclomatic, cognitive and CRAP spokes muted, since the map holds no raw values | tangent: the radar's raw view mutes its complexity spokes honestly; an added key for when the radar is next tuned |
| P74 · Many packages make a strip | core sets each package's block side by side, so a repo of many large packages lays out as a strip: step 43's generator gives 57,740 x 3,139 at 5,000 files (3,265 x 3,139 on 2026-10-24) and 207,173 x 6,245 at 20,000, which regressed the 5,000-file first frame to 4 s and blocks step 66's 20,000-file budget | a repo of many large packages draws as a long thin strip, slowing the first frame to 4 s at 5,000 files | blocker: already folded as step 116 (Q73 lane-rows), which landed in this range, so nothing more to fold |
| P75 · Editor links pass script URLs | editor links: parse the filled template with new URL() and check its protocol (refusing javascript:, data:, vbscript:, blob: and file:, or allowing known editor schemes and https), and refuse control characters in atis.config.json's editor, since browsers strip tabs and newlines so "java\tscript:" passes the denylist in libs/core/src/config.ts | a reviewed repo's own `atis.config.json` could put script in the page that holds the run's token | blocker: a repo's own atis.config.json can slip a script URL past the editor-link guard ("java\tscript:"), so fix it as a step before range 19's deliveries |
| P76 · Stars show through churny cells | stars show through a cell wherever churny files' swells sink the skin below the stars' plane: on step 43's 20,000-file map whole packages read as star fields (seen at step 66) | whole packages can read as star fields, so a reader sees background where a churny cell should be | tangent: a look issue over churny cells for the next world tuning pass; it predates this range |
| P77 · Huge map first frame slow | step 43's 20,000-file map draws its first frame about 5 s after it arrives on both backends, 0.7 s of it the composites' tissue and grid; C14 names no first frame at that size (step 66) | a user on a 20,000-file repo waits about 5 s after the map arrives for a first frame no budget covers | tangent: C14 names no first frame at 20,000 files, and no real repo that size is in the corpus |
| P78 · PNG frames the far planet | a PNG capture frames the tab's opening view, the far-zoom planet with the HUD and the notices' rail, where the numbered notice boxes are not drawn; a PR comment's image may read better framed at the surface (step 68) | a `--png` image shows the far-zoom planet without the numbered notice boxes, so a reader of it sees little of the change | tangent: the comment's image now takes the cinema framing (D174 (comment-image)), and whether `--png` should too can wait for the README (step 73), the next place a PNG is shown |
| P79 · Images drawn like the minimap | draw the comment's image and the fingerprint the way the minimap draws the field (flat skins and files, the notices' numbered boxes), as if the minimap could be zoomed in, rather than the world's lit still and the SVG's terrain (Rob at range 19's stop) | a PR reviewer and a README reader see these images, and Rob wants them flat and numbered like a zoomed-in minimap | blocker: it amends D174 (comment-image) and D107 (fingerprint), and step 73's README shows the fingerprint, so it becomes step 118 in a bare range of its own ahead of range 20, where you judge the look at its pause |
| P80 · Web app license notices | the web app the tarball ships under web/ inlines three, react, camera-controls and elkjs (EPL-2.0) with no license file beside it; apps/web's Vite build could set build.license as the CLI's bundle now does (step 72) | the tarball's web app inlines three, react and elkjs (EPL-2.0) with no notice; a `build.license` in `apps/web`'s Vite config fixes it | tangent: nothing in wave 5 depends on it, and it needs doing only before you publish by hand (D53 (pnpm-and-stub)) |
| P81 · Packed types name core | the packed declarations (dist/run.d.ts, comment.d.ts, cache.d.ts) import types from core, which the tarball carries only as bundled JavaScript, so a TypeScript consumer of @robmclarty/atis's library entry reads those types unresolved (step 72) | a TypeScript user of the library entry would see `core`'s types unresolved | tangent: the package is a command, and nothing imports its library entry, in the workspace or out of it |
| P82 · README omits atis mcp | the user's README (root and apps/atis) says nothing of atis mcp: an agent's MCP config launching it in the repo, its three tools, and --map for a map with no tab open | a user wiring an agent finds no line on how its MCP config launches `atis mcp` in the repo | tangent: `atis --help` already documents the command, and the README can take it with the producer docs at the build's end |
| P83 · Export list sits under labels | an opened cell's export list draws beneath the world's other layers (Rob, range 21's stop): the notice labels' layer is laid over the interior's, its numbered boxes at z-index 1, and the list stays translucent until the exploded view has spread; asked-for words should sit on top | the names lit on a membrane are the point of D181, and nothing should draw over words the reader asked for | blocker: the light step 76 shipped can be covered by the world's own layers, so one web fix step goes first in range 22, with P84 |
| P84 · Reach block ignores the open cell | the Reach block opens on every name the change carried, 22 on checkride PR 4 with 22 more files at the file level, so the four names lit on src/pm's membrane are lost among them (Rob, range 21's stop): with a cell open, open on the names lit on its membrane | on PR 4, the four names lit on `src/pm` sit among 22 names and 22 more files, so the panel buries what the membrane shows | blocker: step 76 grouped the Reach block by every name map-wide, and an opened cell's reader wants that cell's lit names; it joins P83's step |
| P85 · Two runs clobber serve.json | two runs serving one repository overwrite each other's .atis/serve.json, and the later one's exit removes it, so atis mcp loses the tab that is still open | the later run's exit deletes the file, so `atis mcp` loses the tab still open | tangent: two `atis` serving one repository at once is rare, and keying the file per run can wait for a later step |
| P86 · Tour test flakes under load | the web tour test (world.test.ts, served with a tour) timed out at 30 s waiting on the breadcrumb under the full suite's load once in step 79's check, and passed alone in 5 s and on the rerun: a flake in the gate | a 30 s browser wait under the full suite's load can turn a later landing red for nothing | tangent: a load-sensitive timeout in a test this range never touched, green alone and on two full reruns |
| P87 · Producer registry outside later seams | steps 81 to 84 each register their producer in apps/atis/src/sources/producers.ts's PRODUCERS, which their seams omit (they name sources/index.ts); step 87's contract should say where a producer is registered | each new producer adds a line to `PRODUCERS` in `sources/producers.ts`, which the next range's seams leave out | tangent: seams are orientation, so steps 81 to 84 still land; the stray just shows on each checkpoint |
| P88 · Vendored JavaScript founds cells | vendored or minified JavaScript (vendor/thing/dist/thing.min.js, a public/vendor/jquery.js) is terrain since step 120, since only the build row at a member's root and the config row take JavaScript back to the shore; a bundle of thousands of lines founds a directory cell of its own | a vendored or minified bundle of thousands of lines draws as a cell of its own, as if it were the repo's own code | tangent: no fixture carries vendored JavaScript, and the build and config rows catch its common homes |
| P89 · Shore exceptions name only TypeScript | the config row's except list names only TypeScript (D164), so a root config/ of JavaScript code and a JavaScript eslint plugin's rules/ stay config shore while TypeScript in the same places is terrain | a JavaScript repo's `config/` code and an eslint plugin's `rules/` draw no cells, while TypeScript in the same places does | tangent: no fixture reads a JavaScript rules or config folder, and P102's step can take it if you want |
| P90 · Go libraries have no entries | a Go module with no main package (a library) has no entry points, so every file of it sits in the deepest band, unreachable (D26); a Go library's non-internal packages may be its entry points as a TypeScript package's exports are | every file of a Go library sits in the deepest band as unreachable, so a reader cannot tell its public packages from its internals | tangent: which packages a Go library exposes is a design call, and go-1 shows the gap openly |
| P91 · Unlisted Go files land loud | Go files go list never lists, under testdata/ or vendor/ or in no module, land in the shore's other group, loud; a testdata/ row in data and a vendor/ row would sort them by kind | files `go list` skips, under `testdata/` or `vendor/`, crowd the shore's loud other group instead of sitting in rows by kind | tangent: the files go list skips land loud on the shore, and no map misreads code there |
| P92 · Src layout folds Python packages | a Python src layout folds every subpackage into its top package's folder cell, since core's src/ convention (D45) makes src/<name>/ one folder module, while a flat layout gives each package a cell of its own; D115 wants each package with an __init__.py a cell | a reader of a `src/`-layout Python repo sees its packages folded into one cell, while a flat layout gives each its own | blocker: python-1 folds twelve packages into one cell, so a fix step regenerates it before range 24's stop |
| P93 · HCL parser is stale | hcl2-parser 1.0.3, step 83's HCL reader, has had no release since 2022-05 and has one maintainer, the staleness Rob ruled out; the maintained choice is HashiCorp's @cdktf/hcl2json (WASM, asynchronous), which the same worker bridge step 84 builds for sh-syntax could run | the HCL reader rests on a package with no release since 2022 and one maintainer, the kind of staleness Rob rules out | tangent: the parser works today, and the replacement's own upkeep needs checking before a swap |
| P94 · Globbed sources draw no edges | a for loop that sources every script a glob matches (for f in "$DIR"/lib/*.sh; do source "$f"; done) reaches none of them; matching the glob against the tracked scripts would give each an edge | a shell loader that sources every script a glob matches draws no edge to any of them, so the map shows none of them read | tangent: shell-1 shows it on Bash-it's lib loader, and the map stays honest about what it reads |
| P95 · Shebang scripts stay on shore | an extensionless script with a shell shebang (bin/deploy, .husky/pre-commit) stays on the shore's scripts row, since a producer claims files by extension alone (D114); claiming by shebang too would bring such scripts into the terrain | scripts like `bin/deploy` or `.husky/pre-commit` stay off the terrain, so their code and edges go unmapped | tangent: claiming by shebang is a new producer rule, and shell-1 has only four such scripts |
| P96 · Split repo lint view empty | serve a split repo's raw slot output from each target's directory: the HUD part for lint asks serve.ts for .check/lint.*, which a run split into targets writes as .check/<target>/lint.json, so it opens empty | on a repo whose checks are split into targets, the HUD's raw lint view opens empty, though the map reads it right | tangent: the map reads a split repo right, and only the HUD part's raw view opens empty |
| P97 · Type errors stay global | read tsc's and go-build's findings through checkride's parsers, so a type error on a changed file puts a red types slot on the change; today a TypeScript or Go types red stays global, so standing, and the map names tsc and go-build as unparsed | a type error on a changed file never reddens the change's types slot, so it reads as standing rather than caused by the change | tangent: a types red stays standing, and the map names both checkers as unparsed |
| P98 · Stylelint rules draw no cells | the shore table's rules/** and root /config/** exceptions keep only TypeScript extensions (libs/core/src/config.ts, D164), so since D184 (javascript-terrain) a JavaScript repo's rules folder lands on the shore's config group: stylelint's 160 lib/rules/**/*.mjs files draw no cell, and an eslint plugin's rules/ would do the same; widen both exceptions to .js, .jsx, .mjs and .cjs (step 86) | a JavaScript repo's rule code, such as stylelint's 160 rule files, is missing from the terrain a reader reviews | tangent: it repeats P89, parked again at step 86 |
| P99 · Missing test channel goes unexplained | a pack with no test check (bash always, terraform without .tftest.hcl runs) leaves meta.instruments silent on why its files have no coverage or test channel: unwritten() in apps/atis/src/sources/check.ts names the reason only for a test check that ran, so fixtures/shell-1's map has no muted line though D176 (other-language-evidence) says meta.instruments says why (step 86) | a reader of a shell or Terraform map sees no coverage or test channel and no line saying why it is absent | tangent: the channel is absent and never faked, so only the stated reason is missing |
| P100 · False deleted exports on Terraform | the Terraform producer's edges carry local.*, module.*, data.* and resource names a file reads from its sibling, but its exports hold only var.* and output.*, so liveConsumers (libs/core/src/notices.ts) reads each as a removed export: all 6 notices on fixtures/terraform-1 are false deleted-export ones naming 62 names that both sides still declare (step 86) | all six notices on `terraform-1` are false, sending a reader after 62 names that both sides still declare | blocker: P103 is its cause, so P103's fix step clears these notices and regenerates terraform-1 |
| P101 · Trailing slash drops module edge | a Terraform module source spelled with a trailing slash, source = "../../", draws no edge: calledDir in apps/atis/src/sources/terraform.ts normalizes it to './', checks for '.' before stripping the slash, and returns '.' where the root module is keyed '', so fixtures/terraform-1's root reads fan-in 0 and interface 0 and counts as an entry point (step 86) | a module source of `../../` draws no edge, so a reader sees the root module as an entry point nothing reaches | blocker: terraform-1 is regenerated in P103's step, and the missing edge would ride into it |
| P102 · Tests folder read as source | the TypeScript producer reads a tests/ folder as source terrain: TEST_DIR in apps/atis/src/sources/imports.ts matches only __tests__/ and test/, so svelte's packages/svelte/tests/ (2,465 _config.js and sample files) founds 2,377 of fixtures/javascript-1's 2,417 cells, 2,089 of its 2,203 reach entries, a 17.7 MB map.json and a 7.5 minute run, where the Python producer already counts tests/ as tests (step 86) | test samples swamp the map, founding nearly all of `javascript-1`'s cells, with a 17.7 MB `map.json` and a 7.5 minute run | blocker: javascript-1's cells are mostly test samples, so a fix step regenerates it before range 24's stop |
| P103 · Unexported reads count as deleted | core's deleted-export candidate (liveConsumers in libs/core/src/notices.ts) checks a base edge's names only against head exports, never that the base exported them, so a Go file's same-package reads of unexported names (App.isASCII, getAuthSchemes) and a Terraform file's local.* reads all count as deleted exports: 3 of fixtures/go-1's 6 notices are false, with the same cause as P100's 6 on terraform-1 (step 86) | reads of names that were never exported show as deleted exports, so half of `go-1`'s notices and all of `terraform-1`'s are false | blocker: three Go and six Terraform notices are false, so a fix step regenerates both maps before range 24's stop |
| P104 · HUD-fit test times out | chrome.test.ts's HUD-fit test (libs/svg) renders every committed fixture map and timed out at 5 s under the full suite once in step 122's check, passing alone in 1.1 s; javascript-1's 2,417-cell map is the heavy one, which step 123's regeneration shrinks (step 122) | a test rendering every fixture map can exceed the 5 s limit under the full suite's load, turning a check red for no fault | tangent: a load-sensitive timeout that passed alone and on the rerun, and step 123 shrinks the map behind it |
| P105 · Corpus maps predate tests rule | seven committed outside-repo maps predate D189 (tests-folder-is-tests): corpus-2, corpus-5, corpus-10, corpus-12, retake-2, retake-3 and round-two-5 read 73 JavaScript and TypeScript files under a tests/ folder as terrain, founding 30 cells of their own (retake-2 alone 44 files in 15 cells); no golden reads them, and each would move if regenerated (step 123) | a glance round reading them again would see test samples as cells | tangent: no golden reads them, and they were scored as they stand |
| P106 · Cache trips the repo's prettier | atis's cache turns a reviewed repo's format check red: apps/atis/src/cache.ts writes .atis/{terrain,structure,entries}/<sha>.json into the repo and hides them from git with a .atis/.gitignore of *, which prettier never reads, so checkride run after atis on svelte failed its format slot on four .atis/*.json files; javascript-1's README now clears .atis before its checkride run, and a cache under .git/ or written as prettier would write it would not trip it (step 123) | checkride's format slot fails on files atis wrote into the reviewed repo | blocker: a user's own format gate goes red after one atis run, and the fix lives in atis's cache alone |
| P107 · Empty init shows no interface | a Python subpackage whose __init__.py exports nothing shows an interface of 0 now that it is a cell (D187): fixtures/python-1's util (fan-in 21), extensions (7), extensions/models (2) and voice/models (2) read interface_size 0 and no exports, since a folder cell's interface is its barrel alone (D45), while its readers import the submodules directly; interface notices still find those files through interfaceFiles in libs/core/src/notices.ts, so only the membrane's names and the HUD's sizes go quiet (step 124) | four python-1 cells read interface 0 though up to 21 files read them | tangent: display only, since interface notices still find the submodules readers import |
| P108 · javascript-1 predates nested cells | fixtures/javascript-1 predates D187 (nested-barrel-cells): step 123 regenerated it before step 124's rule, and its compiler and internal folder cells hold 10 nested index.js barrels; a scratch run on the same worktree and .check/ reads 50 cells, not 40 (internal/client with 74 files, internal/server, internal/flags, the compiler's 1-parse, 2-analyze and 3-transform among 10 new folder cells), and every notice names packages/svelte/src/internal/client, read by 28 files, where the committed map says packages/svelte/src/internal and 36 (step 124) | its cells and every notice move once internal/client is a cell | blocker: the JavaScript map this stop reviews predates the cell rule step 124 shipped |
| P109 · Corpus maps predate nested cells | ten committed outside maps predate D187 (nested-barrel-cells) and would move if regenerated: their folder cells hold nested index or __init__ barrels, in corpus-2 (8), corpus-3 (2), corpus-7 (20 across 6 folders), corpus-9 (1), retake-1 (26 across 4), retake-3 (2), retake-5 (3), round-two-2 (2), round-two-4 (2) and round-two-5 (4); no golden reads them (step 124) | ten scored maps would draw more folder cells if regenerated | tangent: no golden reads them, as with P105, for the nested-cell rule |
| P110 · Producer page overstates muted | docs/producers.md overstates the muted lines: its evidence section says each gap is a line in meta.instruments.muted, but a pack with no test check (bash always, terraform without .tftest.hcl runs) leaves none, as P99 (a tangent) records, so shell-1's and terraform-1's maps say nothing of their missing coverage; one sentence in the page's list makes it true (step 87) | it says a missing channel always names itself, and two packs' maps do not | blocker: the page is the contract this range ships, and one sentence makes it true |

## Final status

**Done.** All 127 steps are checkpointed, each on a green `pnpm check`
([C8 (checkride-convention)](intent.md#c8)), and every park is harvested (110 of 110). Each
wave's "done looks like" holds, with two readings that did not pass and one target a little
over:

- **Wave 0:** `docs/glance-test.md` records criterion 5 on the held-out holds (2 of 3) and
  the second blind retake on the SVG: **fail**, 2 of 5 verdicts. Under
  [D38 (glance-is-a-step)](intent.md#d38) and [D144 (working-system-first)](intent.md#d144)
  its encodings were parked rather than tuned.
- **Wave 1:** the spike's verdict is in `docs/design.md`, and the motion tokens are in
  `libs/svg/src/tokens.ts`.
- **Wave 2:** `atis --base main` opens the world in a tab, and it holds 60 fps at 5,000
  files (`docs/design.md`). Glance round two is recorded as **not read**: ten seconds in
  the opening frame with input off showed too little to judge, and the five maps stay
  sealed.
- **Wave 3:** `atis` with no `--base` reads the trunk, and the Health Δ block is live. A
  cached run's first frame lands 2.22 s after the command on this repository and 2.93 s on
  `actual`, recorded in `docs/performance.md`. That is a little over the 2 s target, which
  [D150 (first-frame-target)](intent.md#d150) lets pass.
- **Wave 4:** `--png` writes a byte-stable image of a fixture, and the packed tarball
  installs into an empty directory and runs.
- **Wave 5:** an agent highlighted a notice in the open tab through `atis mcp` (step 74),
  and `fixtures/javascript-1/`, `go-1/`, `python-1/`, `terraform-1/` and `shell-1/` each draw
  that language's modules as cells.

**The glance test has still not passed.** Across both builds, no reading has reached four of
five verdicts, and round two was never read. Rob chose to get atis working end to end on code
he knows before tuning the encodings ([D144 (working-system-first)](intent.md#d144)), and this
build reached that point.

**Open:**

- [Q3 (flare-and-jiggle-numbers)](intent.md#q3) and [Q69 (motion-direction)](intent.md#q69),
  kept open on purpose as the logs of motion tuning;
- the deferred tangents below;
- `docs/world-description-spec.md`, a draft spec for the next build, committed with step
  125.

## Deferred tangents

Each tangent below is listed as its park left it. Where a later step touched the same area,
it is named, so check it before acting.

**Encodings to tune once atis works on Rob's code** (D144 (working-system-first))

- A glance reading that can be read: round two's protocol showed too little (P39), the far
  field withholds every mark (P40), and the notice list shows 1 to 4 rows whole (P41).
- The category read IFR on every second-retake map, holds and merges alike (P11), and an
  interface notice led all six held-out maps (P12).
- Skins: a package's teeth are the union of its folders' (P2), a member's centre can fall
  outside its smoothed skin (P3), stars show through churny cells (P76), and the spike's
  cell shapes and pulse read better than the world's (P37).
- Inside an opened cell: the evidence marks give way with the stains (P23), the LOD2 gate
  opens late on a small map (P24), the tag columns crowd the screen's edges (P25), and a
  target with several notices wears several labels (P18, P26, P49), which
  D168 (labels-on-demand) now shows only on hover.
- The still map: a large repo's sheet draws too small to read (P13), and the practice map's
  balloon lines crowd other marks (P10).

**What the map reads, still short**

- Evidence: `tsc` and `go-build` findings are never read (P97), a pack with no test check
  writes no `muted` line (P99, now documented by step 127), unlit stitches for `test/` files
  no run reports (P14), blank and comment lines in a multi-line statement count as
  executable (P38), and a changed `package.json` lands in patch coverage (P31).
- Kinds and the shore: tstyche's `*.tst.ts` reads as source (P29), vendored or minified
  JavaScript is terrain (P88), and the `rules/` and `config/` exceptions name only
  TypeScript (P89, P98).
- Other languages: a Go library has no entry points (P90), Go's `testdata/` and `vendor/`
  land in `other` (P91), a shell loop that sources a glob reaches nothing (P94), a script
  claimed only by its shebang stays on the shore (P95), and an empty `__init__.py` shows an
  interface of 0 (P107).
- The overlays: an opened package's wiring counts only its own files' edges (P48), and the
  health radar's raw view mutes its complexity spokes for want of raw scores in the map (P73).

**The chrome and its words**

- Neither legend keys an improved file's stain or a rename's leader (P62), a repo map's
  still legend keys a change's marks (P70), and `new-dependency` never singularises (P1).
- The served page could take the PR link from step 71's `gh` lookup (P72), `--png` frames
  the far-zoom planet without the numbered boxes (P78), and the planet answers no hover
  (P59).
- In the code: the HUD's words are derived twice (P19), the camera's smoothing and bounds
  are not tokens (P20), labels are placed in the overhead frame under tilt (P21), an
  edge-less `vite-env.d.ts` hangs a tendril (P55), an added file can cross a sibling's skin
  in 1 seeded layout of 80 (P58), and `actual`'s 877-file package draws no skin (P65).

**Performance**

- An uncached `buildMap` takes 274 s on a 5,000-file synthetic map (P27), core still cuts
  shore skins nothing draws, 1.7 s of `actual`'s cold layout (P64), and the checker's
  extractions cost 0.4 to 1.1 s of a cached run (P66).
- `actual`'s page takes 1.1 s from the map to its first frame (P67), a 20,000-file map 5 s
  (P77), and the first LOD2 opening holds one 40 to 50 ms frame (P28).
- `--range` has no cap on the commits it measures (P68), and a growing package slides every
  lane to its right on relayout (P56).

**Before publishing by hand** (D53 (pnpm-and-stub))

- The tarball's web app inlines three, react, camera-controls and elkjs (EPL-2.0) with no
  license notices (P80), and the packed declarations import types from `core`, which ships
  only as bundled JavaScript (P81).
- The README never mentions `atis mcp` (P82): its reason said the README would take it at
  the build's end, and no step did.
- `hcl2-parser` 1.0.3 has had no release since 2022 and has one maintainer (P93); the
  maintained replacement's upkeep needs checking before a swap.
- Two runs serving the same working tree still overwrite each other's `serve.json` (P85;
  step 125 gave each worktree its own), `git show` prints a fatal line to stderr for an
  added manifest (P63), and a split repo's raw slot output opens empty in the HUD (P96).

**Fixtures**

- Seven committed outside maps predate D189 (tests-folder-is-tests) (P105), and ten predate
  D187 (nested-barrel-cells) (P109). No golden reads them, and they were scored as they
  stand; regenerate them before any of them is read again.

**Tests that time out or flake under the full suite's load**

- The world's reduced-motion frame compare (P42, P47; P57 says step 114 removed its cause),
  the range scrubber's notice count (P69, P71), the tour test's 30 s wait (P86), and the
  SVG's HUD-fit test at 5 s (P104). Each passed alone and on rerun.

**Not carried forward**, since a later step or another project took them up:

- P8, a mutant no test reached counted as survived: step 92
  (D143 (untested-mutants)).
- P9, fallow's re-exports at line 1: wave 3's base side (D98 (base-side-structure)).
- P45, `apps/web`'s files as single-file cells: P46's step, without regrouping cells.
- P50, the wedge-shaped hole in `apps/web`'s slide: step 108.
- P60, the slow `readLog` test: steps 49 and 50.
- P32, yarn running a repo's own `prettier` script under checkride's `format` slot:
  checkride's fix, and the fixture procedure works round it.
- P87, producer registrations outside steps 81 to 84's seams: seams are orientation, and
  nothing is left to do.

## Checkpoints

- baseline 0d42c0c263a2646af0c1f5d90b2a998120d91d5d
- plan 86c1b77652bce672cf385c685a2891660ef8cb0d
- step 1 d17b25c05d3e19466b27835b2d0c323d7ca9b247
- step 2 deb6a931daa76d0560f117f99265a8f09c71909e
- step 3 bf4d97da2dd2421b2ac7a52a47d67e71c4eee11c
- step 4 1feb6c2c4038dca36f33aeb50295838455e9ae54
- step 5 d230d958538fb20b4b1990ec46eceea9d8a6059c
- step 6 de8e50be23df9c4e3a250f64ba75379a82e31f5d
- step 7 b335055fab538292c5f8a18d6b79a8f91561b998
- step 8 c118a635308e6f76bea958fda239cc032a0e5435
- step 9 b3237672c9cb312e5cbc18491707363a055c9b8c
- step 10 79726214a6b178c9fd3487235ff023026793ab96
- step 11 a15bdf92781137f9fa06d2e589f8eb9474fa013d
- step 12 0e304ce14896e41f08608ed62652cf777a7e7e36
- step 13 9e62328829130b7f1a7d8133e257f70a7a735153
- step 14 bd79f6006ffdb02fe0f47e6a2073394c44d741e4
- step 15 03915ecc77cf1d1cf3212e71002cc51b23ee2550
- step 16 a18fd39b513d3fc1b5b81069649671b376067501
- step 17 0da883268d7bcb83f2ac5052fed5c656f090dfec
- step 18 3e6109e6d837ee127bf62ee9581fdbd6e6be6ca8
- step 89 82ef67dbde424e3c944d4b71a4a979ba4e9aac5a
- step 90 7c7f63f4f180f5e11af22cfe1a055d22f83a073d
- step 91 5d6816f32f4b1780ca84c1e66f7542a5b8a7f65f
- step 92 69fe9ab339138e0ed25f06e814c73b80978f0744
- step 19 447b84c7e6c788a3d80967ee49668aabe4f0e78d
- step 20 f8f5646fbb53133b21bd1f5b5a2803a8d14549aa
- step 21 1cd4818188e0e881be45162a6ef413fd71c98cd0
- step 22 63b3f23000d4d20fca000984b4f5c5992e38cc15
- step 23 d80907bdafb5696e390f1b5d6d76f80fa0ad1303
- step 95 e9be62690ad81b3aba0361cf232abfbb5424bf75
- step 98 5ea422332b5effa4880ae59fc6fab4b67572d62c
- step 24 4f65d8615cc56027ebce4ba59a24c27bf4cb6e68
- step 25 bcd9a4ed25a4f9c7eec0795dcb30e3258b4757e8
- step 26 cae7a45749184175afe2aa8415eb16e7659ac86b
- step 88 dc47134d3ff2a0889515394f633b39eed6989946
- step 94 7c9938acbf92b5718970910562a9733de0c63a9c
- step 96 0678bfc905aaaceaa083527d94c44cefa97d1c2d
- step 27 0b2aded8fdf98c1329fa76d395dd570ffa5a2024
- step 28 f7bd919285da9e5a3b3a3f3ec57abeb4f16227cf
- step 29 eb544073da4e3a28745a6f7e297dc220d16ad0ba
- step 99 d25cfc34538f0203d1f4a2e80f4d179a71f55555
- step 30 6575c416fe2d111aea7e480b1a8f6fc437ca4afc
- step 97 703aa52dfaa4bb1e1f2dad31cf8c9d48aa0a6c17
- step 31 fda74e3e153ef6dd402cc5e230e7b31a7432d8b3
- step 100 8be6a3389fb19e20b5549844b135f70dfdd14a9b
- step 32 2045a4c704a0422d259b817e20d6f12de460afac
- step 33 4c4a9c042e0204de41a9e0f63ef452d4193154d8
- step 34 ed096bfedb698201f8658c335d13a2ea7969e1d7
- step 35 20fcfdaedc71a17c65f78f2b1744003dd550d56b
- step 36 68f9f8ceaadaba33a8005b4b1fd18823a8ecb732
- step 37 3c0d4d65a7ec18d8954a013e43f66f1d49b4f3c4
- step 93 8f9e3e625de091da2c7bf95ed899075095c7a49f
- step 38 64f307a941b133785a189a49c2ba56a2920386fd
- step 39 a866dd39b17b0be9be2e7677fdfc892f65d0a7d2
- step 40 5b2252fbc3abf30d7625c587d7c6df931c592523
- step 41 e462f476c53c1adf0422fd4fc4447f6e8cf023bf
- step 101 0bf7e2c0ae136ebfb3cb1e78007ba7efa4bfe135
- step 42 27e040b973fd85c07f67d9175fb7e13a4b4f9e0b
- step 43 1a18f99bde7c8440d031f84b975ce841a3cd5d9d
- step 44 8112faf13184211266c637f572dc4b4205aa6e1a
- step 45 2c23e4911e6eb1cd33d6eaef2ca09b7660f08d6b
- step 46 ff88d8e7a1cc190419556d15720de5e758dd99e4
- step 102 380c21622ac375cb9f92fd18e52ba96436806289
- step 47 cbc3919c4bc9aba8874a08b6f499f7d69dbde56b
- step 103 8dae3ed3f5345cd4bc8229ad68913f808b8992eb
- step 104 a4cee0a5e305d834a49d3f42c8ecdb5a26205593
- step 105 c4b76b7a38ee9743e3daadbc83003b0facc8414b
- step 106 0f8c5eaea28dd3ca4704d8a0e0e69a0813ce54db
- step 107 869f9b1dede785acaea784ecfd34da254d8a810a
- step 108 245e5ad3957a41ae9218afd14d0307024c191318
- step 114 6e46bac30f81d15cc49e5ad99476c444d8965bfb
- step 110 c96ebc3baf4ef4b5c8066fd0fc6a98f66b5563be
- step 111 0b6bb31a5cb5ea81764df3c63b9ec68d8ea598f4
- step 109 8fe382b9298229680e6430fbf2aa0f5cbe890cb6
- step 112 3af7b74d1c0f926d461c7c8c9565dd0148ba4f4c
- step 113 f4f44ba4e7896dcf72dd111d80d85a452d746fb3
- step 48 c80af1d91f9a65500408dcdc6e2d80d9e6caf919
- step 49 2950c4f64d629bfdb96e19424683219cebc3a51b
- step 50 1b5743cd9e74e47fab2fdaa89f0c56b57b9aec68
- step 51 f00c9f376516df092baedd42d5077caabab7217e
- step 52 d423968d1d238fbbe7463a78ca7cf6db689689dd
- step 53 dd7cdba675f3a01e10e06d7549ff8d3e13d75184
- step 54 8350549c17a66772e1815b0f22fc7a77492158c3
- step 115 8fa79cb7be7d45936c8f7e94b789a5b6b31d8ab9
- step 55 a517784b22297b5a0828dad8eda4ca2dcba9ca2f
- step 56 a0a184a54482dce28a0a47c1ba5cc3e938ca679a
- step 57 5b2f2d2edaf2b937f2bea242d9d9f9325e110a16
- step 58 1eac3916f73fc233f444ac95ef7dbeeb92dbf8e5
- step 59 20a0c0b9014f9c810b1a0153c48adec35dacd97d
- step 60 1f789705eb10b493bbbbc2d9ef8b6c847b12cb3b
- step 61 bc8c7200a109ea674000d5484224a8c5f1c78770
- step 62 3e7093def273dd9bf619f42458b2bfce1b5d1413
- step 63 73447abcec7eb1948863352d77042251a772f1a6
- step 64 e5fbe48de52af8b26397a2e66d74da0ce78c7d7b
- step 65 a16cf123dcc2f447c460e898fd15d83b1db376a0
- step 116 5866263a7b0708fa9809645ad839d9324a38883a
- step 66 b55db1113cc2f0d3e6bff2c7e839d40aa789fb64
- step 117 1a1388f7c9b793cd4965b63ff968ad203352ce98
- step 67 5fc5adfc10f8af9da7ae3fda905e41cdbf43c8d1
- step 68 2211f6a66f2a84261169e40593e6707ce81a2612
- step 69 0f6791ad8a1ce6d48135950497c2b65b9a29f993
- step 70 63b37d69cca36a9e4baba7b5646cfb4353f57ef5
- step 71 13570faa50d8f918b360d7187dd088063c99e4fa
- step 118 15506e9fd0fdc01b7f65bb066a2073a7b12a41cf
- step 72 d77781992dae3de4799382aa6d4bb6f5266466ba
- step 73 0958b93ded301ca42b253a6cd197c5aa72f8c5e9
- step 74 1185c6540a568754eb0e3b4513ab90c698e4c40a
- step 75 676f2eb24a3d688685749afefdf6b1f45ba5c64d
- step 76 157ccee29648344dc3f0fe86369abea27a65a840
- step 121 184236a8a9020648ea268841a16f3717130df54f
- step 77 5da70cf67404d1952c33fc36d6a1177149b93d50
- step 78 2d440629754c4b33e37c005f759a46fae22681ae
- step 79 90876511effe829b8dda318bc1547e35c7c4d2b0
- step 120 7ef67c5dc7400ea88359a8de63fece63220321c3
- step 80 2fa9a8385791125d118d82f87674cf96db5fde60
- step 81 a256463cb546b7acff4e0b126c45416973af738e
- step 82 607e031c200db156bdd6aee16abe1807992629e2
- step 83 6f1081f65b7ea428ddac13587c0cd33d74a0c419
- step 84 4b337ffa2662b3768791c5c92cc63eee623eb109
- step 119 d1533348708c4dce9d5a376a00fdd2101ff8fab5
- step 85 3b2bfdc4df2b54fc4093692d1bfc9fc2ccbc424d
- step 86 5e63185a52bb82affaa3fcbe8417470ac2770211
- step 122 872b491555827511ad1019206f89eaced138244c
- step 123 038a9f8c36cfe453c94b07fbe422c0539936e080
- step 124 cf0ba63b01f9d2a4ff6e5cb4abc402de2b1ced6d
- step 87 15a790b2d39e102b67176ce55af167526c65390c
- step 125 1aed865d8e8c123d9578ed6172e1cd316abeff3f
- step 126 6956778b5a5aa0d2a4bde70a134ec856c8781f48
- step 127 f99023e16d7ffa9af6a933fabbeb8d7026c28053

## Stats

| step | red checks | drift warnings | reverts | wall-clock |
| ---- | ---------- | -------------- | ------- | ---------- |
| 1 | 0 | 0 | 0 | 6m |
| 2 | 0 | 0 | 0 | 2m |
| 3 | 0 | 1 | 0 | 10m |
| 4 | 0 | 1 | 0 | 3m |
| 5 | 0 | 1 | 0 | 8m |
| 6 | 0 | 1 | 0 | 2m |
| 7 | 0 | 1 | 0 | 11m |
| 8 | 0 | 0 | 0 | 3m |
| 9 | 1 | 1 | 0 | 7m |
| 10 | 0 | 0 | 0 | 1m |
| 11 | 0 | 1 | 0 | 5m |
| 12 | 0 | 1 | 0 | 8m |
| 13 | 0 | 0 | 0 | 27m |
| 14 | 0 | 1 | 0 | 3m |
| 15 | 0 | 1 | 0 | 16m |
| 16 | 0 | 0 | 0 | 152m |
| 17 | 0 | 0 | 0 | 137m |
| 18 | 0 | 0 | 0 | 5m |
| 19 | 0 | 0 | 0 | 197m |
| 20 | 0 | 0 | 0 | 23m |
| 21 | 0 | 0 | 0 | — |
| 22 | 0 | 0 | 0 | 41m |
| 23 | 0 | 0 | 0 | 10m |
| 24 | 0 | 1 | 0 | 6m |
| 25 | 0 | 0 | 0 | 4m |
| 26 | 0 | 1 | 0 | 6m |
| 27 | 0 | 1 | 0 | 11m |
| 28 | 0 | 0 | 0 | 2m |
| 29 | 0 | 0 | 0 | 4m |
| 30 | 0 | 1 | 0 | 107m |
| 31 | 0 | 1 | 0 | 9m |
| 32 | 0 | 0 | 0 | 17m |
| 33 | 0 | 0 | 0 | 13m |
| 34 | 0 | 1 | 0 | 24m |
| 35 | 0 | 1 | 0 | 8m |
| 36 | 0 | 1 | 0 | 8m |
| 37 | 0 | 1 | 0 | 9m |
| 38 | 0 | 0 | 0 | 11m |
| 39 | 0 | 0 | 0 | 11m |
| 40 | 0 | 1 | 0 | 44m |
| 41 | 0 | 0 | 0 | <1m |
| 42 | 0 | 0 | 0 | 7m |
| 43 | 0 | 1 | 0 | 25m |
| 44 | 0 | 0 | 0 | 6m |
| 45 | 0 | 0 | 0 | 27m |
| 46 | 0 | 0 | 0 | 73m |
| 47 | 0 | 0 | 0 | 28m |
| 48 | 0 | 1 | 0 | 9m |
| 49 | 0 | 1 | 0 | 13m |
| 50 | 1 | 1 | 0 | 33m |
| 51 | 0 | 1 | 0 | 11m |
| 52 | 0 | 1 | 0 | 16m |
| 53 | 1 | 1 | 0 | 12m |
| 54 | 0 | 1 | 0 | 10m |
| 55 | 0 | 1 | 0 | 8m |
| 56 | 0 | 1 | 0 | 3m |
| 57 | 0 | 1 | 0 | 9m |
| 58 | 0 | 0 | 0 | 14m |
| 59 | 0 | 1 | 0 | 27m |
| 60 | 0 | 1 | 0 | 14m |
| 61 | 0 | 1 | 0 | 21m |
| 62 | 0 | 1 | 0 | 10m |
| 63 | 0 | 1 | 0 | 9m |
| 64 | 0 | 0 | 0 | 77m |
| 65 | 0 | 0 | 0 | 10m |
| 66 | 0 | 1 | 0 | 40m |
| 67 | 0 | 0 | 0 | 3m |
| 68 | 2 | 1 | 0 | 24m |
| 69 | 0 | 1 | 0 | 14m |
| 70 | 0 | 1 | 0 | 9m |
| 71 | 0 | 1 | 0 | 82m |
| 72 | 0 | 1 | 0 | 14m |
| 73 | 0 | 0 | 0 | 6m |
| 74 | 0 | 1 | 0 | 7m |
| 75 | 0 | 0 | 0 | 22m |
| 76 | 0 | 0 | 0 | 10m |
| 77 | 0 | 0 | 0 | 16m |
| 78 | 0 | 1 | 0 | 14m |
| 79 | 0 | 1 | 0 | 21m |
| 80 | 0 | 0 | 0 | 4m |
| 81 | 0 | 1 | 0 | — |
| 82 | 0 | 1 | 0 | — |
| 83 | 1 | 1 | 0 | 148m |
| 84 | 0 | 1 | 0 | 64m |
| 85 | 0 | 1 | 0 | 72m |
| 86 | 0 | 0 | 0 | 2772m |
| 87 | 0 | 0 | 0 | 8m |
| 88 | 0 | 1 | 0 | 6m |
| 89 | 0 | 0 | 0 | 15m |
| 90 | 0 | 1 | 0 | 5m |
| 91 | 0 | 1 | 0 | 5m |
| 92 | 0 | 1 | 0 | 4m |
| 93 | 0 | 0 | 0 | 9m |
| 94 | 0 | 0 | 0 | 7m |
| 95 | 0 | 0 | 0 | 3m |
| 96 | 0 | 1 | 0 | 14m |
| 97 | 0 | 1 | 0 | 23m |
| 98 | 0 | 0 | 0 | 2m |
| 99 | 0 | 1 | 0 | 4m |
| 100 | 0 | 1 | 0 | 6m |
| 101 | 0 | 1 | 0 | 5m |
| 102 | 0 | 0 | 0 | 95m |
| 103 | 0 | 0 | 0 | 98m |
| 104 | 0 | 0 | 0 | — |
| 105 | 0 | 0 | 0 | 12m |
| 106 | 0 | 1 | 0 | 11m |
| 107 | 0 | 1 | 0 | 17m |
| 108 | 0 | 1 | 0 | 17m |
| 109 | 0 | 1 | 0 | 6m |
| 110 | 0 | 0 | 0 | 14m |
| 111 | 0 | 0 | 0 | 11m |
| 112 | 0 | 0 | 0 | 8m |
| 113 | 0 | 0 | 0 | 20m |
| 114 | 0 | 0 | 0 | 41m |
| 115 | 0 | 0 | 0 | 60m |
| 116 | 0 | 0 | 0 | 25m |
| 117 | 0 | 0 | 0 | 4m |
| 118 | 0 | 0 | 0 | 620m |
| 119 | 0 | 1 | 0 | 29m |
| 120 | 0 | 0 | 0 | 10m |
| 121 | 0 | 1 | 0 | 17m |
| 122 | 0 | 0 | 0 | 1604m |
| 123 | 0 | 0 | 0 | 98m |
| 124 | 0 | 1 | 0 | 19m |
| 125 | 0 | 1 | 0 | 17m |
| 126 | 0 | 0 | 0 | 8m |
| 127 | 0 | 0 | 0 | 4m |
| **total** | 6 | 67 | 0 | 7764m |
