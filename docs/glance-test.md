# The glance test

atis's acceptance test (SPEC §11): show a reader the map for ten seconds and see whether the
map, alone, carries the judgement a review would. It runs at the end of phases 1 and 2. This
file is the phase-1 setup — the five fixtures, their ground truth, and the protocol — ready
for step 23 to run round one against the still renders.

The fixtures live in `fixtures/<repo>-pr<n>/`, each with its `map.json`, `atis.svg`, a
`README.md`, and a `truth.md` whose ground-truth lines are drafted from history and marked
**needs Rob**. Round one settled each PR's verdict from the follow-up commits instead, and
those verdicts supersede the drafts where they differ (see [Round one](#round-one-fail-2026-09-24)).

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
