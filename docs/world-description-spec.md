# Spec: a world that describes itself at a glance

Draft 0.2, 2026-11-02. Draft 0.1 was written at range 24's boundary of the build "atis phases 1b
to 5, in waves", from Rob's answers to Q3 (flare-and-jiggle-numbers) and Q69 (motion-direction),
to be picked up by `/plumbbob:plan` as the next build once that one finished. Draft 0.2, written
after that build finished, adds what Rob found setting the world's opened cell beside the first
spike's frames (P37, P25): nuclei inside the bodies (§4.7), an exploded view that spreads the
labels and not the bodies (§4.8), held files gathered at the cell's middle (§4.9), and a shape
demo switch (§4.2). It changes the 2.5D world (`apps/web`, drawn from `libs/scene`) and, where a
new reading needs data, the map (`libs/core`). `SPEC.md` at the repo root stays the product spec; this is a feature spec on top of
it.

## 1. Problem

atis draws a pull request as a living map: each module is a cell with a membrane, each file an
organelle inside it, the cells sit in depth bands below the entry points, and the change's
effects are weather over them. The world is built and reads correctly, but from the bird's eye it
says too little about each file and each module. Rob's reading at range 24's boundary:

- **The motion is too subtle.** Inside an opened cell, a stable file and a loose one barely
  differ, so looseness does not read.
- **Nearly every file is a circle.** The spike's virus shapes are in the code, but they are
  keyed to one narrow signal, so a healthy repository draws almost nothing but circles, and files
  cannot be compared by shape. The frame Rob liked, `a-5-shapes-demo.png`, ran the spike's
  `?shapes=demo`, which gave each file a level by its index; on every fixture four files in five
  break no rule and none reaches level 5 or 6, and the world has no such switch, so the forms
  cannot even be previewed on a real map.
- **A module's membrane is inert.** Nothing on it says whether the module is contained, entered
  through its interface, or leaking: other modules importing straight past its interface into its
  insides.
- **Links are static.** The lines the world draws between cells and layers never move, so they
  carry one reading at most.
- **The weather is thin.** It shows what the change touched and the evidence on it, and little of
  the standing situation around it.
- **The layers are unlabelled.** The depth bands are faint rules with no words, so a new reader
  cannot tell what the layout's vertical order means without the legend.
- **The bodies are hollow.** The first spike drew each file's functions as granules clustered
  inside its body (`a-3-inside.png` and `a-5-shapes-demo.png`), so a large file read as a dense
  nucleus, a small one as a few dots, and the cell as living tissue. The world's slide draws each
  file as a flat disc; its granules appear only one level deeper, on the file plate (D102
  (file-and-diff-levels)). The map already carries every file's functions.
- **Explode throws the bodies, not the labels.** The world's file tags sit in two columns beside
  the slide, as the spike's did (D155 (open-cell-holds)), but they show only on hover or in the
  exploded view, and exploding spreads the bodies to 1.6 times their distance from the cell's
  middle, off the slide. The columns then land on the bodies and stack to the screen's top and
  bottom edges (P25). In the spike the bodies stayed where the layout put them and the labels went
  out on long leaders into the two columns, which reads on a wide monitor.

The goal is that a reviewer looking at the whole map for a few seconds can see which files are
calm and which are troubled, which modules hold together and which leak, and what each layer is,
before they open anything; and that, once a cell is open, they see how much each file holds and
which files belong to the cell's core, with every name readable.

## 2. Solution overview

Nine changes, each with one meaning:

1. **Motion contrast** (answers Q3): the existing drift inside an opened cell grows slightly, and
   its range from a stable file to a loose one grows a lot, inside the readability limits that
   already hold.
2. **Shape spectrum** (answers Q69): every file's outline sits on one continuous spectrum from
   smooth and round to spiky with tendrils, and the spiky end moves more and less regularly. The
   forms are the first spike's (`docs/img/materials-spike/a-5-shapes-demo.png`, and
   `SHAPE_LEVELS` in `libs/scene/src/shape.ts` today), driven by more than rule breaks, so most
   files are no longer plain circles. A page switch cycles an opened cell's files across the
   spectrum, as the spike's `?shapes=demo` did, so the forms can be previewed on any map.
