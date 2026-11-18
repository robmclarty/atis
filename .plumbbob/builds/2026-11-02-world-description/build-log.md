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

**Current step:** 2 — feat(scene): score each file's trouble on one spectrum from the map
**Heavy check:** checkride (set a "check" key in .plumbbob/settings.json to override)

## Steps

*(Mirror of intent.md's Steps, with live status; CLI-maintained, not hand-edited.
`build`/`checkpoint`/`revert` re-render this from intent.md, and set the Current step
line above. Only ONE step is in flight; a step is done only after a checkpoint:
check green + checkpoint taken, via `/plumbbob:verify` or `/plumbbob:build`.)*

- ☑ 1. feat(core): count a cell's imports through and past its interface
- ☐ 2. feat(scene): score each file's trouble on one spectrum from the map
- ☐ 3. feat(scene): draw every file's outline on a continuous spectrum
- ☐ 4. feat(scene): move the spectrum's spiky end most, and least regularly
- ☐ 5. feat(web): cycle an opened cell's files across the spectrum on demand
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

## Park list

> Mid-step, every new problem / idea / "ooh what if" lands HERE, untouched, and you
> go straight back to the step. Acting the instant an idea arrives is the disease.
> Capture is one line (`/plumbbob:park` composes it). Harvest happens only at the boundary.

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

- (none yet)

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
