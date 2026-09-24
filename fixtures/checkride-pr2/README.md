# checkride PR 2

The oldest fixture, and the one that proved D58. Its tree is from June 2026, when checkride
was `v0.1.1`; run against that era's own harness it produced nothing atis could read, and the
map came out LIFR with zero notices. Run against the *current* harness it produces the
sharpest finding of the five: 11 mutants survive on the lines this PR changed.

## The change

| | |
| --- | --- |
| repo | `checkride` — `~/Projects/checkride/code/checkride` (`robmclarty/checkride`) |
| pull request | [#2](https://github.com/robmclarty/checkride/pull/2) `fix/cli-bin-symlink-entrypoint` |
| base | `bffc4d96bf7fd385b25476735ed28024483c35b1` (PR 1, `ci: bump actions to node24 runtime`) |
| head | `937bb1d7f316aeb9ab347bcb9b2317af4eae86ab` `fix: run CLI when invoked through the bin symlink (#2)` |
| merge | `937bb1d7f316aeb9ab347bcb9b2317af4eae86ab` — PR 2 was squash-merged, so the head commit is the merge commit |
| merge base | `bffc4d96bf7fd385b25476735ed28024483c35b1` |
| size | 2 files, +76 −4 (`src/cli.ts`, `test/e2e/bin-entrypoint.e2e.test.ts`) |

## The toolchain

The tree is historical; the harness is current (D58). This is the fixture that forced that
decision: checkride v0.1.1's `.check/summary.json` declares `schema_version: 1` yet omits
`checks_run`, which atis's schema-1 parser requires, so the commit's own harness read as
`harness_broken` and atis refused to quote anything under `.check/` (D41). Rather than teach
atis a format nothing will send, the procedure installs the current harness.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.13.0 | installed into the worktree, not the 0.1.1 the commit pinned |
| fallow | 3.28.0 | installed into the worktree, not the 2.48.0 the commit pinned |
| checkride summary schema | 1 | `checks_run` present, so `readCheck` trusts the folder |
| node | 24 | the engine the package declares (`>=24.0.0`) |

## The commands

```sh
# 1. A worktree at the head of the PR, named for the repo.
git -C ~/Projects/checkride/code/checkride worktree add /tmp/atis-fixtures/checkride 937bb1d --detach

# 2. The current harness (D58). Run the installed binary, never `pnpm check`: checkride's
#    repo dogfoods itself, so its own check script would run this commit's v0.1.1 CLI.
#    Mutation is kept here — it completes on this small tree (see "Skipped slots").
cd /tmp/atis-fixtures/checkride
pnpm install
pnpm add -D checkride@0.13.0 fallow@3.28.0 --config.minimumReleaseAge=0
pnpm exec checkride --all --skip security

# 3. The map and the still render, --repo resolved past the /tmp symlink.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/checkride && pwd -P)" \
  --base bffc4d9 \
  --out fixtures/checkride-pr2/map.json \
  --svg fixtures/checkride-pr2/atis.svg

# 4. The worktree is not kept.
git -C ~/Projects/checkride/code/checkride worktree remove --force /tmp/atis-fixtures/checkride
```

## Skipped slots

Named per D56. 16 slots ran.

- `security` — skipped per D56 (today's advisory database, not this PR's weather).
- `mutation` — **not** skipped. It completes on this tree in about 96 seconds, so D56's
  "included where the run completes" clause is satisfied rather than waived. This is the only
  fixture of the five that keeps it, and it earns the primary notice.
- `attw`, `publint` — checkride finds no tool for these slots on this old tree.
- `format`, `prose` — checkride 0.13.0 skips these itself.

## What it says

`IFR, 2 files changed, 6 notices`.

| | |
| --- | --- |
| category | IFR |
| terrain | 8 cells, 8 organelles, 5 bands, 9 shore groups |
| weather | 2 changed, 1 file reached, no ghosts, no new dependencies |
| notices | 6 — 1 primary, 2 secondary, 3 tertiary |
| primary | `survived-mutants` on `src/cli.ts` — 11 mutants survived on the changed lines |
| red slots | `dead`, `dupes`, `health`, `snippets` |

The primary notice is the one that matters: PR 2 added an end-to-end test for the bin
symlink, and mutation testing says the lines it changed are still weakly pinned. That is a
statement about *this change*, and it is what replaced a map with no notices at all.

The four red slots are current fallow rules firing on June-2026 code. Rob's ruling
(2026-09-22) is that these are real weather — the complexity is genuinely in the tree — even
though the rules post-date it. They are what carry the IFR category, so read the category and
the primary notice as saying different things: the category is largely the repository's
standing state, the primary notice is the change.

This is the one fixture whose `map.json` step 30 left unchanged apart from the two timestamps
(`meta.generated_at` and the harness's own `weather.checks.timestamp`, both of which a re-run
must move): it carried no `other` residual for step 28 to claim, so nothing in the shore or
the terrain moved. Its `atis.svg` did change. Two of its notices — `red-check-slot` on `dead` and on `snippets` — name a slot
rather than a file, and step 27 gives such a notice a leader from its HUD row to the storm
marker in the field corner instead of leaving it with no leader at all. Those two dotted
leaders are new here, and this fixture is the clearest place to read that fix: a reader can
now trace every one of the six rows to something on the map.

## Ground truth

See [`truth.md`](./truth.md).
