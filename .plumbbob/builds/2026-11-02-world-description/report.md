# Report: a world that describes itself at a glance

Built 2026-11-18 to 2026-11-19: 19 steps in 6 ranges, out of numeric order. The plan committed
18 steps; a blocker confirmed at the first range's stop added the nineteenth, which was built
next, ahead of the opened cell's steps. The step-by-step history is the build-log's `## Log`; this report adds the why, the
harvest and what is left.

## What shipped

The world now says something about every file and every module before anything is opened, and
more once a cell is open. The spec's nine changes landed as eight, since the plan named no new
weather pattern, plus the one field core had to add.

- **A file's shape is its trouble.** Every outline is a point on one continuous spectrum, from
  round to spiked and bulbed, read from a score of the rules the file breaks shaded by its
  history. Both renderers draw it, the SVG still. Inside an opened cell the spiky end pulses,
  turns and jitters most and the smooth end holds still. `?shapes=demo` spreads an opened
  cell's files across the whole spectrum on any map.
- **An opened cell reads as tissue.** Each file's functions are a nucleus of granules inside
  its body. Files held by their cellmates rest toward the middle and loose ones toward the
  rim, and the drift's contrast grew through a looseness curve. The exploded view sends the
  tags out on elbowed leaders into two columns and leaves every body where it floats.
- **A membrane and a ribbon each say one thing when they move.** Core counts each barrelled
  cell's outside imports through and past its barrel. A membrane ripples by the share that
  land past it, and a ribbon sways when its import enters a module past its interface.
- **The depth bands carry words.** From the surface on, each band has a quiet caption,
  `entry` or `n deep`, that yields to labels, notices, the chrome and every cell's skin.
- **The record matches.** `docs/design.md` carries the channel list as the rewritten
  one-meaning-per-channel constraint has it, a table of the five movers with their tokens, a
  balance log dating what Rob kept at each stop, and a dated budget row. The spec's eleven
  open questions each name the decision that answered them.

Goldens moved in three steps, each for one reason: the demo map for the added `integrity`
key, then thirteen SVGs twice, once when every file with history gained a form and once when
the score began reading the churn every file carries.

Two steps halted and landed on Rob's word. The step that drew the continuous outline could
not hold two of its proof's geometry tests as written and holds them restated. The budget
step first ran on a busy laptop that read under half its rates on every world, and landed on
a rerun once the machine was quiet.

## Decisions and why

The calls that shaped the build, each as `intent.md` settled it:

- **D191 (nine-changes)**: the build is the spec's nine changes and the one field they need,
  because each has one meaning and Rob judges them a range at a time, so a tenth would wait
  on its own reading.
- **D192 (cell-integrity)**: `Cell` carries `integrity: { through, past }` only where a cell
  has a barrel, because a directory's interface is whatever outsiders import, so a `past` of 0
  there would be a containment nothing measured.
- **D193 (looseness-curve)**: a file's mobility is its looseness raised to `DRIFT_CURVE`,
  because a bigger reach alone moves the held hub along with the loose file.
- **D194 (shape-spectrum)**: one continuous spectrum replaces the seven stepped forms,
  because those left four files in five as plain circles and files could not be compared by
  shape.
- **D195 (living-membranes)**: the ripple is a sampled displacement of the membrane line,
  because re-laying the line every frame would break the world's budget.
- **D196 (band-labels)**: each band's caption is the one text the world writes unasked, and
  it yields, because a first-time reader cannot tell what the vertical order means without
  the legend, and a label that yields never covers what it describes.
- **D197 (nuclei)**: granules come from `functions` alone and never from `function_count`,
  because the spike's dense nuclei read as how much a file holds and the map already carries
  every function, so nothing needs inventing from a count.
- **D198 (labels-explode)**: the exploded view spreads the tags and not the bodies, because
  thrown bodies landed the columns on them and stacked the tags to the screen's edges.
- **D199 (held-files-gather)**: position inside an opened cell means looseness, on the slide
  alone, because a cell whose files share one looseness must keep the layout's places, and
  position may carry the reading the drift already moves by.
