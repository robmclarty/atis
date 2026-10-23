# The glance test

atis's acceptance test (SPEC §11): show a reader the map for ten seconds and see whether the
map, alone, carries the judgement a review would. It runs at the end of phases 1 and 2. This
file is the phase-1 setup — the five fixtures, their ground truth, and the protocol — ready
for step 23 to run round one against the still renders.

The fixtures live in `fixtures/<repo>-pr<n>/`, each with its `map.json`, `atis.svg`, a
`README.md`, and a `truth.md` whose ground-truth lines are drafted from history and marked
**needs Rob**. Round one settled each PR's verdict from the follow-up commits instead, and
those verdicts supersede the drafts where they differ (see [Round one](#round-one-fail-2026-09-24)).
Round one's retake reads five outside fixtures in `fixtures/retake-<n>/` instead, blind and
after a fixed legend (see [Round one retake](#round-one-retake-fail-2026-09-29)).

All five are generated under [D58](../.plumbbob/builds/2026-09-16-map-and-svg/intent.md): the
*tree* is historical, the *harness* is current (checkride 0.13.0, fallow 3.28.0, `--skip
security`). Step 22 first built them against each commit's own pinned toolchain, which left
checkride PR 2 unreadable and both fascicle fixtures blind; those maps are superseded.

Step 30 re-ran all five through that same procedure so they carry step 27's global-slot
leaders and step 28's shore-table rules. Every category in the table below survived the re-run
unchanged, as did every terrain and weather count, every cell membrane and every organelle
position; the deltas are confined to the shore and to one notice, and each fixture's
`README.md` names its own. The `other` residual is now empty on all five: checkride's
`.claude-plugin/plugin.json` went to `prompts`, and fascicle's `.mcp.json`,
`.ridgeline/settings.json`, `.codegraph/config.json`, `bench/reviewer/{baseline,cases}.json`
and `packages/core/src/flow-schema.json` went to `config` and `data`. Two consequences matter
for round one:

- **checkride PR 4 now shows five notices, not six.** Its sixth was the shore residual, and
  with the residual gone nothing ranked behind it to take the slot (C7 does not pad). No
  fixture's budget is spent on shore bookkeeping any more, so all 29 notice rows a reader
  sees across the five maps are about code or the harness.
- **Three slot-targeted notices gained leaders.** `dead` and `snippets` on checkride PR 2 and
  `attw` on fascicle PR 5 name a slot rather than a file, and step 27 points each at the storm
  marker in the field corner. Before, those rows were the only ones a reader could not trace
  to anything, which would have confounded the ten-second read.

## The five

| # | fixture | change | category | ground truth as drafted (round one's verdicts supersede) |
| --- | --- | --- | --- | --- |
| 1 | [`checkride-pr4`](../fixtures/checkride-pr4/) | resolve a slot's tool locally (#4) | MVFR | the local tool search was later bounded to the repo (`aa2a08a`); watch `src/pm`, `src/doctor.ts` |
| 2 | [`checkride-pr5`](../fixtures/checkride-pr5/) | the Yarn PnP doctor fix (#5) | IFR | the doctor change was reworked twice after (`aa2a08a`, `a488f6c`); the map flags `src/doctor.ts` uncovered |
| 3 | [`checkride-pr2`](../fixtures/checkride-pr2/) | run the CLI through the bin symlink (#2) | IFR | the e2e test it added does not pin the behaviour: 11 mutants survive on the changed lines |
| 4 | [`fascicle-pr4`](../fixtures/fascicle-pr4/) | the pr-improve builder tools (#4) | IFR | the review found 7 bugs in `examples/pr-improve/src/tools/`, on `run_shell.ts` byte cap/timeout and symlink TOCTOU |
| 5 | [`fascicle-pr5`](../fixtures/fascicle-pr5/) | apply the improvement spec (#5) | IFR | near-calm — one `run_shell.ts` type follow-up (`414f336`) |

Each row's ground truth is the summary; the full drafting, with stat lines and the
`needs Rob` markers, is in that fixture's `truth.md`.

Two of the five now say something they could not say before D58. checkride PR 2's primary
notice is `survived-mutants` on `src/cli.ts` — a finding about the PR's own changed lines,
where the old fixture had no notices at all. fascicle PR 4's primary notice names
`run_shell.ts`, the single file carrying three of the review's seven findings, where the old
fixture could only point at the tools barrel.

## The protocol (SPEC §11)

Run at the end of phases 1 and 2:

1. Pick five merged historical PRs from checkride, fascicle, and weft with known ground
   truth — what the review actually found, or what broke after. (Done: the five above; weft
   supplied patterns only, D54.)
2. Three readers — Rob plus two — none of whom wrote or reviewed the PR.
3. Show the map for ten seconds. The reader states **merge** or **hold**, and one reason.
4. **Pass:** four of five verdicts agree with ground truth, and for every *hold* the stated
   reason matches a real finding.
5. **Notice precision:** for each PR, the thing the real review flagged appears in the top
   three notices.

Fail means the encodings change, not the test.

## The legend (D66, D87)

Every reader in every reading from the second retake on hears this, word for word, before
the practice map and the first map. It says what each mark measures and never how to weigh
it. It is [the retake's legend](#the-legend-d66), which stays below as it was read then, with
each mark wave 0 added since:

- **The legend inset** (D87): every map now carries this key in its chrome, at the foot of
  the notice column, ten marks by number.
- **The `+` on an added file's path** (D120): added and modified files share the one change
  colour, so the text tells them apart.
- **A skin lit all round** (D80): a changed file no coverage report names. The Patch cov
  block counts those files beside its share.
- **A module's own points and glyph**: a module's outline now carries the points of the
  rules its files break and the glyph of the clone family it belongs to, as a file does.
- **Build output on the shore** (D84): committed `dist/`, `build/` and `out/` folders are
  shore, never modules.
- **Security on the change** (D83): an advisory counts on the Gate only when the change
  added or moved the package that brings it.

**The practice map** comes first: [`glance-practice.svg`](./glance-practice.svg), a real map
that is never scored, with a numbered balloon on one instance of each mark the inset keys.
`pnpm practice-map` renders it from `fixtures/retake-5` (or `pnpm practice-map <fixture>`
from another), with that fixture's module outlines cut again by today's core over its own
positions. retake-5 has no lit arc and no skin lit all round, so balloons 2 and 10 are not
on it; the inset still keys both.

**The inset**, numbered as the practice map's balloons:

1. **category: set by the change alone**. The coloured block at the top left, below.
2. **lit arc: changed lines no test ran**. A bright arc on a changed file's skin, clockwise
   from the top, as long as the share no test ran.
3. **hairline: changed lines the tests ran**. The dim rest of that skin.
4. **notch: a mutant no test killed**. A bright notch cut into the top of the skin, one per
   mutant: one that survived the tests, or one no test reached.
5. **stitches: its tests passed, not run, failed**. Short strokes across the bottom of the
   skin, one per test file that imports it: bright, grey, or red and broken.
6. **red bolt: a failing check names a changed file**. With the check's name beside it,
   over the module that file sits in.
7. **grey bolt: fails on files the change left alone**. Smaller, with no name, over a
   module the change did not touch.
8. **ghost: usually changes with these, and did not**. A dashed grey outline round a file.
9. **cyan: a changed file; +path in a row: added**. The fill of every file the change added
   or modified.
10. **skin lit whole: no coverage report names it**. A changed file's skin lit all the way
    round: no test is known to have run it.

Each map is one pull request. The grey field is the repository at the PR's base; everything
lit is the change.

**The category**, the coloured block at the top left, is set by the change alone:

- **VFR**, green, "glance-mergeable": nothing below applies.
- **MVFR**, blue, "mergeable with a look": a changed line no test ran, or a changed module
  interface that is used from outside its module; nothing red.
- **IFR**, red, "needs instrument review": a failing check names a changed file, or a file
  with changed lines no test ran reaches three or more modules.
- **LIFR**, magenta, "do not approach": the checks ran nothing, or a cycle or a boundary
  violation touches a changed file.
- **NOINST**, grey: there were no check results to read.

**The HUD blocks**, left to right after the category:

- **Patch cov**: the share of the change's executable lines that the tests ran, and how many
  changed files no coverage report names.
- **Mutants**: mutants that survived the tests on the changed lines, and, counted apart as
  `untested`, those no test reached.
- **Reach**: how many modules the changed files and the files importing them span.
- **Size**: lines added and removed, and files changed.
- **Gate**: failing checks that name a changed file, or `pass` when none do. A security
  advisory counts here only when the change added or moved the package that brings it.
- **Standing**: failing checks that name only files the change did not touch, with the
  repo-wide ones listed after `global`; absent when there are none.
- **Health Δ**: not measured in this build.
- **Notices**: how many notices sit in each tier, primary · secondary · tertiary.
- **Other**, when shown: files the map could not sort onto the shore.

A dash where a number would be means the input is missing, never zero.

**The field**, the repository at the base, drawn in grey:

- The bands, top to bottom, are import depth: entry points at the top, leaves at the bottom.
  The strip above them is the shore, the non-code files grouped by kind, committed build
  output among them.
- A soft outlined region is a module; a thicker outline is a bigger interface. Each dot
  inside it is a file, sized by its code.
- A file drawn with points instead of round breaks a complexity or size rule, one point per
  rule. A module's outline with points holds files that break those rules, one point for
  each rule broken anywhere inside it.
- A small glyph beside a file marks duplicated code; the same glyph on several files is one
  clone family. The same glyph beside a module's outline marks the module as holding a member
  of that family.
- Hatching is churn; stipple is how often the file's commits were bug fixes.
- A small grey bolt is a failing check that names files in that module the change did not
  touch.

**The weather**, the change, drawn in light:

- Cyan fill: a file this change added or modified, one colour for both. Wherever the map
  writes an added file's path, it begins with `+`; a path with no `+` is a file the change
  modified. A cyan outline is a deleted file; a dashed one is a renamed file, with its old
  path beside it.
- Warm glow: the change's reach through the files that import it, dimmer at each module
  boundary it crosses, with a lit disc where it crosses a module's interface.
- The skin round a changed file: a bright arc is its changed lines no test ran, a dim
  hairline is its changed lines the tests ran, and a bright notch is a mutant no test killed.
  A skin lit all the way round is a changed file no coverage report names, so no test is
  known to have run it.
- Short strokes across the bottom of that skin are test files that import it: bright passed,
  grey not run, red and broken failed.
- A red bolt with a check's name: that check fails and names a changed file there.
- A dashed grey outline: a file that usually changes with these and did not.
- The only lines drawn between files: cyan, an import across modules this change added;
  magenta, a cycle or a boundary violation.

**The notices**, the column on the right: up to six, ranked. Box 1 is the primary: a solid
box, a thin ring in the category's colour round its target, and its kind written under the
mark. Boxes 2 and 3 are secondary, with a thick grey ring. Boxes 4 to 6 are tertiary, the
numbered box alone. A dotted leader joins each row to its target, and each row gives the
target (with a leading `+` when the change added it), the kind, why, and the thresholds that
fired.

**The legend inset**, at the foot of the notice column, keys ten of these marks by number, as
listed above.

Then, for each map: "Merge or hold? And one reason." Ten seconds, then the map goes.

## Round one: fail (2026-09-24)

The map did not separate merge from hold at a glance. Where it did separate the five, it
separated them by the repository's standing state rather than by the change. Rob, the one
reader: "the visual/ui was not prominently distinct enough for me to easily tell merge from
hold … it isn't obvious to me at a glance."

### How it ran, and where that departs from the protocol

- **One reader, not three.** Rob was the only reader available, so "Rob plus two" did not
  happen. Rob also wrote all five PRs, and before reading had been told that checkride PR 4
  and PR 5 were reworked after merge. The round is unblinded on every count. It cannot show
  that the map works; it can show where the map misleads, and it did.
- **No legend.** §11 does not say what a reader is told first. Rob read the maps with no
  briefing on what the category, the HUD blocks or the marks mean.
- **Ground truth came from the history, not from recollection.** D44 assumed Rob would
  remember these PRs; Rob did not, and asked the builder to read what happened. Each verdict
  below is settled from the follow-up commits' own messages. It supersedes the `truth.md`
  drafts where they differ, and the 25 `needs Rob` lines were not worked one by one.

### Ground truth, from the history

| PR | fixture | verdict | evidence |
| --- | --- | --- | --- |
| 1 | `checkride-pr4` | **hold** | `aa2a08a`: "Three defects in the tool-resolution work merged by #4 and #5." Two are PR 4's, both from its head commit `ae5078c`: a refused slot carried `exit_code: -1`, so `triage` called the one failure the pre-flight exists to surface "a harness problem, not a finding"; and the upward search for `node_modules/.bin/<tool>` stopped only at the filesystem root, so a stray install above the checkout satisfied it |
| 2 | `checkride-pr5` | **hold** | the third of `aa2a08a`'s defects is PR 5's (`yarn bin` arrived in `9511268`): under Yarn PnP a timed-out `yarn bin` probe was folded into "not a dependency", so an installed tool read as missing |
| 3 | `checkride-pr2` | **merge** | nothing in the next thirty commits reverted or repaired the bin-symlink fix, and `truth.md` already read it as merge with a caveat. The sheet's earlier *hold* was the builder's error: it took the map's own `survived-mutants` notice as ground truth, which is circular |
| 4 | `fascicle-pr4` | **hold** | the PR's one review found seven bugs in `examples/pr-improve/src/tools/`, three of them in `run_shell.ts` |
| 5 | `fascicle-pr5` | **hold** | `414f336`: PR 5's casts in `run_shell.ts` break the repo's `no-unsafe-type-assertion` rule, "so `pnpm check` fails on main as-is". It merged red. The sheet's earlier *merge* read the follow-up's size, not what it said |

Four holds and one merge, so a reader who holds on everything still scores 4 of 5 on the
verdict half (parked).

### Verdicts (criteria 3 and 4)

| PR | reader | merge / hold | matches truth? |
| --- | --- | --- | --- |
| 1 `checkride-pr4` | Rob | merge | no |
| 2 `checkride-pr5` | Rob | merge | no |
| 3 `checkride-pr2` | Rob | hold | no |
| 4 `fascicle-pr4` | Rob | hold | verdict yes; reason no |
| 5 `fascicle-pr5` | Rob | hold | verdict yes; reason no |

One reason, the same for all five, in Rob's words: "a combination of 'lit' top row stats +
'calm' map + presence or absence of the colour red + sharp versus smooth overall impressions
and soft lighter blue beige colours vs flat, sharp, red colours." The checkride PR 4 and 5
maps "looked calmer, whereas the others had lots of red and sharp lightning bolts and lots
of red lines."

Neither fascicle hold names a real finding. The red on those maps is dead-code, duplication
and complexity storms, not the review's seven bugs on PR 4, and not the lint failure PR 5
merged with, whose storm is one global bolt among 71.

### What the map was meant to show

The map is two layers. The **terrain** is the repository as it stands: grey cells, and a
storm (a red bolt and a slot name) over every cell a failing check names. The **weather** is
this change: cyan stains on the changed files, a warm glow for how far the change reaches, a
skin on each changed file that is closed where tests ran the changed lines, open where they
did not and bitten where a mutant survived, dashed ghosts for files that usually change
alongside and did not, and the numbered notices. The call is meant to come from the weather,
with the terrain as context. On these five, the terrain won:

- **checkride PR 5: the signal was there, and it was too quiet.** `src/doctor.ts` sits in a
  glow reaching three cells with an open skin (6 changed lines no test ran), notice 2, and the
  HUD says IFR. That is the file `aa2a08a` repaired. It was one small open skin on an
  otherwise calm field, and it lost to "Checks 17/17".
- **checkride PR 4: the instruments had nothing to show.** Every changed line was tested and
  every check passed. Mutation testing, the one instrument that asks whether the tests pin the
  behaviour, was skipped on this fixture because it runs past fifteen minutes (D58). The top
  three notices include `src/orchestrator.ts`, a file `aa2a08a` repaired, but for an interface
  change rather than the defect. MVFR, "mergeable with a look", was an honest reading of
  evidence that could not see the bug.
- **checkride PR 2 and both fascicle maps: most of the red is terrain.** Each fascicle render
  hangs 71 storms, 2 of them over the cell the PR changed; the rest are what current fallow
  thinks of the old tree (D58). The red lines are two cycle edges in `packages/viewer`, which
  neither PR touched. checkride PR 2 has 7 storms and none over its changed file. "Lots of
  red" meant "this repository is messy", which was as true of the base as of the head.

### Notice precision (criterion 5)

| PR | the thing ground truth flags | in the top three? |
| --- | --- | --- |
| 1 `checkride-pr4` | the unbounded tool search and the `exit_code: -1` refusal | **judgement**: `src/orchestrator.ts` is notice 2, for an interface change, not for the defect |
| 2 `checkride-pr5` | the `yarn bin` timeout in the doctor's tool probe | **yes**: `src/doctor.ts` is notice 2, for untested changed lines |
| 3 `checkride-pr2` | nothing (merge) | n/a |
| 4 `fascicle-pr4` | seven bugs in the tools, three in `run_shell.ts` | **judgement**: `run_shell.ts` is primary, for dead code |
| 5 `fascicle-pr5` | the unsafe casts in `run_shell.ts` that fail lint | **judgement**: `run_shell.ts` is primary, for dead code; the `lint` slot is global and ranked out of the budget |

1 of 4 on the strict reading (the right thing for the right reason), 4 of 4 on the generous
one (the right file for any reason).

### Result

- **Criterion 4, verdicts:** 2 of 5 agree with ground truth. The pass line is 4.
- **Criterion 4, hold reasons:** none of the three holds names a real finding.
- **Criterion 5, notice precision:** 1 of 4 strict, 4 of 4 generous; checkride PR 2 has
  nothing to flag.

**Fail line.** The map's loudest signals (the storms, the red, the Checks block and the
category they drive) describe the repository's standing state, and the change's own evidence
is drawn too quietly to compete. The encodings to change, each parked for `/plumbbob:refine`
(D38):

1. **Standing-state storms outshout the change.** A red slot naming cells the change did not
   touch draws the same bolt as one naming a changed file: 69 of 71 on each fascicle map.
2. **The category is set by the standing state.** Repo-wide red slots make four of the five
   IFR, so the category cannot tell these changes apart.
3. **"Checks 17/17" reads as the verdict.** It is the HUD's most legible number, and it says
   only that the gate passed, which it did for every PR checkride let merge.
4. **The change's own evidence is too quiet for ten seconds.** An open skin on one file was
   the whole of checkride PR 5's signal, and it read as calm.

### For round two

Parked alongside the encodings, since each changes the test rather than the map:

- **Fixtures with outside ground truth.** Use other projects' PRs whose reviews are public:
  the commit a reviewer asked changes on is a *hold*, the commit they approved is a *merge*,
  and the ground truth is the reviewer's own words. That balances the verdicts, lifts the
  author out of the reader's chair, and replaces recollection with a record.
- **A fixed legend briefing.** The same minute for every reader before the first map, saying
  what each mark and block measures and not how to weigh it.
- The four protocol holes parked when the sheet was prepared: blinding, the criterion-5
  reading, the blanket hold, and how three readers collapse to one verdict.

The administration procedure stands for round two:

1. **Randomize the order per reader** and note it. `fascicle-pr4` and `fascicle-pr5` render
   nearly the same map, so whichever is shown second is read in the first one's shadow.
2. **Show `atis.svg` alone**, full-screen, from a path the reader cannot see.
3. **Say exactly:** "Merge or hold? And one reason."
4. **Ten seconds**, then hide it.
5. **Record the reader's own words**, not a paraphrase.
6. Ask nothing and explain nothing until all five are done for that reader.

## Round one retake: fail (2026-09-29)

The retake of round one (D63), on five outside fixtures in `fixtures/retake-<n>/` (D59,
D60, D61), read blind (D62) after a fixed legend (D66). It failed again, for a narrower
reason. The standing state no longer reaches the map through untouched files. It now
reaches the map through the touched ones: a changed file's complexity or duplication
breach reads as the change's red, and it set the category and the primary notice on four
of the five maps.

### The legend (D66)

Every reader gets this, word for word, before the first map. It says what each mark
measures and never how to weigh it.

Each map is one pull request. The grey field is the repository at the PR's base; everything
lit is the change.

**The category**, the coloured block at the top left, is set by the change alone:

- **VFR**, green, "glance-mergeable": nothing below applies.
- **MVFR**, blue, "mergeable with a look": a changed line no test ran, or a changed module
  interface that is used from outside its module; nothing red.
- **IFR**, red, "needs instrument review": a failing check names a changed file, or a file
  with changed lines no test ran reaches three or more modules.
- **LIFR**, magenta, "do not approach": the checks ran nothing, or a cycle or a boundary
  violation touches a changed file.
- **NOINST**, grey: there were no check results to read.

**The HUD blocks**, left to right after the category:

- **Patch cov**: the share of the change's executable lines that the tests ran.
- **Mutants**: mutants that survived on the changed lines.
- **Reach**: how many modules the changed files and the files importing them span.
- **Size**: lines added and removed, and files changed.
- **Gate**: failing checks that name a changed file, or `pass` when none do.
- **Standing**: failing checks that name only files the change did not touch, with the
  repo-wide ones listed after `global`; absent when there are none.
- **Health Δ**: not measured in this build.
- **Notices**: how many notices sit in each tier, primary · secondary · tertiary.
- **Other**, when shown: files the map could not sort onto the shore.

A dash where a number would be means the input is missing, never zero.

**The field**, the repository at the base, drawn in grey:

- The bands, top to bottom, are import depth: entry points at the top, leaves at the bottom.
  The strip above them is the shore, the non-code files grouped by kind.
- A soft outlined region is a module; a thicker outline is a bigger interface. Each dot
  inside it is a file, sized by its code.
- A file drawn with points instead of round breaks a complexity or size rule, one point per
  rule.
- A small glyph beside a file marks duplicated code; the same glyph on several files is one
  clone family.
- Hatching is churn; stipple is how often the file's commits were bug fixes.
- A small grey bolt is a failing check that names files in that module the change did not
  touch.

**The weather**, the change, drawn in light:

- Cyan fill: a file this change added or modified. A cyan outline is a deleted file; a
  dashed one is a renamed file, with its old path beside it.
- Warm glow: the change's reach through the files that import it, dimmer at each module
  boundary it crosses, with a lit disc where it crosses a module's interface.
- The skin round a changed file: a bright arc is its changed lines no test ran, a dim
  hairline is its changed lines the tests ran, and a bright notch is a mutant that survived.
- Short strokes across the bottom of that skin are test files that import it: bright passed,
  grey not run, red and broken failed.
- A red bolt with a check's name: that check fails and names a changed file there.
- A dashed grey outline: a file that usually changes with these and did not.
- The only lines drawn between files: cyan, an import across modules this change added;
  magenta, a cycle or a boundary violation.

**The notices**, the column on the right: up to six, ranked. Box 1 is the primary: a solid
box, a thin ring in the category's colour round its target, and its kind written under the
mark. Boxes 2 and 3 are secondary, with a thick grey ring. Boxes 4 to 6 are tertiary, the
numbered box alone. A dotted leader joins each row to its target, and each row gives the
target, the kind, why, and the thresholds that fired.

Then, for each map: "Merge or hold? And one reason." Ten seconds, then the map goes.

### How it ran

- **One reader, blind.** Rob read alone (D62). He had not written, reviewed or seen any of
  the five PRs, and he opened no fixture folder, `truth.md` or PR page until the verdicts
  were in. Steps 32 and 33 named no repo, PR or verdict at their pauses. One caveat: step
  33's pause flagged that one agent reply might have reached the screen, and that reply
  described a fixture's failing test and where it lands. Rob landed step 33 without asking
  for a swap. Only `retake-1` (copy D) has a red `test` slot, so if that reply was read,
  copy D was not read blind.
- **The legend first.** Rob read the legend above on screen, word for word, before the
  first map (D66).
- **Shuffled copies, keyed by the builder.** The builder put the five `atis.svg` files into
  one local page under the letters A to E, in a fresh random order, and kept the key in a
  separate folder until the verdicts were in. The order was A `retake-4`, B `retake-2`,
  C `retake-5`, D `retake-1`, E `retake-3`.
- **Ten seconds, enforced.** The page scaled each map to fill the screen whole, removed it
  after ten seconds, then asked "Merge or hold? And one reason." Rob typed each answer, and
  the page never showed a map twice.

### The five, unsealed

| copy | fixture | pull request, at the fixture commit | truth | what the reviewer found |
| --- | --- | --- | --- | --- |
| A | `retake-4` | [remeda/remeda#793](https://github.com/remeda/remeda/pull/793), add `randomInt`, at `77ac065` | **hold** | the `bigint` branch draws from `Math.random`, so a wide range comes out biased; and it throws on input that should work, such as `randomInt(2, 2)` |
| B | `retake-2` | [TanStack/form#2259](https://github.com/TanStack/form/pull/2259), an SSR-safe default `formId` in vue-form, at `f3474c7` | **merge** | approved with no change asked |
| C | `retake-5` | [honojs/hono#5266](https://github.com/honojs/hono/pull/5266), wildcard middleware in the RegExpRouter, at `0a21573` | **merge** | approved with no change asked |
| D | `retake-1` | [apollographql/apollo-client#12633](https://github.com/apollographql/apollo-client/pull/12633), cancel a running `ObservableQuery` link on unsubscribe, at `ea36754` | **hold** | an aborted in-flight query's `reobserve` promise resolves with `data: undefined`, and the `useLazyQuery` tests fail because of it |
| E | `retake-3` | [trpc/trpc#6976](https://github.com/trpc/trpc/pull/6976), a query and mutation key prefix option, at `e11a7d2` | **hold** | a breaking change: the public `TRPCQueryKey` and `TRPCMutationKey` types gain a leading prefix element even when no prefix is set |

Three holds and two merges (D60). Each fixture's `truth.md` quotes the review with its
link.

### Retake verdicts (criteria 3 and 4)

| copy | fixture | reader | verdict, and the reason in Rob's words | matches truth? |
| --- | --- | --- | --- | --- |
| A | `retake-4` | Rob | merge: "looks like it just moved or renamed some files?" | no |
| B | `retake-2` | Rob | hold: "looks like there is uncertainty and failing checks" | no |
| C | `retake-5` | Rob | merge: "i'm not sure, i think it looks ok, but might need a second look" | yes |
| D | `retake-1` | Rob | hold: "looks like something needs fixing" | verdict yes; reason no |
| E | `retake-3` | Rob | hold: "less than 100%" | verdict yes; reason no |

Rob, on the whole read: "i don't think i got it perfect, but i really like how it's looking.
i think i just need to better learn what the graphics actually mean. i'm just guessing and
intuiting."

### What the maps showed

| copy | category | HUD after the category | primary notice |
| --- | --- | --- | --- |
| A | MVFR | Patch cov 100%, Mutants 3 survived, Reach 7 cells, Gate pass, Standing 6 red | `survived-mutants` on `src/randomInt.ts` |
| B | IFR | Patch cov 83%, Mutants 3 survived, Reach 4 cells, Gate 1 red, Standing 8 red | `red-check-slot`, `dupes` on `packages/vue-form/src/useForm.tsx` |
| C | IFR | Patch cov 100%, Mutants 5 survived, Reach 23 cells, Gate 1 red, Standing 5 red | `red-check-slot`, `health` on `src/router/reg-exp-router/router.ts` |
| D | IFR | Patch cov 100%, Mutants —, Reach 20 cells, Gate 3 red, Standing 10 red | `red-check-slot`, `health` on `src/core/QueryManager.ts` |
| E | IFR | Patch cov 94%, Mutants 37 survived, Reach 7 cells, Gate 1 red, Standing 8 red | `red-check-slot`, `dupes` on `packages/tanstack-react-query/src/internals/utils.ts` |

- **The category ran backwards on three of five.** Both merges read IFR and one of the
  holds read MVFR. A reader who followed the category alone would have scored 2 of 5. Rob
  scored 3 by merging C against its IFR.
- **Four of five primaries are a `health` or `dupes` slot on a touched file.** D67 counts
  a red slot as the change's when it names a changed file. But `health` and `dupes` name a
  file for what it is, a function over a complexity threshold or a member of a clone
  family, not for what the change did to it. This build has no base-side metrics (phase 3),
  so atis cannot tell a breach the change made from one it only touched. On C the `health`
  slot is the whole of the IFR. On B, one uncovered changed line in a file reaching 4 cells
  would make it IFR anyway. Both reviewers approved without asking for a change.
- **The map found A's bug and said so quietly.** A's primary notice sits on the bug: all
  three surviving mutants are on line 23 of `src/randomInt.ts`, the first line of the
  `bigint` branch the reviewer called biased. But mutants do not move the category, and
  every block around them read calm: MVFR, Patch cov 100%, Gate pass. The change moved and
  renamed nothing. It adds one function with its tests and docs. The only dashed outline on
  the map is the missing co-change ghost round `mapping.md`, at notice 2.
- **D's failing tests ranked last.** The reviewer's "the `useLazyQuery` tests fail" is on
  the map. The `test` slot is red on `useLazyQuery.test.tsx`, and that red alone would make
  D IFR. But its notice ranks sixth, tertiary, behind two `health` rows and an interface
  change. A `red-check-slot` notice carries one severity (10) whatever the slot, and a test
  file reaches no cells, so a failing test ranks below any red slot on a file with reach.
- **E's break never reached the map.** The reviewer blocked a breaking change to the
  exported key types in `internals/types.ts`, and no notice names that file. An
  `interface-change` notice needs the changed cell to be wide (fan-in at or above the
  repository's 95th percentile) or deep, and the `internals` cell has an in-repo fan-in of
  1 in band 1. A library's readers are outside its repository, so in-repo fan-in reads its
  public types as narrow. Rob held on "less than 100%", which was Patch cov 94%.
- **The shore's residual is large on outside repositories.** The Other block read 43, 53,
  72 and 106 on B to E. The shore rules were written against checkride and fascicle, so
  other projects' tooling files fall through them. Nothing in the reasons points at it.

### Notice precision (criterion 5, read per D65)

| copy | the thing ground truth flags | in the top three? |
| --- | --- | --- |
| A | the `bigint` branch (lines 23 to 27) and the throws in `src/randomInt.ts` | **yes**: notice 1 is `survived-mutants` on `src/randomInt.ts`, and all three mutants live on line 23, in the `bigint` branch |
| B | nothing (merge) | n/a |
| C | nothing (merge) | n/a |
| D | the `reobserve` promise in `src/core/ObservableQuery.ts`, `execute` in `src/react/hooks/useLazyQuery.ts`, and the failing `useLazyQuery` tests | **no**: notice 2 is on `useLazyQuery.ts` but for a `health` red, which D65 rules out; notice 3 is an interface change on `src/core`, not the behaviour the reviewer objected to; the failing tests are notice 6 |
| E | the key types in `internals/types.ts` and the key builders in `internals/utils.ts` | **no**: notice 1 is on `utils.ts` but for a `dupes` red, which D65 rules out; notice 2 is an uncovered line in `createOptionsProxy.ts`, unrelated to the break; no notice names `types.ts` |

1 of 3.

### Retake result

One reader, Rob, blind per D62 (with copy D's caveat above) and briefed per D66.

- **Criterion 4, verdicts:** 3 of 5 agree with ground truth. The pass line is 4.
- **Criterion 4, hold reasons:** neither correct hold (D, E) gives the reviewer's finding
  as its reason, and the third hold (B) was a merge.
- **Criterion 5, notice precision:** 1 of 3, read per D65.

**Fail line.** Round one's split took the standing state off the untouched files, and it
came back through the touched ones. A changed file's own complexity and duplication breaches
set the category and took the primary notice. Meanwhile the change's own signals that
matched the reviews stayed quiet or ranked low: A's live mutants on the buggy line, and D's
failing tests. E's break never reached the map. The encodings to change, each parked for
`/plumbbob:refine` (D38):

1. **A `health` or `dupes` red on a touched file counts as the change's red.** These slots
   name a file for what it already is. Touching an already-complex or already-duplicated
   file therefore makes the category IFR and takes the primary notice. That was four of
   five primaries, and the whole of C's IFR.
2. **A failing test on the change ranks like a threshold breach.** Every red slot carries
   the same severity, and a test file reaches no cells, so D's failing tests were notice 6.
3. **A published package's public types read as narrow.** The interface notice measures
   fan-in inside the repository, but a library's readers are outside it, so E's breaking
   change to exported types drew no notice.

### For round two, from the retake

Parked beside the encodings, since it changes the test rather than the map:

- **One read of the legend does not teach it.** In Rob's words, "i think i just need to
  better learn what the graphics actually mean. i'm just guessing and intuiting." A read
  the map does not bear out on A ("moved or renamed", on a change that renamed nothing)
  points the same way.

## After the fifth pass: unscored (2026-09-29)

Step 52 regenerated the five retake maps in place after the fifth pass (steps 43 to 50), by
step 33's procedure at the same checkride, fallow and stryker versions (D78). Each fixture's
`README.md` records the rerun. Every rerun ran the same checkride slots as step 33 with the
same ones red, so what moved below is atis, not the evidence.

**Read blind by no one.** Everyone who could read these five has seen the PRs and their ground
truth (D63), so this table is unscored. It gives no verdict and makes no claim under §11. It
records whether each fix moved the map that exposed its fault. The retake's own tables above
stand as read, round one's five stay frozen (D61), and round two judges the fixes on fresh
fixtures.

| copy | fixture | map | category | notice 1 | notice 2 | notice 3 |
| --- | --- | --- | --- | --- | --- | --- |
| A | `retake-4` | before | MVFR | `survived-mutants` on `src/randomInt.ts` | `missing-cochange` on `mapping.md` | `other-group` on `other` |
|  |  | after | MVFR | `interface-change` on `src/randomInt.ts` | `interface-change` on `src/index.ts` | `survived-mutants` on `src/randomInt.ts` |
| B | `retake-2` | before | IFR | `red-check-slot`, `dupes` on `packages/vue-form/src/useForm.tsx` | `uncovered-high-reach` on `packages/vue-form/src/useFormId.ts` | `survived-mutants` on `packages/vue-form/src/useFormId.ts` |
|  |  | after | IFR | `uncovered-high-reach` on `packages/vue-form/src/useFormId.ts` | `interface-change` on `packages/vue-form/src/useForm.tsx` | `survived-mutants` on `packages/vue-form/src/useFormId.ts` |
| C | `retake-5` | before | IFR | `red-check-slot`, `health` on `src/router/reg-exp-router/router.ts` | `survived-mutants` on `src/router/reg-exp-router/router.ts` | `large-hot-change` on `src/router/reg-exp-router/router.ts` |
|  |  | after | IFR | `red-check-slot`, `health` on `src/router/reg-exp-router/router.ts` | `interface-change` on `src/router/reg-exp-router/router.ts` | `survived-mutants` on `src/router/reg-exp-router/router.ts` |
| D | `retake-1` | before | IFR | `red-check-slot`, `health` on `src/core/QueryManager.ts` | `red-check-slot`, `health` on `src/react/hooks/useLazyQuery.ts` | `interface-change` on `src/core/QueryManager.ts` |
|  |  | after | IFR | `red-check-slot`, `test` on `src/react/hooks/__tests__/useLazyQuery.test.tsx` | `interface-change` on `src/core/QueryManager.ts` | `red-check-slot`, `health` on `src/core/ObservableQuery.ts` |
| E | `retake-3` | before | IFR | `red-check-slot`, `dupes` on `packages/tanstack-react-query/src/internals/utils.ts` | `uncovered-high-reach` on `packages/tanstack-react-query/src/internals/createOptionsProxy.ts` | `red-check-slot`, `dupes` on `packages/tanstack-react-query/src/internals/mutationOptions.ts` |
|  |  | after | IFR | `interface-change` on `packages/tanstack-react-query/src/internals/createOptionsProxy.ts` | `uncovered-high-reach` on `packages/tanstack-react-query/src/internals/createOptionsProxy.ts` | `survived-mutants` on `packages/tanstack-react-query/src/internals/createOptionsProxy.ts` |

Against the retake's three encodings:

1. **A `health` or `dupes` red on a touched file (D73, step 44).** The `dupes` primaries on B
   and E are gone: their findings sit on lines neither change touched, so both slots now read
   as standing. D's `health` rows on `QueryManager.ts` and `useLazyQuery.ts` went the same
   way, leaving the one on `ObservableQuery.ts`. C keeps its `health` primary on `router.ts`,
   because the finding is on `add`, whose lines the change rewrote and which D73 records the
   change took over all three thresholds. No category moved. B and E still read IFR, now on one uncovered
   changed line that reaches 4 and 7 cells. C's IFR is still that one `health` red, and D's
   is its failing tests and the `health` red on `ObservableQuery.ts`.
2. **A failing test on the change (D74, step 45).** D's failing `useLazyQuery` tests are
   notice 1, up from notice 6.
3. **A published package's public types (D75 and D76, steps 46 to 48).** E's break now
   reaches the map: an `interface-change` on `internals/types.ts` names `TRPCMutationKey`
   and `TRPCQueryKey` as reshaped. It is notice 5, outside the top three. Every interface
   notice on E carries the same severity at the same reach, so each file's history and
   uncovered share order them. `types.ts` has less of both than `createOptionsProxy.ts`,
   which takes notice 1 for its own reshaped options type.

What else the refresh turned up:

- **An uncompared shape still raises the notice.** D's body-only edit to `QueryManager.ts`
  is notice 2, where it was notice 3. The `QueryManager` class has methods whose return
  types are inferred, so the scan records its shape as not compared, and step 47 keeps the
  notice rather than read that silence as unchanged (C2). B's `useForm.tsx` and C's
  `router.ts` enter the top three the same way, on the uncompared shapes of `useForm` and
  `RegExpRouter`. Parked for the next refine.
- **A's mutants moved from notice 1 to notice 3.** The PR adds `randomInt`, a public name,
  to `src/randomInt.ts` and to the barrel `src/index.ts`, and both now rank as interface
  changes ahead of the three mutants on the `bigint` branch. The finding stays in the top
  three.
- **The Other block** reads 0, 41, 12, 2 and 16 on A to E, down from 5, 72, 53, 43 and 106,
  which is what step 50 measured. All five maps now read their entry points from the
  repository's own fallow (step 43).

## Precision corpus, tuning half: 4 of 6 (2026-10-23)

Step 18 scores §11's criterion 5 on the six holds `fixtures/corpus-1` to `fixtures/corpus-6`,
the tuning half of the precision corpus (D88, amended by D127 to D129; see
[`fixtures/corpus.md`](../fixtures/corpus.md)). Each fixture is named by number alone (D62).
Step 17 generated the maps by the D58 procedure on checkride 0.17.0 and fallow 3.35.0, with
coverage on all six and mutation kept on three (`corpus-1`, `corpus-4` and `corpus-6`). A
notice counts only when it targets the file or cell the review flags *and* its kind bears on
the finding (D65). Criterion 5 needs no reader, so this section scores the maps, not a
reading.

**Scored once (D127).** The six are not re-scored after the fixes they prompt. Each miss is
parked for one `/plumbbob:refine` pass (D38). That pass's fixes are judged only on the
held-out half at step 20, and any miss it leaves is parked past step 20.

| fixture | category | notice 1 | notice 2 | notice 3 | finding in the top three? |
| --- | --- | --- | --- | --- | --- |
| `corpus-1` | IFR | `red-check-slot`, `health` on `client/src/App.tsx` | `red-check-slot`, `health` on `client/src/components/ToolsTab.tsx` | `survived-mutants` on `client/src/App.tsx` | **yes**, notice 3 |
| `corpus-2` | IFR | `interface-change` on `packages/mermaid/src/config.type.ts` | `red-check-slot`, `health` on `packages/mermaid/src/rendering-util/rendering-elements/shapes/classBox.ts` | `uncovered-high-reach` on `packages/mermaid/src/rendering-util/rendering-elements/shapes/classBox.ts` | **yes**, notice 3 |
| `corpus-3` | LIFR | `interface-change` on `src/common-crypto/CryptoBackend.ts` | `red-check-slot`, `dead` and `health` on `src/client.ts` | `interface-uncompared` on `src/client.ts` | **yes**, notice 1 |
| `corpus-4` | LIFR | `red-check-slot`, `dead` on `packages/builders/src/index.ts` | `uncovered-high-reach` on `packages/builders/src/index.ts` | `red-check-slot`, `dead` and `health` on `packages/builders/src/components/Components.ts` | **no** |
| `corpus-5` | LIFR | `red-check-slot`, `dead` on `packages/loot-core/src/shared/schedules.ts` | `interface-change` on `packages/loot-core/src/types/api-handlers.ts` | `red-check-slot`, `health` on `packages/loot-core/src/server/schedules/occurrences.ts` | **no** |
| `corpus-6` | IFR | `survived-mutants` on `packages/cli/src/index.ts` | `large-hot-change` on `packages/cli/src/index.ts` | `red-check-slot`, `health` on `packages/cli/src/commands/publish/index.ts` | **yes**, notice 1 |

**4 of 6**, read per D65.

### The calls and their reasons

1. **`corpus-1`: yes.** The review reports that general metadata is no longer sent with a
   tool call. `callTool`'s third parameter, `metadata`, shadows the component's `metadata`
   state, so the merge at `App.tsx` lines 824 to 828 never reads the state. Notices 1 and 2
   are `health` reds on the two flagged files. D65 rules them out, as the retake did, since a
   complexity threshold does not bear on a shadowed name. Notice 3 counts. Its 14 mutants on
   `App.tsx`'s changed lines sit on the merge itself (lines 824, 826 and 827) and on the
   state and its handler (lines 206 to 223). Two survived the tests and twelve were never
   reached by one, which is the gap the truth names: no test exercises `callTool`.
2. **`corpus-2`: yes, the closest call of the six.** The review finds that `anything || true`
   makes `htmlLabels: false` a dead setting at `shapeUtil.ts` line 107 and `classBox.ts`
   line 17. It also finds that `erBox.ts` decides HTML layout from a value that disagrees with
   the one its label is created with. Notice 1 is an interface change on `config.type.ts`,
   which the truth does not name. Notice 2 is a `health` red on `classBox.ts`, which D65 rules
   out. Notice 3 counts. `classBox.ts` has one changed executable line, line 17, the flagged
   `|| true`, and no test runs it, so the notice sends a reviewer to the exact line for the
   reason the bug went unseen: the PR's tests cover the config helper, not the renderers. It
   is an uncovered line, not a failing test, so it says where to look rather than that the
   line is wrong. `erBox.ts`, the review's blocking issue, has 16 uncovered changed lines with
   every flagged one among them, and it draws no notice in the top three. Its `health` red is
   notice 6.
3. **`corpus-3`: yes.** The review finds that a room waiting for its key bundle keeps no
   record of who invited us, so `rust-crypto.ts` passes the bundle's sender as the inviter
   and trusts any user who sends one. Notice 1 counts. It targets
   `src/common-crypto/CryptoBackend.ts`, which the truth names, and the one name it reshapes
   is the `CryptoBackend` interface. The change grew that interface by
   `markRoomAsPendingKeyBundle(roomId: string)`, the method without an inviter whose own doc
   comment promises the inviter check, and the fix changed that signature. Notices 2 and 3 are
   a `dead` and `health` red and an uncompared shape on `src/client.ts`. The truth names that
   file for `joinRoom`, but neither kind bears on the dropped inviter. The flagged lines in
   `rust-crypto.ts` are all covered and carry no mutants, since mutation did not finish there,
   so no test evidence points at them.
4. **`corpus-4`: no.** The review finds that the radio and checkbox group builders check the
   option count on every `addOptions` and `spliceOptions` call, so adding a radio group's
   options one at a time throws. The top three target the package barrel
   `packages/builders/src/index.ts`, first with a `dead` red and then because no test run
   measured it, and then `components/Components.ts`, with a `dead` and `health` red. None
   targets the `checkbox` files. The map does hold evidence there: three mutants survived in
   each of `RadioGroup.ts` and `CheckboxGroup.ts`, two of them on the flagged checks in
   `spliceOptions` (lines 126 and 132) and two more inside the flagged methods (lines 76 and
   116). No notice of the six reaches either file.
5. **`corpus-5`: no.** The review finds that for a schedule that skips weekends,
   `getScheduleDates` returns one moved date several times and counts the repeats toward
   `count`, and that the method reimplements the app's `getNextDateAfter`. Notice 1 is a `dead`
   red on `shared/schedules.ts`, the file holding the helper the reviewer wants reused. That
   red is a dead or structural finding the change touched there, and it does not bear on
   repeated dates. Notice 2 is an interface change on `types/api-handlers.ts`, which the truth
   does not name. Notice 3 is a `health` red on `occurrences.ts`, the flagged file, which D65
   rules out. The flagged loop is fully covered and mutation did not finish, so the map holds
   no evidence on it. The new public `getScheduleDates` is notice 5, an interface addition,
   which says where the new API is, not that it misbehaves.
6. **`corpus-6`: yes.** The review finds that `changeset version --snapshot` parses as
   `ignore: ["undefined"]`, because the `version` command declares `--ignore` with
   `{ type: [String] }` at `packages/cli/src/index.ts` line 49, and the command then fails.
   Notice 1 counts. It targets that file, and its 88 mutants on the changed lines include the
   option declarations at lines 46 to 50. All 88 are `NoCoverage`: no test loads the CLI's
   entry, which is why the truth says its parsing is never under test. Notices 2 and 3 do not
   count, and need not.

### What the six show

- **Test evidence on the flagged lines carried three of the four hits.** Mutants
  (`corpus-1` and `corpus-6`) and an uncovered line (`corpus-2`) sat on the lines the
  reviewers flagged. The fourth hit was an interface whose new method was itself the flaw
  (`corpus-3`).
- **`health` and `dead` reds on changed files hold half the top three.** Nine of the 18
  top-three rows are a `health` or `dead` red on a changed file, and none bears on any of the
  six findings. They pushed `corpus-1`'s hit down to notice 3, and with the barrel's
  unmeasured notice they kept `corpus-4`'s mutants out of all six. The retake parked the same
  pattern as its first encoding, and D73 narrowed it to findings on the changed lines; on
  these six it still leads.
- **A barrel no test imports reads as a gap.** `corpus-4`'s notice 2 says no test run
  measured `src/index.ts`, the package barrel, whose seven added lines are exports.
- **A `NoCoverage` mutant reads as survived.** All 88 of `corpus-6`'s mutants and 12 of
  `corpus-1`'s 14 were never reached by a test, and both notices say they "survived". The
  hits stand either way, but the notice overstates what the tests did.

### Parked for the one refine pass (D127)

The two misses are parked by fixture number, and so are the three encodings above; the first
two of those bear on `corpus-4`'s miss. The refine pass that answers them is the one D127
allows. Its fixes are judged on the held-out half at step 20, never on these six.
