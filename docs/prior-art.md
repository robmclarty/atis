# Command centre: a glanceable verdict surface for a diff against trunk

Prior-art research for atis, 2026-09-16, done before the spec was written.
The spec is [../SPEC.md](../SPEC.md); this note is the reasoning behind its
encodings and the catalogue of what was borrowed from where. Some proposals
below were superseded by the spec (for example the geometry and the motion
grammar); where they disagree, the spec wins.
Formal credits, citations and licences are in [inspiration.md](./inspiration.md).

## The idea (Rob's brief, condensed)

A satellite view of a project: hierarchical groups as organic blobs pulled
together by gravity, blobs within blobs for the hierarchy, lines only between
related modules, forming a topographical map seen from above. Enough
information in the picture that a reviewer with zero context can gauge whether
a PR/diff against trunk is safe, accurate, and working, at a glance. Colour for
state; deep modules as fat blobs with a thin interface skin that can be opened;
shape regularity for conformance to best practice; motion for urgency
(twitching = severe deviation, slow hover = calm). Multiple toggleable views:
the map, coverage by modular level, and an agent/data-flow view like weft.
Three.js. Attention is the scarce resource; the view lowers the attention
needed to tick the merge checklist.

## Prior art, grouped by what it teaches

### 1. Hierarchy as nested circles (the "blobs within blobs" base layer)

- **GitHub Next repo-visualizer** (Amelia Wattenberger, 2021).
  https://githubnext.com/projects/repo-visualization/ and
  https://github.com/githubocto/repo-visualizer. Circle packing: folders are
  circles containing file circles; colour = file type, size = file size. Import
  edges only on hover ("too many connections at once"). Shipped as a GitHub
  Action that regenerates an SVG in the README so you see the fingerprint every
  day and notice structural change by familiarity.
  Borrow: circle packing as the base; edges hidden by default; the daily
  fingerprint. Limit: 2D, no metrics, no diff awareness.
- **Git Truck** (ITU Copenhagen, VISSOFT 2022). https://github.com/git-truck/git-truck.
  Local, treemap + circle packing, colour by authorship / commit count / last
  change, time slider. Borrow: local-first, git-derived churn and age overlays.
- **Codecov sunburst**. https://docs.codecov.com/docs/graphs. Hierarchical
  coverage rings, drill-down. Their thesis piece "patch coverage matters more
  than project coverage" is the diff-relevant number.
  Borrow: coverage rolled up per module ring; patch coverage as the headline.

### 2. Organic blobs and maps (the "gravity + terrain" look)

- **Bubble Sets** (Collins, Penn, Carpendale, InfoVis 2009).
  https://vialab.ca/research/bubble-sets. Isocontour blobs drawn around set
  members over an existing layout, so a group reads as one organic shape even
  when members are scattered. JS port: `bubblesets-js`. Observable riff:
  "Hierarchical Bubble Clusters for Semantic Layout".
  Borrow: draw module boundaries as isocontours around a force layout, not as
  rigid circles. This is the literal technique for Rob's blob outline.
- **GMap** (Gansner, Hu, Kobourov 2010). https://yifanhu.net/MAPS/index.html.
  Graph plus clustering rendered as a geographic map: clusters become
  countries with coastlines and borders. Ships in Graphviz as `gvmap`.
  Borrow: country = module, shared border = coupling, sea = distance.
- **Software Cartography / Codemap** (Kuhn, Loretan, Nierstrasz 2008 to 2010).
  https://arxiv.org/abs/1001.2386. Files placed by lexical similarity, hills
  sized by LOC, and, critically, a *consistent layout* across versions so the
  developer forms spatial memory of the codebase.
  Lesson: layout stability is the whole game. If the map reshuffles per PR,
  nobody builds a mental model and the glance never gets cheaper.
- Metaballs / marching cubes in three.js are the technical route to soft 3D
  blobs; `3d-force-graph` (vasturiano) is ready scaffolding for a three.js
  force layout if we want it.

### 3. City and 3D metric maps

