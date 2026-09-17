# Spec: atis, a weather map for code changes

> Draft v0.2, 2026-09-16. Written to be absorbed by `/plumbbob:plan SPEC.md`
> or split by `spec-to-ridgeline`. Prior art and the reasoning behind the
> encodings are in [docs/prior-art.md](./docs/prior-art.md); attribution,
> citations and licences for every borrowed idea and every dependency are
> in [docs/inspiration.md](./docs/inspiration.md).
>
> **Name.** *atis*: Automatic Terminal Information Service, the recorded
> broadcast of field conditions a pilot listens to before approach. The tool
> is the same thing for a change: the conditions, in a few seconds, before
> you commit to landing it. npm `atis`, `@robmclarty/atis`, and
> `github.com/robmclarty/atis` were all free on 2026-09-16; nothing is
> reserved until a `0.0.0` stub is published.
>
> Section 13 holds the decisions (settled, and defaults that stand unless
> overruled). Section 14 holds what is still open, all of it plan-time detail.

## 1. Context

Code review is the bottleneck, and it is getting worse: code is generated
faster than a human can read it line by line with any confidence, and
AI-written code is good but not shaped the way a human would shape it, so the
reviewer's pattern-matching is less reliable than it used to be. Line-by-line
attention does not scale. What scales is *seeing* the change: where it landed,
how far it reaches, what evidence covers it, and which handful of spots
deserve the reviewer's actual attention.

checkride already answers "is the work done" with one exit code and leaves
every tool's raw output in `.check/`. Git already knows what changed, when,
how often, and with what. Fallow already knows the import graph, who reaches
whom, and which functions breach which thresholds. None of that is *visible*
at a glance. This project makes it visible.

**Thesis.** *The PR is a weather layer over the terrain of the trunk.* The
terrain is a stable spatial picture of the repository (structure, depth,
mass, health). The weather is what one change does to it (what moved, how far
it ripples, what evidence covers it, what to look at first). A reviewer reads
the weather in ten seconds, then descends only where the weather is bad.

**Primary outcome.** Move the needle on review throughput without moving it on
review confidence: a reviewer with zero context can approve, or hold back with
a stated, evidenced reason, without reading every line of every change.

## 2. What we take from each reference (feedback, correlated)

Full attributions with citations and licences, including the creative
references and the libraries atis will depend on, are in
[docs/inspiration.md](./docs/inspiration.md). Add a row there whenever
something new is borrowed, and cite the source at the implementation site.

