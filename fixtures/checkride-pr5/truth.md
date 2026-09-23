# Ground truth · checkride PR 5

Drafted per D44 from the next thirty commits on `main` after the merge (`0ae85a6`) that
touch a file PR 5 changed. Reasons are the builder's reading, not Rob's; every line Rob has
not confirmed is **needs Rob**.

PR 5 stopped the doctor reporting a healthy Yarn PnP project as broken (`src/doctor.ts`,
`src/pm/tools.ts`, `src/pm/index.ts`, tests).

## Reworks of PR 5's code

- `aa2a08a` `fix: report a refused slot as a finding, and bound the tool search to the repo`
  (`src/doctor.ts` +41, `src/pm/tools.ts` +26, tests) — reworks the doctor and tool search
  again, the same day. **needs Rob**: PR 5 and this commit both rework `doctor.ts`; was PR 5
  incomplete, or is `aa2a08a` a separate concern that happened to touch the same file?
- `a488f6c` `fix(gate): stop reading a package manager's refusal to launch as a red pipeline`
  (`src/doctor.ts` +80, `src/pm/index.ts`, tests) — a large doctor rework four days later.
  **needs Rob**: the doctor's package-manager reading is exactly PR 5's territory (Yarn PnP);
  this looks like the strongest "what broke after". Confirm or correct.

## Later touches of PR 5's source (may be unrelated)

- `80af49b` `feat(agent-setup): stop imposing checkride's own shape on the repos adopting it`
  (`src/pm/index.ts` 2 lines). **needs Rob**
- `4fa38a2` `feat(gate): stand down when nothing in the turn can fix a could-not-run`
  (`src/pm/index.ts` 1 line). **needs Rob**

## Bookkeeping (grouped, not findings)

- Twelve release / feature commits touch only `CHANGELOG.md` or PR 5's `docs/tools.md`
  (`fd8266d` v0.9.5 through `f75c3ee`, the v0.10.x line and the agent-setup docs). **needs
  Rob**: calm.

## What the map says now, for comparison

`IFR`. The secondary notice `uncovered-high-reach` on `src/doctor.ts` points straight at the
file the two follow-ups rewrote. If the ground truth is "PR 5's doctor change was thin where
it reached" (`a488f6c`, `aa2a08a`), the map flagged the right file, one tier below the
interface-change primary. Step 23 judges whether that lands in the top three.