- **CodeCharta** (MaibornWolff, active, open source, three.js).
  https://codecharta.com/ and https://github.com/maibornwolff/codecharta.
  City metaphor: area = LOC, height = complexity, colour = any metric. Importers
  for Sonar, coverage, git log (churn), Code Maat. **Compare (delta) mode**:
  load two maps and each building is coloured by how its height metric changed
  (green up, red down), with a metric bar showing Σ and Δ.
  https://codecharta.com/docs/visualization/user-controls/compare/
  Borrow: everything is a delta of two snapshots (trunk vs branch). Avoid: the
  rectilinear clutter; it is a metrics browser, not a merge gauge.
- **ExplorViz** (Kiel). https://explorviz.dev/. 3D city plus "landscape"
  level, live traces, VR. Borrow: two zoom levels (landscape of packages, city
  of one package).
- **Software Galaxies** (anvaka). https://anvaka.github.io/pm/. 3D WebGL
  package graphs. Beautiful, purely exploratory. Cautionary: 3D node-link
  clouds at scale are pretty and not diagnostic; occlusion and free camera
  fight the glance task.
- **Orbis** (2025/26). dev.to write-up: paste a GitHub URL, get a 3D
  dependency graph across six languages. Same category as CodeLayers.

### 4. PR and diff focused (closest to the actual goal)

- **CodeSee Review Maps** (2021 to ~2024; now dormant inside GitKraken).
  https://docs.codesee.io/docs/review-map-guide. Auto-generated per-PR map of
  changed files plus their imports/importers. Colour swatch per file:
  added / removed / edited / renamed / unchanged. Author-written **Tours** walk
  reviewers through the change in logical order instead of alphabetical.
  "Reviewed" checkboxes grey out nodes and drive a progress bar; double-click
  a node for its diff.
  Borrow: change-state colour, tour ordering, reviewed progress.
  Market lesson: a standalone viewer with its own workflow did not survive.
  Delivery must be zero-tax: local tab, PR image, CLI.