3. **Living membranes** (Q69): a cell's membrane wobbles like a living skin by its module's
   integrity, steady when outsiders enter through its interface and unsettled when imports bleed
   past the interface into its insides.
4. **Oscillating links** (Q69): the lines between cells and layers may oscillate slightly, each
   kind of oscillation saying one thing about the link it moves.
5. **More weather** (Q69): further weather patterns that describe the standing situation of the
   ground, not only the change's own marks.
6. **Layer labels** (Q69): small, quiet labels in the world name what each depth band is.
7. **Nuclei** (P37): each file's functions are drawn as granules clustered inside its body on the
   slide, as the first spike drew them, so a body's density reads as how much the file holds.
8. **Labels explode, not bodies** (P25): the exploded view sends each file's tag out on a leader
   into one of two columns beside the slide and leaves the bodies on the slide, as the spike did.
9. **Held files gather** (Rob's reading of the spike's frame): on the slide, files held by their
   cellmates sit toward the cell's middle and loose files toward the rim, so the cell's nucleus is
   its conformant core and its loose files float round it.

Data flows the way it does today. Core computes any new reading once into `map.json` (C3
(deterministic)); `libs/scene` derives each encoding's numbers from the map for both renderers;
the world animates them through the one scheduler (C12 (motion-budget)); the SVG draws the same
shapes still (C10 (svg-is-still)). Every look is a token in the registry, so the dev panel moves
it live (D156 (dev-panel)) and Rob can tune it in production after the build.

```text
libs/core  ──map.json──▶  libs/scene  ──scene model──▶  apps/web (world, animated)
 new per-file and          shape, wobble,                └▶ libs/svg (still map, same shapes)
 per-cell readings         oscillation, labels
```

## 3. Data the map needs

