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

**Current step:** 19 — feat(scene): shade every file's shape by the churn its stability carries
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
- ☐ 6. feat(scene): grow the drift's contrast through a looseness curve
- ☐ 7. feat(scene): gather an opened cell's held files toward its middle
- ☐ 8. feat(scene): lay each file's functions as a nucleus inside its body
- ☐ 9. feat(scene): send the tags out on leaders and leave the bodies in place
- ☐ 10. feat(web): draw the nuclei and the exploded tags in the world
- ☐ 11. feat(scene): read each membrane's wobble from its cell's integrity
- ☐ 12. feat(web): ripple the skin's membrane line by its cell's integrity
- ☐ 13. feat(scene): mark the ribbons that enter a cell past its interface
- ☐ 14. feat(web): oscillate the marked ribbons along their length
- ☐ 15. feat(scene): place a quiet label on each depth band
- ☐ 16. feat(web): write the band labels over the field
- ☐ 17. docs(design): rewrite the channel list and log the balance patches
- ☐ 18. chore(web): measure the new movers against the world's budget
- ☐ 19. feat(scene): shade every file's shape by the churn its stability carries

## Park list

> Mid-step, every new problem / idea / "ooh what if" lands HERE, untouched, and you
> go straight back to the step. Acting the instant an idea arrives is the disease.
> Capture is one line (`/plumbbob:park` composes it). Harvest happens only at the boundary.

- [x] docs/glance-practice.svg predates the shape spectrum: it still keys 'shape: rules it breaks, 0 to 6' and draws every calm file as a circle, and it was already behind the renderer (its Size block counts 4 files where today's counts 2); pnpm practice-map re-renders it, outside step 3's seam
- [x] the two spikiest forms are drawn through too few points: at SHAPE_LEVELS 5 and 6 an arm is about one sample wide (160 points round 18 arms of sharp 20), so the ring catches each tip at 53 to 100 percent of its length by where the points fall, which flickers as a shape turns and makes the ring's own furthest point wander as the score climbs; step 3 holds the monotone test on the outline's analytic extent instead
- [x] apps/web hud.test.tsx 'the world's blocks are the sheet's' timed out at vitest's 5 s default once under a loaded full check (6.7 s) and passed on rerun; it walks every committed fixture, so give it a longer timeout or split it
- [x] troubleOf reads the organelle's top-level churn_ratio and bugfix_rate, which the map sets only on files the change touched, so shape shows history for almost no file: on atis's own map 0 of 165 files leave the circle on a whole-repo map and 7 of 165 on the last commit (no file breaks a rule), where stability.churn_ratio is on all 165; javascript-1 has 128 of 414 with a form against 405 with stability's churn
- [ ] stability.churn_ratio counts a file's own birth, so on atis's whole-repo map every one of the 165 files reads churn 0.47 or more (median 1.22) and 155 score between 0.13 and 0.27, one soft wobble for nearly all; a calm file needs a floor to subtract or a scale that starts above birth before shape alone tells it from a busy one (step 19, D203 history-on-every-file)

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
