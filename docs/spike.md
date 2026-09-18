# The map.json spike: checkride PR 4

Step 14 of the phases 0–1 build. The pipeline of steps 2–13 is tested at every seam
against fixtures it was written from, which proves it is self-consistent and nothing
more. This spike points it at a real pull request and checks four of its answers against
evidence that comes from somewhere else: git, fallow and istanbul.

The fixture the checks were run against is `fixtures/checkride-pr4/map.json`, generated
by the commands in [its README](../fixtures/checkride-pr4/README.md). Everything below is
reproducible from a worktree of checkride at `ae5078c`.

## The four rows

| # | What was checked | Oracle | Verdict |
| --- | --- | --- | --- |
| 1 | the changed set | `git diff --name-status` | ✓ 11 of 11, exact |
| 2 | the reach set for `src/pm/tools.ts` | `fallow dead-code --impact-closure` | ✓ 32 of 32, exact |
| 3 | patch coverage for `src/pm/tools.ts` | `coverage-final.json`, by hand | ✓ 12 of 12, exact |
| 4 | the `src/pm/index.ts` interface change in the top three | the ranked notices | ✓ ranked 1, primary |

### ✓ 1. The changed set equals git's

```sh
git -C /tmp/atis-spike/checkride diff --name-status fee5ed6...ae5078c
```

Eleven paths, ten modified and one added. `map.json`'s `weather.changed` carries the same
eleven with the same kinds, and its `added`/`deleted` counts sum to +473 −21, which is
`git diff --numstat` over the same range and the size D29 recorded for the PR.

The three-dot range is the point: `readDiff` computes `merge-base(fee5ed6, HEAD)..HEAD`
(D25), and here the base is an ancestor of the head, so the merge base is `fee5ed6` itself
and the two agree by construction. A stale branch is where this would earn its keep.

Where each changed file landed is the second half of the row, and it is the part git
cannot check. Three files are terrain — `src/doctor.ts` and `src/orchestrator.ts` in
single-file cells, `src/pm/index.ts` and the added `src/pm/tools.ts` in `folder:src/pm` —
and the rest are shore: four to `docs` and `prompts`, three test files to the `tests`
group, which is where a changed test lands so that every entry names exactly one cell or
group (D48) while staying a stitch and never an organelle (D4).

### ✓ 2. The reach set equals fallow's impact closure

```sh
cd /tmp/atis-spike/checkride
pnpm exec fallow dead-code --impact-closure src/pm/tools.ts --format json
```

fallow returns 56 files in `affected_not_shown`. Removing the 24 test files (16 under
`src/__tests__/`, 7 contract tests and 1 e2e test) leaves **32**.

atis reports 33 `weather.reach` entries when the diff is narrowed to `src/pm/tools.ts`
alone. One of them is the seed itself, which fallow reports separately under `seed`.
Removing it leaves **32**, and the symmetric difference of the two sets is empty: nothing
in atis that fallow does not have, nothing in fallow that atis does not have.

The narrowing matters, because `weather.reach` in the committed map is the union over all
eleven changed files. The single-file reach was produced by running the shipped pipeline
with `diff.changed` filtered to that one path, so the code under test is `computeReach`
as it ships, not a re-implementation.

What atis has and fallow does not is the shape of D5. fallow's closure is a flat list;
atis prices it per membrane crossed:

| hops | files | example `via` |
| --- | --- | --- |
| 0 | 2 | `src/pm/tools.ts`, `src/pm/index.ts` — the same cell, free |
| 1 | 13 | `src/pm/index.ts` |
| 2 | 8 | `src/pm/index.ts` → `src/orchestrator.ts` |
| 3 | 10 | `src/pm/index.ts` → `src/orchestrator.ts` → `src/artifacts/index.ts` |

That is the oracle doing its job and then stopping: set equality is all fallow can
witness, and the attenuation is exactly the thing D52 says cannot come from it.

### ✓ 3. Patch coverage matches the hunk lines

```sh
node -e "const c=require('/private/tmp/atis-spike/checkride/.check/coverage/coverage-final.json');
const f=c['/private/tmp/atis-spike/checkride/src/pm/tools.ts'];
const r=Object.keys(f.statementMap).map(i=>({line:f.statementMap[i].start.line,hits:f.s[i]}));
console.log(r.map(x=>x.line+':'+x.hits).join(' '))"
```

`src/pm/tools.ts` is added, so its one hunk is `{ start: 1, count: 86 }` and every
statement in the file is a changed statement. istanbul's `statementMap` holds **15**
statements, at lines 30, 30, 31, 38, 47, 63, 64, 65, 66, 66, 67, 68, 68, 69 and 85, with
hit counts 50, 11, 39, 24, 16, 42, 42, 72, 72, 27, 45, 45, 15, 30 and 52. None is zero.

atis reports `changed_executable: 12, covered: 12, uncovered_lines: []`.

Fifteen against twelve is the row's one subtlety, and it is right: three lines carry two
statements each (30, 66 and 68), and step 10 counts changed executable *lines*, not
statements. Twelve distinct lines, all with a non-zero hit count, no uncovered line. The
same arithmetic done by hand over the other three changed files with coverage agrees
exactly: `src/doctor.ts` 4 of 4 over six hunks, `src/orchestrator.ts` 9 of 9 over three,
and `src/pm/index.ts` 0 of 0 — a barrel of pure re-exports has no executable line inside
its hunks, which is an absent measurement rather than a zero-percent one (C2).