What the map already carries per file (`Organelle` in `libs/core/src/schema.ts`): `loc`,
`function_count` and `functions` (each function's name, line, line count and the thresholds it
breaks, which the file plate draws today), `dents` (the rules it breaks, which drive today's
seven forms), `churn_ratio`,
`age_days`, `bugfix_rate`, `stability`, `ties` and `package_ties` (its import ties inside and
outside its cell and package, which drive today's drift), `clone_family`, `band` and
`reachable`. Per cell: `interface_size`, `exports`, `fan_in`, `fan_out`, `dents`,
`clone_family`. The map also holds the head's import edges in `weather.wiring` for the change and
the cells' interface files through module identification (`libs/core/src/modules.ts`).

New data, settled:

- **Per-cell integrity.** For each cell, the imports from outside the cell that land on a file
  that is not one of its interface files, and the imports that land on an interface file, counted
  on the head graph between terrain files. Tests and the shore do not count (D4
  (tests-not-terrain)). Stored on `Cell`, absent where it cannot be computed, never defaulted (C2
  (never-fake)).

New data, open (see §9): whatever single per-file reading drives the shape spectrum, if it is
computed in core rather than in `libs/scene` from the fields above.

New data, none: the nuclei (§4.7) read `functions`, the exploded view (§4.8) reads nothing new,
and the gathering (§4.9) reads the looseness `libs/scene/src/drift.ts` already derives from
`ties` and `package_ties`.

Any field added to `map.json` is additive; `meta.schema_version` moves only if a field changes
meaning.

## 4. Behaviour

### 4.1 Motion contrast

- The drift of D157 (organelle-drift) keeps its meaning: a file wanders by its looseness, the
  share of its import ties that leave its cell.
- Its overall size grows slightly: `DRIFT_REACH` and `SHAPE_PULSE` rise from today's values
  (0.15, and the pulse row in `docs/design.md`).
- Its contrast grows much more: looseness maps to wander through a curve rather than a straight
  line, so a file held by its cellmates is nearly still and a wholly loose one moves clearly. The
  curve is a token.
- The readability limit holds: no file moves fast enough that its label cannot be read or its
  motion followed. D165 (cell-float) caps `DRIFT_SPEED` at 0.05 of the screen's shorter side per
  second, and that cap stays unless Rob raises it by eye.

### 4.2 Shape spectrum

- Every terrain file's outline is a point on one continuous spectrum. The smooth end is a round
  body with a soft, regular surface. The spiky end has more, longer, narrower arms with tendrils
  and bulbed tips, and it moves more and less regularly. The forms between are the first spike's
  morphs, interpolated continuously rather than stepped across seven levels.
- The spectrum reads one score per file, in [0, 1], computed from the map alone and deterministic
  (C3 (deterministic)). Which signals make the score is the first open question (§9).
- A file's arms and their lengths stay seeded by its path, so two files at one score still look
  like two files.
- Where the shape animates (inside an opened cell, as today, or at the surface as the first spike
  did) is open (§9). Wherever it animates, the smooth end is still and the spiky end moves most.
- Both legends key the spectrum, as they key the seven forms today.
- A page parameter, `?shapes=demo` as the spike's, gives an opened cell's files levels by their
  index across the whole spectrum, so every form can be seen on any map, and the HUD says the
  shapes are a demo while it is on. The SVG and the PNG never read it.

### 4.3 Living membranes

- A cell's membrane wobbles by its integrity: the share of its outside imports that land past its
  interface (§3). A cell entered only through its interface holds a steady skin. One whose
  insides are imported directly ripples, more as the share grows.
- The wobble is slow and small enough that the membrane's shape, its teeth (step 12) and its
  labels stay readable, and the skin never crosses another cell's (D171 (sibling-cells-apart)).
- A cell with no barrel has an interface made of whatever outsiders import, so by today's rules
  nothing can land past it; what integrity means there is open (§9).

### 4.4 Oscillating links

- A drawn link between cells or layers may oscillate slightly. Each oscillation has one meaning,
  and a link with nothing to say stays still. What the oscillation means, and which links the
  world draws for it, is open (§9).

### 4.5 More weather

- Further weather patterns describe the standing ground around the change. Which patterns are
  open (§9); each must have one meaning and come from data the map carries.

### 4.6 Layer labels

- Each depth band carries a small label naming what it is, so the vertical order reads without
  the legend. The labels are quiet: the same translucent ink as the band rules (D169
  (space-ground)), at the field's edge rather than over cells, and they never collide with a cell,
  a notice or the HUD.
- This amends D168 (labels-on-demand), which keeps every text off the field unless asked. The
  band labels are the one standing text it allows.
- What each label says, and where it sits as the view zooms and tilts, is open (§9).

### 4.7 Nuclei

- On the slide, each file's functions are granules clustered inside its body: one per function
  the head scan read, laid by phyllotaxis from the body's middle outward, inside the core that
  the arms never cross (`core` in `libs/scene/src/shape.ts`), so a nucleus never meets the
  outline however the shape moves.
- Each granule is sized by the lines its function spans and dented by the thresholds it breaks,
  as the file plate draws them today (D102 (file-and-diff-levels)), scaled so a file's granules
  fill its core by the file's share of the cell's lines and never spill it. A file with many
  functions reads dense, one with few reads as a few dots, and one the scan read no functions in
  has no nucleus (C2 (never-fake)); a nucleus is never invented from `function_count` alone.
- The granules take the body's stain, darker (hue is state, C11 (one-meaning-per-channel)): the
  body's ink, or the change hue on a changed file, and the unstained share of a body, its changed
  lines no test ran, leaves its granules unstained too.
- A nucleus moves with its body in the float and keeps still inside it: granules never pulse or
  turn, so a turning shape reads as a skin moving over a fixed interior.
- The still SVG draws the same nuclei wherever it draws an opened cell, and keys a nucleus in its
  legend (C10 (svg-is-still)). Whether a nucleus also shows through the body at the surface, as
  the spike's second variant glowed it (`b-2-surface.png`), is open (§9).

### 4.8 Labels explode, not bodies

- The exploded view (D155 (open-cell-holds)) spreads the labels, not the bodies. Each body stays
  where the float has it, inside its membrane (D165 (cell-float)), and its tag goes out along a
  dotted leader to one of two columns, left and right of the slide, by which side of the slide's
  middle the body stands on, as the spike's `chrome.ts` did and `tagsOf` in
  `libs/scene/src/interior.ts` does today.
- The columns stand just outside the slide and are pulled in only when the slide runs off the
  screen; their rows follow the bodies' order down the screen and never overlap; each tag
  carries its rule count; and the leaders are drawn long, in the technical drawing's manner.
- The columns stay on the screen whatever the tilt and zoom. A column with more tags than it has
  rows for keeps its order and its spacing down to the smallest readable row; what it does past
  that is open (§9).
- `explodeSpread` and `explodePush` in `INTERIOR_LAYOUT` go, with the sockets and spread leaders
  of the old view, unless the plan keeps a small spread that holds every body on the slide.
- This keeps D168 (labels-on-demand): the tags appear with the exploded view and on hover, as
  now, and stay the last thing anything covers (D185 (asked-words-on-top)).

### 4.9 Held files gather

- On the slide, files held by their cellmates sit toward the cell's middle and loose files toward
  the rim: each body's place at rest is the layout's, pulled inward by the share of its import
  ties that stay in the cell, so the cell reads as a nucleus of conformant files with its loose
  files floating round it, and the drift of §4.1 moves those loose files most.
- The gathering is the slide's, not the terrain's: `libs/scene` computes it when a cell opens, as
  it computes the exploded view, so the layout in `map.json`, the surface and the still SVG are
  unchanged and every golden holds. Whether the terrain's own layout should gather too is open
  (§9).
- No body leaves its membrane or overlaps another (D165 (cell-float)); the gathering keeps the
  clear ground the exploded view keeps today.
- The gathering spends position on the reading the drift spends motion on, looseness. The plan
  names that under C11 (one-meaning-per-channel): one reading, read two ways on the slide.

## 5. Constraints

**Rules that hold unchanged:**

- C3 (deterministic): one seed and one time give one frame; every new reading is computed from the
  map, sorted, and seeded.
- C10 (svg-is-still): the SVG draws the shapes and membranes at rest, never animated.
- C12 (motion-budget): every motion runs through the one scheduler in `libs/scene/src/motion.ts`;
  at most one flare in flight; transients 600 ms or less, cross-fades 300 ms or less.
  `prefers-reduced-motion` stills every motion this spec adds.
- C14 (world-budget): 60 fps at 5,000 files and a first frame about 2 s after the map arrives;
  30 fps at 20,000 files with composites. New per-frame work (surface shape motion, membrane
  wobble) is measured by `apps/web/scripts/budget.ts` against it.
- D165 (cell-float): no body leaves its membrane, jumps, or moves faster than the cap. The
  exploded view keeps it too, once §4.8 lands.
- D166 (legibility-first): every change is judged on a map Rob knows (atis or checkride), one step
  at a time.
- Every look is a token in the registry, moved live by the dev panel (D156 (dev-panel)), and each
  token's value and limits are logged in `docs/design.md`. A look that cannot be a token is named
  as baked.
- No new runtime dependency unless it earns its place (C9 (deps-earn-their-place)).

**Rules this spec amends, to be decided at the plan:**

- C11 (one-meaning-per-channel) gives each channel one meaning: shape is conformance, and motion
  is urgency at the surface and, inside an opened cell, conformance and looseness. The shape
  spectrum, the membrane wobble and the oscillating links each give a channel a new or wider
  meaning, and the plan rewrites C11 to say exactly which. The nuclei add density as a channel,
  meaning a file's functions (§4.7), and the gathering spends position on looseness as the drift
  spends motion (§4.9).
- D146 (morph-shapes) and D147 (alive-motion) key the shapes to rule breaks and animate them only
  inside an opened cell; the spectrum replaces or widens both.
- D168 (labels-on-demand) gains the band labels as its one standing text.
- D155 (open-cell-holds) gave the exploded view bodies that spread; §4.8 makes it labels that
  spread, and the bodies stay.
- D102 (file-and-diff-levels) draws a file's granules on its plate; §4.7 draws them inside the
  body on the slide as well, and the plate keeps its own.

**Out of scope:**

- Any change to how the scan, the producers or the evidence read a repository.
- New colours or a new hue meaning; hue stays state (C11).
- Sound, haptics, or any output beyond the world, the SVG and the PNG.
- Retuning the precision corpus or re-running a blind glance reading inside this build; a
  reading can follow it.

## 6. Failure modes

| Scenario | Expected behaviour | Test |
| --- | --- | --- |
| A map with every file at score 0 (a tiny healthy repo) | every file is round and still; nothing is invented to fill the spectrum | a scene test over a hand-built map with no signals asserts every outline is the smooth form and no shape motion is scheduled |
| A map with no history window, so churn and age are absent | the score uses only the signals present and says which it lacked; it never defaults a missing signal to calm (C2) | a scene test with `churn_ratio` absent asserts the score's inputs name what was missing |
| 5,000 files with every shape animating at the surface | the world holds C14's 60 fps, shedding shape motion past a level of detail if it must, never dropping frames | `apps/web/scripts/budget.ts` on its seeded 5,000-file map |
| Reduced motion | every new motion is still; shapes, membranes and links draw at rest | the existing reduced-motion test extended to the new movers |
| A cell with no barrel | integrity is reported as not applicable, the membrane holds still, and the legend says so | a core test over a barrel-less directory cell |
| A band label meets a cell or a notice at a tilt or zoom | the label yields: it hides or moves, never overlaps | a label-placement test at the zoom and tilt extremes |
| The same map and seed rendered twice | byte-identical SVG and PNG, the same scene model | the existing determinism tests, extended |
| A file the head scan read no functions in | no nucleus; none is invented from `function_count` (C2) | a scene test over a file with `function_count` set and `functions` absent asserts no granules |
| A file of hundreds of functions | the granules shrink to fill the core and never spill it; past a token cap the rest are counted, not drawn | a scene test with 400 functions asserts every granule inside the core at every motion time, and the count the body carries |
| A cell of 80 files, exploded on a 1440 by 900 screen | every body stays on the slide; no two tags overlap; both columns stay on the screen | a scene test over a synthetic 80-file cell |
| A tilt or zoom while exploded | tags hold their columns and order; leaders follow the bodies | the label-placement test at the tilt and zoom extremes, extended to the tags |
| Every file of a cell at one looseness | the bodies keep the layout's places; no gathering is invented from a flat signal | a scene test over a hand-built cell |
| `?shapes=demo` set when `--png` or the SVG renders | neither reads it; the stills keep the files' real levels | the determinism tests run with the parameter on the page |

## 7. Success criteria

**Automated:**

- `libs/scene` tests: the shape spectrum is continuous (two scores 0.01 apart give outlines that
  differ by less than a token-set tolerance), monotone (a higher score never gives fewer or
  shorter arms), and seeded by path (C3).
- `libs/core` tests: per-cell integrity from scans built by hand, a barrelled cell imported past
  its barrel among them, a barrel-less cell, and tests and shore excluded.
- Motion tests on the scheduler's injected clock: a wholly held file's wander stays under a small
  token bound, a wholly loose one's reaches the full reach, and no file exceeds the speed cap.
- Every golden that does not read a new field is unchanged; any that moves is named with why.
- Nuclei: a body carries one granule per function the scan read, every granule lies inside the
  core at every motion time, granule size is monotone in line count, and the same file gives the
  same nucleus on every render (C3).
- The exploded view: every body lies inside its membrane, no two tag boxes overlap, each column's
  order is its bodies' order down the screen, and both columns lie on the screen.
- The gathering: of two files at one rest distance from the middle, the one with more of its ties
  in the cell sits nearer the middle, and no two bodies overlap.

**In the world, judged by Rob on a map he knows (D166 (legibility-first)):**

- From the bird's eye, a troubled file is told from a calm one by its shape alone, and two files
  are compared by shape without opening anything.
- In an opened cell, a stable file and a loose one are told apart at a glance, and every label
  stays readable while files move.
- A module entered through its interface and one whose insides are imported are told apart by
  their membranes.
- A first-time reader names what the depth bands mean from their labels, without the legend.
- On the slide, a large file is told from a small one by its nucleus, and a changed file's
  unstained share reads on its granules as on its body.
- In the exploded view on a 16:9 screen, every file name is readable in the two columns, and each
  leader is followed to its body without the body having moved.
- A cell's held core and its loose files are told apart by where they sit, before any motion, and
  the world's opened cell set beside `a-5-shapes-demo.png` reads as the same kind of thing (P37).

## 8. Files likely touched

```text
libs/core/src/schema.ts        Cell gains integrity; any per-file score if core computes it
libs/core/src/modules.ts       which files are a cell's interface (already computed)
libs/core/src/map.ts           assemble the new readings
libs/scene/src/shape.ts        the continuous spectrum, replacing the seven stepped forms, and the demo levels
libs/scene/src/interior.ts     nuclei on the bodies, the exploded view's tags and leaders, the gathering
apps/web/src/world/interior.ts drawing the granules, and the exploded view's tags and leaders
apps/web/src/view.ts           the shape demo parameter
libs/scene/src/drift.ts        the looseness curve
libs/scene/src/membranes.ts    the wobble by integrity
libs/scene/src/motion.ts       scheduling the new movers
libs/scene/src/labels.ts       band labels
libs/scene/src/tokens.ts       every new token
apps/web/src/                  drawing the new movers and labels
libs/svg/src/                  the still shapes, membranes, nuclei and legend key
docs/design.md                 the token tables and the motion log
```

## 9. Open questions

Each is a call for `/plumbbob:plan`, with what is known so far.

1. **What drives the shape spectrum?** Today it is `dents` alone: fallow's four thresholds, a
   boundary violation and a cycle. Candidates already in the map: churn, bugfix rate, age,
   stability, looseness, size, function count, clone family. One composite score, or a primary
   signal with the others shading it? Looseness already drives the drift, so using it for shape
   too would spend two channels on one reading.
2. **Does the shape animate at the surface?** The first spike animated shapes at the surface; the
   built world animates them only in an opened cell (D147 (alive-motion)). At the surface it costs
   frame budget at 5,000 files and competes with the surface's urgency motion (flares).
3. **What is integrity for a cell with no barrel?** Its interface is whatever outsiders import,
   so nothing lands past it. Options: not applicable and still; or a different reading, such as
   how many of its files outsiders reach.
4. **What does an oscillating link mean, and which links?** The world draws exceptional edges,
   reach crossings and, in an opened cell, the wiring overlay. Candidates: a link that runs
   against the depth order, a deep import past an interface, an edge the change added, a cycle.
5. **Which new weather patterns?** None is chosen yet. Each needs one meaning and data the map
   carries.
6. **What do the band labels say, and where do they sit?** The band's depth range, a word for
   what lives there (entry, surface, core, deep), or both; pinned to the field's left edge or
   following the camera; shown at every level of detail or only at the surface.
7. **How much is "slightly more exaggerated"?** The tokens' new defaults are set by eye in the
   world; the spec fixes only the direction and the readability cap.
8. **Does a nucleus show at the surface?** The spike's second variant glowed every unchanged
   file's nucleus through its body. At the surface the bodies are small and there are 5,000 of
   them under C14, so it may cost a draw call per file or need the granules baked into the
   organelles' instances.
9. **What does a column do past its rows?** A cell of 80 files has more tags than a 900-pixel
   column holds at a readable row. Options: shrink the row to a floor and then page the column by
   the pointer's height; group the tags by folder with a count; show only the tags of the bodies
   nearest the view's centre and the rest on hover.
10. **Should the terrain's layout gather too?** §4.9 gathers only on the slide. Gathering the
    terrain's layout would give position one meaning at every level, but moves every golden and
    the still map, and changes the surface Rob has judged.
11. **Do granules show their dents at the slide's scale?** On the file plate a granule is dented
    by the thresholds its function breaks. Inside a body a granule may be a few pixels across, so
    the dent may be invisible or may need a mark of its own.
