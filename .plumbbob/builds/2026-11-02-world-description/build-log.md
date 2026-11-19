<!--
build-log.md: your live ledger for execution. Append constantly; reorganize at
step boundaries. The antidote to "my plan got lost in the noise."

  Steps     : where you are. One step in flight at a time. CLI-maintained: `build`,
              `checkpoint`, and `revert` keep this mirror and the Current step line
              in sync with intent.md; you never hand-edit them.
  Park list : where ideas go so you do not chase them. CAPTURE, never act inline.
  Harvest   : the boundary ritual that keeps you on one branch.
  Log       : the build's history. `plumbbob checkpoint` appends a line per step as it
              lands; feeds the /plumbbob:finish report, which rides the branch into the PR.
-->

# Build log: a world that describes itself at a glance

**Current step:** 18 — chore(web): measure the new movers against the world's budget
**Heavy check:** checkride (set a "check" key in .plumbbob/settings.json to override)

## Steps

*(Mirror of intent.md's Steps, with live status; CLI-maintained, not hand-edited.
`build`/`checkpoint`/`revert` re-render this from intent.md, and set the Current step
line above. Only ONE step is in flight; a step is done only after a checkpoint:
check green + checkpoint taken, via `/plumbbob:verify` or `/plumbbob:build`.)*

- ☑ 1. feat(core): count a cell's imports through and past its interface
- ☑ 2. feat(scene): score each file's trouble on one spectrum from the map
- ☑ 3. feat(scene): draw every file's outline on a continuous spectrum
- ☑ 4. feat(scene): move the spectrum's spiky end most, and least regularly
- ☑ 5. feat(web): cycle an opened cell's files across the spectrum on demand
- ☑ 6. feat(scene): grow the drift's contrast through a looseness curve
- ☑ 7. feat(scene): gather an opened cell's held files toward its middle
- ☑ 8. feat(scene): lay each file's functions as a nucleus inside its body
- ☑ 9. feat(scene): send the tags out on leaders and leave the bodies in place
- ☑ 10. feat(web): draw the nuclei and the exploded tags in the world
- ☑ 11. feat(scene): read each membrane's wobble from its cell's integrity
- ☑ 12. feat(web): ripple the skin's membrane line by its cell's integrity
- ☑ 13. feat(scene): mark the ribbons that enter a cell past its interface
- ☑ 14. feat(web): oscillate the marked ribbons along their length
- ☑ 15. feat(scene): place a quiet label on each depth band
- ☑ 16. feat(web): write the band labels over the field
- ☑ 17. docs(design): rewrite the channel list and log the balance patches
- ☐ 18. chore(web): measure the new movers against the world's budget
- ☑ 19. feat(scene): shade every file's shape by the churn its stability carries

## Park list

> Mid-step, every new problem / idea / "ooh what if" lands HERE, untouched, and you
> go straight back to the step. Acting the instant an idea arrives is the disease.
> Capture is one line (`/plumbbob:park` composes it). Harvest happens only at the boundary.

- [x] docs/glance-practice.svg predates the shape spectrum: it still keys 'shape: rules it breaks, 0 to 6' and draws every calm file as a circle, and it was already behind the renderer (its Size block counts 4 files where today's counts 2); pnpm practice-map re-renders it, outside step 3's seam
- [x] the two spikiest forms are drawn through too few points: at SHAPE_LEVELS 5 and 6 an arm is about one sample wide (160 points round 18 arms of sharp 20), so the ring catches each tip at 53 to 100 percent of its length by where the points fall, which flickers as a shape turns and makes the ring's own furthest point wander as the score climbs; step 3 holds the monotone test on the outline's analytic extent instead
- [x] apps/web hud.test.tsx 'the world's blocks are the sheet's' timed out at vitest's 5 s default once under a loaded full check (6.7 s) and passed on rerun; it walks every committed fixture, so give it a longer timeout or split it
- [x] troubleOf reads the organelle's top-level churn_ratio and bugfix_rate, which the map sets only on files the change touched, so shape shows history for almost no file: on atis's own map 0 of 165 files leave the circle on a whole-repo map and 7 of 165 on the last commit (no file breaks a rule), where stability.churn_ratio is on all 165; javascript-1 has 128 of 414 with a form against 405 with stability's churn
- [x] stability.churn_ratio counts a file's own birth, so on atis's whole-repo map every one of the 165 files reads churn 0.47 or more (median 1.22) and 155 score between 0.13 and 0.27, one soft wobble for nearly all; a calm file needs a floor to subtract or a scale that starts above birth before shape alone tells it from a busy one (step 19, D203 history-on-every-file)
- [x] Rob at range 2's stop: the transition from the overworld to the map of cells is not helping; the overworld is less useful than expected and makes it harder to get into the cells and browse them, so consider keeping the one map view and leaning on the weather-pattern analogy
- [x] Rob at range 2's stop: selections are glitchy when clicking different things: a click does not always do what is expected, fills are not good, and 3D elements are not always rendered properly; unknown whether any of it is new since range 2
- [x] Rob at range 2's stop: clicking a highlighted issue pops a map of the related cells and files up in a rectangle in the centre; he likes it but could not tell what he was looking at or how to turn it off, so it needs a title or key and a visible way to close
- [x] Rob at range 2's stop: clicking a cell should probably bring up file details in an inspector panel; what goes in it is undecided
- [x] fixtures/javascript-1 and fixtures/corpus-7 map.json predate step 1's integrity field (0 cells carry it), so range 3's stop sees no ripple on javascript-1 until that map is regenerated; only libs/core/fixtures/demo has a cell with past above 0 (package:libs/core, 1 through 1 past)
- [x] at the surface the membrane line is faint where the reach's glow fills a cell (seen on the demo's libs/core, both backends), so a lit cell's ripple barely reads while an unlit cell's reads clearly; judge at range 3's stop whether the line needs more contrast under the reach or the ripple a second cue
- [x] The still SVG keeps its terraces unworded: D86 (svg-stays-the-fixture) would set each band's entry or n deep at the terrace's left edge too, and no step of this build does
- [ ] budget.ts on 2026-11-18 read under 60 fps at idle on both backends and at the surface on WebGL 2, alike on the movers' map, the still map and the world before this build (989dee5), on a machine in use with two other browsers drawing on the GPU; rerun it on a quiet machine before C14's 60 fps is claimed with the ripple and the sway on, and if the pre-build world still misses there, look for a regression older than this build
- [ ] the seeded synthetic map carries no functions, so the budget never draws a nucleus, and its sweep holds an opened cell for half a second: the slide's per-frame work (the nuclei's fans laid again each frame, the shapes' motion, the float) has no budget reading; it needs functions in syntheticMap and a held reading inside an opened cell in budget.ts
- [ ] one budget run on 2026-11-18, taken as the machine quietened, read first frames of 5.05 s (WebGPU) and 3.40 s (WebGL 2) with the ripple and the sway on against 1.87 and 1.97 s without, and two frames of 117 and 158 ms at LOD1 in its WebGPU sweep; sixteen loads and a full run straight after read 1.60 to 1.66 s and no long frame, so it is unexplained, not held: if it shows again, give budget.ts a way to move the ripple and the sway apart before either is shed at LOD1

## Harvest  *(run `/plumbbob:harvest` at each step boundary, after green)*

Classify each parked item as exactly ONE. Naming it before acting is what keeps you
from sprawling across branches.

| Class            | Meaning                                   | Action                               |
| ---------------- | ----------------------------------------- | ------------------------------------ |
| **blocker**      | Plan was wrong/incomplete; can't proceed  | `/plumbbob:revert`, fold into intent |
| **tangent**      | A different path, not clearly better      | Defer or kill. Default here.         |
| **pivot signal** | Evidence the whole approach is wrong      | Stop. Replan deliberately.           |

> Reality check: almost everything that *feels* like a pivot is a tangent. Require a
> failed assumption, not a shinier idea, before you pivot.

Harvest results this boundary:

- 2026-11-18, at the step 3 boundary: 2 parked ideas, classified.
- **tangent**: park 1 · docs/glance-practice.svg predates the shape spectrum: it still keys 'shape: rules it breaks, 0 to 6' and draws every calm file as a circle, and it was already behind the renderer (its Size block counts 4 files where today's counts 2); pnpm practice-map re-renders it, outside step 3's seam → a doc image no test compares and no step ahead reads, re-rendered by one command whenever the practice map is next used
- **tangent**: park 2 · the two spikiest forms are drawn through too few points: at SHAPE_LEVELS 5 and 6 an arm is about one sample wide (160 points round 18 arms of sharp 20), so the ring catches each tip at 53 to 100 percent of its length by where the points fall, which flickers as a shape turns and makes the ring's own furthest point wander as the score climbs; step 3 holds the monotone test on the outline's analytic extent instead → today's forms already draw this way and nothing in steps 4 or 5 depends on it, so it waits on what range 1's stop shows of the spiky end in motion
- 2026-11-18, at range 1 of 6's stop: 2 parked ideas, classified.
- **tangent**: park 3 · apps/web hud.test.tsx 'the world's blocks are the sheet's' timed out at vitest's 5 s default once under a loaded full check (6.7 s) and passed on rerun; it walks every committed fixture, so give it a longer timeout or split it → a timeout on a test no step touches, cured by one argument, though it will keep costing reruns on a loaded machine
- **blocker**: park 4 · troubleOf reads the organelle's top-level churn_ratio and bugfix_rate, which the map sets only on files the change touched, so shape shows history for almost no file: on atis's own map 0 of 165 files leave the circle on a whole-repo map and 7 of 165 on the last commit (no file breaks a rule), where stability.churn_ratio is on all 165; javascript-1 has 128 of 414 with a form against 405 with stability's churn → D194 (shape-spectrum)'s own reason, most files leaving the circle, is unmet on atis's own map until the score reads the history every file carries
- 2026-11-18, at the step 19 boundary: 1 parked idea, classified.
- **tangent**: park 5 · stability.churn_ratio counts a file's own birth, so on atis's whole-repo map every one of the 165 files reads churn 0.47 or more (median 1.22) and 155 score between 0.13 and 0.27, one soft wobble for nearly all; a calm file needs a floor to subtract or a scale that starts above birth before shape alone tells it from a busy one (step 19, D203 history-on-every-file) → real, but ranges 2 to 5 do not build on the score's spread and the fix leaves a choice open (subtract a file's birth, or start the scale above it), which is a `/plumbbob:refine` call rather than a fold made here
- 2026-11-18, at range 2 of 6's stop: 4 parked ideas, classified.
- **tangent**: park 6 · Rob at range 2's stop: the transition from the overworld to the map of cells is not helping; the overworld is less useful than expected and makes it harder to get into the cells and browse them, so consider keeping the one map view and leaning on the weather-pattern analogy → a change to the world's levels, wider than this build's nine changes
- **tangent**: park 7 · Rob at range 2's stop: selections are glitchy when clicking different things: a click does not always do what is expected, fills are not good, and 3D elements are not always rendered properly; unknown whether any of it is new since range 2 → Rob confirmed it predates this build, and no step ahead builds on selection
- **tangent**: park 8 · Rob at range 2's stop: clicking a highlighted issue pops a map of the related cells and files up in a rectangle in the centre; he likes it but could not tell what he was looking at or how to turn it off, so it needs a title or key and a visible way to close → the plate works and is liked; it lacks a name and a way out
- **tangent**: park 9 · Rob at range 2's stop: clicking a cell should probably bring up file details in an inspector panel; what goes in it is undecided → a new surface whose contents are undecided
- 2026-11-18, at range 3 of 6's stop: 2 parked ideas, classified.
- **tangent**: park 10 · fixtures/javascript-1 and fixtures/corpus-7 map.json predate step 1's integrity field (0 cells carry it), so range 3's stop sees no ripple on javascript-1 until that map is regenerated; only libs/core/fixtures/demo has a cell with past above 0 (package:libs/core, 1 through 1 past) → the stop reads on fascicle's own map, so rebuilding the fixtures' maps can wait for its own step
- **tangent**: park 11 · at the surface the membrane line is faint where the reach's glow fills a cell (seen on the demo's libs/core, both backends), so a lit cell's ripple barely reads while an unlit cell's reads clearly; judge at range 3's stop whether the line needs more contrast under the reach or the ripple a second cue → a look to judge at this stop, and the dev panel moves the line's ink and the amplitude live
- 2026-11-19, at range 4 of 6's stop: 1 parked idea, classified.
- **tangent**: park 12 · The still SVG keeps its terraces unworded: D86 (svg-stays-the-fixture) would set each band's entry or n deep at the terrace's left edge too, and no step of this build does → the still sheet has no viewport to set a caption against, so wording its terraces is a call of its own for a later build

## Log

*(The build's history, oldest first. `plumbbob checkpoint` appends an entry here
every time a step lands (via `/plumbbob:build` or `/plumbbob:verify`): the dated line,
and beneath it the pause as you approved it, so this fills in as you go, not at the
end, and an older step's detail is a scroll away. Add your own decision/event lines too: this is what
you point at to say "I did that: the LLM helped, but those were my calls."
`/plumbbob:finish` reads this for the report; `plumbbob finish` commits it with the build
folder, so it rides the branch into the PR.)*

- 2026-11-18 — step 1 checkpointed · dbd09d86b — feat(core): count a cell's imports through and past its interface (10m)

  **Readout**:

  ```text
  check        green: 1 of 1 checks
  plumb        seam 8 · reach 0 · out 0
  diff         +281 -5 across 8 files
               - libs/core/fixtures/demo/map.json +15 -3
               - libs/core/src/__tests__/integrity.test.ts +129 -0
               - libs/core/src/__tests__/map.test.ts +17 -0
               - libs/core/src/__tests__/schema.test.ts +15 -0
               - libs/core/src/index.ts +1 -0
               - libs/core/src/integrity.ts +70 -0
               - libs/core/src/map.ts +9 -2
               - libs/core/src/schema.ts +25 -0
  spent        10 min · 143s gate · green first run
  ```

  **Verdict**: ◐ A hair off (2 commits outside the ledger)

  **Recommendation**: Approve it, answering the twelve leans in one reply. The read checked each seam against the file it names (`shape.ts`, `interior.ts`, `drift.ts`, `membranes.ts`, `labels.ts`, `marks.ts`, `skin.ts`, `ribbons.ts`, `view.ts`), found every done-when a test, a golden or the smoke test can measure, and found no range that runs through an open call once the leans are answered. The three findings above are the plan's own calls for you to glance at, not holes a builder would guess through.

  **1.** §4.7's clause on the SVG binds nothing, and the plan read it for you (D201, in Decisions)

  The spec says the still SVG draws the same nuclei "wherever it draws an opened cell" and keys a nucleus in its legend. `libs/svg` has no slide: `cellSlide` and `interiorOf` are called from `apps/web` alone, and the SVG's legend keys the surface's marks. The plan reads the clause as vacuous and keys the nucleus in the world's legend only (step 10), which is a call made on your behalf. A nucleus on the still needs Q88 (surface-nuclei) answered yes and a step for the SVG's organelles that the plan does not carry.

  **2.** §4.5 "more weather" has no candidate the map carries undrawn (Q85 in the table)

  The world already draws every standing mark the still map does: history as hatching and stipple, co-change ghosts, standing storms, clone glyphs, and cycles and boundaries as ribbons (`apps/web/src/marks.ts`). The one reading nothing draws is `reachable: false`. The lean lands no step; naming a pattern here means `/plumbbob:refine` writes its step into range 4 before any code, with a channel C11 can give it.

  **3.** Step 3 moves every SVG golden at once

  The spectrum gives a form to every file with history, so each fixture SVG under `fixtures/` (34 reviewed PRs) and the demo goldens regenerate in one step, and the retake maps you know by eye change shape. C16 (goldens-named) covers it and no glance reading is in scope (§5), but the diff is the build's largest, and it lands before you have judged the spectrum in the world at range 1's stop. Cutting range 1 at `1-2` would let you judge the score's spread on a map first; the plan keeps `1-5` so the stop has the demo switch to judge with.

