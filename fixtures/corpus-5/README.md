# Corpus fixture 5

An outside project's pull request, in the tuning half of the precision corpus (D88, D127,
D128, D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `actualbudget/actual` (<https://github.com/actualbudget/actual>) |
| pull request | [#9020](https://github.com/actualbudget/actual/pull/9020) `[AI] Add getScheduleDates to the API` |
| base branch | `master` |
| fixture commit | `f25eab0686dd13a1683cff5eec740a9f8f594a4e` `[AI] Add getScheduleDates to the API`: the commit a human review was submitted against |
| merge base | `bfa850ca618ca78c556ded61274602f1fca7a4a4` `experimental sidebar: respect light theme sidebar overrides (#9003)` |
| size | 10 files, +609 −8; 5 TypeScript source files by `classifyFile`'s rule, 2 test files |

The TypeScript source files are `packages/api/methods.ts` and four in `packages/loot-core/src/`:
`server/api.ts`, `server/schedules/occurrences.ts` (new), `shared/schedules.ts` and
`types/api-handlers.ts`. The tests are `packages/api/methods.test.ts` and
`packages/loot-core/src/server/schedules/occurrences.test.ts` (new). The other three files are
`packages/api/vite.config.mts`, a tool config that `classifyFile` leaves out (it makes vitest
resolve the ES builds of `@rschedule`), the API reference page
`packages/docs/docs/api/reference.md` and a release note under `upcoming-release-notes/`.

The fixture commit is the PR's only commit at the time, one commit ahead of the merge base.

## The ecosystem

<!-- cspell:ignore lage -->

| | |
| --- | --- |
| package manager | yarn 4.17.1, from `packageManager`, `.yarnrc.yml` (`yarnPath` `.yarn/releases/yarn-4.17.1.cjs`, `nodeLinker: node-modules`) and `yarn.lock` (`__metadata` version 10); `engines.yarn` is `^4.9.1` |
| workspaces | `packages/*`, from the root `workspaces` field; lage `^2.15.17` runs the workspace tasks |
| test runner | vitest `^5.0.0` (the lockfile resolves 5.0.0), from the root and package `devDependencies`; the root `vitest.config.ts` lists per-package projects. `packages/loot-core` (`@actual-app/core`) runs `test:node` (`ENV=node vitest --run`) and `test:web` (`ENV=web vitest --run -c vitest.web.config.ts`); `packages/api` runs `vitest --run`; the root `test` script runs `lage test --continue` |
| node | `>=22.18.0`, from `engines.node`; `.nvmrc` says v24.18.1 |
| TypeScript files at the fixture commit | 2012 |

## Generation

Step 17 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, lockfile and package manager stay as the commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.17.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `engines.node` is `>=22.18.0`, which admits it. `.nvmrc` says v24.18.1, and the suites that ran pass on 24.15.0, so no other Node was used |
| yarn | 4.17.1 | `packageManager` and `.yarnrc.yml`'s `yarnPath`, the release committed under `.yarn/releases/` |
| vitest | 5.0.0 | the lockfile's, unchanged |
| `@vitest/coverage-v8` | 5.0.0 | **added**: the repo has no coverage provider installed, so it is pinned to the repo's vitest version; vitest's default provider is v8 |
| typescript | 6.0.3 | the lockfile's, unchanged |
| oxlint | 1.74.0 | the lockfile's; the repo's `.oxlintrc.json` is what checkride detects for the `lint` slot |

## The commands

```sh
# 0. The scratch clone was a blobless partial clone, and `git log --numstat` (which atis runs
#    over up to 5000 commits) failed on objects the promisor remote would not hand back. Make
#    it a full clone first, then fetch the fixture commit, its merge base and any object
#    still missing.
cd /tmp/atis-corpus/clones/actualbudget__actual
rm -f .git/objects/info/commit-graph
git config --unset remote.origin.partialclonefilter
git config --unset remote.origin.promisor
git fetch --refetch --no-tags origin
for oid in f25eab0686dd13a1683cff5eec740a9f8f594a4e bfa850ca618ca78c556ded61274602f1fca7a4a4; do
  git fetch --no-tags origin "$oid"
  for missing in $(git rev-list --objects --missing=print "$oid" | grep '^?' | tr -d '?'); do
    git fetch --no-tags origin "$missing"
  done
done

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `actual`.
git -C /tmp/atis-corpus/clones/actualbudget__actual worktree add \
  /tmp/atis-corpus/work/corpus-5/actual \
  f25eab0686dd13a1683cff5eec740a9f8f594a4e --detach

# 2. The repo's own package manager, honouring its lockfile (`--immutable` works, as in the
#    repo's CI). HUSKY=0 keeps the `prepare` script from rewriting the clone's hooks.
cd /tmp/atis-corpus/work/corpus-5/actual
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
HUSKY=0 yarn install --immutable

# 3. The current harness (D58), plus the coverage provider the repo lacks. `.yarnrc.yml` sets
#    `npmMinimalAgeGate: 3d`, which refuses a release less than three days old; fallow 3.35.0
#    was 20 hours old, so the gate is set to 0 for this one command (an environment variable,
#    not a file). Yarn keeps every resolution the lockfile already has.
HUSKY=0 YARN_NPM_MINIMAL_AGE_GATE=0 yarn add -D --exact \
  checkride@0.17.0 fallow@3.35.0 @vitest/coverage-v8@5.0.0

# 4. Harness edits (see the next section for why).
cat > vitest.config.ts <<'CONFIG'
import { dirname } from 'node:path';

import { defineConfig } from 'vitest/config';

const projects = [
  'bin/vitest.config.mts',
  'packages/api/vite.config.mts',
  'packages/ci-actions/vitest.config.mts',
  'packages/cli/vite.config.ts',
  'packages/component-library/vitest.web.config.ts',
  'packages/crdt/vitest.config.mts',
  'packages/eslint-plugin-actual/vitest.config.mts',
  'packages/loot-core/vitest.config.ts',
  'packages/sync-server/vitest.config.ts',
];

export default defineConfig({
  test: {
    projects: [
      // Vitest 5 refuses to run projects that set different `maxWorkers` under the same
      // `sequence.groupOrder`, so each project gets a group of its own.
      ...projects.map((config, groupOrder) => ({
        extends: config,
        root: dirname(config),
        test: {
          sequence: { groupOrder },
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      })),
      {
        extends: 'packages/loot-core/vitest.web.config.ts',
        test: {
          name: 'loot-core-web',
          dir: 'packages/loot-core',
          sequence: { groupOrder: projects.length },
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
    ],
    coverage: {
      reporter: ['json'],
      reportsDirectory: '.check/coverage',
      reportOnFailure: true,
    },
    onConsoleLog: (log, type) => {
      // print only console.error
      return type === 'stderr';
    },
  },
});
CONFIG
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG

# 5. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. `--concurrency 1` runs one slot at a time: the type check and lint
#    otherwise compete with the test run for CPU on a shared machine. Mutation is dropped (see
#    "Skipped slots").
rm -rf .check
HUSKY=0 node_modules/.bin/checkride --all --skip security,mutation --concurrency 1

# 6. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-corpus/work/corpus-5/actual && pwd -P)" \
  --base bfa850ca618ca78c556ded61274602f1fca7a4a4 \
  --out fixtures/corpus-5/map.json \
  --svg fixtures/corpus-5/atis.svg

# 7. The worktree is not kept.
git -C /tmp/atis-corpus/clones/actualbudget__actual worktree remove --force \
  /tmp/atis-corpus/work/corpus-5/actual
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `yarn.lock` — three dev dependencies added at the workspace root
  (`checkride`, `fallow`, `@vitest/coverage-v8`), all exact-pinned. The lockfile gains the new
  packages' entries and keeps every resolution it had: none is dropped or moved to another
  version.
- `vitest.config.ts` — rewritten; the repo's own root config is a list of per-package projects
  (the repo's `test` script runs each package's tests from inside the package), and it cannot
  run as `vitest run` from the root. Four changes:
  - Vitest 5 stops the run with "different `maxWorkers` but same `sequence.groupOrder`" because
    the repo's projects set different worker counts. Each project becomes an inline project that
    extends the same config file, rooted at its directory, with a `sequence.groupOrder` of its
    own. The project list is the repo's own, so the same test files are found (checked with
    `vitest list --filesOnly` before and after).
  - `packages/api` and `packages/cli` are added to the list. The repo's root list leaves them out,
    and the PR's test for `packages/api` lives there, so the root run would never have reached
    it. `packages/desktop-client` is **not** added: its config resolves `./src/build-shims.js`
    against the working directory, so run from the root its 85 test files fail to import their
    setup file. That package is outside the PR and outside the repo's own root list; its files
    have no coverage entries.
  - `coverage.reporter` is `['json']` and `coverage.reportsDirectory` is `.check/coverage`, so
    the `test` slot's `--coverage` writes istanbul JSON to `.check/coverage/coverage-final.json`,
    where atis reads it. `coverage.reportOnFailure` is `true` because vitest writes no coverage
    when a test fails by default, and the file must land either way. The repo sets no
    `coverage.include`, so vitest's default (the files the tests load) is kept.
  - `testTimeout` and `hookTimeout` are 120 seconds for every project, because the machine was
    shared with other suites (a load average above 20 on 8 cores) and suites with config-level
    timeouts ran past them. One file, `packages/loot-core/src/server/aql/schema/executors.test.ts`,
    sets `20_000` on each test itself, which a config cannot override; it passes alone in about
    six seconds a test, and passes in the full run once `--concurrency 1` stops checkride
    competing with itself. No test was edited, skipped or deleted.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself, so `dead`, `dupes` and `health` run. One line, `ignoreDependencies = ["checkride"]`,
  keeps the harness's own install from showing up as an unused dev dependency.
- No `.prettierignore`: the repo formats with oxfmt, which checkride does not detect, so no
  `format` slot runs.
- Run-time settings, not files: `HUSKY=0`, `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`,
  `YARN_NPM_MINIMAL_AGE_GATE=0` on the one `yarn add` that installs the harness, and
  `--concurrency 1` on the checkride run.

## Skipped slots

Named per D56. 10 slots ran, of 20.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open. It is also `pnpm audit`, which
  checkride reports unavailable under yarn.
- `mutation` — **dropped**: it did not complete within the time allowed. Stryker 10.0.0 with its
  vitest runner (`@stryker-mutator/core` and `@stryker-mutator/vitest-runner`) was installed
  and a `stryker.config.json` limited `mutate` to the PR's five changed non-test source files
  (1729 mutants). Its default sandbox copy stopped on the repo's `.agents/` symlinks; with
  `inPlace` set its initial test run stopped on a `.pegjs` grammar it could not load; with
  `inPlace` and `vitest.related` off that error went away, and the run had not finished after
  twenty minutes, when it was stopped. Both stryker packages and the config were then removed, so
  nothing of the attempt is left in the worktree, and the run used `--skip security,mutation`.
  With them installed, the `types` slot also read two copies of `@babel/types`; without them it
  reads one.
- `format`, `struct`, `docs`, `spell`, `prose`, `publint`, `attw` — checkride 0.17.0 skips these
  itself ("no tool detected for slot"); the repo has none of their detect files, and per the
  harness policy none was added.
- `pack` — checkride 0.17.0 skips it ("`pnpm pack` is unavailable under yarn").
- `build` — ran, as the repo has it (`lage build`). The `mobile-client` package's build runs a
  Capacitor sync that needs CocoaPods, which this machine does not have (the repo's CI is
  Linux), so that step stops the build. The other packages built.
- `links` — ran, as the repo has it.
- `snippets` — ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
- `smoke` — ran at the repo root, which is a private package with no `exports` or `main` to
  import. It is left as run.