- **CodeLayers** (2026, commercial, active). https://codelayers.ai/explore.
  3D dependency graph; "blast radius" mode colours from red (directly changed)
  through purple (5+ hops); explore any public PR by URL; GitHub Action posts
  the 3D view as a PR comment; MCP server so Claude Code can highlight files
  and check blast radius while it works. Their "Blast Radius" blog series
  quantifies PRs ("6 files changed, 729 in the blast radius", Ghostty #11538).
  Borrow: hop-distance ramp; PR-comment delivery; MCP integration.
  Critique: radius without evidence is fear, not confidence. 729 "affected"
  files says nothing about whether the change is safe. Pairing reach with the
  evidence that covers it is exactly the gap.
- **Nx Cloud affected project graph** (Nov 2024).
  https://nx.dev/blog/ci-affected-graph. Composite graph: directory groups
  collapse into one node, double-click to expand; affected projects highlighted
  on every CI run. Borrow: collapsible composite nodes (= the openable deep
  module) and "affected" highlighting from the CI's own perspective.
- **CodeScene delta analysis**.
  https://docs.enterprise.codescene.io/versions/4.5.0/guides/delta/automated-delta-analyses.html
  Per-PR code-health delta (decline fails the gate); *absent change pattern*
  warning when files that historically co-change were not all touched;
  positive reinforcement when a hotspot improves; a recommended review level
  from a risk profile (change depth and diffusion times author experience in
  this repo).
  Borrow: the missing co-change ghost, health delta with a celebration state,
  review-level recommendation rather than a block.
- **CHID paper**, "Enhanced code reviews using pull request based change impact
  analysis", Empirical Software Engineering 2024.
  https://link.springer.com/article/10.1007/s10664-024-10600-2. PR-level
  impact from a call graph plus history mining. Metrics: highly churned file
  ratio, highly buggy file ratio, missing co-change files, PR size, author
  merge rate, impact size; weighted into a risk score. Focus groups: 3.66/5
  for enhancing review, 3.2/5 for the risk formula, 71% agreement on metrics.
  Lesson: practitioners distrust a single composite score. Show components.

### 5. Attention and motion science (for the animation idea)

- **Bartram, Ware, Calvert**, "Moticons: detection, distraction and task"
  (IJHCS 2003) and "Moving icons: detection and distraction" (Interact 2001).
  https://www.cs.kent.edu/~jmaletic/softvis/papers/Bartram01.pdf. Simple
  motion is detected preattentively across the whole visual field, even in
  the periphery and at low amplitude, and outperforms colour and shape for
  peripheral signalling. It is also the most distracting channel when
  overused. Different motion types (linear, circular, zoom) differ in
  detectability and annoyance; slow, small-amplitude motion is detectable
  without being irritating.
- **Healey, "Perception in Visualization"** (NCSU) summarises flicker,
  direction and velocity of motion as preattentive features.
  Design consequence: motion is a budget, not a palette. The calm state must
  be near-static (one slow drift at most). Only the top few blocking findings
  may twitch. If everything moves, the channel is spent.

### 6. Agent and dataflow views

- **weft** (Rob's own, `~/Projects/fascicle/code/weft`). React Flow + ELK
  canvas for fascicle FlowTrees, watch loop over a JSON file via a localhost
  WebSocket, studio shell with tabs / search / inspector / keyboard nav,
  embeddable `<WeftCanvas>`. This is the "third view" already built. Its
  studio shell and `weft-watch` pattern (tail a JSON file, broadcast, re-render
  in ~500 ms) are worth copying wholesale for the map's live mode.
- MCP code-graph servers (glama "codebase-visualizer", "code-review-graph")
  show the 2026 pattern: the graph doubles as an agent tool. CodeLayers does
  the same.

## What the research says against parts of the brief

1. **Free 3D hurts the glance task.** Treemap and city studies, and the
   experience of Software Galaxies, agree: occlusion and camera freedom cost
   attention. Keep three.js, but lock the default camera orthographic and
   overhead ("satellite"), use height as low relief with lighting (2.5D), and
   let tilt be an optional gesture. The satellite feel survives; the hairball
   does not.
2. **A single risk number will be distrusted** (CHID). Render the components
   spatially; let the whole map being calm be the "score".
3. **Motion everywhere is noise** (Bartram). Budget it.
4. **Standalone viewer apps die** (CodeSee). Live where review happens.
5. **Unstable layouts never become familiar** (Codemap). Anchor layout on trunk.

## Design synthesis

The product is not a codebase explorer. It is a **verdict surface for a diff**:
trunk is the terrain, the PR is a weather layer over it, and the evidence that
covers the change is the skin integrity of the affected blobs. Nothing in prior
art fuses "what changed", "what it reaches", and "what evidence covers it" in
one picture. That fusion is the gap.

Separate the channels, one meaning each:

| Channel | Encodes | Source |
| --- | --- | --- |
| Containment (blob in blob) | Module hierarchy (folder modules, single files, package barrel) | filesystem + `index.ts` convention |
| Proximity (gravity) | Import coupling; edges are *not* drawn for ordinary imports | fallow trace-file / import scan |
| Drawn line | Only exceptional edges: boundary violation, cycle, newly added import across modules | `dead.json`, diff |
| Blob volume vs rim thickness | Ousterhout depth: fill = hidden implementation (LOC, functions), rim = interface size (exports of the barrel) | `health.json` file_scores, barrel export count |
| Shape regularity | Conformance: each fallow threshold breached (cyc, cog, CRAP, unit size) pulls one vertex out; within thresholds = round | `health.json` findings |
| Hue | Verdict only: neutral trunk, changed = cool/white, failing = red, improved = green | `summary.json`, diff, health delta |
| Glow by hop | Reach set: transitive importers of the changed files, fading by hop count, **clipped at an untouched barrel** | fallow `--impact-closure`, diff |
| Skin integrity | Evidence: patch coverage on changed lines = closed skin; uncovered = gaps; surviving mutants = soft dents; tests that ran = stitched seams | `coverage-final.json`, `mutation.json`, `test.json` |
| Ghost outline | Missing co-change: a file that historically changes with this set but was not touched | `git log` co-change mining |
| Elevation | Stability/age: bedrock (old, rarely changed) high; churny lowland. A change in bedrock is notable | git churn |
| Motion | Urgency only. Calm = static. Top 3 blocking findings twitch; nothing else moves | `summary.json` failing slots |

The deep-module payoff becomes visible: because sibling modules only import a
barrel, a change whose barrel is untouched has a reach of one blob. The map
literally shows why the boundary rules are worth having, and shows the cost
when a barrel changes (the glow spreads).

Views (toggleable, same model):
1. **Map** (default): terrain + weather + skin, as above.
2. **Coverage by level**: sunburst / nested rings rolled up per module, with
   patch coverage separated from project coverage.
3. **Flow**: weft, embedded, for agent and data flows where the repo has them.
4. Later: **time scrub** replaying the branch's commits as weather moving over
   the map (Gource-style), and a **tour** ordering (CodeSee) that could be
   written by a fascicle step.

Acceptance test ("glance test"): a reviewer with zero context looks at the map
for a PR for ten seconds and states merge / don't merge and one reason. Run it
on five real historical PRs (checkride, fascicle, weft) with paper or static
SVG prototypes *before* any three.js. If the SVG can't pass, 3D won't save it.

## Where it should live

| Home | For | Against | Verdict |
| --- | --- | --- | --- |
| checkride | All the data is already in `.check/` (health per file with fan_in/out, coverage-final, mutation, dead cycles/boundary violations, summary verdict); fallow gives edges, impact closure, `audit --base` | checkride is a headless gate with a frozen contract and an exact-pinned dev-dep install footprint; a three.js/React app would bloat every consumer, couple release cadences, and break "single flat package" | **No as host. Yes as the data producer.** The viewer's input format *is* the checkride contract (`.check/`). At most checkride grows a small `graph` artifact later, once the viewer proves what it needs. |
| weft | Studio shell, watch loop, inspector, keyboard nav, embeddable canvas all exist | React Flow is DOM node-link with layered ELK layout; "faithful, never stylized" is the opposite aesthetic; model is a FlowTree, not a repo | **No for the map; yes as the Flow view and as the pattern to copy** (`weft-watch` could be reused as-is). |
| fascicle agent | Could write the tour narrative, explain a finding on click, or render pr-improve's reviewer output | A map renderer is not an LLM workflow; hosting it in fascicle mislabels it | **No as host; optional annotator later.** |
| New project | Own dependency footprint, own cadence, consumes checkride's contract like plumbbob and volley do, publishable on its own | One more repo to keep green | **Yes.** |

Recommended shape (mirror weft's split, keep it small):

```text
core/     pure: (.check/, git diff --name-only <base>..., fallow json) -> map.json
render/   three.js (react-three-fiber or plain), orthographic overhead default
cli/      <name> --base main   -> writes map.json, serves localhost page
          <name> --base main --png  -> static image for the PR comment
mcp/      later: highlight / explain / reach tools for the agent
```

Working name candidates that keep the aviation lineage: **tower** (the
control tower sees the whole field from above, in real time) or **approach**
(the approach plate is the chart you check before landing, i.e. before
merging). Tower fits "command centre" best.

## First plumbbob plan (a spike, then three small steps)

1. **Spike** (`/pb-spike`): from checkride's own `.check/` plus
   `git diff --name-only main...HEAD` plus fallow, emit `map.json`: modules
   (folder modules, single files, barrel), per-module rollups (LOC, function
   count, thresholds breached, coverage pct, patch coverage, mutation score,
   fan_in/out), edges (import graph), changed set, reach set. Known gap: fallow
   exposes edges only per file (`--trace-file`) and reach per seed
   (`--impact-closure`); no single full-graph dump was found in `--help`, so
   the spike either loops `--trace-file`, or scans imports with the TS
   compiler / `dependency-cruiser --output-type json`.
2. **Static SVG** of the map encodings (d3 pack + bubblesets-js), no
   three.js. Run the glance test on five historical PRs. Tune encodings.
3. **three.js 2.5D** render of the same `map.json`, orthographic overhead,
   relief lighting, open-a-blob interaction. Motion budget enforced in code
   (max three movers).
4. **Delivery**: `--png` for a PR comment; local watch mode borrowed from
   `weft-watch`.

## Open questions for Rob

- Trunk baseline: is the reference always the merge-base with `main`, or the
  committed checkride baseline (`checkride baseline`)? The ratchet already
  knows "what trunk looked like", which may be the cheaper anchor.
- How much git history mining is acceptable locally (co-change ghosts and
  elevation need `git log` over the whole repo; fine for these repos, slow for
  monorepos)?
- Whether the PR comment artifact matters now, or local-first is enough for
  the first version.
