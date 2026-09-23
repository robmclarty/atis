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

`NOINST`, and its only notice is the `other` residual — the map flags nothing about the three
changed tool files. For the glance test this is a "merge / quiet" case, and a useful negative
control: if a reader holds here, it is on the residual notice, not the change. Whether the
residual should rank at all on a change this small is the parked question.
