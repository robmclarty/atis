# Ground truth · fascicle PR 5

Drafted per D44 from the next thirty commits on `main` after the merge (`c7407b5`) that touch
a file PR 5 changed. Reasons are the builder's reading; unconfirmed lines are **needs Rob**.

PR 5 applied the improvement spec to three of the tool files PR 4 added
(`examples/pr-improve/src/tools/edit_file.ts`, `read_file.ts`, `run_shell.ts`). It is itself
a fix pass, so it is closer to a remedy than a defect.

## What broke after

One later commit touches a PR 5 file:

- `414f336` `fix(pr-improve): narrow run_shell error type with 'in' guard instead of unsafe
  cast` (`run_shell.ts`). **needs Rob**: `run_shell.ts` was still being tidied after PR 5;
  the same commit is the sole follow-up on PR 4. Related to the review's `run_shell.ts`
  findings, or an independent type-safety cleanup?

## Verdict: near-calm

Read as **near-calm** (D44): one small type-narrowing follow-up on `run_shell.ts`, no
reverts. **needs Rob** to confirm, and to add whether PR 5's own fixes (it applied the review
spec) fully closed the run_shell byte-cap and symlink issues, or left the remainder that
`414f336` and later work picked up.

## What the map says now, for comparison

`IFR`, with six `red-check-slot` notices led by `run_shell.ts` — nearly identical to PR 4's
map next door, which changes eighteen files rather than three. One of the six (`attw`, red for
the whole repository) has nothing to do with the change at all.

So the map and the ground truth disagree: the truth here is near-calm, and the map shows an
IFR grade and six red rows, none of which is about the three-file fix as such. That makes PR 5
the adversarial case of the five. A reader who holds is reading the repository's standing
state; a reader who merges is reading the change. Round one should record which, because it
is the clearest test of whether the encodings separate the two — and it is the evidence
behind the parked notice-crowding question.

Under step 22's blind procedure this map was `NOINST` with the shore residual as its only
notice; that version is superseded.

Step 30 refreshed it after the render and shore fixes; the category and all six notices held,
and the shore went from 10 groups to 9 as step 28's rules claimed the `other` residual. One
render change bears on the reading above: the `attw` row, the one notice with nothing to do
with the three changed files, was previously the only row drawn without a leader. Step 27
gives it one, pointing at the storm marker in the field corner. A reader can now see that the
row is about the whole field, which is the distinction round one is being asked to test.