- **D200 (one-meaning-per-mover)**: the channel constraint is rewritten so motion means one
  thing per mover, because the spectrum, the ripple and the sway each widen a channel.
- **D201 (slide-only-svg)**: the still SVG draws no nucleus and keys none, because it draws
  no opened cell and a legend key for a mark the sheet never draws misleads.
- **D202 (demo-switch)**: `?shapes=demo` is the world's alone and never reaches a still,
  because every form must be previewable and a still must never carry a demo.
- **D203 (history-on-every-file)**: the score reads churn from `stability` where a file has
  none of its own, because at the first range's stop atis's own map drew 158 of 165 files as
  circles on a change and all 165 on the whole repo.

Calls made while building, beyond the plan:

- The continuous outline holds continuity at a thousandth of the score, not a hundredth, and
  holds "never a smaller greatest radius" on a new analytic `extent`. Rob approved both at
  that step's pause, because no outline that keeps the seven forms can meet the tests as
  written.
- A ribbon onto a folder's barrel from another package sways where the package has a barrel
  of its own, because the ribbon marks exactly the imports core counts as `past`, so the
  ribbon and the membrane agree import for import. Rob kept that reading at the third
  range's stop.
- The four values left to Rob's eye stand where they started: `SHAPE_PULSE`, `SHAPE_JITTER`,
  `DRIFT_REACH` and `DRIFT_CURVE`. He kept them at the stop for the opened cell and made no
  patch.
- The budget script adds 24 stray imports to its seeded map and reads each backend with the
  movers on and off, because the seeded map drew no ribbon, so nothing on it could sway, and
  a miss cannot be laid on a mover without a still copy beside it.

## Parked & harvested

15 items were parked, and every one is harvested: 1 blocker, 14 tangents and no pivot signal.
Rob confirmed each class at a step boundary or on a range's stop card.

