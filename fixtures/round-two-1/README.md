# Round-two fixture 1

An outside project's pull request, in glance round two (D95; see
[`../round-two.md`](../round-two.md)), read blind in the world at step 47. Its ground truth is
in [`truth.md`](./truth.md); the reader opens neither file until the reading is done (D62).

## The change

| | |
| --- | --- |
| repo | `azat-io/eslint-plugin-perfectionist` (<https://github.com/azat-io/eslint-plugin-perfectionist>) |
| pull request | [#673](https://github.com/azat-io/eslint-plugin-perfectionist/pull/673) `feat: fallback sort subgroup order` |
| base branch | `main` |
| fixture commit | `b34bffb601f91a67f1d1413457e5d6041325e57e` `fix: removed extra blank lines`: the commit a human review was submitted against |
| merge base | `de28a71501081f044ece00064dc45e9a3a137848` `docs: add missing fallback sort documentation` |
| size | 15 files, +346 −49; 9 TypeScript source files by `classifyFile`'s rule, 4 test files |

The TypeScript source files are four rules' comparator computers,
`rules/sort-enums/build-comparator-by-options-computer.ts`,
`rules/sort-imports/comparator-by-options-computer.ts`,
`rules/sort-modules/build-comparator-by-options-computer.ts` and
`rules/sort-object-types/comparator-by-options-computer.ts`; `types/common-options.ts`; and four
under `utils/`, `compare/build-subgroup-order-comparator.ts` (new),
`compare/default-comparator-by-options-computer.ts`, `json-schemas/common-json-schemas.ts` and
`sort-nodes-by-groups.ts`. The tests are `test/rules/sort-classes.test.ts`,
`test/utils/json-schemas/common-json-schemas.test.ts`,
`test/utils/sort-nodes-by-groups.subgroup-order.test.ts` (new) and
`test/utils/sort-nodes-by-groups.test.ts`. The other two files are
`docs/content/rules/sort-imports.mdx` and `pnpm-workspace.yaml`.

The merge base is `git merge-base` of the fixture commit and `origin/main`, and agrees with the
compare API's `merge_base_commit`; the fixture commit is five commits ahead of it, all the PR
author's and all on the PR's branch. The branch was rebased onto the merge base after the PR's
first review, so the commit that first review was submitted against,
`10578872db954f6592ec895bfffa3a9f6e43c195` (a merge of `main` into the branch's earlier
history), is not in the PR's final commit list. The fixture commit is, and so is reachable from
`refs/pull/673/head`. The PR squash-merged as `3c8fecfb61ff6cce606a375a2c35c257b89ca97c`, whose
one parent is the merge base.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm, with no `packageManager` field; CI's `pnpm/action-setup` asks for version 10 and runs `pnpm install --frozen-lockfile --ignore-scripts`, then `pnpm exec astro sync`. `pnpm-lock.yaml` is lockfileVersion 9.0 with a `pnpmfileChecksum`; `pnpm-workspace.yaml` loads the config dependency `@pnpm/plugin-trusted-deps` 0.2.1 and takes `onlyBuiltDependenciesFile` from it |
| workspaces | none: one package whose code sits at the root, in `index.ts`, `rules/`, `types/` and `utils/`, with no `src/`. The fixture commit's `pnpm-workspace.yaml` carries the PR's own `packages: ['.']`, which the owner later asked to drop |
| test runner | vitest `^4.0.16` (the lockfile resolves 4.0.16) with `@vitest/coverage-v8` `^4.0.16` (4.0.16), from root `devDependencies`. `vitest.config.ts` merges `vite.config.ts` (which loads `vite-plugin-dts` and `vite-plugin-prettier-format`) and sets the v8 provider with 100% thresholds on statements, functions, branches and lines. `test:unit` runs `vitest --run --coverage`; the root `test` script runs every `test:*` script, among them `astro check`, stylelint, prettier, eslint, cspell, `svelte-check` and `tsc --noEmit`. The lockfile resolves typescript 5.9.3, eslint 9.39.2 and `@typescript-eslint/parser` 8.51.0 |
| node | `engines.node` `^20.0.0 \|\| >=22.0.0`; no `.nvmrc` or `.node-version`; CI sets up node 24 |
| TypeScript files at the fixture commit | 267 |

## Generation

Step 46 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, coverage provider, lockfile and package manager stay as the
commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.19.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `engines.node` is `^20.0.0 \|\| >=22.0.0`, which admits it, and CI sets up node 24 |
| pnpm | 10.27.0 | the repo has no `packageManager` field; CI's `pnpm/action-setup` asks for `version: 10`, which on the review's date (2026-01-04) resolved to 10.27.0, released 2025-12-30. Run through corepack by a wrapper on `PATH` (see "The commands"); `pnpm-lock.yaml` (lockfileVersion 9.0) is honoured by `--frozen-lockfile` |
| vitest | 4.0.16 | the lockfile's, unchanged |
| `@vitest/coverage-v8` | 4.0.16 | already a root dev dependency, unchanged; the v8 provider is kept |
| typescript | 5.9.3 | the lockfile's, unchanged; fallow brings a second, private copy, 7.0.2, through `fallow-type-aware` |
| eslint | 9.39.2 | the lockfile's, unchanged |
| prettier | 3.7.4 | the lockfile's, unchanged |
| cspell | 9.4.0 | the lockfile's, unchanged |
| `@stryker-mutator/core` | 10.1.1 | added for the `mutation` slot, and kept |
| `@stryker-mutator/vitest-runner` | 10.1.1 | added for the `mutation` slot, and kept; its peer range (`vitest >=2.0.0`) admits 4.0.16 |

checkride records each tool's version as the check's `tool_version` in `.check/summary.json`,
and every one above that runs a slot matches it.

## The commands

```sh
# 0. A full clone, not a blobless one, so `git log --numstat` needs no promisor remote. The PR
#    squash-merged, so the fixture commit is fetched from the PR's head ref.
git clone https://github.com/azat-io/eslint-plugin-perfectionist.git \
  /tmp/atis-round-two/clones/azat-io__eslint-plugin-perfectionist
git -C /tmp/atis-round-two/clones/azat-io__eslint-plugin-perfectionist fetch origin pull/673/head

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads
#    `eslint-plugin-perfectionist`.
git -C /tmp/atis-round-two/clones/azat-io__eslint-plugin-perfectionist worktree add \
  /tmp/atis-round-two/work/round-two-1/eslint-plugin-perfectionist \
  b34bffb601f91a67f1d1413457e5d6041325e57e --detach

# 2. pnpm 10.27.0. With no `packageManager` field the machine's corepack shim runs its own
#    default, pnpm 11.28.5, so a wrapper outside the worktree, first on PATH, makes every
#    `pnpm` call (checkride's own included) run 10.27.0, and corepack's global default is left
#    alone. The hook switches keep any installer off the shared clone's hooks.
mkdir -p /tmp/atis-round-two/tools/round-two-1
cat > /tmp/atis-round-two/tools/round-two-1/pnpm <<'SH'
#!/bin/sh
exec corepack pnpm@10.27.0 "$@"
SH
chmod +x /tmp/atis-round-two/tools/round-two-1/pnpm
export PATH=/tmp/atis-round-two/tools/round-two-1:$PATH
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 HUSKY=0 LEFTHOOK=0 SKIP_INSTALL_SIMPLE_GIT_HOOKS=1

# 3. The repo's own install, as CI runs it: the frozen lockfile and no install scripts, then
#    astro's content types.
cd /tmp/atis-round-two/work/round-two-1/eslint-plugin-perfectionist
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec astro sync

# 4. The current harness (D58) at the workspace root. `-w` because the fixture commit's
#    pnpm-workspace.yaml carries the PR's `packages: ['.']`. pnpm 10 has no release-age gate
#    by default and the workspace file sets none, so checkride 0.19.0 (under an hour old)
#    installed as is.
pnpm add -D -w --save-exact --ignore-scripts checkride@0.19.0 fallow@3.35.0

# 5. Harness edits (see the next section for why). The coverage keys are in the order the
#    repo's own perfectionist `sort-objects` rule asks for.
python3 - <<'PY'
p = "vitest.config.ts"
s = open(p).read()
old = "        provider: 'v8',\n"
new = (
    "        reportsDirectory: '.check/coverage',\n"
    "        reportOnFailure: true,\n"
    "        reporter: ['json'],\n"
    "        provider: 'v8',\n"
    "        enabled: true,\n"
)
s = s.replace(old, new)
open(p, "w").write(s)
PY
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dev dependency.
ignoreDependencies = ["checkride"]
CONFIG
printf '.check\n' >> .prettierignore

# 6. Stryker for the mutation slot, scoped to the PR's nine changed non-test TypeScript source
#    files (`git diff --name-only` between the merge base and the fixture commit).
pnpm add -D -w --save-exact --ignore-scripts \
  @stryker-mutator/core@10.1.1 @stryker-mutator/vitest-runner@10.1.1
cat > stryker.conf.json <<'CONFIG'
{
  "packageManager": "pnpm",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": [
    "rules/sort-enums/build-comparator-by-options-computer.ts",
    "rules/sort-imports/comparator-by-options-computer.ts",
    "rules/sort-modules/build-comparator-by-options-computer.ts",
    "rules/sort-object-types/comparator-by-options-computer.ts",
    "types/common-options.ts",
    "utils/compare/build-subgroup-order-comparator.ts",
    "utils/compare/default-comparator-by-options-computer.ts",
    "utils/json-schemas/common-json-schemas.ts",
    "utils/sort-nodes-by-groups.ts"
  ],
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG

# 7. The mutation attempt, run on its own first: it completed in 8 minutes 13 seconds, so
#    the slot is kept.
node_modules/.bin/stryker run

# 8. The .check/ atis reads for evidence, from a clean state. Run the installed binary, never
#    the repo's own `test` script.
rm -rf .check .stryker-tmp .fallow dist tsconfig.tsbuildinfo
node_modules/.bin/checkride --all --skip security

# 9. The map and the still render, from atis's current source. --repo takes the resolved
#    path, not the /tmp symlink: on macOS /tmp is /private/tmp, and istanbul's absolute
#    coverage keys will not relativise against the unresolved one, which silently empties
#    patch_coverage. atis runs the worktree's own node_modules/.bin/fallow for the entry
#    points, and meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
pnpm exec tsc --build
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-round-two/work/round-two-1/eslint-plugin-perfectionist && pwd -P)" \
  --base de28a71501081f044ece00064dc45e9a3a137848 \
  --out fixtures/round-two-1/map.json \
  --svg fixtures/round-two-1/atis.svg

# 10. The worktree is not kept; the clone is.
git -C /tmp/atis-round-two/clones/azat-io__eslint-plugin-perfectionist worktree remove --force \
  /tmp/atis-round-two/work/round-two-1/eslint-plugin-perfectionist
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml`: four dev dependencies added at the workspace root
  (`checkride`, `fallow`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`), all
  exact-pinned. The lockfile keeps its version 9.0 format and its `pnpmfileChecksum`, and no
  line of it is removed. checkride and fallow add 32 package entries (315 lines) to the 1,443
  it had; with the two stryker packages the gain is 131 entries (1,332 lines). None of the
  1,443 is dropped or moved to another version, and `pnpm-workspace.yaml` is unchanged. vitest,
  its coverage provider, typescript, eslint and every other direct dependency stay at the
  versions the lockfile locked.
- `vitest.config.ts`: edited in place, five settings added to the repo's own `coverage` block
  and nothing removed. `enabled` is `true`, `reporter` is `['json']` and `reportsDirectory` is
  `.check/coverage`, so the `test` slot writes istanbul JSON to
  `.check/coverage/coverage-final.json`, where atis reads it. `reportOnFailure` is `true`
  because vitest writes no coverage when a test fails by default, and the file must land either
  way. The repo keeps its vitest config at the root, which checkride detects, so it is edited
  rather than shadowed; the merge of `vite.config.ts`, the v8 provider and the 100% thresholds
  are unchanged. The keys are ordered by the repo's own `perfectionist/sort-objects` rule: the
  first full run added them in another order, and the `lint` slot reported the two misplaced
  keys as findings of the harness's, so that run was discarded and the order taken from
  `eslint --fix` on that one file.
- `fallow.toml`: created with fallow's defaults and no entry points, since fallow finds them
  itself, so `dead`, `dupes` and `health` run. One line, `ignoreDependencies = ["checkride"]`,
  keeps the harness's own install from showing up as an unused dev dependency. fallow did not
  report the two stryker packages as unused, so they are not listed.
- `.prettierignore`: `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts.
- `stryker.conf.json`: created, as in step 6. Its `mutate` list is the PR's nine changed
  non-test source files, and its JSON reporter writes `.check/mutation.json`, the file atis
  reads. It passes the repo's prettier as written.
- `tsconfig.json` is unchanged: the shared `@azat-io/typescript-config` it extends already sets
  `noEmit: true`, so the `types` slot's `tsc --build` wrote no `.js` or `.d.ts` beside the
  sources. It did write `tsconfig.tsbuildinfo` at the root, the one untracked file the run left
  outside `.check/`. The `build` slot's `vite build` writes `dist/`, which `.gitignore` covers.
  The tsconfig includes `**/*.ts` and excludes only `node_modules` and `coverage`, so a second
  run type-checks the `.d.ts` files a first run's build left in `dist/`; the second full run did
  that and was discarded, and the run that produced the map is the third, from the clean state
  in step 8.
- Run-time settings, not files: the pnpm wrapper on `PATH` (step 2),
  `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, and `HUSKY=0`, `LEFTHOOK=0` and
  `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1` throughout. The repo carries `simple-git-hooks` with a
  `.simple-git-hooks.json`, but the install ran with `--ignore-scripts`, as CI's does; the
  shared clone's `core.hooksPath` stayed unset and its `.git/hooks` holds only git's samples.
- No test was edited, skipped or deleted, and no timeout was raised.

## Skipped slots

Named per D56. 14 slots ran, of 20.

- `security`: skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation`: **not** skipped. Stryker 10.1.1 with its vitest runner, scoped to the PR's nine
  changed non-test TypeScript source files, instrumented 353 mutants in eight of them
  (`types/common-options.ts` holds only types). The attempt on its own ran its initial test run
  of 4,015 tests in 50 seconds and finished in 8 minutes 13 seconds, inside the 20 minutes
  allowed. In the run that produced the map the slot took 6 minutes 26 seconds and scored
  85.55%: 274 killed, 28 timed out, 22 survived, 29 with no coverage, no errors.
- `struct`, `docs`, `prose`, `publint`, `attw`: checkride 0.19.0 skips these itself ("no tool
  detected for slot"); the repo has none of their detect files, and per the harness policy none
  was added.
- `types`, `links`, `build`, `smoke`: ran as the repo has them and passed.
- `test`: ran and **stayed red** on the tree's own thresholds. All 74 test files and 4,525
  tests passed, and the coverage file landed with 148 files, but coverage is 99.85% of lines and
  statements and 99.2% of branches, below the 100% the commit's `vitest.config.ts` sets, so
  vitest exits 1. The thresholds belong to the tree and are left as the commit had them.
- `lint`: ran and **stayed red** on the PR's own code: eslint 9.39.2 reports three
  `perfectionist/sort-intersection-types` errors, at lines 52 and 80 of
  `rules/sort-enums/build-comparator-by-options-computer.ts` and line 29 of
  `rules/sort-object-types/comparator-by-options-computer.ts`. It belongs to the tree.
- `format`: ran and **stayed red** on two files of the tree's: `pnpm-lock.yaml` as the commit
  has it, and `pnpm-workspace.yaml` with the PR's `packages: ['.']` (the merge base's passes).
  checkride runs `prettier --check .`; the repo's own `test:format` globs `*.yml` and not
  `*.yaml`, so it checks neither file. No harness file is among them.
- `dead`, `dupes`, `health`: ran with fallow's defaults, and are red on the tree as a whole
  (117, 46 and 24 findings).
- `spell`: ran and **stayed red**: checkride runs `cspell` with no file arguments, the repo's
  `cspell.config.ts` names no `files`, and cspell 9.4.0 prints its usage and exits 1 without
  checking anything. The repo's own `test:spelling` passes `"**/*"`. It belongs to the
  toolchain's reading of the tree and is left as run.
- `pack`: ran and **stayed red**: the dry-run tarball has no `README.md`, because the repo's
  readme is `readme.md`, in lower case. It is left as run.
- `snippets`: ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
