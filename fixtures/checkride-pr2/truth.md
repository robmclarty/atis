# Ground truth · checkride PR 2

Drafted per D44 from the next thirty commits on `main` after the merge (`937bb1d`) that touch
a file PR 2 changed, and revised after the D58 regeneration, which gave this fixture evidence
it did not have before. Reasons are the builder's reading, not Rob's; every unconfirmed line
is **needs Rob**.

PR 2 made the CLI run when invoked through the bin symlink (`src/cli.ts`, one e2e test).

## What the evidence says

Under the current harness, mutation testing reports **11 mutants surviving on the lines PR 2
changed** (`src/cli.ts`). PR 2's whole contribution beyond the fix was
`test/e2e/bin-entrypoint.e2e.test.ts`, so the finding is that the test it added does not pin
the behaviour it was added to protect.

**needs Rob**: is this the ground truth for PR 2 — a correct fix with a weak test — or is the
surviving-mutant count an artefact of mutating a CLI entrypoint, where much of the mutated
code is argument plumbing an e2e test legitimately does not discriminate?

This supersedes the earlier reading. Step 22's draft recorded PR 2 as **calm** on the strength
of the follow-up commits alone; that draft was written when the fixture had no evidence at all
and the map carried zero notices. The follow-up history below has not changed — nothing
reverted the fix — but "calm" was a conclusion drawn from silence.

## Follow-up touches of PR 2's code

All six later commits touch `src/cli.ts`, but none reads as a repair of the symlink
entrypoint; the file simply kept growing:

- `5273189` `feat(cli): add --help/--version, a configurable timeout, and friendlier errors`
  (`src/cli.ts` +69). **needs Rob**: a feature, not a PR 2 fix?
- `596e02f`, `1c75615`, `c5e39b3`, `6f88d90`, `bb7974a` — five `plumbbob: step N …` and
  `Baseline` commits, each touching `src/cli.ts` in 2–23 lines. **needs Rob**: unrelated
  feature work on the same file?

## Verdict: correct fix, unpinned behaviour

Read as **merge, with a caveat**: no follow-up reverted or repaired the bin-symlink fix, so
it held; but the evidence says the test guarding it is thin. **needs Rob** to confirm which of
those two the ten-second verdict should reward.

## What the map says now, for comparison

`IFR`, primary notice `survived-mutants` on `src/cli.ts`. Note the category and the primary
notice are driven by different things: IFR comes largely from four red fallow slots that are
the repository's standing state, while the primary notice is genuinely about this change.
A reader who judges on the grade and a reader who judges on the top notice will not
necessarily agree here, which is worth watching in round one.