- 2026-11-18 — step 2 checkpointed · 579bcc9bb — feat(scene): score each file's trouble on one spectrum from the map (1 red, 11m)
- 2026-11-18 — step 3 checkpointed · d970d296e — feat(scene): draw every file's outline on a continuous spectrum (3 red, 1 drift, 622m)

  **Summary**: Every file's outline is now a point on one continuous spectrum, read from its trouble score, in the SVG, both legends, the world's surface, the hover, the slide and the file plate; the seven forms are unchanged at their own scores and everything between them is a morph. The run halts here because two of the proof's geometry tests cannot hold as written and I restated them instead of passing them quietly: continuity is held at a thousandth of the score in place of a hundredth, and "a higher score never gives a smaller greatest radius" is held on a new `extent` the outline carries, not on the ring's own furthest point. Approved on 2026-11-17, and not landed yet: the checkpoint refused twice on a red check. The first refusal was partly mine, a lint error in the new legend test (a helper declared inside the test that captures nothing), which I had missed when I wrote that every slot but `test` was green; it is fixed and lint is green. What remains red is `test` alone, on 5-second timeouts in a different handful of tests each run (six on the last, in core's layout, the CLI, the dev panel, and the HUD and SVG chrome fixture sweeps), while a Stryker mutation run in the checkride project holds this 8-core machine at a load of 20 and above; the two sweeps take 2.8 s and 1.8 s alone, the same with and without this step.

  1. The proof's continuity bound cannot be met by any outline that keeps today's forms
  2. The monotone test is held on the outline's extent, not the ring's furthest point
  3. The arms hold and then fade; a plain blend would shrink a file halfway between two forms
  4. Eight files outside the seam moved, one of them shipped code
  5. Five of the 32 fixture SVGs regenerated; the rest are older renders, and the practice map is parked

  **Readout**:

  ```text
  check        green: 1 of 1 checks
  proof        not met: two geometry tests hold only as restated
               → sections 1 and 2: continuity at a thousandth, monotone on the extent
  decisions    2 of 2 honored
  constraints  10 of 10 honored
  plumb        seam 18 · reach 9 · out 5
               - apps/web/src/__tests__/hover.test.ts
               - libs/scene/src/__tests__/file.test.ts
               - libs/svg/fixtures/demo/renamed.svg
               - libs/svg/fixtures/repo/coverage-gaps.svg
               - libs/svg/fixtures/repo/trouble-spots.svg
  diff         +832 -443 across 32 files
               - apps/web/src/__tests__/hover.test.ts +2 -2
               - apps/web/src/__tests__/hud.test.tsx +1 -1
               - apps/web/src/chrome/legend.tsx +6 -6
               - apps/web/src/hover.ts +3 -3
               - apps/web/src/hud.ts +2 -2
               - apps/web/src/world/interior.ts +2 -2
               - apps/web/src/world/organelles.ts +15 -14
               - and 25 more
  spent        10h 22m · 2 turns · 142s gate · 3 red runs
  ```

  **Verdict**: ○ Out of plumb (proof not met)

  **Recommendation**: Type `looks good` again once the Stryker run in checkride has finished. Nothing in step 3 is waiting on a change: the only red left is test timeouts under that load, and the checkpoint runs the check itself and lands only on green. Then `/plumbbob:run` carries on with steps 4 and 5.

  **1.** The proof's continuity bound cannot be met by any outline that keeps today's forms

  The proof asks that two scores 0.01 apart give rings whose matching points differ by less than a hundredth of the radius. The spiky end makes that impossible whatever the morph: between the fifth form and the sixth, an angle that holds a 13-arm tip (about 1.4 radii out) must come down to the 18-arm form's body (about 0.83 radii) inside a sixth of the spectrum, which is at least 0.03 of the radius for every 0.01 of score on average, and the proof also pins both forms ("each integer level's ring matches today's form within rounding"). Measured on the outline as built, matched points move up to 0.011 of the radius per 0.001 of score at the spiky end and 0.001 at the smooth end.

  So `shape.test.ts` holds continuity three ways. Two scores a thousandth apart give rings whose matching points differ by under a fiftieth of the radius, across the whole spectrum, for five paths. The first sixth of the spectrum does hold the proof's own numbers, a hundredth of the radius across a hundredth of the score (within 0.011). And no outline jumps as it passes a form: a millionth of the score either side of each whole level the ring is within a ten-thousandth of the radius of the form itself, bulbs included.

  Rings are compared point for point only where they are drawn through the same number of points. `samples` runs linearly between the forms, as the proof says, so the count ticks by one about every 0.005 of score at the spiky end, and across a tick every point shifts round the ring.

  **2.** The monotone test is held on the outline's extent, not the ring's furthest point

  `Outline` gains `extent`: the radius no point of the ring lies outside, the body's swell and its longest arm together. It never shrinks as the score climbs, for any path, and the test checks that at 601 scores for five paths, with every ring point inside it.

  The ring's own furthest point cannot carry the test, for two reasons I measured. First, the two spikiest forms are drawn through too few points: at form 6 an arm is about one sample wide (160 points round 18 arms of sharpness 20), so the ring catches each tip at 53 to 100 percent of its length depending on where the points fall. That is true of today's forms, not new, and it makes the ring's furthest point wander by up to 0.18 of the radius as the sample count changes with the score. Second, even with perfect sampling the forms' own body wobble (0.05, 0.07, 0.05, 0.03, 0.02 from form 1 to form 5) can put a lower form's longest arm on a wobble crest and the next form's in a trough, so the seven forms are not monotone for every seed either. The existing test that each of the seven forms reaches further than the one before still passes on its five paths.

  The undersampling is parked, since it also makes a turning spike flicker in the slide.

  **3.** The arms hold and then fade; a plain blend would shrink a file halfway between two forms

  The proof describes the cross-fade as the lower form's profile fading out as the upper's fades in by the level's fraction. Read as a linear blend, both sets of arms are half length halfway between two forms, so a file at 5.5 would look less spiky than one at 5, which is the opposite of what the monotone test is for. As built, the lower form's arms keep their full length through the first half of the way while the upper form's grow in beside them, then fade out through the second half, and the outline is whichever of the two stands further out at each angle. `reach`, `sharp`, `wobble`, `bulb` and `samples` run linearly, as the proof says.

  The bulbs fade by the fraction: the lower form's out, the upper form's in. The proof says only that the bulbs follow the upper form's arms, which would drop form 5's thirteen bulbs the instant a score passes it; fading them out keeps the outline continuous there. Between forms 5 and 6 an outline therefore wears up to 31 bulbs, 13 fading and 18 growing.

  Both arm sets read one run of seeded lengths, so an arm keeps its length and its beat as the forms change round it, and arm 0 of each form points the same way.

  **4.** Eight files outside the seam moved, one of them shipped code

  `apps/web/src/world/interior.ts`: one constant. The slide's body mesh sizes its vertex buffer for the most bulbs an outline carries, which was the most arms of any form (18); with two bulb sets fading past each other it is now the most any two neighbouring forms carry together (31). Without it a body between forms 5 and 6 writes past the buffer.

  Tests that pinned the old call: `libs/scene/src/__tests__/interior.test.ts`, `libs/scene/src/__tests__/file.test.ts` and `apps/web/src/__tests__/hover.test.ts` now build their expected outline from the score. `libs/svg/src/__tests__/chrome.test.ts` and `apps/web/src/__tests__/hud.test.tsx` read the shape key's samples by `data-level`, renamed from `data-rules` because a sample is no longer a rule count (one rule scores 0.4, which lands between the third and fourth samples).

  Goldens: the eight under `libs/svg/fixtures/` (the demo, its renamed variant, the four categories and the two repo overlays) regenerate, as the proof says. Under `fixtures/`, see section 5.

  **5.** Five of the 32 fixture SVGs regenerated; the rest are older renders, and the practice map is parked

  The proof says the SVG goldens under `fixtures/` regenerate. No test compares them, and rendering each `fixtures/*/map.json` with today's renderer shows only five are current: `go-1`, `javascript-1`, `python-1`, `shell-1` and `terraform-1` differ from a fresh render in their shapes and the key's words alone, so those five are regenerated. The other 27 were rendered by older builds and differ in hundreds to thousands of other lines (the HUD's Size block, for one), and three of their maps (`checkride-pr2`, `fascicle-pr4`, `fascicle-pr5`) no longer pass `assertMap`, so regenerating them would land drift that has nothing to do with shapes. They are left as they were.

  `docs/glance-practice.svg` is in the same state: it still keys `shape: rules it breaks, 0 to 6`, and it was already behind the renderer before this step. It is outside the seam, so it is parked for `pnpm practice-map`.

  `TROUBLE_RULES_FROM` and `SHAPE_LEVELS` stay baked for now in the sense C15 (every-look-a-token) asks to be named: the world's surface builds its outlines once from the map, so a value the dev panel moves shows at the next build of the world, not on the next frame.

- 2026-11-18 — step 4 checkpointed · ca96b0bda — feat(scene): move the spectrum's spiky end most, and least regularly (1 red, 1 drift, 11m)
- 2026-11-18 — step 5 checkpointed · 601636fda — feat(web): cycle an opened cell's files across the spectrum on demand (1 red, 14m)
- 2026-11-18 — range 1 of 6's stop recorded — judge the spectrum on atis's own map: at the surface a troubled file told from a calm one by shape alone; inside an opened cell, with `?shapes=demo` and without, the forms against `docs/img/materials-spike/a-5-shapes-demo.png` and the spiky end's pulse and jitter; settle [Q87 (exaggeration-numbers)](#q87)'s shape values (`SHAPE_PULSE`, `SHAPE_JITTER`) by eye before the slide builds on them

  **Summary**: Range 1 built the spectrum end to end: each cell's imports counted through and past its interface, a trouble score per file, the outline as a continuous morph across the seven forms, the motion and jitter that grow with the score, and the `?shapes=demo` switch. Every step's proof is met and the check is green. One thing stands in the way of the stop's first judgment: on atis's own map almost every file is still a circle. No atis file breaks a rule, and the score reads history only from the fields the map sets on files a change touched, so 0 of 165 files have a form on a whole-repo map and 7 of 165 on the last commit. That is parked as P4 and I lean blocker. The forms and their motion can be judged today with the demo switch, which I confirmed in the real app on two fixtures; I looked at stills only, so the pulse and the jitter are unjudged.

  1. Shape reads history only on the files a change touched, so atis's own map is nearly all circles
  2. Step 4 landed a hair off: one test file outside its seam and reach, and steps 4 and 5 each needed a rerun
  3. The spiky end moves most and least regularly, at starting values nobody has seen move
  4. The demo switch works in the real app, on stills
  5. Step 3 holds two of its proof's tests as restated, and the spikiest forms' sampling waits on this stop

  **Readout**:

  ```text
  steps        5 of 5 landed
               - 1 dbd09d8 · 2 579bcc9 · 3 d970d29 · 4 ca96b0b · 5 601636f
  check        green: 1 of 1 checks, 5 landings
  proof        met
  decisions    honored:
               - D192 (cell-integrity)
               - D194 (shape-spectrum)
               - D200 (one-meaning-per-mover)
               - D202 (demo-switch)
  constraints  10 of 10 honored
  seam         strayed: 6 paths outside 2 steps' seams
               - step 3: apps/web/src/__tests__/hover.test.ts and 4 others
               - step 4: libs/scene/src/__tests__/shape.test.ts
  diff         +1580 -512 across 57 files
               - apps/atis/src/__tests__/png.test.ts +13 -1
               - apps/atis/src/png.ts +13 -3
               - apps/web/src/__tests__/hover.test.ts +2 -2
               - apps/web/src/__tests__/hud.test.tsx +1 -1
               - apps/web/src/__tests__/status.test.tsx +15 -1
               - apps/web/src/__tests__/view.test.ts +10 -0
               - apps/web/src/chrome/frame.tsx +4 -2
               - and 50 more
  spent        11h 12m · 6 red runs · 2 drift warnings
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Harvested**: **2** of 4 parked ideas open

  | Park | Why it matters | Lean |
  | --- | --- | --- |
  | **P3**: [HUD test's 5 s timeout](#park-list) | it turned three full checks red this range and each rerun costs about two and a half minutes | tangent: a timeout on a test no step touches, cured by one argument, though it will keep costing reruns on a loaded machine |
  | **P4**: [shape reads changed-file history only](#park-list) | 158 of 165 atis files are circles on a change map and all 165 on a whole-repo map, so files cannot be compared by shape | blocker: D194 (shape-spectrum)'s own reason, most files leaving the circle, is unmet on atis's own map until the score reads the history every file carries |

  **Recommendation**: Settle the two shape values with the demo switch now, and take P4 as a blocker before judging the surface on atis's own map. The switch shows every form moving on any map, so `SHAPE_PULSE` and `SHAPE_JITTER` do not wait on P4, and the last two files in a demo are where P2's flicker would show. The surface on atis's own map has nothing to compare until the score reads `stability.churn_ratio`, which would be one small step ahead of range 2; `fixtures/javascript-1`, with 128 of 414 files in a form, is the surface to judge meanwhile. I wrote atis's own maps to `.playwright-mcp/range-1/atis-own.json` and `.playwright-mcp/range-1/atis-last-commit.json`. The dev build carries the tokens panel (Ctrl+Alt+Shift+T):

  ```sh
  pnpm --filter web dev
  ```

  Then open `http://localhost:5173/?map=/@fs/Users/robmclarty/Projects/atis/code/atis/.playwright-mcp/range-1/atis-last-commit.json&shapes=demo` and zoom into a cell until it opens. Tell me the values you settle on and whether P4 is a blocker; `make P4 a tangent` leaves the score as it is.

  **1.** Shape reads history only on the files a change touched, so atis's own map is nearly all circles

  `troubleOf` (step 2) takes history as the greater of the organelle's `churn_ratio` and `bugfix_rate`, the top-level fields. The map sets those only on the files the change touched. Every file the history window saw carries `stability.churn_ratio` as well, and the score does not read it.

  Counted on maps written at the range's head (601636f) with the `atis` on the PATH:

  - atis, whole repo: 165 files, 0 with a broken rule, 0 with top-level history, so 0 with a form; all 165 carry `stability.churn_ratio` above 0.
  - atis, last commit: 165 files, 0 with a broken rule, 7 with top-level history (the files step 5 touched), so 7 with a form.
  - `fixtures/javascript-1`: 414 files, 127 with a broken rule, 128 with a form; 405 would have one if the score read stability's churn.
  - `fixtures/corpus-7`: 1344 files, 212 with a form. `fixtures/retake-5` (hono): 242 files, 49 with a form. Neither fixture's map carries `stability`.

  D194 (shape-spectrum) gives its reason as the seven stepped forms leaving four files in five as plain circles, and Q81 (spectrum-signals)'s answer says history shades the bottom so most files leave the circle. On atis's own map that has not happened. Step 2 built what its proof says; the proof names `churn_ratio` without saying which one. Reading `stability.churn_ratio` where the top-level field is absent would give atis's files scores of about 0.18 to 0.28 (churn of 1.3 to 2.1 over `CHURN_FULL_AT` 3, under the first rule's 0.4), gentle forms between the first two samples. Whether that is the reading wanted is the call: stability already owns relief, so it would put one reading on two channels, which C11 (one-meaning-per-channel) allows only where a decision names it.

  **2.** Step 4 landed a hair off: one test file outside its seam and reach, and steps 4 and 5 each needed a rerun

  `ShapeMotion` gained a required `jitter`, so two literals in `libs/scene/src/__tests__/shape.test.ts` now spread `AT_REST`; that file is in neither step 4's seam nor its reach. `apps/web/src/registry.ts` lists `SHAPE_JITTER` (in the reach), since the panel's sections are the design doc's tables.

  Step 4's checkpoint was refused once and step 5's check and checkpoint were red twice, each time on a timeout in a browser or DOM test the steps do not touch, with the machine's load average between 27 and 72: `hud.test.tsx`'s walk over every committed fixture passed vitest's 5 s default by 0.4 to 1.7 s three times, and `world.test.ts`'s tour test timed out once. Both pass alone (1.1 s and 4.7 s). Step 5 also had one real lint error of mine, a `toSorted()` on numbers with no compare in the new interior test, fixed before it landed. The HUD test is parked as P3.

  **3.** The spiky end moves most and least regularly, at starting values nobody has seen move

  The scheduler's `shape(score)` lands the score at `score × MAX_RULES` among the forms as `outlineOf` does, and `SHAPE_PULSE_HZ`, `SHAPE_PULSE` and `SHAPE_TURN` run linearly between the pair either side. `jitter` is `SHAPE_JITTER × score` radians: each arm's beat wanders by up to that either way on a slow sine whose rate and phase are the arm's own by the path's seed. A score of 0, a non-finite score and reduced motion are `AT_REST`. `interiorOf` hands each body's score to `shape`, so a file with no broken rule and some history now moves inside an opened cell.

  Starting values for Q87 (exaggeration-numbers): `SHAPE_PULSE` is `0, 0.31, 0.38, 0.4, 0.44, 0.48, 0.52`, about a quarter over the spike's at every level, bound still below 1; `SHAPE_JITTER` is `1.5`, bound above 0 and at most π. Both are live in the tokens panel. Baked: the jitter's wander rate, 0.05 to 0.2 Hz (a wander of 5 to 20 s), is a constant in `libs/scene/src/shape.ts`, not a token. `docs/design.md` has the table row and a balance-log line dated 2026-11-18.

  **4.** The demo switch works in the real app, on stills

  `viewOf` reads `?shapes=demo`; `interiorOf` then gives each body of the opened cell a score by its index in path order, `index / (count − 1)`, and the body's outline and motion read it. The slide's own scores, the surface and the SVG are untouched. The status line appends `shapes: demo` in every load state. `--png`'s URL is built by the new `captureUrl`, which deletes any `shapes` parameter.

  I ran the dev build on WebGL 2 against the demo fixture and `fixtures/retake-5`: the status line read `demo against main · shapes: demo`, and hono's opened package showed a circle, a soft lobed form, a star, and the two spikiest forms with their bulbs. The screenshots are in `.playwright-mcp/range-1/`. With `?time=` set the clock is frozen and the slide never fades in, so a demo is looked at with the clock running. I did not watch it move.

  **5.** Step 3 holds two of its proof's tests as restated, and the spikiest forms' sampling waits on this stop

  Approved at step 3's pause: continuity is held at a thousandth of the score (under a fiftieth of the radius) across the whole spectrum, and "a higher score never gives a smaller greatest radius" is held on the outline's analytic `extent`. The cause is P2, harvested as a tangent at step 3's boundary: forms 5 and 6 are drawn through about one point per arm, so the ring catches each tip at 53 to 100 percent of its length, which may flicker as a shape turns. That park waits on what this stop shows of the spiky end in motion, so the demo's last two files are where to look for it.

  Step 1 found no cell on atis's own map with `past` above 0, so range 3's ripple is judged on `fixtures/javascript-1`, as Q94 (range-3-map) allows.

- 2026-11-18 — step 19 checkpointed · db8e6f3b6 — feat(scene): shade every file's shape by the churn its stability carries (24m)

  **Summary**: `troubleOf` now reads a file's churn from `stability.churn_ratio` where it has no `churn_ratio` of its own, so on atis's own whole-repo map all 165 files score above 0 (none did before) and no file is drawn as a circle; on the last commit it is 165 of 165, up from 7. The caveat for the call this pause holds: the spread is narrow. 155 of the 165 files score between 0.13 and 0.27, one soft wobble for nearly all of them, because the churn the log window measures counts each file's own birth, so no file reads calm. Three files with no broken rule reach 0.40, the score one broken rule gives, and atis breaks no rule, so the spiky end is empty.

  1. The scorer falls back to stability's churn and says which it read
  2. On atis's own map every file leaves the circle, and nearly all by the same amount
  3. One test outside the seam followed the change
  4. Thirteen SVG goldens moved, all for one reason

  **Readout**:

  ```text
  check        green: 1 of 1 checks
  proof        met
  decisions    2 of 2 honored
  constraints  10 of 10 honored
  plumb        seam 16 · reach 1 · out 0
  diff         +1763 -1330 across 17 files
               - docs/design.md +9 -2
               - fixtures/go-1/atis.svg +139 -139
               - fixtures/javascript-1/atis.svg +816 -452
               - fixtures/python-1/atis.svg +203 -203
               - fixtures/shell-1/atis.svg +337 -337
               - fixtures/terraform-1/atis.svg +144 -144
               - libs/scene/src/__tests__/trouble.test.ts +43 -0
               - and 10 more
  spent        24 min · 1 turn · 149s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Look at atis's own whole-repo map before approving, and expect the shape test to fail as it stands. The step does what D203 (history-on-every-file) decided and its proof holds, so it is sound to land, but with every file at one soft wobble the surface does not yet tell a troubled file from a calm one; the parked line about churn counting a file's birth is the fix to plan, and a `/plumbbob:refine` that gives it a step is the move I would take after `looks good`. To see it live:

  ```sh
  atis --whole-repo
  atis --last-commit
  ```

  **1.** The scorer falls back to stability's churn and says which it read

  `troubleOf` in `libs/scene/src/trouble.ts` takes `stability` alongside `dents`, `churn_ratio` and `bugfix_rate`. The churn it scores is the file's own `churn_ratio`, else `stability.churn_ratio`. `used` names `churn_ratio` or `stability.churn_ratio`, whichever was read, and `missing` names `churn_ratio` only where the map carries neither, which includes a stability that has an age and no churn. A file's own 0 is a reading and wins over a higher stability churn. Nothing is defaulted (C2 (never-fake)), and the score is the same function of the same inputs as before (C3 (deterministic)). `bugfix_rate` is read as it was.

  The four callers named in the seam (`interior.ts`, the SVG's `terrain.ts`, `hover.ts`, the world's `organelles.ts`) already hand `troubleOf` the whole organelle, so each passes its stability with no edit; the widened parameter type is what makes that hold.

  Four tests joined `trouble.test.ts`: stability-only churn scores as the same top-level churn at every rule count and names `stability.churn_ratio`; a top-level churn wins, higher or lower, a measured 0 included; `churn_ratio` is missing only where both are absent; the score is monotone in stability's churn and the same on every call.

  **2.** On atis's own map every file leaves the circle, and nearly all by the same amount

  Measured on fresh maps of this repository at 601636f, whole repo and last commit, 165 files each:

  - above 0: 165 of 165 whole repo (0 before the step), 165 of 165 last commit (7 before)
  - read through stability: 165 whole repo, 158 last commit; `churn_ratio` missing on none
  - scores: one file under 0.07, 128 between 0.13 and 0.20, 27 between 0.20 and 0.27, 6 between 0.27 and 0.33, 3 at 0.40
  - churn ratios: least 0.47, median 1.22, 90th percentile 1.79, greatest 3.52, against `CHURN_FULL_AT` at 3
  - broken rules: none on any file

  The three at 0.40 are `libs/svg/src/fingerprint.ts`, `libs/svg/src/terrain.ts` and `libs/svg/src/weather.ts`, their churn past 3 and clamped. The proof's count (more than half above 0) is met with room. The judgment the stop asks for is a different question, and the numbers lean against it: a file the window saw being written has churned at least its own size, so the least-changed file on the map still sits near 0.06 and the typical one at 0.16. Shape now says "has a history" for every file rather than telling a troubled one from a calm one. This is parked, with the two ways out it suggests: subtract the birth before scaling, or start the scale above it. `CHURN_FULL_AT` is a live token, but moving it shifts every file together and cannot open the spread on its own.

  The still SVG of the whole repo is at `/tmp/atis-step19/whole.svg`, and the rebuilt `atis` on the PATH serves the world with this step in it.

  **3.** One test outside the seam followed the change

  `libs/svg/src/__tests__/render.test.ts` held "bigger file, bigger circle" on two demo files, `slots.ts` and `apps/cli/src/index.ts`, that were circles only because the scorer ignored their stability. Both now have a form, so the test makes the size comparison on the demo with stability dropped, where each is the circle its lines size, and still holds on the real demo that a file is a circle exactly when its score is 0. Only `legacy.ts`, which the log window never saw, stays round there.

  **4.** Thirteen SVG goldens moved, all for one reason

  Every one moved because files the log window saw and no change touched now have a form in place of a circle (C16 (goldens-named)): under `libs/svg/fixtures/`, the demo's `atis.svg` and `renamed.svg`, the four categories (`LIFR`, `MVFR`, `NOINST`, `VFR`) and the two repo overlays (`coverage-gaps`, `trouble-spots`); under `fixtures/`, `atis.svg` in `go-1`, `javascript-1`, `python-1`, `shell-1` and `terraform-1`, the five that matched a fresh render before the step. The other fixture SVGs were already older renders no test compares and are left as they were. In the demo three undented files gained an outline and the two files in a cycle moved a little, their churn now shading them within their level.

  `docs/design.md` says where the churn is read from, in the `TROUBLE_RULES_FROM` row and in the spectrum's prose, and that churn shows on relief and on shape (C11 (one-meaning-per-channel)).

- 2026-11-18 — step 6 checkpointed · fe396985e — feat(scene): grow the drift's contrast through a looseness curve (7m)
- 2026-11-18 — step 7 checkpointed · 4eb814b3f — feat(scene): gather an opened cell's held files toward its middle (13m)
- 2026-11-18 — step 8 checkpointed · b806fc4b7 — feat(scene): lay each file's functions as a nucleus inside its body (10m)
- 2026-11-18 — step 9 checkpointed · f9c3c28a5 — feat(scene): send the tags out on leaders and leave the bodies in place (7m)
- 2026-11-18 — step 10 checkpointed · f2969dee4 — feat(web): draw the nuclei and the exploded tags in the world (2 red, 39m)
- 2026-11-18 — range 2 of 6's stop recorded — judge the opened cell beside `a-5-shapes-demo.png` (P37): a held file told from a loose one by its motion, the held core and the loose rim before any motion, the nuclei's density and the stains on their granules, and the exploded tags on a 16:9 screen with every name readable and no body moved; settle [Q87 (exaggeration-numbers)](#q87)'s drift values (`DRIFT_REACH`, `DRIFT_CURVE`)

  **Summary**: Steps 6 to 10 landed, each on a green `pnpm check --strict`, and the opened cell is now built the way the stop asks to judge it: a file drifts by its looseness raised to `DRIFT_CURVE` (1.5) over a reach of 0.3; held files rest toward the slide's middle and loose ones toward its rim (`INTERIOR.gather` 0.4); each file's functions are a nucleus of granules inside its body; and the exploded view sends the tags out on elbowed leaders, inside the chrome's margins, and moves no body. Every number is a starting value nobody has judged by eye: I saw one headless frame of the demo, enough to know the granules draw and the leaders elbow, and no more. Three things bear on your judging. The raised reach already meets the speed cap at the zoom a cell opens at, so the float reaches further but its clock runs about a fifth slower. Most committed fixtures carry no ties and no functions, so the drift, the gathering and the nuclei show only on a freshly scanned map such as atis's own. And each step touched a file or two outside its seam, all named in its commit body. Step 10's checkpoint went red twice on timeouts while another project's run held this machine's load near 180, and green on the third run with nothing changed.

  1. The raised reach meets the speed cap, so the float goes further and no faster
  2. The gathering needed three things the proof did not name
  3. A full nucleus draws about a tenth under `NUCLEUS_FILL`
  4. The tags take the chrome's claims as whole-screen margins, and a few things went with the spread
  5. Where to look, and which tokens move what
  6. Rob judged the stop on 2026-11-18 and kept the drift's starting values

  **Readout**:

  ```text
  steps        5 of 5 landed
               - 6 fe39698 · 7 4eb814b · 8 b806fc4 · 9 f9c3c28 · 10 f2969de
  check        green: 1 of 1 checks, 5 landings
  proof        met
  decisions    honored:
               - D193 (looseness-curve)
               - D199 (held-files-gather)
               - D197 (nuclei)
               - D198 (labels-explode)
               - D201 (slide-only-svg)
               - D165 (cell-float)
               - D156 (dev-panel)
  constraints  10 of 10 honored
  seam         held: 5 of 5 steps, no strays
  diff         +1222 -319 across 16 files
               - apps/web/src/__tests__/hud.test.tsx +2 -1
               - apps/web/src/__tests__/world.test.ts +28 -4
               - apps/web/src/chrome/legend.tsx +17 -0
               - apps/web/src/hud.ts +4 -1
               - apps/web/src/materials.ts +9 -7
               - apps/web/src/registry.ts +6 -0
               - apps/web/src/world/draw.ts +42 -5
               - and 9 more
  spent        77 min · 2 red runs
  ```

  **Verdict**: ◐ A hair off (2 red runs before green)

  **Harvested**: **4** of 9 parked ideas open

  | Park | Why it matters | Lean |
  | --- | --- | --- |
  | **P6**: [drop the overworld view](#park-list) | the far view slows getting into the cells, which is where the reading happens | tangent: a change to the world's levels, wider than this build's nine changes |
  | **P7**: [glitchy selection and rendering](#park-list) | clicks, fills and 3D elements misbehave across the world, before and after this range | tangent: Rob confirmed it predates this build, and no step ahead builds on selection |
  | **P8**: [unexplained issue map](#park-list) | a reader cannot tell what the rectangle is or how to close it | tangent: the plate works and is liked; it lacks a name and a way out |
  | **P9**: [cell inspector panel](#park-list) | a click on a cell has nowhere to show the file's details | tangent: a new surface whose contents are undecided |

  **Recommendation**: Judge it on a fresh map of atis before replying, then settle the two drift values in the dev panel and tell me what they came to. Leave `DRIFT_REACH` at 0.3 and tune `DRIFT_CURVE` first: the reach already meets the speed cap, so more of it slows the float rather than livening it, while the curve alone sets how still a held file sits beside a loose one. If a loose file still reads sluggish, the lever is `DRIFT_SPEED`, which D165 (cell-float) bounds at 0.05, and that is a call for you and not a patch I would make unasked. The world's dev server, to open with `?map=/@fs/` and the absolute path of the map:

  ```sh
  pnpm --filter web dev
  ```

  **1.** The raised reach meets the speed cap, so the float goes further and no faster

  At `DRIFT_REACH` 0.3 the wander's fastest point would outrun `DRIFT_SPEED` (0.02 of the screen a second) at the zoom a cell opens at, so the float's own clock now runs at about 0.81 of the wall's there, as D165 (cell-float) has it do when zoomed in. The old test held that nothing capped the wander at that zoom; it now holds that the clock slows and never stops. Raising the reach further buys distance and costs pace: at 0.5 the clock would run near half speed.

  A second fact for the tuning: a wholly loose file wanders on two seeded sines, and how far that carries it depends on their phases. Over a minute at twelve seeds a wholly loose file got between 0.45 and 1.0 of the full reach from its rest, most often about 0.6. The proof's test (within a tenth of the full reach) holds for `slots.ts` at the tests' seed, which is one of the far ones. So the reach is a ceiling, and a typical loose file moves about two thirds of it.

  The curve itself does what Q98 (curve-quiets-middle) said: a file a fifth loose moves 0.09 of the reach where its straight share was 0.2, and the test holds the loose file to more than ten times the fifth-loose one's wander.

  **2.** The gathering needed three things the proof did not name

  `restOf` moves each file along the line to the slide's middle by `gather × (held − mean held) × distance`, pushes the rests apart, holds them inside the membrane and off the held cells, and sends back to the layout's place any rest that still crosses a skin, stands too near one, or lies over another body. On the outside repo's fixture it moves all 64 tied files of `src/rules`.

  Beyond the proof: the float has to gather by the same token the slide does, so `FloatView` in `libs/scene/src/motion.ts` gained an optional `gather` and `apps/web/src/world/draw.ts` hands it `INTERIOR.gather`, both outside step 7's seam. A still file that stands off its rest now heads back to it at the speed cap; without that, a held file the surface had eased home stayed wherever its cell opened on it again, since only loose files moved. And the rests keep `DRIFT_GAP` between bodies, the float's own gap, where the spec's section 4.9 names the exploded view's clear ground, which step 9 retired.

  One thing to look for: a cell opens with its files already at their rests, so the slide fades in over the surface's layout places with the held files standing nearer the middle than the surface drew them. The proof asks for exactly that (`startFloat` reads the rest), and it is the "before any motion" reading the stop names.

  **3.** A full nucleus draws about a tenth under `NUCLEUS_FILL`

  A nucleus is laid once per file and rides its body: the granules lie from the body's middle, so a frame costs nothing for them and they cannot pulse or turn. Each stands as far out as the area before it and half its own, turned the golden angle from the last, and a lone function sits at the middle.

  Equal granules on such a spiral lie clear of one another only up to about 0.55 of its disc. `NUCLEUS_FILL` 0.5 inside a core padded by `NUCLEUS_PAD` 0.1 asks for 0.62, so a full nucleus is shrunk whole by about a tenth of its area to stay inside the padded core. That limit is baked as `NUCLEUS_PACK_MOST`, since it is geometry and not a look. If the densest file should read fuller, lower `NUCLEUS_PAD` toward 0.07, the body's deepest wobble, before raising the fill.

  In the world a round granule is a 12-segment fan and a dented one keeps every point of its ring. The fans are laid again each frame with the bodies, so a cell of many large files adds per-frame vertex work that step 18's budget row should measure.

  **4.** The tags take the chrome's claims as whole-screen margins, and a few things went with the spread

  `tagsOf` lays each leader as from, elbow, to, shrinks a crowded column's rows and words to `TAG_ROW_FLOOR`, then keeps the tags nearest the view's middle above a footer, `and 23 more`. The 80-file test holds it level, tilted to 35 degrees and zoomed past a 1440 by 900 screen.

  The scene's margins are top, bottom, left and right for the whole screen, as the proof words them. So the HUD's height comes off the top of both columns and the legend's or the minimap's off the foot of both, though each sits on the left alone. The world reads those boxes from the page every 15 frames while a slide shows and caps each claim at a third of the height, so an open legend cannot squeeze the columns to nothing. If the right column looks short on a wide screen, per-column margins are the fix, and that is a change to step 9's `Screen`.

  Gone or added beyond the proof: `explodeGap` went with `explodeSpread` and `explodePush`, since nothing else read it; a `Tag` carries the size its words are set at; a body under the pointer whose column had no row for its tag is tagged by itself, so a hover never comes up empty in a crowded cell; and the world's legend keys the nucleus as a fifteenth mark while the sheet keeps fourteen, which moved one assertion in `apps/web/src/__tests__/hud.test.tsx`, outside step 10's seam.

  **5.** Where to look, and which tokens move what

  The dev panel moves all of it live. Under Motion: `DRIFT_REACH`, `DRIFT_CURVE`, `DRIFT_SPEED`. Under the base tissue: `NUCLEUS_FILL`, `NUCLEUS_PAD`, `NUCLEUS_MOST`. Under the chrome: `TAG_ELBOW`, `TAG_ROW_FLOOR`. Under the opened cell: `INTERIOR.gather`, `INTERIOR.granuleShade`.

  Of the committed fixtures only `fixtures/round-two-3` carries ties, and few carry functions, so the float, the gathering and the nuclei need a map scanned by the current build. `?shapes=demo` still spreads an opened cell's files across the spectrum, and under it each nucleus is laid for the demo score's core.

  **6.** Rob judged the stop on 2026-11-18 and kept the drift's starting values

  He likes the cell and file shapes, the animation and the movement as built. Q87 (exaggeration-numbers)'s drift values stand where step 6 set them: `DRIFT_REACH` 0.3 and `DRIFT_CURVE` 1.5. What he would change is wider than this build, and is parked as P6 to P9.

- 2026-11-18 — step 11 checkpointed · c7022a189 — feat(scene): read each membrane's wobble from its cell's integrity (1 drift, 15m)
- 2026-11-18 — step 12 checkpointed · 1682c274b — feat(web): ripple the skin's membrane line by its cell's integrity (11m)
- 2026-11-18 — step 13 checkpointed · d2219579f — feat(scene): mark the ribbons that enter a cell past its interface (12m)
- 2026-11-18 — step 14 checkpointed · 3c819a7ad — feat(web): oscillate the marked ribbons along their length (13m)
- 2026-11-18 — range 3 of 6's stop recorded — judge the surface: a module entered through its interface told from one imported past it by its membrane, and a swaying ribbon against a still one, the ripple on atis's own map where step 1 found a cell with `past` above 0, else `fixtures/javascript-1`, and the sway on `fixtures/corpus-7` ([Q94 (range-3-map)](#q94)); confirm [Q84 (oscillating-links)](#q84)'s reading or redirect it before the labels land

  **Summary**: Steps 11 to 14 landed, each on a green `pnpm check --strict`. A cell's membrane line now ripples by the share of its outside imports that land past its barrel, and a ribbon whose import enters a module past its interface sways along its bow. Everything else holds still, and reduced motion stills both. Two things to know before you judge. First, neither map the stop names shows a ripple: atis's own map has 12 barrelled cells and none is imported past its barrel, and the map in `fixtures/javascript-1` predates the integrity field. Fascicle's own map does ripple, at three strengths: `src/engine` is entered 14 times and all 14 go past its barrel, `src/engine/providers/claude_cli` 3 times in 4, and the root package 9 times in 51. Second, the ripple is small on a real repo. It is 3 layout units, which on fascicle is a pixel or two at the zooms before a cell opens, and it is faint where the reach's glow fills a cell. The sway reads at a glance.

  1. Step 11 changed one test outside its seam and its computed reach
  2. No map the stop names ripples, and fascicle's own map does
  3. The ripple circles its place, and its grid is laid wider than the line
  4. A ribbon onto a folder's barrel from another package sways
  5. Where to look, and which tokens move what

  **Readout**:

  ```text
  steps        4 of 4 landed
               - 11 c7022a1 · 12 1682c27 · 13 d221957 · 14 3c819a7
  check        green: 1 of 1 checks, 4 landings
  proof        met
  decisions    honored:
               - D195 (living-membranes)
               - D192 (cell-integrity)
               - D171 (sibling-cells-apart)
               - D200 (one-meaning-per-mover)
               - D156 (dev-panel)
               - D94 (seeded-motion)
  constraints  10 of 10 honored
  seam         strayed: 1 path outside step 11's seam
               → apps/web/src/__tests__/world.test.ts
  diff         +1051 -114 across 20 files
               - apps/web/src/__tests__/hover.test.ts +15 -2
               - apps/web/src/__tests__/hud.test.tsx +40 -4
               - apps/web/src/__tests__/marks.test.ts +30 -0
               - apps/web/src/__tests__/world.test.ts +180 -11
               - apps/web/src/chrome/legend.tsx +56 -11
               - apps/web/src/hover.ts +13 -3
               - apps/web/src/hud.ts +8 -5
               - and 13 more
  spent        52 min · green first run at every landing · 1 drift warning
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Harvested**: **2** of 11 parked ideas open

  | Park | Why it matters | Lean |
  | --- | --- | --- |
  | **P10**: [Fixture maps lack integrity](#park-list) | no committed fixture shows a ripple until its map is rebuilt | tangent: the stop reads on fascicle's own map, so rebuilding the fixtures' maps can wait for its own step |
  | **P11**: [Faint line under reach](#park-list) | a lit cell's ripple barely reads beside an unlit cell's | tangent: a look to judge at this stop, and the dev panel moves the line's ink and the amplitude live |

  **Recommendation**: Judge the ripple on fascicle's own map and the sway on `fixtures/corpus-7`, then keep Q84 (oscillating-links)'s reading. The sway reads at a glance against a still ribbon and agrees with the membranes import for import. The ripple is the one to watch: if it is too quiet, raise `MEMBRANE_WOBBLE` in the dev panel before deciding it needs a second cue. I would leave both parks as tangents. Build first, since the world `atis` serves was built before this range:

  ```sh
  pnpm build
  atis --whole-repo --repo ~/Projects/fascicle/code/fascicle
  ```

  For the sway, serve the app from its sources and open `?map=/@fs/Users/robmclarty/Projects/atis/code/atis/fixtures/corpus-7/map.json&zoom=3&centre=896,4210` on the port it prints:

  ```sh
  pnpm --filter web dev
  ```

  **1.** Step 11 changed one test outside its seam and its computed reach

  The world's smoke test in `apps/web/src/__tests__/world.test.ts` counted the legend's rows as a literal, 15. Step 11 added a row, so the count had to move, and the file was in neither the step's seam nor its reach. It now reads `LEGEND.length`, so the row step 13 added needed no second change. That is the range's one stray, and the checkpoint flagged it.

  Three more files outside step 11's seam were in its reach: `apps/web/src/registry.ts`, whose test holds its Motion section to the design doc's table; `apps/web/src/chrome/legend.tsx`, for the new row's sample; and `apps/web/src/__tests__/hud.test.tsx`, which holds the legend's list. Step 13 touched the same three for the swaying line's row, and step 14 touched `apps/web/src/materials.ts` for the wave's length, all in reach.

  **2.** No map the stop names ripples, and fascicle's own map does

  The stop asks for the ripple on atis's own map, else on `fixtures/javascript-1`. I mapped atis at the range's head: 112 cells, 12 with a barrel, and every one is entered through its barrel alone, so every membrane holds still. That is the right reading of this repo, and it leaves nothing to judge. The map in `fixtures/javascript-1` was written before step 1 added the integrity field, as was every other committed fixture's, so none of them ripples either. Only the demo map under `libs/core/fixtures/demo` does, on its core package, entered once each way.

  I then mapped the two other repos you know, reading them only. Checkride has 13 barrelled cells and none is imported past its barrel. Fascicle has 21, and three are: `src/engine` at 0 through and 14 past, which is the full ripple; `src/engine/providers/claude_cli` at 1 through and 3 past; and the root package at 42 through and 9 past, which is under a fifth of it. So fascicle's map shows a hard ripple, a middling one and a slight one beside 18 still skins, which is the comparison the stop asks for.

  The sway is as the plan counted it: `fixtures/corpus-7` carries two swaying ribbons among its 104 still ones, both cycles in ra-core, and a test holds the count. Neither atis, checkride nor fascicle draws a ribbon that sways.

  **3.** The ripple circles its place, and its grid is laid wider than the line

  Step 12's proof gives the displacement as one sine. One sine along an axis leaves a line that runs along that axis still, and a sine on each axis in step ripples a diagonal 1.4 times too far. So the skin reads the line at a point that circles each fragment's place: the proof's sine on both axes, a quarter turn apart. A line then ripples by the amplitude and no more, whichever way it runs. The circle's phase runs with the place across the field, 72 units to a swell along a fixed heading, so a line swells along its length.

  A line moved by sampling can only move where the samples beside it carry the amplitude too. So step 11's grid carries each cell's amplitude under its line and out to 8 units either side, the bound the token keeps under, plus a sample. Where two skins run close, each sample takes the amplitude of the line it stands nearest, so a still skin beside a rippling one holds still. A test holds that with two squares 4 units apart.

  The cost: a map where no cell ripples lays no texture and samples nothing more than before. A map with one adds a texture the size of the tissue's and two reads to each fragment of the skin. Step 18's budget row measures it.

  **4.** A ribbon onto a folder's barrel from another package sways

  Step 13 marks a ribbon wherever core would count its import as `past` for some cell, so a ribbon and a membrane agree import for import. One case follows that may surprise. An import from another package onto a folder's barrel comes through the folder and past the package the folder sits in, when that package has a barrel of its own. Core counts it past the package, so the ribbon sways though it lands on a barrel. A test names the case, and the same import holds still once the package's barrel is taken away. If you would rather a ribbon that lands on any barrel hold still, that is a change to Q84 (oscillating-links)'s reading and to how D192 (cell-integrity) counts the package, and now is the time to say so.

  **5.** Where to look, and which tokens move what

  Hover a cell for the two counts behind its ripple: `src/engine · 0 through, 14 past`. A cell with no barrel says its folder alone. The legend's last two rows key the ripple and the swaying line.

  The dev panel moves all of it live. Under Motion: `MEMBRANE_WOBBLE` (3, and it may go to just under 8), `MEMBRANE_WOBBLE_HZ` (0.15), `RIBBON_SWAY` (1.5, at most 3) and `RIBBON_SWAY_HZ` (0.3). Under the skin: `SKIN.rippleLength` (72), `SKIN.rippleHeading` (0.6) and `SKIN.membraneLine`, the line's own ink. Under the weather: `WEATHER.ribbonWave` (24), one wave's length along the bow.

  The ripple's size is the thing to judge. It is in layout units and bounded under half the layout's sibling gap, so that a rippling skin never reaches a sibling's. On fascicle, 3,922 units wide, a cell opens before the view comes near enough for 3 units to be more than about two pixels. On a change's map the reach's warm glow also washes the line out over the cells it lights, where a whole repo's map has no reach and the line reads plainly.

- 2026-11-19 — step 15 checkpointed · 828574f67 — feat(scene): place a quiet label on each depth band (1 drift, 21m)
- 2026-11-19 — step 16 checkpointed · ff8c1e1d3 — feat(web): write the band labels over the field (1 drift, 21m)
- 2026-11-19 — range 4 of 6's stop recorded — the first-time-reader test: name what the depth bands mean from their labels alone, at the surface and inside a cell, tilted and zoomed; confirm they yield to cells, notices and the HUD

  **Summary**: From LOD1 each depth band now carries one quiet caption in the rule's own ink, just under where its line enters the screen: `entry` for the band at depth 0, and `n deep` or `n–m deep` for the rest. The scene places the captions through the camera's projection, so they ride their rules through a pan, a tilt and a turn. A caption that would fall on a placed label, a notice's numbered boxes, the HUD, the legend, the minimap or a cell's skin is dropped, never moved. Both steps landed a hair off. Step 15 moved two clip tests out of `space.test.ts`. Step 16 touched two files outside its seam: the labels layer now reports the boxes it drew, and the scene's placer was sped up from 45 ms to at most 1.7 ms a call on the 5,000-file map, so it can run on every frame the view moves.

  1. Step 16 reached two files its seam did not name, one for the boxes to yield to and one for speed
  2. Band 0's caption hangs under its top, where no rule is drawn
  3. A caption stays inside its band and on its rule, tilted and turned
  4. It yields to a skin's drawn line as well as its ground
  5. The rule clip moved into the scene, so the rules and their captions read one line

  **Readout**:

  ```text
  steps        2 of 2 landed
               - 15 828574f · 16 ff8c1e1
  check        green: 1 of 1 checks, 2 landings
  proof        met
  decisions    honored:
               - D196 (band-labels)
               - D168 (labels-on-demand)
               - D185 (asked-words-on-top)
  constraints  10 of 10 honored
  seam         strayed: 3 paths outside 2 steps' seams
               - step 15: apps/web/src/__tests__/space.test.ts
               - step 16: apps/web/src/world/labels.ts, libs/scene/src/labels.ts
  diff         +787 -128 across 12 files
               - apps/web/src/__tests__/space.test.ts +1 -27
               - apps/web/src/__tests__/world.test.ts +42 -2
               - apps/web/src/materials.ts +5 -1
               - apps/web/src/registry.ts +3 -0
               - apps/web/src/space.ts +0 -41
               - apps/web/src/world/draw.ts +46 -5
               - apps/web/src/world/labels.ts +30 -10
               - and 5 more
  spent        42 min · green first run at every landing · 2 drift warnings
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Harvested**: **1** of 12 parked ideas open

  | Park | Why it matters | Lean |
  | --- | --- | --- |
  | **P12**: [Still SVG's unworded terraces](#park-list) | D86 (svg-stays-the-fixture) asks for every encoding in both renderers, and the glance test reads the still | tangent: the still sheet has no viewport to set a caption against, so wording its terraces is a call of its own for a later build |

  **Recommendation**: Run the first-time-reader test on atis's own map: read the bands from their captions at `?zoom=4`, at `?zoom=4&tilt=35`, and at `?zoom=8` on an opened cell, then pan under the HUD, the legend and a noticed file to see them yield. Take P12 as a tangent. Whether `n deep` alone tells a new reader that depth counts import hops from an entry point is the real question at this stop. If it doesn't, the words are a one-line change in `bandWords`, and the tokens are live in the dev panel. `atis` serves whatever `pnpm build` last wrote, and the bundle on disk at the card predated steps 6 to 16; it was rebuilt from range 4's code after the card. Rebuild and serve the whole repository with:

  ```sh
  pnpm build
  atis --whole-repo
  ```

  **1.** Step 16 reached two files its seam did not name, one for the boxes to yield to and one for speed

  The captions must keep off what the world has drawn, and only `apps/web/src/world/labels.ts` knows where its placed labels and notice runs land on the screen. It now hands those boxes out as `claims()`, read at its last render, and `draw.ts` adds the HUD's, the legend's and the minimap's boxes. A first cut of the placer took 45 ms a call on the seeded 5,000-file map (618 cells, package rings of up to 9,000 points), far over a frame. In `libs/scene/src/labels.ts` the fix caches each contour's bounds and dented ring, clears a skin by its projected bounds before walking it, keeps only the edges that reach the captions' column, and reorders `onRing` so an edge whose bounds miss the box costs a few comparisons. The worst view tried now costs 1.7 ms, with the same captions as before at every zoom. Step 18 measures it against C14 (world-budget).

  **2.** Band 0's caption hangs under its top, where no rule is drawn

  The rules mark the boundaries between bands, so no rule sits above band 0, and `entry` would never show if captions hung only under rules. Band 0's caption hangs just under the line where it begins, under the shore. On a zoomed view the HUD often claims that top strip, so `entry` reads mostly from LOD1's far end, which is where a first-time reader starts.

  **3.** A caption stays inside its band and on its rule, tilted and turned

  Each caption is worked out on the screen through the camera's view of the level ground. It hangs the inset in from where its rule's visible stretch begins, which is the screen's left edge for a full-width rule and the row's start where the lanes wrap. It sits on the band's side of the rule even when the view is turned more than a quarter turn. It is dropped where it would run past its rule's end, or out of a band thinner on the screen than the caption itself. A third token, `BAND_LABEL_GAP` (2 px), sets how far under the rule it hangs, so that gap is not baked in (C15 (every-look-a-token)).

  **4.** It yields to a skin's drawn line as well as its ground

  A cell's membrane line is drawn half its width outside the contour and ripples by up to `MEMBRANE_WOBBLE` there. So a caption keeps that whole reach off each skin, the teeth included. On the demo at the deepest zoom, a caption 2.4 layout units off `libs/core`'s contour is dropped, because that cell is half entered past its barrel and its rippling line reaches 2.7 units. In the browser on the demo, captions read "2 deep" and "3 deep" at zoom 4, "1 deep" and "2 deep" tilted 35° and turned, and "3 deep" inside a cell at LOD2. During a drag they followed their rules frame by frame, dropped under the HUD, and stayed off the minimap.

  **5.** The rule clip moved into the scene, so the rules and their captions read one line

  `across` and `between` moved from `apps/web/src/space.ts` into `libs/scene/src/labels.ts`, so a caption is placed on the very line the world draws its rule along. Their two tests moved with them, and that one-line change to `space.test.ts` is step 15's stray.

- 2026-11-19 — step 17 checkpointed · b296088a2 — docs(design): rewrite the channel list and log the balance patches (14m)
