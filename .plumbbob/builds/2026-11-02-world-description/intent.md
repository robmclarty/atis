# a world that describes itself at a glance

**Phase:** framed, awaiting approval
**Size:** medium (18 steps in five ranges, each stopping where Rob judges the world on a map he knows)
**Scope:** world

*Source: `docs/world-description-spec.md` (draft 0.2, 2026-11-02), preserved verbatim under [Source](#source). The spec answers the last build's Q3 (flare-and-jiggle-numbers) and Q69 (motion-direction) and its parks P25 (tags slide under the chrome) and P37 (spike's cell look preferred), all in `.plumbbob/builds/2026-10-08-phases-1b-to-5/`. That build's decisions and constraints this plan leans on are carried below under their own numbers and slugs, so each means the same thing in both files; the new ones start at D191, C15 and Q81.*

## Frame

- **Problem:** atis draws a pull request as a living map, and the map reads correctly, but from the bird's eye it says too little about each file and each module. Rob's reading at the last build's range 24 boundary, and after setting the world's opened cell beside the spike's frames (P37, P25): inside an opened cell a stable file and a loose one barely differ, so looseness does not read; nearly every file is a circle, because the seven forms key to rule breaks alone and on every fixture four files in five break none, so files cannot be compared by shape and the forms cannot even be previewed on a real map; a membrane says nothing of whether its module is entered through its interface or leaked into past it; the lines the world draws never move; the depth bands are faint rules with no words; the bodies on the slide are flat discs where the spike drew each file's functions as a dense nucleus; and the exploded view throws the bodies off the slide and stacks the tags to the screen's edges where the spike sent the labels out on long leaders and left the bodies alone.
- **Smallest thing that solves it:** the spec's nine changes, each with one meaning and one source the map already carries, plus the one field core must add: motion contrast through a looseness curve, a continuous shape spectrum with a demo switch, membranes that ripple by their module's integrity, links that sway when they bypass an interface, more weather (none, pending [Q85 (new-weather)](#q85)), quiet band labels, nuclei of functions inside the bodies, an exploded view that sends the tags out and leaves the bodies in place, and held files gathered toward the cell's middle. Core computes integrity once into `map.json`; `libs/scene` derives every encoding for both renderers; the world animates them through the one scheduler; the SVG draws the same shapes still. Five ranges, each ending where Rob judges what landed on atis's own map ([D166 (legibility-first)](#d166)).
- **Done looks like:** every step checkpointed on a green `pnpm check --strict`, and the spec's §7 criteria held three ways. Automated: the spectrum is continuous, monotone and seeded (step 3); integrity is counted on hand-built scans with a barrel bypassed, a barrel-less cell and tests excluded (step 1); a held file's wander stays under its bound and a loose one reaches the full reach on the injected clock, under the speed cap (step 6); every granule lies inside its core at every motion time (step 8); in the exploded view every body stays inside its membrane, no two tags overlap, and both columns lie on the screen (steps 9 and 10); of two files at one distance the better-held rests nearer the middle (step 7); every golden that reads no new field is unchanged and every one that moves is named ([C16 (goldens-named)](#c16)). Measured: step 18's budget row holds [C14 (world-budget)](#c14) with the membranes and the ribbons moving. Judged: at each range's stop Rob's reading of §7's in-world criteria is recorded in the build log, and the values [Q87 (exaggeration-numbers)](#q87) settles by eye are logged in `docs/design.md` (step 17).
- **Explicitly NOT doing:** any change to how the scan, the producers or the evidence read a repository; new colours or a new hue meaning, since hue stays state ([C11 (one-meaning-per-channel)](#c11)); sound, haptics, or any output beyond the world, the SVG and the PNG; retuning the precision corpus or a blind glance reading inside this build (one may follow it); shape motion at the surface, nuclei at the surface and a gathered terrain layout, unless [Q82 (surface-shape-motion)](#q82), [Q88 (surface-nuclei)](#q88) or [Q90 (terrain-gather)](#q90) is answered against its lean; a new weather pattern unless [Q85 (new-weather)](#q85) names one; a new runtime dependency ([C9 (deps-earn-their-place)](#c9)); publishing.

## Architecture sketch

```
libs/core  ──map.json──▶  libs/scene  ──scene model──▶  apps/web (the world, animated by the one scheduler)
 Cell.integrity            trouble.ts   a file's score on the spectrum       └▶ libs/svg (the still map: spectrum forms,
 { through, past }         shape.ts     the spectrum's outline (both renderers)   membranes and legend key at rest; no slide)
 (D192, step 1)            motion.ts    shape by score with jitter; the drift's curve
                           drift.ts     looseness curve; each slide file's gathered rest
                           interior.ts  nuclei inside the bodies; tags out on leaders, bodies in place
                           membranes.ts a wobble grid beside the tissue, by integrity
                           weather.ts   which ribbons sway (past an interface)
                           labels.ts    a quiet label per band rule
                           tokens.ts    every new token ──▶ registry (dev panel) ──▶ docs/design.md rows and bounds
```

Data flows the way it does today: core computes any new reading once ([C3 (deterministic)](#c3)), the scene derives each encoding's numbers from the map, the world animates them through the scheduler ([C12 (motion-budget)](#c12)) and the SVG draws the same shapes still ([C10 (svg-is-still)](#c10)). Every look is a token the dev panel moves live ([D156 (dev-panel)](#d156), [C15 (every-look-a-token)](#c15)), so Rob tunes it in production after the build.

## Decisions

Carried from the last build, under their own numbers and slugs, compressed to what this build leans on; the originals stand in `.plumbbob/builds/2026-10-08-phases-1b-to-5/intent.md`:

- <a id="d4"></a>**D4 (tests-not-terrain)**: test files are evidence, never cells or depth entry points, and an edge to one ties and counts nothing, *because* they would flatten depth.
- <a id="d51"></a>**D51 (motion-tokens-shared)**: the motion tokens live in `libs/scene/src/tokens.ts` beside the colours and are logged in `docs/design.md`'s motion table, *because* the still and the moving renderer read one file.
- <a id="d86"></a>**D86 (svg-stays-the-fixture)**: every encoding lands in both renderers, the SVG still, *because* the SVG is the glance test's fixture format.
- <a id="d94"></a>**D94 (seeded-motion)**: the scheduler reads an injected clock and a seeded source of chance, *because* one seed and one time give one frame ([C3 (deterministic)](#c3)).
- <a id="d102"></a>**D102 (file-and-diff-levels)**: LOD3 opens one file onto a plate of its functions as granules, each sized by its lines and dented by the thresholds it breaks; amended by [D197 (nuclei)](#d197), which draws the same granules inside the body on the slide, the plate keeping its own.
- <a id="d146"></a>**D146 (morph-shapes)**: a file's outline took one of seven forms by the rules it breaks, drawn by one function for both renderers; replaced by [D194 (shape-spectrum)](#d194), which keeps the seven forms as the spectrum's samples.
- <a id="d147"></a>**D147 (alive-motion)**: the spike's motion is the world's baseline, and inside an opened cell each shape moved by its rule count; widened by [D194 (shape-spectrum)](#d194), which moves it by its score.
- <a id="d155"></a>**D155 (open-cell-holds)**: an opened cell stays open while the reviewer moves inside it, its file tags in two columns kept on the screen; amended by [D198 (labels-explode)](#d198).
- <a id="d156"></a>**D156 (dev-panel)**: every world material and the scheduler read their tokens through one registry the dev panel writes, so a change shows on the next frame.
- <a id="d157"></a>**D157 (organelle-drift)**: inside an opened cell each file drifts by its looseness, the share of its import ties that leave its cell on the head graph between terrain files; amended by [D193 (looseness-curve)](#d193), which curves the mapping, and [D199 (held-files-gather)](#d199), which moves the rest it drifts about.
- <a id="d159"></a>**D159 (shared-teeth)**: a cell's membrane wears one tooth per rule its files break, in both renderers.
- <a id="d162"></a>**D162 (exports-on-membrane)**: the barrel's exports are written on the slide's membrane, a few to a line and the rest counted.
- <a id="d165"></a>**D165 (cell-float)**: no body leaves its membrane or jumps, and the float moves a body at most `DRIFT_SPEED` of the screen's shorter side a second, capped at 0.05; the surface draws a closed cell's files where they last floated and eases them home as the view climbs.
- <a id="d166"></a>**D166 (legibility-first)**: every change to the world is judged on a map Rob knows (atis or checkride), one step at a time, before anything builds on it.
- <a id="d167"></a>**D167 (package-slide)**: an opened package floats the file of each single-file cell it holds on its own slide, beside its own files, by its `package_ties`.
- <a id="d168"></a>**D168 (labels-on-demand)**: the world writes no text over the field unasked; an opened cell's tags show in its exploded view or one at a time under the pointer; amended by [D196 (band-labels)](#d196), its one standing text.
- <a id="d169"></a>**D169 (space-ground)**: the field is space, near-black with faint stars, and each band's boundary is a 1px translucent rule over the canvas.
- <a id="d171"></a>**D171 (sibling-cells-apart)**: no two sibling skins cross or nest, and no file's centre lies under a skin it is not in.
- <a id="d181"></a>**D181 (symbol-reach-still)**: symbol reach shows in the world, lit on the opened cell's membrane, not in the still map.
- <a id="d185"></a>**D185 (asked-words-on-top)**: an opened cell's words, its tags and exports, draw over every other layer the world lays over the canvas.

Settled at this plan (2026-11-02):

- <a id="d191"></a>**D191 (nine-changes)**: this build is the spec's nine changes (§2) and the one field they need, no more; a new weather pattern joins only if [Q85 (new-weather)](#q85) names one, *because* each change has one meaning and Rob judges them one range at a time ([D166 (legibility-first)](#d166)), so a tenth would wait on its own reading.
- <a id="d192"></a>**D192 (cell-integrity)**: `Cell` gains an optional `integrity: { through, past }`, counted on the head graph between terrain files for every cell with a barrel (a package or a folder): an import from a file outside the cell's contour onto its barrel counts `through`, onto any other file inside the contour counts `past`; tests, the shore, self-imports and duplicate edges count nothing ([D4 (tests-not-terrain)](#d4)); a directory cell, a single-file cell and a deleted cell carry no key ([C2 (never-fake)](#c2)), *because* a directory's interface is whatever outsiders import and a single file is its own, so `past` would be 0 there by construction, a containment nothing measured (answers [Q83 (barrel-less-integrity)](#q83)).
- <a id="d193"></a>**D193 (looseness-curve)**: a slide file's mobility is `looseness ^ DRIFT_CURVE` in place of its looseness, `DRIFT_REACH` rises, and `DRIFT_SPEED` keeps [D165 (cell-float)](#d165)'s cap, *because* a bigger reach alone moves the held hub with the loose file, and Rob asked for a stable file that barely moves beside a loose one that clearly does, never so fast a label cannot be read (the last build's Q3, answered 2026-11-01).
- <a id="d194"></a>**D194 (shape-spectrum)**: every terrain file's outline is a point on one continuous spectrum, read from a trouble score in [0, 1] ([Q81 (spectrum-signals)](#q81)): `outlineOf` takes the score, interpolates the seven forms of `SHAPE_LEVELS` between the two either side of `score × MAX_RULES` and cross-fades their arms, the arms' phase and lengths still seeded by the path; inside an opened cell the shape's pulse and turn interpolate the same way and a jitter grows with the score, so the spiky end moves most and least regularly, while the smooth end is still; the surface draws the forms at rest ([Q82 (surface-shape-motion)](#q82)); both legends key seven samples along the spectrum; the SVG draws it still ([C10 (svg-is-still)](#c10)), *because* Rob judged the spike's spectrum (`docs/img/materials-spike/a-5-shapes-demo.png`) the look he was after and wants files compared by shape before anything is opened, and the seven stepped forms left four files in five as plain circles (the last build's Q69, answered 2026-11-01).
- <a id="d195"></a>**D195 (living-membranes)**: a cell's membrane line ripples by the share of its outside imports that land past its barrel, `MEMBRANE_WOBBLE × past / (through + past)` in layout units, slowly at `MEMBRANE_WOBBLE_HZ`; the scene lays each cell's amplitude into a `wobble` grid beside the tissue's body and membrane grids, and the skin's shader displaces where it samples its membrane line by that amplitude on a slow seeded sine, so the teeth and the width hold; `MEMBRANE_WOBBLE` is bounded under half the layout's sibling gap and under `MEMBRANE_DENT_PULL`, so a rippling skin never reaches a sibling's ([D171 (sibling-cells-apart)](#d171)); a cell with no `integrity` holds still, *because* the membrane line is laid into a grid once when the world is built, and re-laying it every frame would break [C14 (world-budget)](#c14), while a sampled displacement costs one uniform a frame.
- <a id="d196"></a>**D196 (band-labels)**: each depth band carries a small standing label naming its depth, the one text [D168 (labels-on-demand)](#d168) allows unasked: set in the rules' own translucent ink just under each band's rule at the viewport's left edge, per row where the lanes wrap, shown from LOD1, and dropped wherever it would overlap a placed label, a notice mark, the HUD or a cell's skin ([Q86 (band-label-words)](#q86)), *because* a first-time reader cannot tell what the layout's vertical order means without the legend, and a label that yields never covers what it describes.
- <a id="d197"></a>**D197 (nuclei)**: on the slide each file's functions are granules clustered inside its body, one per entry of `functions`, laid by phyllotaxis from the body's middle outward inside the core the arms never cross, each sized by its `line_count` and dented by its `breaches` through the same `outlineOf` the plate uses ([Q91 (granule-dents)](#q91)), the set scaled so the largest file on the slide fills `NUCLEUS_FILL` of its core and every other file in proportion to its lines ([Q92 (nucleus-fill)](#q92)), shrinking before it spills; past `NUCLEUS_MOST` granules the largest are drawn and the rest counted on the body's tag; the granules take the body's stain, darker, and its unstained share; they move with the body and never pulse or turn; a file whose `functions` are absent has no nucleus, never one made from `function_count` ([C2 (never-fake)](#c2)), *because* the spike's dense nuclei read as how much a file holds and made the cell living tissue (P37), and the map already carries every function ([D102 (file-and-diff-levels)](#d102)).
- <a id="d198"></a>**D198 (labels-explode)**: the exploded view spreads the tags, not the bodies: every body stays where the float has it inside its membrane ([D165 (cell-float)](#d165)), and each tag goes out on a long elbowed leader to one of two columns just outside the slide, pulled onto the screen only when the slide runs off it and then clear of the chrome's claims, the HUD, the legend, the minimap and the rail (P25); `explodeSpread` and `explodePush` go, with the sockets and spread leaders; a column past its rows shrinks them to a floor and then shows the nearest bodies' tags with a footer counting the rest ([Q89 (column-overflow)](#q89)); the tags still appear only in the exploded view or under the pointer ([D168 (labels-on-demand)](#d168), [D185 (asked-words-on-top)](#d185)), *because* thrown bodies landed the columns on them and stacked the tags to the screen's edges (P25), while the spike's bodies stayed where the layout put them and their labels read on a wide monitor.
- <a id="d199"></a>**D199 (held-files-gather)**: on the slide each file's rest is the layout's position moved along the line to the slide's centre by `INTERIOR.gather × (held − the slide's mean held) × its distance`, held being `1 − looseness`, inward when the file is held more than its cellmates and outward when less, then pushed apart and kept inside the membrane and off the held cells' skins, so a cell reads as a nucleus of conformant files with its loose files round the rim; the float wanders about this rest and eases home to the layout's position as the cell closes; the layout in `map.json`, the surface and the still SVG are unchanged ([Q90 (terrain-gather)](#q90)), *because* a cell whose files share one looseness must keep the layout's places (a flat signal invents no gathering), and position may carry the reading drift already moves by where [C11 (one-meaning-per-channel)](#c11) names it.
- <a id="d200"></a>**D200 (one-meaning-per-mover)**: [C11 (one-meaning-per-channel)](#c11) is rewritten below: shape means trouble (conformance shaded by history, one spectrum), density means a file's functions, position inside an opened cell means looseness, and motion means one thing per mover (a notice's light, a file's shape, a file's place, a membrane's line, a ribbon), *because* the spectrum, the ripple and the sway each widen a channel, and the spec asks the plan to say exactly which.
- <a id="d201"></a>**D201 (slide-only-svg)**: the still SVG draws no opened cell (`cellSlide` and `interiorOf` are the world's alone), so the nuclei and the gathering never reach it and its legend keys no nucleus; both reach the still only if a later decision shows nuclei at the surface ([Q88 (surface-nuclei)](#q88)), *because* a legend key for a mark the sheet never draws misleads, and §4.7's "wherever it draws an opened cell" binds nothing today.
- <a id="d202"></a>**D202 (demo-switch)**: `?shapes=demo` gives an opened cell's files scores by their index in path order across the whole spectrum, in place of their trouble, the surface unchanged; the status line says `shapes: demo` while it is on; `--png`'s capture URL and the SVG never carry it, *because* every form must be previewable on any map, as the spike's switch allowed, and a still must never carry a demo.

## Constraints

- <a id="c1"></a>**C1 (libs-are-pure)**: `libs/*` import no Node, no DOM, no three, and no clock or random source they were not handed; the `struct` slot's `lib-is-pure` rule holds (tests under `__tests__/` may read fixtures).
- <a id="c2"></a>**C2 (never-fake)**: a missing source mutes its channel (an absent key, a still membrane, a round and still file, a nucleus not drawn), never a default number.
- <a id="c3"></a>**C3 (deterministic)**: the same inputs give a byte-identical `map.json` (except `meta.generated_at`), SVG and scene model, and one seed and one time give one frame of the world; every list is sorted, every tie broken by path, every random source seeded, and every new reading computed from the map alone.
- <a id="c9"></a>**C9 (deps-earn-their-place)**: this build adds no runtime dependency.
- <a id="c10"></a>**C10 (svg-is-still)**: the SVG contains no `<animate>`, SMIL, `<script>` or CSS animation; it draws the spectrum's forms and the membranes at rest.
- <a id="c11"></a>**C11 (one-meaning-per-channel)**, rewritten by [D200 (one-meaning-per-mover)](#d200): hue means state, luminance evidence and reach, texture history, size mass, repetition duplication, relief the three elevation scales, shape trouble (conformance shaded by history, one spectrum, [D194 (shape-spectrum)](#d194)), density a file's functions (a nucleus's granules, [D197 (nuclei)](#d197)), and position inside an opened cell looseness ([D199 (held-files-gather)](#d199)); motion means one thing per mover: a notice's light its urgency, a file's shape its trouble, a file's place its looseness ([D157 (organelle-drift)](#d157)), a membrane's line its cell's integrity ([D195 (living-membranes)](#d195)), and a ribbon that its link enters a module past its interface ([Q84 (oscillating-links)](#q84)). No channel carries two meanings in one view (P3); one reading shows on two channels only where a decision names it (looseness on drift and rest, history on texture and shape); and the category letters always accompany the category hue.
- <a id="c12"></a>**C12 (motion-budget)**: nothing animates outside the one scheduler in `libs/scene/src/motion.ts`, and each motion means something about what it moves; at most one flare is in flight, transients last 600 ms or less and cross-fades 300 ms or less; `prefers-reduced-motion` stills every mover this build adds: the spectrum's motion, the ripple, the sway and the float.
- <a id="c14"></a>**C14 (world-budget)**: 60 fps at 5,000 files on an M-series laptop, a first frame about 2 s after the map's arrival, and 30 fps at 20,000 files with composites, each measured by `apps/web/scripts/budget.ts`, never assumed; new per-frame work (the ripple, the sway) is measured against it at step 18.
- <a id="c15"></a>**C15 (every-look-a-token)**: every look and every motion value this build adds is a token read through the registry ([D156 (dev-panel)](#d156)), with a row in `docs/design.md` and, for a motion token, a bound in `tokens.test.ts`; a look that cannot be a token is named as baked in its step's commit body.
- <a id="c16"></a>**C16 (goldens-named)**: every golden that reads no new field is unchanged; one that moves is regenerated in the step that moves it, and the step's commit body names it and why.

## Steps

1. [x] feat(core): count a cell's imports through and past its interface
   - proof: per [D192 (cell-integrity)](#d192): `Cell` gains the optional `integrity: { through, past }`, `assertMap` validates it as two whole counts, and `computeIntegrity` beside `ties.ts` counts it on the head graph for every cell with a barrel, every file inside the cell's contour being inside (a nested cell's files included, as `fansOf` reads them), and no key for a directory cell, a single-file cell or a deleted cell. Tests over hand-built scans cover: a folder cell imported through its barrel from a sibling folder (`through` 1, `past` 0) and past it (`past` 1); a package whose nested folder's barrel is imported from another package (`past` 1 for the package, `through` 1 for the folder); a barrel-less directory and a single-file cell (no key); a test file importing past a barrel (nothing); the same edge twice (counted once). Any committed map golden a test compares against regenerates for the added key, named in the commit body ([C16 (goldens-named)](#c16)); no SVG golden moves; the commit body lists the cells of atis's own map whose `past` is above 0 ([Q94 (range-3-map)](#q94))
   - seam: `libs/core/src/schema.ts`, `libs/core/src/integrity.ts`, `libs/core/src/map.ts`, `libs/core/src/index.ts`, `libs/core/src/__tests__/integrity.test.ts`, `libs/core/src/__tests__/schema.test.ts`, `libs/core/src/__tests__/map.test.ts`, `libs/core/fixtures/demo/`
   - model: sonnet (a count fully specified by its decision, beside `ties.ts`)
2. [x] feat(scene): score each file's trouble on one spectrum from the map
   - proof: per [Q81 (spectrum-signals)](#q81)'s answer: `troubleOf(organelle)` in a new `libs/scene/src/trouble.ts` gives `{ score, used, missing }`, the score in [0, 1]: with `from(0) = 0`, `from(1) = TROUBLE_RULES_FROM` (0.4) and `from` climbing evenly to 1 at `MAX_RULES + 1`, `score = from(rules) + (from(rules + 1) − from(rules)) × history`, where `rules` is `rulesOf(dents)` and `history` the greater of `churn_ratio / CHURN_FULL_AT` and `bugfix_rate / BUGFIX_FULL_AT`, each clamped to 1 and 0 where both are absent; `missing` names each signal the organelle lacks and `used` each it read; `from` is exported as `troubleFrom(rules)` for the granules ([Q97 (granule-scale)](#q97)). Tests: a hand-built map with every signal at 0 scores every file 0; an absent `churn_ratio` is listed under `missing` and never lowers a score `bugfix_rate` gives; the score is monotone in each input and continuous across each rule boundary; the same organelle scores the same on every call ([C3 (deterministic)](#c3)); `TROUBLE_RULES_FROM` has a row in `docs/design.md`
   - seam: `libs/scene/src/trouble.ts`, `libs/scene/src/tokens.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/trouble.test.ts`, `docs/design.md`
   - model: opus (the composite's shape is judgment; the tests do the thinking)
3. [x] feat(scene): draw every file's outline on a continuous spectrum
   - proof: per [D194 (shape-spectrum)](#d194): `outlineOf(id, at, score, motion)` takes a score in [0, 1] in place of a rule count; `reach`, `sharp`, `wobble`, `bulb` and `samples` interpolate linearly between the two `SHAPE_LEVELS` forms either side of `score × MAX_RULES`, the arms cross-fade (the lower form's radial profile fading out as the upper's fades in by the level's fraction), the bulbs follow the upper form's arms at the fraction's strength, and the arms' phase and lengths stay seeded by the path. Every caller passes a score: the SVG's terrain and both legends, the world's surface organelles, hover and slide (each through `troubleOf`), and the file plate's granules (`troubleFrom(breaches.length)`, [Q97 (granule-scale)](#q97)). Both legends' shape key becomes seven samples along the spectrum at 0, 1/6 … 1 under `SHAPE_KEY_WORDS` reading `shape: trouble, smooth to spiky`. Tests: two scores 0.01 apart give rings whose matching points differ by less than a hundredth of the radius; a higher score never gives a smaller greatest radius; score 0 is a circle; each integer level's ring matches today's form within rounding; the same id and score give the same ring ([C3 (deterministic)](#c3)). The SVG goldens under `fixtures/` and `libs/svg/` regenerate, since every file with history now has a form, and the commit body names that as the why ([C16 (goldens-named)](#c16))
   - seam: `libs/scene/src/shape.ts`, `libs/scene/src/file.ts`, `libs/scene/src/interior.ts`, `libs/scene/src/__tests__/shape.test.ts`, `libs/svg/src/terrain.ts`, `libs/svg/src/legend.ts`, `libs/svg/src/__tests__/legend.test.ts`, `libs/svg/src/__tests__/render.test.ts`, `apps/web/src/hover.ts`, `apps/web/src/world/organelles.ts`, `apps/web/src/chrome/legend.tsx`, `apps/web/src/hud.ts`, `fixtures/`, `docs/design.md`
   - model: opus (a continuous morph across forms with different arm counts, held by geometry tests)
4. [x] feat(scene): move the spectrum's spiky end most, and least regularly
   - proof: per [D194 (shape-spectrum)](#d194) and [D200 (one-meaning-per-mover)](#d200): the scheduler's `shape(score)` interpolates `SHAPE_PULSE_HZ`, `SHAPE_PULSE` and `SHAPE_TURN` at `score × MAX_RULES` as the outline interpolates its forms, and `ShapeMotion` gains `jitter`: each arm's beat wanders by up to `SHAPE_JITTER × score` radians on a slow seeded sine, so the spiky end pulses less regularly and the smooth end not at all; `interiorOf` hands each body's trouble score to `shape`; `SHAPE_PULSE` rises by about a quarter at every level as [Q87 (exaggeration-numbers)](#q87)'s starting value, inside its bound; a score of 0 is `AT_REST`; reduced motion stills it. Tests: `motion.test.ts` holds score 0 still, the motion monotone in score at one time, jitter 0 at score 0 and inside `SHAPE_JITTER` at 1, and one `ShapeMotion` per seed and time ([C3 (deterministic)](#c3)); `tokens.test.ts` bounds `SHAPE_JITTER` (at most π) and the raised `SHAPE_PULSE`; the motion table in `docs/design.md` gains the rows
   - seam: `libs/scene/src/shape.ts`, `libs/scene/src/motion.ts`, `libs/scene/src/interior.ts`, `libs/scene/src/tokens.ts`, `libs/scene/src/__tests__/motion.test.ts`, `libs/scene/src/__tests__/tokens.test.ts`, `libs/scene/src/__tests__/interior.test.ts`, `apps/web/src/world/draw.ts`, `docs/design.md`
   - model: sonnet (interpolation and one new term, specified by the done-when)
5. [ ] feat(web): cycle an opened cell's files across the spectrum on demand
   - proof: per [D202 (demo-switch)](#d202): `viewOf` reads `?shapes=demo` into `View.shapes`, ignoring any other value; while it is on, the slide's bodies take scores by their index in path order, `index / (count − 1)` (0 for a lone file), in place of their trouble, the surface and the SVG unchanged; the status line reads `shapes: demo` while it is on; the URL `--png` builds never carries the parameter, which `png.test.ts` asserts on the URL it builds. Tests: `view.test.ts` parses the parameter; `interior.test.ts` gives the demo scores by index; a status test shows the words
   - seam: `apps/web/src/view.ts`, `apps/web/src/world/draw.ts`, `apps/web/src/chrome/status.tsx`, `libs/scene/src/interior.ts`, `apps/web/src/__tests__/view.test.ts`, `apps/web/src/__tests__/status.test.tsx`, `libs/scene/src/__tests__/interior.test.ts`, `apps/atis/src/__tests__/png.test.ts`
   - model: sonnet (a parameter threaded to one call)
6. [ ] feat(scene): grow the drift's contrast through a looseness curve
   - proof: per [D193 (looseness-curve)](#d193): a file's mobility is `looseness ^ DRIFT_CURVE` (a new token, 1.5, bounded at least 1) in place of its looseness, so a file with a fifth of its ties outside barely moves and a wholly loose one moves the full reach; `DRIFT_REACH` rises from 0.15 to 0.3 as [Q98 (curve-quiets-middle)](#q98)'s starting value, inside its bound of 0.5; `DRIFT_SPEED` stays at 0.02 under [D165 (cell-float)](#d165)'s cap; `DriftTokens` and the registry carry the curve. Tests on the injected clock: a file at looseness 0.2 wanders under `0.2 ^ DRIFT_CURVE × DRIFT_REACH × radius` plus the push's allowance after ten seconds, a wholly loose file comes within a tenth of the full reach at some step of a minute, and no step moves any file more than `DRIFT_SPEED × screen / 60`; the motion table and the balance log in `docs/design.md` gain the change
   - seam: `libs/scene/src/drift.ts`, `libs/scene/src/tokens.ts`, `libs/scene/src/motion.ts`, `libs/scene/src/__tests__/drift.test.ts`, `libs/scene/src/__tests__/tokens.test.ts`, `docs/design.md`
   - model: sonnet (one curve and two values, specified)
7. [ ] feat(scene): gather an opened cell's held files toward its middle
   - proof: per [D199 (held-files-gather)](#d199): `restOf(map, cell)` in `drift.ts` gives each slide file's rest as the decision says, `gather` joining `InteriorLayout` (0.4, between 0 and 1) so the registry's `INTERIOR.gather` moves it live; a move that would cross the membrane or a held cell's skin leaves the file at the layout's position; `laidOf`, `startFloat` and `cellSlide` read the rest, and `homeFloat` still eases to the layout's position. Tests: of two files at one layout distance from the centre, the one with more ties inside rests nearer it; no two rests overlap; a cell whose files share one looseness rests at the layout's positions; a file the map gives no ties rests at the layout's position; no rest lies outside the membrane or inside a held cell; the SVG and the surface read no rest, so no golden moves
   - seam: `libs/scene/src/drift.ts`, `libs/scene/src/interior.ts`, `apps/web/src/materials.ts`, `libs/scene/src/__tests__/drift.test.ts`, `libs/scene/src/__tests__/interior.test.ts`, `docs/design.md`
   - model: opus (geometry under three constraints at once)
8. [ ] feat(scene): lay each file's functions as a nucleus inside its body
   - proof: per [D197 (nuclei)](#d197) and [Q92 (nucleus-fill)](#q92)'s answer: `nucleusOf(file, outline, slide)` in `interior.ts` gives one granule per entry of `functions` in line order, on a phyllotaxis spiral from the body's centre (the golden angle, radius growing as the square root of the index), each granule's radius proportional to the square root of its `line_count`, the set scaled so their summed area is `NUCLEUS_FILL × (loc / the largest loc on the slide)` of the core's area and the outermost granule's edge lies inside `core × (1 − NUCLEUS_PAD)`, shrinking the granules where the spiral would spill; each granule's ring is `outlineOf` at `troubleFrom(breaches.length)` ([Q97 (granule-scale)](#q97)); past `NUCLEUS_MOST` (200) granules the largest are drawn and `Body.nucleus.more` counts the rest, which the body's tag writes as `+N fn`; `Body` carries the nucleus every frame at the body's place. Tests: a file with `function_count` set and `functions` absent has no nucleus; 400 functions give `NUCLEUS_MOST` granules, every one inside the core at 0, 1, 2 and 7 s of the shape's motion at score 1, and a count of 200 more; granule radius is monotone in line count; the same file gives the same nucleus ([C3 (deterministic)](#c3)); the SVG reads none ([D201 (slide-only-svg)](#d201))
   - seam: `libs/scene/src/interior.ts`, `libs/scene/src/tokens.ts`, `libs/scene/src/__tests__/interior.test.ts`, `docs/design.md`
   - model: opus (packing inside a moving outline's core)
9. [ ] feat(scene): send the tags out on leaders and leave the bodies in place
   - proof: per [D198 (labels-explode)](#d198) and [Q89 (column-overflow)](#q89)'s answer: `SlideFile.exploded`, `explodeSpread` and `explodePush` go, and `interiorOf` reads `explode` for nothing, so every body stays where the float has it at every spread; `tagsOf` lays each tag's leader as a long polyline from the tag's inner edge straight out `TAG_ELBOW` pixels, then to the body's rim; `Screen` gains `margins` (top, bottom, left, right in pixels) so a column pulled onto the screen clears the chrome's claims (P25); a column with more tags than rows shrinks its rows to `TAG_ROW_FLOOR` (9 px) and, when they still do not fit, keeps the tags of the bodies nearest the view's centre that fit, in body order, ending on a footer tag counting the rest, `and 23 more`. Tests: a synthetic 80-file cell on a 1440 by 900 screen leaves every body inside its membrane, no two tag boxes overlapping, both columns on the screen and inside the margins, each column's order its bodies' order down the screen, and a footer counting the rest; the same holds under a projection that tilts the slide to 35° and one that zooms it past the screen; every leader's first segment is horizontal
   - seam: `libs/scene/src/interior.ts`, `libs/scene/src/tokens.ts`, `libs/scene/src/__tests__/interior.test.ts`, `docs/design.md`
   - model: opus (column layout with overflow, order and clearance)
10. [ ] feat(web): draw the nuclei and the exploded tags in the world
    - proof: the slide's body mesh draws each granule as a fan in the body's ink darkened by `INTERIOR.granuleShade` (a new look token), the change or improved hue so darkened where the body is stained, and unstained where the body is (the granule's angle from the body's centre inside the open share); the granules move with the body and never pulse or turn; the exploded view's sockets and spread leaders go, each tag's leader is the scene's polyline, and `render` hands the chrome's claims as the screen's margins (the HUD at the top left, the legend and the minimap at the bottom left, the rail on the right); the world's `LEGEND` gains `nucleus: its functions, sized by their lines`; the dev panel moves the new tokens live. Tests: the world's smoke test on an opened cell asserts the exploded view leaves every body's picked place where it was (`bodies()` unchanged between spread 0 and 1), finds no socket element, and finds one `polyline` leader per tag
    - seam: `apps/web/src/world/interior.ts`, `apps/web/src/world/draw.ts`, `apps/web/src/materials.ts`, `apps/web/src/registry.ts`, `apps/web/src/hud.ts`, `apps/web/src/chrome/legend.tsx`, `apps/web/src/__tests__/world.test.ts`, `docs/design.md`
    - model: opus (geometry in the body mesh, stains by angle, and the chrome's claims)
11. [ ] feat(scene): read each membrane's wobble from its cell's integrity
    - proof: per [D195 (living-membranes)](#d195): `wobbleOf(cell)` gives the amplitude a cell's membrane line ripples by, `MEMBRANE_WOBBLE × past / (through + past)` in layout units, 0 for a cell with no `integrity` or no outside imports; `tissue()` lays a third grid, `wobble`, with each cell's amplitude under its skin's line; `MEMBRANE_WOBBLE` (3) is bounded under half the layout's sibling gap and under `MEMBRANE_DENT_PULL`, and `MEMBRANE_WOBBLE_HZ` (0.15) at most 0.5; the world's `LEGEND` gains `membrane ripples: imported past its interface`, and a cell's hover line reads `N through, M past` where the cell carries `integrity` and nothing where it does not ([Q95 (ripple-by-share)](#q95)). Tests: the hover line shows the two counts and none for a barrel-less cell; a barrel-less cell and one entered only through its barrel give 0; a cell half entered past gives half the amplitude; the grid is 0 off every membrane; the same map gives the same grid ([C3 (deterministic)](#c3)); the tokens are bounded in `tokens.test.ts` and rowed in `docs/design.md`
    - seam: `libs/scene/src/membranes.ts`, `libs/scene/src/tokens.ts`, `libs/scene/src/__tests__/membranes.test.ts`, `libs/scene/src/__tests__/tokens.test.ts`, `apps/web/src/hud.ts`, `apps/web/src/hover.ts`, `apps/web/src/__tests__/hover.test.ts`, `docs/design.md`
    - model: opus (a grid beside the tissue's, bounded by the layout)
12. [ ] feat(web): ripple the skin's membrane line by its cell's integrity
    - proof: the skin's shader samples its membrane line at a position displaced by `wobble × sin(2π × MEMBRANE_WOBBLE_HZ × t + phase)`, the phase seeded from the sample's position, so a rippling membrane keeps its teeth and its width and a still one never moves; `t` is the scheduler's clock as one uniform; the amplitude is 0 under reduced motion; the world's reduced-motion test, framed on the surface over a cell whose `past` is above 0 (on a fixture that has one, else the synthetic map), holds its frames identical, and with motion on the same frames differ
    - seam: `apps/web/src/world/skin.ts`, `apps/web/src/world/draw.ts`, `apps/web/src/materials.ts`, `apps/web/src/registry.ts`, `apps/web/src/__tests__/world.test.ts`, `docs/design.md`
    - model: opus (a TSL displacement in the skin's sampling)
13. [ ] feat(scene): mark the ribbons that enter a cell past its interface
    - proof: per [Q84 (oscillating-links)](#q84)'s answer: each exceptional edge the scene hands the world gains `sway`, true where its `to` lies in a cell with a barrel, is not that barrel, and its `from` lies outside that cell's contour ([Q93 (sway-from-outside)](#q93), as [D192 (cell-integrity)](#d192) counts `past`), false otherwise and for a cell with no barrel; `RIBBON_SWAY` (1.5 layout units, at most three times `EDGE_WIDTH`) and `RIBBON_SWAY_HZ` (0.3, at most 0.5) are tokens with rows and bounds; the world's `LEGEND` gains `swaying line: enters a module past its interface`; the SVG draws the edges as before ([C10 (svg-is-still)](#c10)). Tests: hand-built maps for each edge kind landing on a barrel (still), past it from outside (sway), a cycle inside one barrelled cell (still) and in a barrel-less directory (still); the same map gives the same marks ([C3 (deterministic)](#c3))
    - seam: `libs/scene/src/weather.ts`, `libs/scene/src/tokens.ts`, `apps/web/src/marks.ts`, `apps/web/src/hud.ts`, `libs/scene/src/__tests__/weather.test.ts`, `apps/web/src/__tests__/marks.test.ts`, `libs/scene/src/__tests__/tokens.test.ts`, `docs/design.md`
    - model: sonnet (a predicate on data the map carries)
14. [ ] feat(web): oscillate the marked ribbons along their length
    - proof: the ribbon mesh carries a per-vertex `sway` attribute and its vertex stage offsets a swaying ribbon across its width by `RIBBON_SWAY × sin(2π × RIBBON_SWAY_HZ × t − k × along)`, a wave travelling along the bow that leaves the arrowhead on the rim and a still ribbon untouched; `t` is the scheduler's clock; the amplitude is 0 under reduced motion; the reduced-motion test, framed on a fixture with a swaying ribbon (else the synthetic map), holds its frames identical, and with motion on the same frames differ
    - seam: `apps/web/src/world/ribbons.ts`, `apps/web/src/world/draw.ts`, `apps/web/src/registry.ts`, `apps/web/src/__tests__/world.test.ts`, `docs/design.md`
    - model: opus (a vertex-stage wave on a draped strip)
15. [ ] feat(scene): place a quiet label on each depth band
    - proof: per [D196 (band-labels)](#d196) and [Q86 (band-label-words)](#q86)'s answer: `bandLabelsFor(map, lod, viewport, placed, off)` in `labels.ts` gives one label per band rule the viewport shows (per row where the lanes wrap), its text `entry` for the band whose `depth_min` is 0 and `n deep` or `n–m deep` otherwise from `terrain.bands`, set `BAND_LABEL_SIZE` (9 px) at `BAND_LABEL_INSET` (8 px) from the viewport's left edge just under the rule; none at LOD0; a label whose box overlaps a placed label, a notice mark, the HUD's claim or a cell's skin on the screen (`onRing`) is dropped, never moved onto a cell. Tests: at zoom 1 none; at zoom 4 one per rule in view with the words; under projections at the tilt and zoom extremes no label overlaps a placed label or a skin; the same inputs give the same labels ([C3 (deterministic)](#c3))
    - seam: `libs/scene/src/labels.ts`, `libs/scene/src/tokens.ts`, `libs/scene/src/__tests__/labels.test.ts`, `docs/design.md`
    - model: opus (placement against three kinds of neighbour)
16. [ ] feat(web): write the band labels over the field
    - proof: the rules layer writes each band label as DOM text in `SPACE.ruleInk` at `SPACE.labelOpacity` (new, 0.5) beside its rule, placed by the scene whenever the view, the level or the placed labels change, fading with the surface layer, under the slide's words ([D185 (asked-words-on-top)](#d185)); the file's header notes [D168 (labels-on-demand)](#d168)'s amendment; the world's smoke test at `?zoom=4` finds the labels with their words and at `?zoom=1` finds none
    - seam: `apps/web/src/world/space.ts`, `apps/web/src/world/draw.ts`, `apps/web/src/materials.ts`, `apps/web/src/registry.ts`, `apps/web/src/__tests__/world.test.ts`, `docs/design.md`
    - model: sonnet (DOM text placed by the scene)
17. [ ] docs(design): rewrite the channel list and log the balance patches
    - proof: the channel list in `docs/design.md` reads as [C11 (one-meaning-per-channel)](#c11) does here, its Motion section names each new mover with its tokens, the balance log carries a dated entry for each value [Q87 (exaggeration-numbers)](#q87) settled at the stops, the table test in `tokens.test.ts` names the new motion tokens, and `docs/world-description-spec.md` §9 gains one line per question naming the decision that answered it; `pnpm check --strict` is green with the `docs`, `links` and `spell` slots
    - seam: `docs/design.md`, `docs/world-description-spec.md`, `libs/scene/src/__tests__/tokens.test.ts`
    - model: sonnet (writing from the decisions)
18. [ ] chore(web): measure the new movers against the world's budget
    - proof: `node apps/web/scripts/budget.ts` runs on the seeded 5,000-file map on both backends with the ripple and the sway on, and the budget table in `docs/design.md` gains a dated row holding [C14 (world-budget)](#c14): 60 fps at idle, through the sweep and at the surface, and a first frame about 2 s; a reading that misses is recorded as measured and parked with the mover and the level of detail it must shed at, never passed
    - seam: `apps/web/scripts/budget.ts`, `docs/design.md`
    - model: sonnet (run the script, record the numbers)

## Build order

## Build ranges

Drive the build with `/plumbbob:run`: each run lands one range and stops where Rob judges what landed on atis's own map ([D166 (legibility-first)](#d166)), with `pnpm --filter web dev` and `?map=/@fs/<path>` or a run of `atis` on this repository.

1. `/plumbbob:build 1-5`, **stop:** judge the spectrum on atis's own map: at the surface a troubled file told from a calm one by shape alone; inside an opened cell, with `?shapes=demo` and without, the forms against `docs/img/materials-spike/a-5-shapes-demo.png` and the spiky end's pulse and jitter; settle [Q87 (exaggeration-numbers)](#q87)'s shape values (`SHAPE_PULSE`, `SHAPE_JITTER`) by eye before the slide builds on them
   - model: opus
2. `/plumbbob:build 6-10`, **stop:** judge the opened cell beside `a-5-shapes-demo.png` (P37): a held file told from a loose one by its motion, the held core and the loose rim before any motion, the nuclei's density and the stains on their granules, and the exploded tags on a 16:9 screen with every name readable and no body moved; settle [Q87 (exaggeration-numbers)](#q87)'s drift values (`DRIFT_REACH`, `DRIFT_CURVE`)
   - model: opus
3. `/plumbbob:build 11-14`, **stop:** judge the surface: a module entered through its interface told from one imported past it by its membrane, and a swaying ribbon against a still one, the ripple on atis's own map where step 1 found a cell with `past` above 0, else `fixtures/javascript-1`, and the sway on `fixtures/corpus-7` ([Q94 (range-3-map)](#q94)); confirm [Q84 (oscillating-links)](#q84)'s reading or redirect it before the labels land
   - model: opus
4. `/plumbbob:build 15-16`, **stop:** the first-time-reader test: name what the depth bands mean from their labels alone, at the surface and inside a cell, tilted and zoomed; confirm they yield to cells, notices and the HUD
   - model: opus
5. `/plumbbob:build 17-18`, **stop:** the build's boundary: review the channel list and the balance log, the budget row, and the goldens that moved with their reasons, then `/plumbbob:finish`
   - model: sonnet

## Open questions

The spec's §9, one entry each, with the plan's lean; `yes to all leans` settles them in one reply.

- <a id="q81"></a>**Q81 (spectrum-signals)**: What drives the shape spectrum's score?, *resolved:* 2026-11-17, the lean, its top reworded by [Q96 (spectrum-top)](#q96): shape means trouble, rules over history, computed in `libs/scene`
  - *plain:* Today shape is `dents` alone, so four files in five are circles and cannot be compared. Every other signal the map carries already owns a channel: looseness has the drift and now the rest, size is mass, stability is relief, a clone family is repetition, and history is texture; any widening spends one reading on two channels, which the rewritten [C11 (one-meaning-per-channel)](#c11) allows only where a decision names it.
  - *lean:* Shape means trouble: the rules a file breaks carry the top of the spectrum, from 0.4 at one rule to 0.9 at six, and 1 with full history ([Q96 (spectrum-top)](#q96)), and history (the greater of churn and bug-fix rate) shades the bottom for a rule-abiding file and shades within each level above, so most files leave the circle while the spiky end stays the rule-breakers'. Looseness, size, age and clone family stay out. It is computed in `libs/scene` (step 2), not core, since every input is already in the map and a missing one is named, never defaulted ([C2 (never-fake)](#c2)).
- <a id="q82"></a>**Q82 (surface-shape-motion)**: Does the shape animate at the surface?, *resolved:* 2026-11-17, the lean: not in this build, the surface draws the forms still
  - *plain:* The spike moved its shapes at the surface, and the world moves them only inside an opened cell ([D147 (alive-motion)](#d147)). At the surface 5,000 outlines would move under [C14 (world-budget)](#c14)'s 60 fps, and the flares own urgency there.
  - *lean:* Not in this build: the surface draws every file's spectrum form still, and the motion stays inside an opened cell; a later step may add it behind a token once step 18 has measured the surface's headroom.
- <a id="q83"></a>**Q83 (barrel-less-integrity)**: What is integrity for a cell with no barrel?, *resolved:* 2026-11-17, the lean: not applicable, no key and a still membrane ([D192 (cell-integrity)](#d192))
  - *plain:* A directory cell's interface is whatever outsiders import, so by construction nothing lands past it, and a single-file cell is its own interface. A `past` of 0 there would read as perfect containment, a calm nothing measured ([C2 (never-fake)](#c2)).
  - *lean:* Not applicable: `integrity` is absent on directory and single-file cells, their membranes hold still, and the world's legend says the ripple means imports past a barrel; [D192 (cell-integrity)](#d192) records it.
- <a id="q84"></a>**Q84 (oscillating-links)**: What does an oscillating link mean, and which links sway?, *resolved:* 2026-11-17, the lean, narrowed by [Q93 (sway-from-outside)](#q93): a ribbon sways when its import enters a barrelled cell from outside, past the barrel
  - *plain:* The world's only lines are the exceptional ribbons (a cycle, a boundary crossed, a new cross-module import) and, inside a cell, the wiring overlay, which is chrome and never moves on its own. "Against the depth order" is vacuous, since depth is the longest path and every upward edge is already a cycle's, wearing LIFR; what no ribbon yet says is whether its import lands on the target's barrel or bypasses it.
  - *lean:* One oscillation, one meaning: a ribbon sways when its import lands in a barrelled cell past the barrel, the reading the membrane ripples by (§4.3) read on the link; every other ribbon and the wiring overlay stay still.
- <a id="q85"></a>**Q85 (new-weather)**: Which new weather patterns describe the standing ground?, *resolved:* 2026-11-17, the lean: none in this build
  - *plain:* The world already draws every standing mark the still map does: history as hatching and stipple, co-change ghosts, standing storms, clone glyphs, cycles and boundaries as ribbons, and stability as relief (`apps/web/src/marks.ts`). The one reading the map carries that nothing draws is `reachable: false`, a file no entry point reaches, and each new pattern needs one meaning and a channel [C11 (one-meaning-per-channel)](#c11) can give it.
  - *lean:* None in this build beyond the two standing readings it adds, the membrane's integrity and the swaying link, so §4.5 lands no step; if you name a pattern here, `/plumbbob:refine` writes its step into range 4 before any code.
- <a id="q86"></a>**Q86 (band-label-words)**: What do the band labels say, and where do they sit?, *resolved:* 2026-11-17, the lean: `entry` and `n deep`, under each rule at the left edge, from LOD1, yielding
  - *plain:* The bands quantise longest-path depth, up to seven, and the map carries each band's depth range in `terrain.bands`; a word like "services" would be invented ([C2 (never-fake)](#c2)) where a depth is measured. A label over a cell would cover what [D168 (labels-on-demand)](#d168) keeps clear.
  - *lean:* `entry` for the band at depth 0 and `n deep` (or `n–m deep`) for the rest, from `depth_min` and `depth_max`; set small in the rules' own translucent ink, just under each rule at the viewport's left edge (per row where the lanes wrap), shown from LOD1 and dropped wherever it would overlap a label, a notice mark, the HUD or a cell's skin.
- <a id="q87"></a>**Q87 (exaggeration-numbers)**: How much more exaggerated are the drift and the pulse?, *resolved:* 2026-11-17, the lean, its drift starting values replaced by [Q98 (curve-quiets-middle)](#q98)'s; tuned by eye at the stops of ranges 1 and 2
  - *plain:* The spec fixes the direction and the readability cap and not the values, and [D165 (cell-float)](#d165) holds `DRIFT_SPEED` at 0.05 at most; the values are judged in the world, not on paper.
  - *lean:* Start at `DRIFT_REACH` 0.25 (from 0.15), `DRIFT_CURVE` 2.5, `SHAPE_PULSE` a quarter higher at every level and `SHAPE_JITTER` π/3, then tune by eye at the stops of ranges 1 and 2, each change logged in the design doc's balance log (step 17); this is the one you may rather defer until those stops.
- <a id="q88"></a>**Q88 (surface-nuclei)**: Does a nucleus show through the body at the surface?, *resolved:* 2026-11-17, the lean: not in this build, nuclei on the slide alone
  - *plain:* The spike's rejected variant glowed every nucleus through the skin (`b-2-surface.png`). At the surface the bodies are small and 5,000 of them stand under [C14 (world-budget)](#c14), so the granules would need baking into the organelles' instances or a draw call per file.
  - *lean:* Not in this build: nuclei show on the slide alone, so the SVG, which draws no opened cell, draws none and keys none ([D201 (slide-only-svg)](#d201)); revisit after step 18's budget row.
- <a id="q89"></a>**Q89 (column-overflow)**: What does a tag column do past its rows?, *resolved:* 2026-11-17, the lean: shrink to `TAG_ROW_FLOOR`, then the nearest bodies' tags and a footer counting the rest
  - *plain:* An 80-file cell has more tags than a 900-pixel column holds at a readable row. Paging by the pointer is hard to discover, and grouping by folder loses the names the view exists to show.
  - *lean:* Shrink the row to `TAG_ROW_FLOOR` (9 px), then keep the tags of the bodies nearest the view's centre that fit, in body order, and end the column on a footer counting the rest; hover still names any body one at a time ([D168 (labels-on-demand)](#d168)).
- <a id="q90"></a>**Q90 (terrain-gather)**: Should the terrain's layout gather held files too?, *resolved:* 2026-11-17, the lean: not in this build, judged after range 2's stop
  - *plain:* Gathering the terrain would give position one meaning at every level, but it moves every golden, the still map and the surface Rob has judged ([D166 (legibility-first)](#d166)).
  - *lean:* Not in this build: the slide alone gathers ([D199 (held-files-gather)](#d199)); judge it at range 2's stop and decide the terrain's afterwards, on what it shows.
- <a id="q91"></a>**Q91 (granule-dents)**: Do granules show their dents at the slide's scale?, *resolved:* 2026-11-17, the lean, on the scale [Q97 (granule-scale)](#q97) sets: dents by the plate's `outlineOf`, no other mark
  - *plain:* On the file plate a granule is dented by the thresholds its function breaks. Inside a body a granule may be a few pixels across, where a dent is invisible, and a mark of its own would be a second encoding of one reading.
  - *lean:* Yes, by the same `outlineOf` the plate uses, and nothing else: a dent too small to see is the plate's to show one level deeper, and no mark is invented for a size the eye cannot read.
- <a id="q92"></a>**Q92 (nucleus-fill)**: How full is a body's nucleus?, *resolved:* 2026-11-17, the lean: the largest file fills `NUCLEUS_FILL`, the rest in proportion to their lines
  - *plain:* §4.7 scales a file's granules "to fill its core by the file's share of the cell's lines". Read as a share of the cell's total, every file in a twenty-file cell would fill a twentieth of its core, and no nucleus would read dense.
  - *lean:* The largest file on the slide fills `NUCLEUS_FILL` (0.5) of its core's area and every other file fills in proportion to its lines, so density compares within the cell and the densest file always reads full, its granules shrinking before they spill (step 8).
- <a id="q93"></a>**Q93 (sway-from-outside)**: Does a ribbon sway only when its importer is outside the cell?, *resolved:* 2026-11-17, the lean: yes, step 13's predicate takes the `from` outside the contour clause
  - *plain:* Step 13 marks any ribbon whose `to` is a file of a barrelled cell other than the barrel, so a cycle between two files inside one folder sways though nothing entered past an interface. Counted on the 32 maps under `fixtures/`, that predicate sways 160 of 769 exceptional ribbons, and 7 of them are imported from outside the cell; [D192 (cell-integrity)](#d192) counts only imports from outside the contour, so the ribbon and the membrane would disagree.
  - *lean:* Yes: step 13's predicate gains [D192 (cell-integrity)](#d192)'s clause, `from` outside the cell's contour, and its tests gain a cycle inside one barrelled cell, which stays still.
- <a id="q94"></a>**Q94 (range-3-map)**: Which map shows Rob a ripple and a sway at range 3?, *resolved:* 2026-11-17, the lean: step 1 records atis's cells with `past` above 0, and range 3's stop names its maps
  - *plain:* Range 3's stop judges a rippling membrane and a swaying ribbon, and neither is promised on a map Rob knows: with the importer outside ([Q93 (sway-from-outside)](#q93)) 7 ribbons sway across 32 fixtures, none on checkride or fascicle, and no map yet says whether any atis cell is imported past its barrel. A stop with nothing on the screen settles nothing ([D166 (legibility-first)](#d166)).
  - *lean:* Step 1's commit body records which cells of atis's own map carry `past` above 0, and range 3's stop names the maps: atis's own for the ripple where one does, else `fixtures/javascript-1`, and `fixtures/corpus-7` (two swaying ribbons) for the sway; the sway stays in the build, rare as it is, since §4.4 asks a link with nothing to say to hold still.
- <a id="q95"></a>**Q95 (ripple-by-share)**: Does one stray import ripple a membrane as hard as a hundred?, *resolved:* 2026-11-17, the lean: keep the share, the two counts on the cell's hover line
  - *plain:* The amplitude is the share `past / (through + past)`, so a cell with a single outside import, landing past its barrel, ripples at full strength while a hub with 100 of its 200 imports past ripples at half. The share is what §4.3 names, but the loudest membranes may be the least imported.
  - *lean:* Keep the share, since a floor on the count would be a threshold nothing measured ([C2 (never-fake)](#c2)); step 11 adds the two counts to the cell's hover line so the size is one pointer away, and range 3's stop judges whether the small cells shout.
- <a id="q96"></a>**Q96 (spectrum-top)**: Do six broken rules reach the spectrum's top without history?, *resolved:* 2026-11-17, the lean: step 2's formula stands, 0.9 at six rules and 1 with full history
  - *plain:* [Q81 (spectrum-signals)](#q81)'s lean says the rules carry the score "to 1 at six", and step 2's formula puts `from` at 1 only at `MAX_RULES + 1`, so six rules with no history score 0.9 and reach 1 only with full history. The two cannot both hold, and step 2's tests would be written against one of them.
  - *lean:* Step 2's formula stands, so history shades inside every level, the top one included, and [Q81 (spectrum-signals)](#q81)'s lean is reworded to "0.4 at one rule to 0.9 at six, and 1 with full history".
- <a id="q97"></a>**Q97 (granule-scale)**: Does one breach bend a granule as far as one rule bends a file?, *resolved:* 2026-11-17, the lean: a granule scores `from(breaches)` with no history
  - *plain:* A file that breaks one rule scores 0.4 or more and draws between the third and fourth forms, while step 3 draws a granule with one breach at `1 / MAX_RULES`, the second form. One legend key, `shape: trouble`, would then cover two scales, on the plate and inside the nuclei.
  - *lean:* A granule's score is step 2's `from(breaches)` with no history (a function carries none), so one breach reads alike on a file and on a granule; steps 3 and 8 say `from(breaches.length)` in place of `breaches.length / MAX_RULES`.
- <a id="q98"></a>**Q98 (curve-quiets-middle)**: Do the starting drift values move most files less than today?, *resolved:* 2026-11-17, the lean: start at `DRIFT_CURVE` 1.5 and `DRIFT_REACH` 0.3
  - *plain:* At `DRIFT_CURVE` 2.5 and `DRIFT_REACH` 0.25 a file wanders `looseness ^ 2.5 × 0.25` of the radius against today's `looseness × 0.15`, which is less than today for every file under 0.71 loose: a half-loose file drops from 0.075 to 0.044. The build's first complaint is that the motion is too subtle, and range 2 would open on a slide quieter than the one Rob judged.
  - *lean:* Start at `DRIFT_CURVE` 1.5 and `DRIFT_REACH` 0.3, inside its bound of 0.5: a file a fifth loose still barely moves (0.027 against today's 0.03), every file over a quarter loose moves more than today, and a wholly loose one twice as far; [Q87 (exaggeration-numbers)](#q87) still tunes both by eye at range 2's stop.

## Verdicts

*(Filled in as spikes and forks resolve.)*

## Source

`docs/world-description-spec.md`, draft 0.2 (2026-11-02), verbatim, its headings one level down:

## Spec: a world that describes itself at a glance

Draft 0.2, 2026-11-02. Draft 0.1 was written at range 24's boundary of the build "atis phases 1b
to 5, in waves", from Rob's answers to Q3 (flare-and-jiggle-numbers) and Q69 (motion-direction),
to be picked up by `/plumbbob:plan` as the next build once that one finished. Draft 0.2, written
after that build finished, adds what Rob found setting the world's opened cell beside the first
spike's frames (P37, P25): nuclei inside the bodies (§4.7), an exploded view that spreads the
labels and not the bodies (§4.8), held files gathered at the cell's middle (§4.9), and a shape
demo switch (§4.2). It changes the 2.5D world (`apps/web`, drawn from `libs/scene`) and, where a
new reading needs data, the map (`libs/core`). `SPEC.md` at the repo root stays the product spec; this is a feature spec on top of
it.

### 1. Problem

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

### 2. Solution overview

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

### 3. Data the map needs

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

### 4. Behaviour

#### 4.1 Motion contrast

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

#### 4.2 Shape spectrum

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

#### 4.3 Living membranes

- A cell's membrane wobbles by its integrity: the share of its outside imports that land past its
  interface (§3). A cell entered only through its interface holds a steady skin. One whose
  insides are imported directly ripples, more as the share grows.
- The wobble is slow and small enough that the membrane's shape, its teeth (step 12) and its
  labels stay readable, and the skin never crosses another cell's (D171 (sibling-cells-apart)).
- A cell with no barrel has an interface made of whatever outsiders import, so by today's rules
  nothing can land past it; what integrity means there is open (§9).

#### 4.4 Oscillating links

- A drawn link between cells or layers may oscillate slightly. Each oscillation has one meaning,
  and a link with nothing to say stays still. What the oscillation means, and which links the
  world draws for it, is open (§9).

#### 4.5 More weather

- Further weather patterns describe the standing ground around the change. Which patterns are
  open (§9); each must have one meaning and come from data the map carries.

#### 4.6 Layer labels

- Each depth band carries a small label naming what it is, so the vertical order reads without
  the legend. The labels are quiet: the same translucent ink as the band rules (D169
  (space-ground)), at the field's edge rather than over cells, and they never collide with a cell,
  a notice or the HUD.
- This amends D168 (labels-on-demand), which keeps every text off the field unless asked. The
  band labels are the one standing text it allows.
- What each label says, and where it sits as the view zooms and tilts, is open (§9).

#### 4.7 Nuclei

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

#### 4.8 Labels explode, not bodies

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

#### 4.9 Held files gather

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

### 5. Constraints

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

### 6. Failure modes

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

### 7. Success criteria

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

### 8. Files likely touched

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

### 9. Open questions

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
