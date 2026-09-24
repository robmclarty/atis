# Ground truth · checkride PR 4

Drafted per D44 from what broke after: every later commit in the next thirty on `main`
after the merge (`07d95bb`) that touches a file PR 4 changed, with subject and stat. The
reasons are the builder's cautious reading of the subjects and diffs, not Rob's; every line
Rob has not confirmed is marked **needs Rob**. He confirms, edits, or replaces the reason
before step 23 runs.

PR 4 resolved a slot's tool locally instead of trusting the launcher cache
(`src/pm/tools.ts`, `src/pm/index.ts`, `src/doctor.ts`, `src/orchestrator.ts`, tests).

## Reworks of PR 4's code

The two commits that rewrote the source PR 4 touched, not just its docs:

- `9511268` `fix(doctor): stop reporting a healthy Yarn PnP project as broken`
  (`src/doctor.ts` +100, `src/pm/tools.ts` +21, `src/pm/index.ts`, tests) — this is PR 5,
  merged the same day; it reworks the doctor and the tool-resolution PR 4 had just changed.
  **needs Rob**: did PR 4's local resolution mis-handle Yarn PnP, or is PR 5 an independent
  follow-on?
- `aa2a08a` `fix: report a refused slot as a finding, and bound the tool search to the repo`
  (`src/pm/tools.ts` +26, `src/doctor.ts` +41, `src/orchestrator.ts`, tests) — directly
  bounds the tool search PR 4 introduced. **needs Rob**: this reads as the strongest "what
  broke after" — PR 4's local tool search was unbounded and reached outside the repo?

## Later touches of PR 4's source (may be unrelated)

Same source files, but part of the agent-setup / gate stream rather than a fix to PR 4:

- `80af49b` `feat(agent-setup): stop imposing checkride's own shape on the repos adopting it`
  (`src/pm/index.ts` 2 lines). **needs Rob**
- `a488f6c` `fix(gate): stop reading a package manager's refusal to launch as a red pipeline`
  (`src/doctor.ts` +80, `src/pm/index.ts`, tests). **needs Rob**: touches doctor heavily;
  related to PR 4's launcher change or a separate gate concern?
- `4fa38a2` `feat(gate): stand down when nothing in the turn can fix a could-not-run`
  (`src/orchestrator.ts` +23, `src/pm/index.ts`). **needs Rob**

## Adjacent, docs and bookkeeping (grouped, not findings)

Grouped rather than listed line by line, so the residual is visible without drowning the
signal above (they touch PR 4's `docs/contract.md`, `docs/tools.md`, `AGENTS.md`, or only
`CHANGELOG.md`):

- Five `feat(agent-setup)` / `feat(gate)` commits touch only PR 4's docs pages
  (`7383931`, `726cce3`, `d837ecc`, `a9d9f91`, `16475d5`) — the Cursor and gate feature
  stream, documented in the same pages. **needs Rob**: confirm none is a PR 4 fix.
- Ten release / changelog-only commits touch just `CHANGELOG.md` (`fd8266d` v0.9.5 through
  `5f22a95` v0.11.1, plus `69e6530`, `a6f6bc6`). Bookkeeping. **needs Rob**: calm.

## What the map says now, for comparison

`MVFR`, primary notice `interface-change` on `src/pm/index.ts`. If the ground truth is
"PR 4's tool search was unbounded" (`aa2a08a`), the map's top notice points at the barrel
whose interface PR 4 changed, which is the right neighbourhood but not the finding itself.
Step 23 judges whether that counts as the flagged thing landing in the top three.

Step 30 refreshed this map after the render and shore fixes. The only number that moved is the
notice count, 6 down to 5: the sixth was the loud `other` residual, and step 28's shore table
claimed the file behind it. The category and all five surviving notices are unchanged, so
nothing above is affected — the budget is simply one row shorter, and a shore-bookkeeping row
no longer sits below the three co-change ghosts.
