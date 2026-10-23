# Corpus fixture 6

An outside project's pull request, in the tuning half of the precision corpus (D88, D127,
D128, D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `changesets/changesets` (<https://github.com/changesets/changesets>) |
| pull request | [#2009](https://github.com/changesets/changesets/pull/2009) `Refactor CLI to cac` |
| base branch | `next` |
| fixture commit | `fca0d4c28eaee07bf2fbd08a37117b22a8a9d426` `add some examples`: the commit a human review was submitted against |
| merge base | `47e7c7d62431b28ca1ac0732cd3f18b33ca52bca` `Remove unused code` |
| size | 24 files, +894 −1204; 12 TypeScript source files by `classifyFile`'s rule, 9 test files |

The TypeScript source files are all under `packages/cli/src/`: `index.ts`, the new
`commands/shared.ts`, the seven command entry points `commands/<name>/index.ts` for `add`,
`init`, `pre`, `publish`, `status`, `tag` and `version`, and three deleted files, `help.ts`,
`run.ts` and `types.ts`. The tests are
`commands/add/__tests__/add.test.ts`, `commands/init/__tests__/command.test.ts`,
`commands/pre/index.test.ts`, `commands/publish/__tests__/index.test.ts`,
`commands/status/__tests__/status.test.ts`, `commands/tag/__tests__/index.test.ts` and
`commands/version/version.test.ts`, with `commands/publish/__tests__/releaseCommand.test.ts`
and `run.test.ts` deleted, all under the same directory. The other three files are a
changeset, `packages/cli/package.json` (which swaps the `mri` dependency for `cac`) and
`pnpm-lock.yaml`.

The base branch is `next`, a long-lived branch that has since been merged into `main`; the PR
was squash-merged into it. The merge base is the PR's recorded base.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 11.0.4, from `packageManager` and `pnpm-lock.yaml` (lockfileVersion 9.0) |
| workspaces | `packages/*`, `scripts/*`, from `pnpm-workspace.yaml` (which also sets `allowBuilds`, peer deduplication, an override and `shellEmulator`) and the root `workspaces` field; the root `postinstall` runs `manypkg check` |
| test runner | vitest `^4.1.5` (the lockfile resolves 4.1.5) with `@vitest/coverage-v8` `^4.1.5`, from root `devDependencies`; the root `test` script runs `vitest`, with `vitest.config.mts` at the root. `packages/cli` has no scripts of its own |
| node | `^22.11 \|\| ^24 \|\| >=26`, from `engines.node`; `.node-version` says v22.9.0, below that floor |
| TypeScript files at the fixture commit | 116 |

## Generation

Step 17 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, coverage provider, lockfile and package manager stay as the
commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.17.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `engines.node` is `^22.11 \|\| ^24 \|\| >=26`, which admits it, and CI at the commit tests on 22, 24 and 26. `.node-version` says 22.9.0, below that floor, so it is not used |
| pnpm | 11.0.4 | `packageManager`; the machine's pnpm switched to it |
| vitest | 4.1.5 | the lockfile's, unchanged |
| `@vitest/coverage-v8` | 4.1.5 | already a dev dependency at the repo's vitest version, unchanged |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot |
| `@stryker-mutator/vitest-runner` | 10.0.0 | added for the `mutation` slot; its peer range admits vitest 4.1.5 |

## The commands

```sh
# 0. The scratch clone was a blobless partial clone, and `git log --numstat` (which atis runs
#    over up to 5000 commits) failed on objects the promisor remote would not hand back. Make
#    it a full clone first, then fetch the fixture commit, its merge base and any object
#    still missing.
cd /tmp/atis-corpus/clones/changesets__changesets
rm -f .git/objects/info/commit-graph
git config --unset remote.origin.partialclonefilter
git config --unset remote.origin.promisor
git fetch --refetch --no-tags origin
for oid in fca0d4c28eaee07bf2fbd08a37117b22a8a9d426 47e7c7d62431b28ca1ac0732cd3f18b33ca52bca; do
  git fetch --no-tags origin "$oid"
  for missing in $(git rev-list --objects --missing=print "$oid" | grep '^?' | tr -d '?'); do
    git fetch --no-tags origin "$missing"
  done
done

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `changesets`.
git -C /tmp/atis-corpus/clones/changesets__changesets worktree add \
  /tmp/atis-corpus/work/corpus-6/changesets \
  fca0d4c28eaee07bf2fbd08a37117b22a8a9d426 --detach

# 2. The repo's own package manager, honouring its lockfile (`--frozen-lockfile` works).
#    HUSKY=0 keeps the install from rewriting the shared clone's hooks.
cd /tmp/atis-corpus/work/corpus-6/changesets
HUSKY=0 pnpm install --frozen-lockfile

# 3. The build the repo's CI runs before its tests (the packages import each other's `dist/`).
pnpm build

# 4. The current harness (D58), plus stryker for the mutation slot. pnpm 11 refuses a version
#    published less than a day ago by default; fallow 3.35.0 was 20 hours old, so the age
#    gate is set to 0 for this one command (an environment variable, not a file).
HUSKY=0 pnpm_config_minimum_release_age=0 pnpm add -D -w --save-exact \
  checkride@0.17.0 fallow@3.35.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/vitest-runner@10.0.0

# 5. Harness edits (see the next section for why).
cat > vitest.config.mts <<'CONFIG'
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    experimental: { preParse: true },
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    coverage: {
      reporter: ["json"],
      reportsDirectory: ".check/coverage",
      reportOnFailure: true,
    },
    // TODO: enable this and fix tests in packages/cli/src/commands/version/version.test.ts, then remove `vi.resetMocks()` from test files
    // mockReset: true,
  },
});
CONFIG
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
cat > stryker.conf.json <<'CONFIG'
{
  "packageManager": "pnpm",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": [
    "packages/cli/src/commands/add/index.ts",
    "packages/cli/src/commands/init/index.ts",
    "packages/cli/src/commands/pre/index.ts",
    "packages/cli/src/commands/publish/index.ts",
    "packages/cli/src/commands/shared.ts",
    "packages/cli/src/commands/status/index.ts",
    "packages/cli/src/commands/tag/index.ts",
    "packages/cli/src/commands/version/index.ts",
    "packages/cli/src/index.ts"
  ],
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG

# 6. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. Mutation is kept; it completed in under six minutes on the nine scoped
#    source files and wrote `.check/mutation.json`.
rm -rf .check .stryker-tmp
HUSKY=0 node_modules/.bin/checkride --all --skip security

# 7. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-corpus/work/corpus-6/changesets && pwd -P)" \
  --base 47e7c7d62431b28ca1ac0732cd3f18b33ca52bca \
  --out fixtures/corpus-6/map.json \
  --svg fixtures/corpus-6/atis.svg

# 8. The worktree is not kept.
git -C /tmp/atis-corpus/clones/changesets__changesets worktree remove --force \
  /tmp/atis-corpus/work/corpus-6/changesets
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml` — four dev dependencies added at the workspace root
  (`checkride`, `fallow`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`), all
  exact-pinned. The lockfile keeps its version and gains only the new packages' entries: every
  package it locked before is still locked at the same version.
- `vitest.config.mts` — edited, three settings added to the repo's own `test` block and nothing
  removed. `coverage.reporter` is `["json"]` and `coverage.reportsDirectory` is `.check/coverage`,
  so the `test` slot's `--coverage` writes istanbul JSON to `.check/coverage/coverage-final.json`,
  where atis reads it; the repo sets no coverage provider of its own, so vitest's default
  (`@vitest/coverage-v8`, already installed) is kept. `coverage.reportOnFailure` is `true`
  because vitest writes no coverage when a test fails by default, and the file must land either
  way. `testTimeout` and `hookTimeout` are raised from vitest's 5 seconds to 120 seconds
  because the suite spawns `git` in scratch directories and, on a machine whose load average
  was above 100 (other agents' suites running at the same time), a handful of those tests ran
  past 5 seconds; the same files pass alone with the longer timeout. The first full run,
  made on a quieter machine, passed with the repo's own timeout. No test was edited, skipped or
  deleted.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself, so `dead`, `dupes` and `health` run. One line, `ignoreDependencies = ["checkride"]`,
  keeps the harness's own install from showing up as an unused dev dependency. The two stryker
  packages did not show up as unused, so they are not listed.
- `stryker.conf.json` — created; `mutate` is limited to the PR's nine changed non-test source
  files that still exist at the fixture commit (the three deleted ones are left out), and the
  JSON reporter writes `.check/mutation.json`, the file atis reads. It is `stryker.conf.json`,
  not `stryker.config.json`, because the repo's ESLint config gives every `*.config.*` file the
  type-aware TypeScript parser, so the `lint` slot reported the harness's own JSON file as a
  parse error; checkride detects both names and stryker loads both.
- No `.prettierignore`: the repo formats with oxfmt, which checkride does not detect, so no
  `format` slot runs.
- Run-time settings, not files: `HUSKY=0` on the install, and `pnpm_config_minimum_release_age=0`
  on the one `pnpm add` that installs the harness (see step 4).

## Skipped slots

Named per D56. 13 slots ran, of 20.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation` — **not** skipped. It completed in under six minutes on the nine scoped source
  files and wrote `.check/mutation.json`.
- `format`, `struct`, `docs`, `spell`, `prose`, `attw` — checkride 0.17.0 skips these itself
  ("no tool detected for slot"); the repo has none of their detect files (its formatter,
  oxfmt, is not one checkride detects), and per the harness policy none was added.
- `snippets` — ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
- `pack`, `smoke` — ran at the repo root, which is a private package with no `files` list,
  `exports` or `main`: the dry-run tarball holds the whole tree, and there is nothing to import.
  They are left as run.