### ✓ 4. The interface change is the primary notice

The six notices rank:

| # | tier | kind | target |
| --- | --- | --- | --- |
| 1 | primary | `interface-change` | `src/pm/index.ts` |
| 2 | secondary | `interface-change` | `src/orchestrator.ts` |
| 3 | secondary | `red-check-slot` | `security` |
| 4 | tertiary | `missing-cochange` | `README.md` |
| 5 | tertiary | `other-group` | `other` |
| 6 | tertiary | `missing-cochange` | `package.json` |

The row asked for the `src/pm/index.ts` interface change in the top three; it is first,
and it carries the numbers that put it there (D9, D28): *the interface of `src/pm`
changed and 8 files read it and it sits in band 4*, with `fan_in: 8` against a threshold
of 6, `band: 4` against a deep-band threshold of 4, `cells_reached: 14` and a history
weight of 1.773. Exactly 1 + 2 + 3 notices, which is the budget of C7 filled rather than
padded — there were more candidates than slots.

The ranking is worth reading rather than just passing. `red-check-slot` has the highest
severity in the config, 10 against the interface change's 8, and still lands third,
because the score multiplies severity by reach, uncovered fraction and history. A global
slot failure reaches no cell and has no history, so it scores its bare severity, while a
deep barrel that fourteen cells read is amplified to roughly eight times that (82.3
against 10). The map's
answer to "what should I look at" is the barrel, and the red gate slot is reported without
being allowed to shout down a change it has nothing to do with. That reads correct.

## What the spike found

Four ✓ rows and three problems, all parked for `/plumbbob:refine`. None of them is a
wrong number in the map; two are silent mutes and one is a ranking that is deterministic
without being meaningful.

### A symlinked repo path silently empties the coverage channel

The first run of this spike produced `weather.evidence.patch_coverage: []` with no reason
given, on a repository whose `.check/coverage/coverage-final.json` holds 52 files
including the changed ones.

The cause is macOS: `/tmp` is a symlink to `/private/tmp`, istanbul writes absolute keys
under the resolved path, and `relativeToRepo` in `apps/atis/src/sources/check.ts`
computes `relative('/tmp/…', '/private/tmp/…')`, gets a `../../..` path, and falls back to
keeping the key absolute. Nothing then joins to a repo-relative changed path, so coverage
and stitches both come back empty. Passing the resolved path restores 4 patch-coverage
entries and 9 stitches.

It fakes nothing, so C2 holds by the letter, but a wrongly muted channel is worse than an
absent one because it cannot be told from a repository with no tests. A `realpathSync` on
`--repo` in `run.ts` is the fix. The fixture is generated from the resolved path in the
meantime, which is why the README's command says `pwd -P`.

### `meta.repo` is the directory's name, not the repository's

`run.ts` fills `meta.repo` with `basename(resolve(options.repo))`, so a worktree at
`/tmp/atis-spike-cr-pr4` wrote `"repo": "atis-spike-cr-pr4"` into the map. The worktree is
now named after the repository and the fixture reads `"repo": "checkride"`, but step 22
generates five of these and the trap is one careless path away each time.

### The tertiary tier is ranked by the alphabet

Four candidates tied at weight 2 — `README.md`, `other`, `package.json` and
`src/pm/translate.ts` — and three tertiary slots. The tie-break is `byPath`, so `R` beat
`o` beat `p` beat `s` and `src/pm/translate.ts` was cut.

That is the wrong one to cut. It is a source file inside the very cell the PR changes,
and it co-changes with `src/__tests__/pm.test.ts` at rate 0.857 over 6 commits, against
0.5 over 4 for the `README.md` that took a slot. `score()` multiplies severity by reach,
uncovered fraction and history weight, and a file that did *not* change has none of the
three, so every missing-cochange candidate scores its bare severity and the alphabet does
the rest of the ranking. The attention budget is the product (P1, C7); spending two of
three tertiary slots on markdown housekeeping while dropping a source file in the changed
cell is the budget being spent badly, deterministically.

Feeding a ghost's `rate` and `support` into its weight is the obvious repair, and it is a
`config.ts` and `notices.ts` change rather than a schema one.

## What also held

Two properties this spike was not asked to check, confirmed while it was here:

- **C3.** Two runs over the same worktree produced byte-identical files, 185,534 bytes
  each, once `generated_at` was blanked.
- **C4.** The command exited 0 on a map it wrote, with the weather reading IFR and the
  reviewed repository's own `pnpm check` exiting 1. checkride gates, atis informs.

Wall time on checkride is 2.67 seconds across the eight measured sources, and the two
TypeScript scans are 1.97 of it. The history window is 0.47, but checkride carries 182
non-merge commits against D8's cap of 5,000, so that number says almost nothing about
history cost and should not be read as if it did. What the two data points so far do say
is that the scan is the term that grows: D50 reserved a `--history <n>` cap for the first
repository past about two seconds, and on this evidence the cap it earns first is on the
scan instead.
