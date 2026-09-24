# The glance test

atis's acceptance test (SPEC §11): show a reader the map for ten seconds and see whether the
map, alone, carries the judgement a review would. It runs at the end of phases 1 and 2. This
file is the phase-1 setup — the five fixtures, their ground truth, and the protocol — ready
for step 23 to run round one against the still renders.

The fixtures live in `fixtures/<repo>-pr<n>/`, each with its `map.json`, `atis.svg`, a
`README.md`, and a `truth.md` whose ground-truth lines are drafted from history and marked
**needs Rob** until he confirms them. Rob confirms every `truth.md` before round one runs.

All five are generated under [D58](../.plumbbob/builds/2026-09-16-map-and-svg/intent.md): the
*tree* is historical, the *harness* is current (checkride 0.13.0, fallow 3.28.0, `--skip
security`). Step 22 first built them against each commit's own pinned toolchain, which left
checkride PR 2 unreadable and both fascicle fixtures blind; those maps are superseded.

## The five

| # | fixture | change | category | ground truth (one line, needs Rob) |
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

## Round one (step 23 fills this)

For each PR, for each of the three readers, record the ten-second verdict, the one reason,
and whether it matches that PR's ground truth. Then the pass/fail line.

| PR | reader | merge / hold | reason | matches truth? |
| --- | --- | --- | --- | --- |
| | | | | |

Pass line, per the step 23 done-when: **≥ 4 of 5 verdicts agree with ground truth**, **every
hold's reason matches a real finding**, and **the flagged thing sits in the top three
notices**. Fail line: name the encodings to change, and park each with `/plumbbob:park` for
`/plumbbob:refine` (D38).

Two things step 23 should carry in, both parked:

- **The category spread collapsed.** Four of the five now read IFR and one MVFR, where the
  step-22 set spanned MVFR, IFR, LIFR and two NOINST. Current fallow's `dead`, `dupes` and
  `health` rules fire on every one of these older trees, and Rob's ruling (2026-09-22) is
  that those findings are real weather, not calendar noise. The cost is that the category
  alone no longer discriminates between these five; a reader who judges on the HUD grade has
  almost no signal, so round one leans harder on the notices.
- **Repo-wide red slots crowd out change-specific notices.** Every one of fascicle PR 4's and
  PR 5's six notices is a `red-check-slot`, and the `interface-change` notice that used to be
  primary is pushed out of the budget entirely. The two fascicle maps now look nearly
  identical despite 18 versus 3 changed files. When scoring notice precision, check whether
  the map distinguished *this change* or merely reported the repository's standing state.
