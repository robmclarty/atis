# The glance test

atis's acceptance test (SPEC §11): show a reader the map for ten seconds and see whether the
map, alone, carries the judgement a review would. It runs at the end of phases 1 and 2. This
file is the phase-1 setup — the five fixtures, their ground truth, and the protocol — ready
for step 23 to run round one against the still renders.

The fixtures are built by step 22 under D36 and D54; each lives in `fixtures/<repo>-pr<n>/`
with its `map.json`, `atis.svg`, a `README.md`, and a `truth.md` whose ground-truth lines are
drafted from history and marked **needs Rob** until he confirms them. Rob confirms every
`truth.md` before round one runs.

## The five

| # | fixture | change | category | ground truth (one line, needs Rob) |
| --- | --- | --- | --- | --- |
| 1 | [`checkride-pr4`](../fixtures/checkride-pr4/) | resolve a slot's tool locally (#4) | MVFR | the local tool search was later bounded to the repo (`aa2a08a`); watch `src/pm`, `src/doctor.ts` |
| 2 | [`checkride-pr5`](../fixtures/checkride-pr5/) | the Yarn PnP doctor fix (#5) | IFR | the doctor change was reworked twice after (`aa2a08a`, `a488f6c`); the map flags `src/doctor.ts` uncovered |
| 3 | [`checkride-pr2`](../fixtures/checkride-pr2/) | run the CLI through the bin symlink (#2) | LIFR | calm — the fix held; the LIFR is an unreadable v0.1.1 harness, not the change |
| 4 | [`fascicle-pr4`](../fixtures/fascicle-pr4/) | the pr-improve builder tools (#4) | NOINST | the review found 7 bugs in `examples/pr-improve/src/tools/`, on `run_shell.ts` byte cap/timeout and symlink TOCTOU |
| 5 | [`fascicle-pr5`](../fixtures/fascicle-pr5/) | apply the improvement spec (#5) | NOINST | near-calm — one `run_shell.ts` type follow-up (`414f336`); the map's only notice is the residual |

Each row's ground truth is the summary; the full drafting, with stat lines and the
`needs Rob` markers, is in that fixture's `truth.md`.

The five are deliberately spread across the categories — MVFR, IFR, LIFR, and two NOINST —
and across what atis can see: two with real checkride evidence (1, 2), one whose evidence
atis cannot read (3), and two git-only workspace repos (4, 5). Three of the five (1, 2, 4)
carry a follow-up or a review that names the file to watch; two (3, 5) are calm controls.

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

Two things step 23 should carry in, both parked by step 22:

- `checkride-pr2` reads LIFR only because atis rejects checkride v0.1.1's `summary.json`
  (no `checks_run`). A reader who holds is reacting to the harness, not the change — discount
  it, or the category confounds the verdict.
- On `fascicle-pr5` the loud `other` residual is the *primary* notice on a three-file change.
  The notice-precision check (step 5) should read that as the map having nothing about the
  change to say, not as a finding.