| Park | Why it matters | Settled |
| --- | --- | --- |
| **P1**: [Stale practice map](build-log.md#L52) | the practice map a reader learns the marks from still keys the old seven forms | tangent: a doc image no test compares, re-rendered by one command when the practice map is next used |
| **P2**: [Undersampled spiky forms](build-log.md#L53) | a turning spike may flicker, since the two spikiest forms are drawn through about one point an arm | tangent: the old forms already drew this way and no later step depended on it |
| **P3**: [HUD test's 5 s timeout](build-log.md#L54) | it turned full checks red on a loaded machine in more than one range, each rerun costing minutes | tangent: a timeout on a test no step touches, cured by one argument |
| **P4**: [Shape reads changed-file history only](build-log.md#L55) | 158 of 165 atis files were circles on a change map and all 165 on the whole repo, so files could not be compared by shape | blocker: the spectrum's own reason was unmet until the score read the history every file carries; it became D203 (history-on-every-file) and the nineteenth step |
| **P5**: [Churn counts a file's birth](build-log.md#L56) | nearly every atis file scores one soft wobble, so shape says "has a history" and not "troubled" | tangent: real, but the fix leaves a choice open, to subtract a file's birth or start the scale above it |
| **P6**: [Drop the overworld view](build-log.md#L57) | the far view slows getting into the cells, which is where the reading happens | tangent: a change to the world's levels, wider than this build's nine changes |
| **P7**: [Glitchy selection and rendering](build-log.md#L58) | clicks, fills and 3D elements misbehave across the world | tangent: Rob confirmed it predates this build, and no step built on selection |
| **P8**: [Unexplained issue map](build-log.md#L59) | a reader cannot tell what the rectangle is or how to close it | tangent: the plate works and is liked; it lacks a name and a way out |
| **P9**: [Cell inspector panel](build-log.md#L60) | a click on a cell has nowhere to show the file's details | tangent: a new surface whose contents are undecided |
| **P10**: [Fixture maps lack integrity](build-log.md#L61) | no committed fixture shows a ripple until its map is rebuilt | tangent: the stop read on fascicle's own map, so rebuilding the fixtures can be its own step |
| **P11**: [Faint line under reach](build-log.md#L62) | a lit cell's ripple barely reads beside an unlit cell's | tangent: a look to judge, and the dev panel moves the line's ink and the amplitude live |
| **P12**: [Still SVG's unworded terraces](build-log.md#L63) | every encoding is meant to land in both renderers, and the glance test reads the still | tangent: the still sheet has no viewport to set a caption against, so it is a call of its own |
| **P13**: [Quiet-machine budget rerun](build-log.md#L64) | the busy runs read under 60 fps, which would have left the world's budget unconfirmed | tangent: answered at the budget step's pause, where the quiet rerun held 60 fps |
| **P14**: [Slide's work unmeasured](build-log.md#L65) | the nuclei's fans, the shapes' motion and the float have no budget reading | tangent: it needs functions in the seeded map and a held reading inside an opened cell |
| **P15**: [Unexplained slow first frame](build-log.md#L66) | a 5 s first frame with the movers on would break the budget if it recurred | tangent: seen on one run in the day's five and on none of sixteen loads |

## Final status

**Done.** All 19 steps are checkpointed, each on a green `pnpm check --strict`, and every park
is harvested (15 of 15). The spec's success criteria were held three ways, and two of them
carry a caveat worth reading before the next build.

- **Automated: held.** The tests the plan names all landed: the spectrum continuous, monotone
  and seeded; integrity counted on hand-built scans; the wander under its bound and the speed
  cap; every granule inside its core; the exploded view's bodies, tags and columns; the
  gathering. Two of the spectrum's tests hold as restated, not as the spec worded them.
- **Measured: held, on the second attempt.** With the membranes rippling and the ribbons
  swaying, the seeded 5,000-file map reads 111 fps at idle, 95 through the sweep and 120 at
  the surface on WebGPU, and 74, 95 and 115 on WebGL 2, with first frames at 1.63 and 1.66 s.
  The movers cost 8 frames a second at idle on WebGPU, 2 or 3 elsewhere, and a quarter of a
  second on the first frame. One run that day read a 5 s first frame with the movers on and
  did not repeat; it is recorded in `docs/design.md` as unexplained, not passed.
- **Judged: recorded at each stop, with one criterion short.** Rob liked the files' shapes,
  their animation and movement in an opened cell, kept the drift's values, and approved the
  stops for the ripple and the sway and for the band captions with no patch. On 2026-11-19 he
  asked to see the new motion and shapes once more, was given a synthetic showcase map and
  fascicle's whole repo to open, and recorded the last stop afterward, again with no patch.
  The criterion that is short is the first: from the bird's
  eye, a troubled file told from a calm one by shape alone. On atis's own map every file now
  leaves the circle, but 155 of 165 score between 0.13 and 0.27, one soft wobble for nearly
  all, because the log window's churn counts each file's own birth.

Two things were never put in front of anyone at a size that settles them. The ripple is a
pixel or two on a real repo before a cell opens, and atis's own map ripples no membrane at
all, so its size stands at a starting value. And no committed fixture shows the ripple, the
sway and nuclei together; the showcase map made for the last look is a throwaway.

## Deferred tangents

Future work, grouped by what it would touch. P4 (shape reads changed-file history only) was
folded into this build and P13 (the quiet-machine budget rerun) was answered inside it, so
neither is listed.

**The shape score, so shape tells trouble from calm.**

- P5 (churn counts a file's birth): subtract a file's birth before scaling, or start the scale
  above it. This is the open half of the build's first judged criterion, and it wants a
  refine pass, since the choice is Rob's.
- P2 (undersampled spiky forms): draw the two spikiest forms through more points, if a
  turning spike is seen to flicker.

**The membranes' ripple, so it reads.**

- P11 (faint line under reach): more contrast for the line where the reach's glow fills a
  cell, or a second cue for the ripple.
- The ripple's size, `MEMBRANE_WOBBLE`, is a live token that may go to just under 8. It is
  not a park; the balance log in `docs/design.md` names it as the lever.

**Getting around the world, from Rob's reading at the opened cell's stop.**

- P6 (drop the overworld view): keep the one map view and lean on the weather analogy.
- P7 (glitchy selection and rendering): clicks, fills and 3D elements, older than this build.
- P8 (unexplained issue map): give the plate a title or key and a visible way to close.
- P9 (cell inspector panel): decide what a click on a cell shows, then build it.

**Fixtures and stills, so the record shows what the world draws.**

- P10 (fixture maps lack integrity): regenerate the committed fixtures' maps so one of them
  ripples, and consider a committed map that shows every mover.
- P1 (stale practice map): re-render `docs/glance-practice.svg` with `pnpm practice-map`.
- P12 (still SVG's unworded terraces): decide whether the still sheet captions its terraces.

**Measurement, so the budget covers what was added.**

- P14 (slide's work unmeasured): give the seeded map functions and the budget script a held
  reading inside an opened cell.
- P15 (unexplained slow first frame): if it shows again, read the ripple and the sway apart
  before shedding either.
- P3 (HUD test's 5 s timeout): raise the timeout on the two fixture-sweep tests, which cost
  three red checks in the last range alone.

**Calls the plan left for after the build.** Each was answered "not in this build" and is
now better informed: whether shapes move at the surface (Q82 (surface-shape-motion)) and
whether nuclei show there (Q88 (surface-nuclei)), with the surface now measured at 120 fps;
whether the terrain's own layout gathers held files (Q90 (terrain-gather)); and whether any
new weather pattern earns a channel (Q85 (new-weather)).

## Checkpoints

- baseline 60a7fdec9bfbb01b2b3542d3979018b282e0442a
- step 1 dbd09d86ba8afddb9edbce9c38dd2394a748b348
- step 2 579bcc9bb08c5452351f6a527b823efba1e217e2
- step 3 d970d296e091ee639dc0c715376c85ee802d014d
- step 4 ca96b0bda7bdc782121e1bbe6074315f3db38809
- step 5 601636fda55bcd76fb72da311b97c0d8d31df97b
- step 19 db8e6f3b6d1546f6417a3f77c3bfc2ce8c99a4ea
- step 6 fe396985e94f4bca0f4d185a09a2df62db769696
- step 7 4eb814b3ff4b998ff89ff8ef1a6213146e18e7a5
- step 8 b806fc4b7de4bfec38a91b3ca062c3a7309ff887
- step 9 f9c3c28a52ca7cbe44cd557980d3ccc282af79cb
- step 10 f2969dee4669f3ead43e710c1e369ea94feb73e4
- step 11 c7022a189c8e1f76da376e7b5c570545d7305fd3
- step 12 1682c274b80cd17d045c7a326e28fc36c542b973
- step 13 d2219579fe67f469dc85726e4915e62eef946fc5
- step 14 3c819a7ad8b3bf987d858cdc51e1f4c1e99bb09d
- step 15 828574f67f2d2804fe78a68b19516f1b9f805b20
- step 16 ff8c1e1d32248dc661cf91f45f9e0af34f165289
- step 17 b296088a235dae17893a3a7b20081a8d39ea41d0
- step 18 b10d1b39d4f365cc3daedeff2cd329b9f595e73a

## Stats

| step | red checks | drift warnings | reverts | wall-clock |
| ---- | ---------- | -------------- | ------- | ---------- |
| 1 | 0 | 0 | 0 | 10m |
| 2 | 1 | 0 | 0 | 11m |
| 3 | 3 | 1 | 0 | 622m |
| 4 | 1 | 1 | 0 | 11m |
| 5 | 1 | 0 | 0 | 14m |
| 6 | 0 | 0 | 0 | 7m |
| 7 | 0 | 0 | 0 | 13m |
| 8 | 0 | 0 | 0 | 10m |
| 9 | 0 | 0 | 0 | 7m |
| 10 | 2 | 0 | 0 | 39m |
| 11 | 0 | 1 | 0 | 15m |
| 12 | 0 | 0 | 0 | 11m |
| 13 | 0 | 0 | 0 | 12m |
| 14 | 0 | 0 | 0 | 13m |
| 15 | 0 | 1 | 0 | 21m |
| 16 | 0 | 1 | 0 | 21m |
| 17 | 0 | 0 | 0 | 14m |
| 18 | 0 | 0 | 0 | 143m |
| 19 | 0 | 0 | 0 | 24m |
| **total** | 8 | 5 | 0 | 1018m |
