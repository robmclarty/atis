# Ground truth · fascicle PR 4

The one fixture with a real review, so its ground truth has two sources: what the review
found (D44's acknowledged exception — checkride's PRs and all but this one of fascicle's
carry no review), and what broke after. Reasons are the builder's reading; every line Rob
has not confirmed is **needs Rob**.

PR 4 added the worktree-scoped builder tools under `examples/pr-improve/src/tools/`
(`run_shell.ts`, `read_file.ts`, `write_file.ts`, `edit_file.ts`, `list_dir.ts`,
`path_safety.ts`, `limits.ts`, `index.ts`, tests).

## What the review found

The PR carries one automated review with **7 suggestions**, all inside
`examples/pr-improve/src/tools/`. They cluster on two themes:

- **`run_shell.ts` (3)** — stream truncation counts UTF-16 code units, not bytes, so
  multi-byte output can exceed `MAX_SHELL_OUT_BYTES` (bug, medium); on timeout the `error`
  event settles the promise before `close`, so `timed_out: true` is dead (bug, medium); an
  unreachable `cmd === undefined` guard (clarity, low).
- **path safety across the tools (4)** — `read_file.ts` and `edit_file.ts` `stat` after an
  `lstat` guard, a TOCTOU window a swapped-in symlink slips through (safety, medium);
  `write_file.ts` `stat`s a symlink-to-dir and misreports it (safety, medium);
  `read_file.ts` line count over-counts by one on a trailing newline (bug, low);
  `path_safety.ts` `resolve_within` does not assert an absolute root (safety, low).

**needs Rob**: confirm the review is the ground truth for PR 4, and which of the seven is
"the" finding for the ten-second glance — the byte-cap bug and the symlink TOCTOU are the
two mediums that recur.

## What broke after

The next thirty commits after the merge (`a3ef265`) that touch a PR 4 file:

- `414f336` `fix(pr-improve): narrow run_shell error type with 'in' guard instead of unsafe
  cast` (`run_shell.ts`). **needs Rob**: a follow-up fix on `run_shell.ts`, the same file
  three of the review's suggestions land on — related to the review, or a separate tidy?
- Grouped, not findings: `7af511d`, `3929c18`, `2a90626`, `509a41f` add words to
  `cspell.json`; `d9fe8d1`, `19aeada` edit `examples/pr-improve/SPEC.md`; `245f166` and
  `509a41f` touch `vitest.config.ts` — dictionary, spec and config churn. **needs Rob**:
  calm.

## What the map says now, for comparison

`NOINST`, primary notice `interface-change` on `examples/pr-improve/src/tools/index.ts`. The
map points at the tools barrel — the directory every review finding sits in — but as a
git-only map it cannot name the byte-cap or symlink bugs themselves. Step 23 judges whether
"the tools cell is the primary notice" counts as the flagged thing landing in the top three,
or whether a reader needs the line-level finding the map cannot give without evidence.