| Rob's read | Reference | Unique idea worth keeping | In this spec |
| --- | --- | --- | --- |
| Along the same lines, but basic | CodeCharta | Compare/delta mode: colour each building by how a metric *changed* between two maps; Σ and Δ metric bar | Everything renders as trunk→branch delta (§5); the HUD shows Σ and Δ (§7) |
| Mediocre, but the focused change-only graph is useful | CodeSee Review Maps | Per-change map of touched files plus importers; change-kind colour; author tours; reviewed progress | The L1 "cell" view is exactly the focused change graph (§6); tours deferred to a later annotator (§12) |
| Good, unique; recalls the edge→authz→handler→service→store layering; Made in Abyss | CodeLayers | Blast radius by hop distance; topological depth as a first-class metric; PR comment + MCP delivery | Depth bands are the primary geometry (§5.1, [D13 (geometry)](#d13)); reach attenuates by module hops (§5.2); PNG comment and MCP in later phases (§12) |
| OK as a zoomed-in view; zoomed out should be organic | Nx Cloud affected graph | Composite nodes collapsed by directory, double-click to expand; affected highlighting from CI's own view | L1 opens a cell into a node graph; L0 stays organic (§6) |
| Brutalist grade blocks are easy to follow; the prose after is not | CodeScene delta | Big contrasting category blocks; health *delta* gate; missing co-change warning; positive reinforcement; recommended review level | HUD is grade blocks, no prose (§7); co-change ghosts (§5.2); "improved" is a first-class state (§5.3); category not score |
| Closest to "cells and organelles" | GitHub Next repo-visualizer | Circle packing; edges only on hover; the daily README fingerprint that makes structural change *noticeable by familiarity* | Cells contain organelles (§5.1); ordinary edges never drawn (§4 P3); fingerprint export (§12 phase 4) |
| Really great | Bubble Sets | Isocontour blobs around set members over an *existing* layout; membership can straddle the primary layout | The exact technique for cell membranes over the depth layout (§5.1) |
| Great ideas | Software Cartography / Codemap | Consistent layout across versions so developers build spatial memory | Terrain layout is anchored on trunk and relaxes incrementally; the weather never moves anything (§4 P2, §8) |
| Full of great ideas, mine it | CHID (Springer 2024) | Churn, bug frequency, missing co-change, PR size, impact size via PageRank; categories over numbers; radar chart of raw metrics; participants said "more to look at" can *slow* review; never use metrics against developers | History layer (§5.2); notice ranking inputs (§5.4); categories + radar in HUD detail (§7); the attention budget exists because of the "more to look at" complaint (§4 P1); no per-person metrics (§10) |
| This is my thesis too | Bartram / Healey | Motion is preattentive across the whole field and the most distracting channel when overused | Motion grammar with a hard budget (§5.5) |
| Yes | Ousterhout | Deep module = small interface, large implementation | Membrane thickness vs body volume (§5.1) |
| Liked for the daylight option's aesthetic | Star Trek: Discovery, season 1 opening credits (a reference, not a tool) | Technical-drawing chrome: ink line-art, dotted leader lines, small annotations, exploded views of a mechanism | The UI and label layer over the organic world (§5.6); opening a cell as an exploded view (§6) |

## 3. Frame

**Problem.** Reviewers cannot see a change; they can only read it, and reading
no longer keeps up.

**Smallest thing that solves it.** A local command that renders one change
against one base as a 2.5D map with a ranked notice list and a grade-block
HUD, fed by git plus checkride's `.check/` plus fallow, and passes the glance
test (§11) on real PRs.

**Done looks like.** `<name> --base main` opens a browser tab; within ten
seconds a cold reviewer states merge / hold and one reason that matches a real
finding, on four of five historical PRs.

**Explicitly not doing.** See §10.

## 4. Principles

- **P1 Attention budget.** At most one primary, two secondary, three tertiary
  notices on screen (six total). Everything else is calm and muted. If the
  tool cannot rank, it shows less, never more. (CHID participants: "the
  number of things to look at increased".)
- **P2 Terrain is stable; weather never moves it.** Positions derive from the
  trunk and change slowly and incrementally. A change recolours, relights,
  outlines, and moves the camera. It never re-lays out the map.
- **P3 One meaning per channel.** Position = structure (depth, coupling,
  membership). Size = mass. Shape regularity = conformance. Hue = state.
  Luminance = evidence. Texture = history. Motion = urgency. Repetition =
  duplication. A channel is never reused for a second meaning in the same view.
- **P4 Motion is a budget, not a palette.** Idle is static. One mover at a
  time, plus short transitions. Respect `prefers-reduced-motion`.
- **P5 Categories and components, not a score.** Every rollup is a category
  with its components one click away. No single risk number.
- **P6 Delta, not state.** The default frame is what changed between base and
  head. Whole-repo state is a mode, not the default.
- **P7 Zero workflow tax.** One command, one tab, one image. No account, no
  service, no new review process. Informs; never blocks. checkride is the gate.
- **P8 Degrade gracefully.** Git alone still renders terrain and weather.
  checkride adds evidence and verdicts. Fallow adds reach and conformance.
  Missing data mutes a channel; it never fakes one.
- **P9 Never about people.** No author scores, no ownership grades, nothing
  that could be read as a performance metric. (CHID §7.3.3.)

## 5. The visual model

### 5.1 Terrain (from the base ref)

**Geometry: the abyss.** The map is organised top-to-bottom by *topological
depth*: entry points at the top edge, leaf utilities and data at the bottom
(settled: [D13 (geometry)](#d13)). Depth is computed on the import graph with
cycles collapsed: `depth(f)` = longest path from any entry point to `f`.
Depth is quantised into at most seven bands drawn as contour terraces. A
change at the bottom of the abyss climbs every terrace on its way back up;
the reviewer sees the ascent. For a REST service the bands fall out as
edge → auth/validation → handlers → domain → services → stores → raw data,
which is the layering Rob already draws by hand.

**One soft skin.** The surface is a single continuous soft body stretched
over the terrain, and everything on it is a bulge in that skin: think a
water bed with things under it, a bean bag world, jello. It is a heightfield
displaced by summed smooth bumps, one per cell weighted by mass, so cells
swell up through the skin rather than sitting on it, and where two bulges
meet the skin folds into a crease. The material reads wet and translucent
with a soft specular sheen. The skin is not rigid: it settles when the camera
lands and gives a brief damped jiggle when a cell is opened (§5.5).

**Cells and organelles.** A module is a cell; its files are organelles inside
it; its barrel (`index.ts`) is the membrane. The membrane is the crease line
around the module's bulge, computed as a Bubble Set isocontour around the
module's files *over* the depth layout, so a module whose files span several
bands is visibly stretched across terraces. That stretch is information: a
module doing work at many depths.

Module identification follows checkride's convention when present
(`src/<name>.ts` single-file module, `src/<name>/index.ts` folder module,
`src/index.ts` package barrel) and falls back to "directory = module,
files imported from outside the directory = interface" elsewhere.

**Depth of a module (Ousterhout).** Membrane thickness = interface size
(exports of the barrel, or of the file for single-file modules). Body volume
= implementation mass (non-test LOC, function count). A deep module is a big
body with a thin skin. A shallow module is mostly skin. Opening a cell (§6)
shows the organelles the skin hides.

**Shape = conformance.** Within thresholds a cell or organelle is round. Each
breached threshold pulls one vertex out: cyclomatic, cognitive, CRAP, unit
size (fallow's four), plus a boundary violation or a cycle. A wobbly polygon
is a cell that breaks the rules; the count of dents is the count of rules.

**Elevation = three things, at three scales.** Terraces (large scale) are
depth. Broad, gentle swells (medium scale) are stability: old, rarely
changed code sits high as bedrock, churny code lies low. Local bulges (small
scale) are mass. All three are relief under one light, never a colour. A
change in bedrock is notable and is a notice candidate.

**Coupling = proximity.** Within a band, cells that import each other sit
close (force layout with import attraction, collision, and set cohesion).
Ordinary import edges are **never drawn**. A drawn line always means "look
here": a boundary violation, a cycle, or a cross-module import introduced by
this change.

**Repetition = duplication.** Members of a clone family (fallow `dupes`) carry
the same small glyph. Seeing the same mark on three cells *is* the finding.

**Tests are not terrain.** Test files are evidence (§5.2), rendered as
stitches on the membranes of the files they import, never as cells.

### 5.2 Weather (from base → head)

- **Changed set.** Touched files light up. Hue by change kind: added,
  modified, deleted (outline only, body gone), renamed (dashed outline from
  old position to new). Unchanged terrain stays muted.
- **Reach.** Transitive importers of the changed files (fallow
  `--impact-closure`, file level in v1; symbol level via `--symbol-impact`
  later). Rendered as a warm glow that attenuates by *module hops*, not file
  hops: the glow fills the changed cell, then crosses a membrane and fills the
  next cell dimmer, and so on. A membrane the reach crosses glows at the
  crossing; that is the public interface through which the change escapes,
  which is exactly where a reviewer should read. A change whose exports are
  not re-exported stays inside its cell, and the map shows the deep-module
  payoff directly.
- **Evidence = membrane integrity.** Patch coverage (changed executable lines
  covered by the test run, from `coverage-final.json` and the diff hunks)
  renders as how closed the changed organelle's skin is: full coverage is a
  closed skin; uncovered changed lines are gaps. Survived mutants on changed
  lines (`mutation.json`) are soft dents. Test files that import the changed
  file (`--trace-file` importers ∩ `test.json`) are stitches; a failing test
  is a torn stitch. A red check slot is a storm marker over the cells it
  names, or over the whole field when it is global.
- **History (from git, CHID).** Churn ratio (cumulative changed LOC / LOC)
  and bug-fix frequency (share of a file's commits whose message matches
  fix/bug patterns; a heuristic stand-in for CHID's PR labels) render as
  *texture*: hatching for churn, stipple for bugginess. A large change on a
  hot, buggy file is a notice candidate.
- **Missing co-change ghost.** Files with a high historical co-change rate
  with the changed set (CHID eq. 3, computed over commits) that were not
  touched render as a dashed ghost outline. Possibly fine (a refactor broke
  the pattern), possibly an omission; either way, a tertiary notice.
- **Improvement.** Health that got better, a dent that went away, coverage
  that closed: rendered as a distinct calm-positive state, because
  reinforcement matters (CodeScene) and because "nothing to see" and
  "got better" are different messages.

### 5.3 State vocabulary (hue)

Hue is reserved for state. Proposal, borrowed from aviation flight
categories so the scale is a *category* with a fixed meaning, not a score
(see [D6 (flight-categories)](#d6)):

| Category | Meaning here | Aviation meaning | Hue |
| --- | --- | --- | --- |
| VFR | Glance-mergeable: checks green, evidence closed, reach contained | Visual flight rules: fly by sight | green |
| MVFR | Mergeable with a look: one gap or one escaped interface, nothing red | Marginal VFR | blue |
| IFR | Needs instrument review: a red slot, or uncovered high-reach change | Instrument flight rules | red |
| LIFR | Do not approach: harness broken (exit 2), vacuous green, or a boundary/cycle introduced | Low IFR | magenta |

Change kinds and improvement use white/cyan and a calm positive respectively;
unchanged terrain is greyscale. Red/green are never the *only* distinction:
every category block also carries its letters, and shape/outline redundancy
covers the map.

### 5.4 The notice list (attention tiers)

The tool ranks candidate notices and shows at most six: 1 primary, 2
secondary, 3 tertiary. Candidates and inputs:

| Candidate | Inputs |
| --- | --- |
| Red check slot | `summary.json` (which slot, global or file-scoped) |
| Boundary violation or cycle introduced | `dead.json` delta |
| Interface change on a high-fan-in or deep module | barrel diff, `fan_in`, depth |
| Uncovered changed lines in a high-reach file | patch coverage, reach size |
| Survived mutants on changed lines | `mutation.json` |
| Threshold newly breached (cyc / cog / CRAP / size) | `health.json` findings delta |
| Large change on a hot or buggy file | churn, bug frequency, hunk size |
| Missing co-change | co-change rate ≥ 0.5 with support ≥ 3 |
| Exported symbol deleted with live consumers | diff + `--trace-file` |
| New dependency or security finding | `package.json` diff, `security.json` |
| Change in bedrock | age/churn |

Rank = severity weight × (1 + log module-reach) × (1 + evidence gap) ×
(1 + history weight), deterministic tie-break by path. Weights and thresholds
live in a config file with fallow's defaults and are shown next to every
notice, because unexplained coefficients were the CHID participants' main
complaint. Tier → emphasis:

| Tier | Count | Channels |
| --- | --- | --- |
| Primary | 1 | motion (flare, then breathe) + saturated hue + label + first in list |
| Secondary | 2 | saturated hue + thick outline, no motion |
| Tertiary | 3 | outline or marker only |
| Everything else | n | muted, static |

### 5.5 Motion grammar (Bartram budget)

Settled: the primary notice **breathes, and flares**. A flare is the loud
channel and is spent deliberately: once on load, then at random, so a
reviewer who looked away is pulled back without the map ever twinkling.

- **Load.** The skin settles onto the terrain (a damped 400 ms drop, the
  one moment the whole surface moves). The primary notice **flares** once
  (a 600 ms bioluminescent burst), then **breathes** (period ~2 s,
  amplitude ~3% of its glow radius). Nothing else moves. At the far zoom
  (§6, LOD0) the changed set is a scatter of static points of light; only
  the primary among them breathes.
- **Random flares.** After the load flare, the primary flares again at a
  random interval drawn from 8 to 20 s. Secondaries flare rarer and dimmer
  (40 to 90 s, half intensity). Never two flares in flight at once; the
  scheduler queues and drops, it never stacks. Tertiaries and everything
  else never flare. The numbers are tuned in the materials spike (§15).
- **Idle.** Between flares, static except the primary's breathing. An
  optional single ambient drift exists behind a setting and is off by default.
- **Jiggle.** The skin gives a brief damped jiggle (≤ 600 ms, spring with
  heavy damping) when the camera lands on a cell or a cell is opened. A
  transient, not a state; it never repeats on its own.
- **Hover.** 100 ms ease to a highlight; no motion on the hovered thing.
- **Camera.** Fly-to on notice click, ≤ 400 ms ease. Zoom, pan, tilt and
  rotate are on demand and never automatic.
- **LOD transitions.** Cross-fades bound to zoom thresholds, ≤ 300 ms. No
  page-like switches; the world never blinks.
- **Budget.** One continuous mover (the primary's breathing), at most one
  flare in flight, plus transient transitions ≤ 600 ms. Enforced in code by
  a motion scheduler that owns every animation; nothing animates outside it.
- **Reduced motion.** `prefers-reduced-motion` keeps the load flare as a
  static halo and disables random flares, breathing, settle and jiggle.

### 5.6 Look (settled)

**Mood: satellite at night, revealed by zoom.** The whole point of the look
is that it *withholds*. Far away there is nothing to see but lights; every
step closer reveals a layer, and each layer is a different material.

1. **Far (LOD0, the field).** A near-black field. Only points of
   bioluminescence: the six notices, bright, and the rest of the changed set
   as a dimmer scatter. Terrace contours are barely there. This is the
   ten-second frame; a calm PR at this distance is a dark field with a few
   faint lights, and that darkness is the message.
2. **Closer (LOD1, the surface).** The surface resolves into an organic
   texture of membranes, the cells, each with its own luminescence. Where
   the change flows, the surface glows along the path: the changed cell
   brightest, the membranes the reach crosses lit at the crossing, the
   next cells dimmer. Relief and terraces become readable. Data visibly
   flowing through tissue.
3. **Inside (LOD2, the cell).** Zooming *into* a membrane fades in the
   interior like a stained slide under a light field: organelles (files) and
   their granules (functions), stained by state, the membrane now the frame
   around them. Warm and clinical where the surface was dark and luminous.
4. **Closer still (LOD3, LOD4).** One organelle, then the diff.

**Rendering: two materials, two rule sets.**

- *The world is organic.* One bulging, blobby soft body: jello, a water
  bed, a bean bag world. Soft, translucent membranes; gradients allowed;
  glow rendered as luminescence from within (emissive plus bloom), not as a
  hard outline; a wet specular sheen on the skin. Every luminous thing is
  luminous because it means something (reach, notice, improvement); the
  base tissue is dim.
- *The UI is brutalist.* Flat blocks, hard edges, high contrast, no
  gradients, big numerals, monospace or grotesk. Labels, leaders and
  annotations are drawn in a technical-drawing style (the Discovery credits):
  thin ink lines, dotted leaders from a label to its cell, small-caps
  annotations, and an exploded view when a cell is opened. The chrome never
  glows.

**Camera: 2.5D.** Orthographic, overhead by default; relief from one key
light plus ambient; continuous zoom is the primary navigation; tilt to ≤ 35°
and rotation on demand; no free perspective camera in v1.

**Colour.** Field near-black; terrain graphite and blue-grey; base tissue
desaturated and dim; state hues per §5.3 on the surface; inside a cell the
stains carry state (changed organelles stained by change kind, uncovered
lines unstained) so hue keeps its one meaning (P3). Exact tokens belong in a
`design.md` written during phase 1, from the static SVG, not before.

## 6. Levels of detail and navigation

| LOD | What it shows | Material |
| --- | --- | --- |
| 0 Field | Dark field; notices and the changed set as points of light; faint terraces; HUD | Lights on black |
| 1 Surface | Whole repo as cells on terraces; weather (reach glow, evidence, ghosts, history texture); the six notices labelled | Organic, luminous |
| 2 Cell | One module: organelles as stained bodies; barrel exports on the membrane; optional *wiring* overlay showing the change-only subgraph with importers and importees (the useful part of CodeSee, the graph part of Nx); optional *exploded view* that spreads the organelles along dotted leaders | Stained slide, technical-drawing chrome |
| 3 Organelle | One file: functions as granules sized by LOC and dented by thresholds; changed hunks; a per-line coverage strip; survived mutants pinned | Stripes and granules |
| 4 Diff | The diff itself, inline or a deep link to the editor / PR | Text |

**Navigation is continuous.** Scroll or pinch zooms; LODs cross-fade at
zoom thresholds; there is no mode switch and nothing reloads. Click a cell to
fly into it; click the notice list to fly to the notice; keyboard walks
siblings and ascends/descends; a breadcrumb in the HUD shows depth
(field › cell › organelle). Every level keeps the HUD. The goal is that the
reviewer *travels* through the change rather than opening panels.

## 7. HUD

A single row (or column) of grade blocks, rendered in the brutalist style Rob
liked in CodeScene's PR comment, never followed by prose:

`[CATEGORY] [Checks 18/19] [Patch cov 84%] [Mutants 2 survived] [Reach 3 cells]
[Size +412 −88, 9 files] [Health Δ −1.2] [Notices 1·2·3]`

Each block opens its components on click: the failing slot's raw output,
the uncovered lines, the survived mutants, the reach list, the health radar
(CHID's radar of raw metrics, categorised or raw by toggle). The base
selector and overlay toggles (§8) live in the HUD too.

## 8. Comparison bases, sequences, and overlays

- **Bases.** `--base <ref>`; default is the merge-base with the trunk
  (auto-detect `main`, `master`, `develop`, `trunk`, `v*` branches; or
  configured). Named shortcuts: last commit (`HEAD~1`), last version (most
  recent tag), working tree vs `HEAD` (uncommitted weather), any two refs.
- **Sequence.** `--range base..head` renders one weather frame per commit,
  scrubbable, over the same terrain (the weather moving over the map).
- **Whole-repo mode.** No single change; overlays instead: trouble spots
  (churn × complexity hotspots), ugly spots (thresholds and maintainability),
  coverage gaps, dead code, duplication, cycles, recent heat (last N commits).
- **Terrain cache.** Layout and history are computed per base SHA and cached
  under `.<name>/terrain/<sha>.json`; incremental relayout starts from the
  previous SHA's positions (Codemap consistency).

## 9. Data

### 9.1 Sources and degradation

| Source | Gives | If absent |
| --- | --- | --- |
| git | diff, hunks, change kinds, log (churn, age, bug-fix heuristic, co-change), tags, merge-base | required |
| checkride `.check/` (contract: `summary.json` schema v1, per-slot raw files, atomic writes) | verdict per slot; `health.json` per-file metrics and findings; `coverage-final.json`; `mutation.json`; `test.json`; `dead.json`; `dupes.json`; `struct.json`; `security.json` | evidence and conformance channels muted; category falls back to a git-only "no instruments" state |
| fallow CLI | `--trace-file` import edges and importers; `--impact-closure` reach; `audit --base` diff attribution; health at base when no cache | reach muted; import graph from a built-in TypeScript import scan instead |

Import edges: v1 loops `fallow dead-code --trace-file` per file (no full-graph
dump exists in fallow 3.22's `--help`), or scans imports with the TypeScript
compiler API. If this proves slow, ask fallow for a graph export or vendor
`dependency-cruiser --output-type json`.

Base-side metrics (health at base, for Δ): from the terrain cache, else from
checkride's committed baseline if it carries per-file scores, else by running
fallow in a temporary worktree of the base and caching.

### 9.2 `map.json` (the contract between core and render)

Versioned (`schema_version`), produced by a pure function from the sources,
consumed by the renderer and by the static exporters. Shape sketch:

```text
map.json
  meta        { schema_version, generated_at, repo, base, head, trunk, mode }
  terrain     { cells[], organelles[], bands[], edges_exceptional[], layout{ positions, contours }, history{ churn, age, bugfix, cochange } }
  weather     { changed[], reach[], evidence{ patch_coverage, mutants, stitches }, checks{ category, slots[] }, ghosts[], improvements[] }
  notices     [ { tier, kind, target, why, inputs, weight } ]   // at most six
```

Everything the renderer draws is in this file. The renderer never reads git,
`.check/`, or fallow. This keeps the render layer swappable (SVG first,
three.js second) and the glance test reproducible from a fixture.

## 10. Non-goals

- Not a general codebase explorer or architecture-diagram product.
- Not a gate. checkride gates; this informs.
- No cloud service, no account, no telemetry, no network at runtime (the
  optional `gh` PR comment is an explicit command).
- No LLM required. A fascicle annotator (tours, explanations) is a later,
  optional layer.
- No per-person metrics, ever (P9).
- No free-perspective 3D, no VR, no city metaphor.
- Not TypeScript-only by design, but TypeScript-first: git-only mode works
  anywhere; evidence and reach need checkride and fallow.

## 11. Acceptance: the glance test

Protocol, run at the end of phases 1 and 2:

1. Pick five merged historical PRs from checkride, fascicle, and weft with
   known ground truth (what the review actually found, or what broke after).
2. Three readers (Rob plus two) who did not write or review the PR.
3. Show the map for ten seconds. The reader states *merge* or *hold* and one
   reason.
4. Pass: four of five verdicts agree with ground truth, and for every "hold"
   the stated reason matches a real finding.
5. Notice precision: for each PR, the thing the real review flagged appears
   in the top three notices.

Fail means the encodings change, not the test.

## 12. Build sequence (plumbbob phases)

0. **Scaffold and spike.** Scaffold with `checkride init --shape monorepo
   --name atis --license Apache-2.0` (workspace packages per §13 D2), then
   build the `map.json` spike for checkride itself: CLI runs sources →
   terrain → weather → notices and writes JSON for a real historical PR. Done
   when the changed set, reach, patch coverage, and notices spot-check
   correct by hand.
1. **Static SVG.** d3 pack/force plus `bubblesets-js`, L0 only, notices and
   HUD, `--svg`. Glance test round one. Iterate encodings until it passes or
   the encodings are reworked. No three.js yet.
1b. **Materials spike.** One day of three.js on fake data to test the
   reveal (§15). Taste only; throw it away.
2. **2.5D app.** three.js terrain, cells, weather, HUD, LOD0 to LOD2, notice
   fly-to, motion scheduler, reduced-motion path. Glance test round two.
3. **Bases and overlays.** Sequence scrub, tags, working tree, whole-repo
   overlays, L2 file level, health radar.
4. **Delivery.** `--png` (headless browser render of the same app), watch
   mode borrowed from `weft-watch`, README fingerprint, optional
   `--comment` via `gh`.
5. **Later.** MCP tools (highlight, reach, explain) so an agent can point at
   the map; symbol-level reach; fascicle annotator for tours; language
   plugins beyond TypeScript.

## 13. Decisions

Settled by Rob (2026-09-16):

- <a id="d11"></a>**D11 (mood)**: satellite at night, revealed by zoom (§5.6).
- <a id="d12"></a>**D12 (materials)**: organic, soft, translucent world with
  gradients allowed; brutalist flat UI with technical-drawing annotations.
- <a id="d13"></a>**D13 (geometry)**: depth terraces top-to-bottom (the
  abyss), cells as Bubble Sets straddling terraces.
- <a id="d14"></a>**D14 (primary motion)**: breathe, plus a flare on load
  and random flares thereafter (§5.5). No shake.
- <a id="d16"></a>**D16 (surface)**: one continuous soft skin; cells are
  bulges in it; jello, water bed, bean bag world (§5.1).
- <a id="d17"></a>**D17 (name and path)**: `atis`, at
  `~/Projects/atis/code/atis`, following the existing project layout.
  The name follows Rob's request to test `atis` first; renaming the folder
  is a one-line move if a different name wins.
- <a id="d18"></a>**D18 (delivery)**: v1 is a local command that opens a
  browser tab. Static PNG/SVG for the PR arrives in phase 4.
- <a id="d1"></a>**D1 (technology)**: three.js (`WebGPURenderer`, WebGL 2
  fallback) for the world, DOM for the chrome, TypeScript throughout, on npm
  beside checkride. Evaluation in §15.

Defaults chosen to keep the spec concrete (silence means keep):

- <a id="d2"></a>**D2 (layout)**: a small pnpm workspace with a pure `core`
  (schema, depth, layout, notices; no DOM, no Node APIs), a `cli` (sources,
  cache, serve, export) and an `app` (render). Because the renderer must
  not touch git or `.check/` (§9.2) and a package boundary enforces that,
  and because a second renderer (native, later) then plugs into the same
  `map.json`.
- <a id="d3"></a>**D3 (gate)**: checkride is the gate (`pnpm check`), deep
  modules, no classes, named exports, tests in `__tests__/`. Dogfood.
- <a id="d4"></a>**D4 (tests-not-terrain)**: test files are evidence, never
  cells. Because they are entry points of their own and would flatten depth.
- <a id="d5"></a>**D5 (reach-by-module-hop)**: reach attenuates per membrane
  crossed, not per file hop. Because the interface is where the reviewer reads.
- <a id="d6"></a>**D6 (flight-categories)**: the verdict scale is
  VFR / MVFR / IFR / LIFR with the hues in §5.3. Because it is a category
  with fixed meaning, it keeps checkride's aviation lineage, and it maps onto
  the red/white/blue/green Rob named. Alternative: plain green/amber/red.
- <a id="d7"></a>**D7 (no-people)**: CHID's author merge rate and any
  ownership grade are excluded. Knowledge overlays are deferred and, if ever
  built, are informational and opt-in.
- <a id="d8"></a>**D8 (history-window)**: full history up to 5,000 commits,
  cached per base SHA; bug-fix frequency from commit-message patterns
  (`fix`, `bug`, `regression`, `hotfix`) marked as heuristic in the HUD.
- <a id="d9"></a>**D9 (thresholds)**: reuse fallow's four thresholds and
  CHID's category ranges as defaults, all in one config file, all displayed
  beside the notice they produced.
- <a id="d10"></a>**D10 (license)**: Apache-2.0, like checkride.

## 14. Open questions (plan-time detail, none blocking)

- <a id="q1"></a>**Q1 (trunk anchor)**: is the base for "against trunk"
  always the merge-base with the trunk branch, or should the committed
  checkride baseline (`checkride baseline`) be usable as the anchor when it
  exists? Default: merge-base; the baseline as an opt-in flag.
- <a id="q2"></a>**Q2 (history cost)**: co-change ghosts and stability need
  `git log --name-only` over the history window (D8: 5,000 commits). Fine
  for these repos; for a large monorepo the window may need to shrink or
  the mining move to a background pass. Decide when a big repo shows up.
- <a id="q3"></a>**Q3 (flare and jiggle numbers)**: the intervals,
  intensities and spring constants in §5.5 are starting values, to be tuned
  by eye in the materials spike and then frozen as design tokens.

## 15. Technology (evaluated against UX/DX, not against what weft did)

What the renderer must do, derived from the settled look (§5.6) and
navigation (§6):

- **R1** Continuous zoom through five LODs with cross-fades; 60 fps at
  ≤ 5,000 files on an M-series laptop; first frame ≤ 2 s from a cached terrain.
- **R2** Two materials: luminous, translucent, gradient-capable tissue with
  glow from within; and flat, crisp chrome whose text renders as text.
- **R3** 2.5D: orthographic overhead, relief lighting, tilt and rotate on
  demand.
- **R4** Precise picking and hover at every LOD, with membranes as arbitrary
  polygons and thousands of organelles.
- **R5** Headless capture to PNG (PR image) and a deterministic static
  render (SVG) for glance-test fixtures.
- **R6** Distribution beside checkride: npm, offline, no per-platform
  binaries, launched by a local command.
- **R7** DX for an LLM-driven build: TypeScript end to end, fast reload, a
  pure core with fixtures, and the deepest example corpus available.
- **R8** Renderer swappable behind `map.json`.

Candidates, status checked 2026-09-16:

| Candidate | Fit | Where it fails |
| --- | --- | --- |
| **three.js r186** with `WebGPURenderer` (WebGPU, automatic WebGL 2 fallback), TSL shaders, node-based or `postprocessing` bloom, `camera-controls`, CSS2D or `troika-three-text` labels, instancing, GPU picking | Meets R1 to R8. WebGPU shipped in Chrome, Edge, Safari 26 and Firefox 141+ by late 2025, so the fallback is a safety net. Custom TSL materials give membranes translucency and inner glow; selective bloom gives the bioluminescence; instancing carries thousands of organelles; continuous orthographic zoom is native; headless capture works through Chromium (Playwright). Largest corpus of any candidate. | In-world text is second-class (solved by DOM labels through `CSS2DRenderer`). Bubble Set contours must be triangulated (earcut ships with three). |
| deck.gl 9.4 (`OrthographicView`, layer model, luma.gl) | Excellent semantic zoom and layer model; picking built in; scales to millions; literally "a map with layers". | Organic materials need custom layers with hand-written shaders; relief and translucency fight its flat-layer primitives; postprocessing is thin; DX is shaped for geodata. Strong second if the world were flatter. |
| PixiJS 8.20 (WebGPU/WebGL, 2D) | Superb 2D throughput and filters; simple. | Relief must be faked with normal maps; tilt and rotate (R3) are out; one look only. |
| Native: Rust + wgpu or Bevy; Odin + raylib or sokol | Best raw performance; Rob's own native experience; the right answer for a wall display or a very large monorepo later. | R5 to R7 get heavy: per-platform binaries or 30 to 40 MB WASM, weaker text and UI, a small LLM corpus for wgpu, nothing npm-shaped beside checkride. Keep as a possible second renderer behind `map.json`; not v1. |
| Godot web export | A whole engine with a UI toolkit. | WebGL 2 only, tens of MB, GDScript outside the TypeScript toolchain, not npm-shaped. |

**Decision [D1 (technology)](#d1), confirmed by Rob: three.js
`WebGPURenderer` for the world, DOM for the chrome.** The reveal in §5.6 is a materials-and-glow problem,
and three.js is the only candidate where translucency, inner glow, relief,
continuous orthographic zoom, picking and headless capture are all
first-class *and* the corpus is deep enough for an LLM to build it reliably.

Around it:

- **World**: vanilla three.js, imperative scene, one explicit render loop
  that also owns the motion scheduler and the LOD cross-fades, so the motion
  budget (§5.5) is enforced in one place. react-three-fiber 9.7 (WebGPU
  capable) is not required; adopt it later only if the scene graph turns
  React-shaped.
- **Chrome and HUD**: DOM. React 19 for components and corpus; Svelte 5 is
  the lighter alternative if bundle size starts to matter. Labels through
  `CSS2DRenderer` so text is text and leaders are SVG lines.
- **Layout**: computed in the CLI and cached per base SHA (§8): d3-force
  within terraces (import attraction, collision, set cohesion, deterministic
  seed), `bubblesets-js` 3.0 for membranes, earcut for triangulation,
  elkjs 0.12 only for the LOD2 wiring overlay. GPU compute for layout is
  unnecessary at ≤ 5,000 files and stays out of v1.
- **Materials**: TSL node materials for tissue (translucency, rim glow,
  emissive by state, a wet specular sheen); selective bloom on emissive
  only, so the base tissue never blooms; relief from a heightfield with one
  key light.
- **Soft body**: the skin is a heightfield mesh displaced in the TSL vertex
  stage by the sum of smooth bumps read from a data texture of cell centres,
  radii and masses (terraces and stability swells are baked into the base
  heightfield). Settle and jiggle drive a single amplitude scalar through a
  damped spring, so the whole surface moves as one substance and the cost
  is one uniform per frame. Translucency is approximated from thickness;
  no real subsurface scattering in v1.
- **Zoom semantics**: one continuous zoom scalar; LOD bands with hysteresis;
  cross-fade ≤ 300 ms; label density managed per band (nearest-N by
  importance, no collisions).
- **Bundling and serving**: Vite for the app; the CLI serves the built app,
  `map.json`, and a WebSocket for watch mode.
- **Capture**: Playwright + Chromium for `--png` (WebGPU headless on macOS
  and Linux, SwiftShader WebGL fallback in CI); the phase-1 static SVG
  renderer stays as the fixture format for the glance test.
- **Budget**: first frame ≤ 2 s from cache; 60 fps at 5,000 files; above
  that, LOD1 collapses cells to composites (Nx style) and targets 30 fps at
  20,000 files.

**Phase 1b, materials spike (new).** In parallel with the static SVG, a
one-day three.js spike of the reveal on fake data: dark field with lights,
zoom to a luminous surface, zoom into one stained cell. Its only purpose is
taste: does the look hold up on screen before phase 2 commits to it.
