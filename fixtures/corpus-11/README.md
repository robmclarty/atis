# Corpus fixture 11

An outside project's pull request, in the held-out half of the precision corpus (D88, D128,
D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `inngest/inngest-js` (<https://github.com/inngest/inngest-js>) |
| pull request | [#1753](https://github.com/inngest/inngest-js/pull/1753) `Add ability to name Sandbox snapshots` |
| base branch | `main` |
| fixture commit | `aff45e0a398788670f3261f2ec04e037dc51ac3e` `refactor: share snapshot option schemas and drop a redundant durable 409 test`: the commit a human review was submitted against |
| merge base | `3b2f56264d8349152b8bfad6a9afea1f0b92ce85` `Release @latest (#1752)` |
| size | 7 files, +325 −16; 5 TypeScript source files by `classifyFile`'s rule, 1 test file |

The TypeScript source files are all in `packages/inngest/src/components/sandbox/`:
`client.ts`, `durable.ts`, `protocol.ts`, `types.ts` and `validation.ts`. The test is
`packages/inngest/src/components/InngestSandbox.test.ts`. The seventh file is a changeset.

The PR's branch merged `origin/main` in (`21e64ba`), and the merge base is the `main` commit it
brought in: `git merge-base` of the fixture commit and `origin/main`, which agrees with the
compare API's `merge_base_commit`. The diff holds only the PR's own work.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 10.12.1, from `packageManager` (with its sha512) and `pnpm-lock.yaml` (lockfileVersion 9.0); the root `preinstall` runs `npx only-allow pnpm` |
| workspaces | `packages/*`, from `pnpm-workspace.yaml` (which also sets `onlyBuiltDependencies`) |
| test runner | vitest `^3.0.8` (the lockfile resolves 3.2.4) with `@vitest/coverage-v8` `3.0.8` (3.0.8, a different minor from vitest's), from `packages/inngest`'s `devDependencies`; its `test` script runs `vitest run` with `packages/inngest/vitest.config.ts` (node environment, `vite-tsconfig-paths`, type-checking of test files on, `src/test/integration/**` left out; `test:integration` runs those against a dev server). The root has no `test` script, and CI builds the workspace before it tests |
| node | `>=20`, from `packages/inngest`'s `engines.node`; no root `engines`, `.nvmrc` or `.node-version`; CI runs node 20, 22 and 24 |
| TypeScript files at the fixture commit | 764 |

## Generation

Step 19 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride, fallow and stryker are
installed into the worktree at their latest versions, because atis only ever ships against
current checkride. The repo's own runner, coverage provider, lockfile and package manager stay
as the commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.17.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `packages/inngest`'s `engines.node` is `>=20`, which admits it, and CI at the commit runs 20, 22 and 24. The suite passed on 24, so no older node was installed |
| pnpm | 10.12.1 | `packageManager` (with its sha512), run through corepack shims in a scratch directory ahead of the machine's own pnpm (11.28.5) on `PATH`, so the `pnpm` its scripts call is 10.12.1 too; `pnpm-lock.yaml` (lockfileVersion 9.0) is honoured by `--frozen-lockfile` |
| vitest | 3.2.4 | the lockfile's, unchanged (`^3.2.4` at the root, `^3.0.8` in `packages/inngest`) |
| `@vitest/coverage-v8` | 3.0.8 | `packages/inngest`'s, unchanged; **also added at the root** at the same version, because the root had vitest but no coverage provider (a different minor from vitest's, as the repo has it); the v8 provider is kept |
| typescript | 5.9.2 | `packages/inngest`'s, the lockfile's, unchanged |
| `@biomejs/biome` | 2.1.2 | the root's, the lockfile's, unchanged; `biome.json` is what checkride detects for `format` and `lint` |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot |
| `@stryker-mutator/vitest-runner` | 10.0.0 | added for the `mutation` slot; its peer range (`vitest >=2.0.0`) admits 3.2.4 |

## The commands

```sh
# 0. The scratch clone is a full clone, made ahead of time (not the blobless partial clone the
#    tuning half started from), and already holds the fixture commit and the merge base.
cd /tmp/atis-heldout/clones/inngest__inngest-js
git cat-file -t aff45e0a398788670f3261f2ec04e037dc51ac3e
git cat-file -t 3b2f56264d8349152b8bfad6a9afea1f0b92ce85

# 1. The package manager the repo pins, through corepack shims in a scratch directory ahead of
#    the machine's own pnpm (11.28.5) on PATH, so the `pnpm` its scripts call is 10.12.1 too.
mkdir -p /tmp/atis-heldout/shims
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack enable --install-directory /tmp/atis-heldout/shims pnpm yarn
export PATH=/tmp/atis-heldout/shims:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# 2. A worktree at the fixture commit, named for the repo so meta.repo reads `inngest-js`.
git -C /tmp/atis-heldout/clones/inngest__inngest-js worktree add \
  /tmp/atis-heldout/work/corpus-11/inngest-js \
  aff45e0a398788670f3261f2ec04e037dc51ac3e --detach

# 3. The repo's own package manager, honouring its lockfile (`--frozen-lockfile` worked; the
#    root `preinstall` runs `npx only-allow pnpm`, which passes). HUSKY=0 is set although the
#    repo has no husky.
cd /tmp/atis-heldout/work/corpus-11/inngest-js
HUSKY=0 pnpm install --frozen-lockfile

# 4. The current harness (D58), plus stryker for the mutation slot, at the workspace root. The
#    lockfile is edited first and installed frozen. Then the coverage provider the root lacks,
#    at the version `packages/inngest` already uses, the same way.
HUSKY=0 pnpm add -D -w --save-exact --lockfile-only --config.dedupe-peer-dependents=false \
  checkride@0.17.0 fallow@3.35.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/vitest-runner@10.0.0
HUSKY=0 pnpm install --frozen-lockfile --ignore-scripts
HUSKY=0 pnpm add -D -w --save-exact --lockfile-only --config.dedupe-peer-dependents=false \
  @vitest/coverage-v8@3.0.8
HUSKY=0 pnpm install --frozen-lockfile --ignore-scripts

# 5. Harness edits (see the next section for why).
cat > vitest.config.ts <<'CONFIG'
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/inngest"],
    coverage: {
      include: ["packages/inngest/src/**"],
      reporter: ["json"],
      reportsDirectory: ".check/coverage",
      reportOnFailure: true,
    },
  },
});
CONFIG
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
cat > stryker.config.json <<'CONFIG'
{
  "packageManager": "pnpm",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "inPlace": true,
  "mutate": [
    "packages/inngest/src/components/sandbox/client.ts",
    "packages/inngest/src/components/sandbox/durable.ts",
    "packages/inngest/src/components/sandbox/protocol.ts",
    "packages/inngest/src/components/sandbox/types.ts",
    "packages/inngest/src/components/sandbox/validation.ts"
  ],
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG
# The repo formats with biome; its own biome formats the two new files to the repo's style.
node_modules/.bin/biome format --write stryker.config.json vitest.config.ts
# biome.json: "!**/.check" added to `files.includes`, after "!**/.claude".

# 6. The build the repo's CI runs ahead of its tests. `prebuild` generates the gitignored
#    `packages/inngest/src/version.ts`, which the tests import; without it 13 test files stop
#    on "Cannot find module '../version.ts'".
HUSKY=0 pnpm build

# 7. The mutation attempt, run on its own first. It completed (initial test run 3,681 tests in
#    27 seconds; the mutation phase 18 minutes 13 seconds), so the slot is kept. The `PATH`
#    entry puts the package's own `tsc` in reach of vitest's typecheck mode, which the
#    package's vitest config turns on and which otherwise stops the initial run with "Spawning
#    typechecker failed".
rm -rf .check .stryker-tmp
HUSKY=0 PATH="$PWD/packages/inngest/node_modules/.bin:$PATH" node_modules/.bin/stryker run
rm -rf .check .stryker-tmp stryker-setup-*.js

# 8. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. `--concurrency 1` runs one slot at a time: stryker runs in place and must
#    not overlap another slot. Mutation is kept; it completed in 17 minutes inside this run.
HUSKY=0 PATH="$PWD/packages/inngest/node_modules/.bin:$PATH" \
  node_modules/.bin/checkride --all --skip security --concurrency 1
rm -rf .stryker-tmp stryker-setup-*.js

# 9. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-heldout/work/corpus-11/inngest-js && pwd -P)" \
  --base 3b2f56264d8349152b8bfad6a9afea1f0b92ce85 \
  --out fixtures/corpus-11/map.json \
  --svg fixtures/corpus-11/atis.svg

# 10. The worktree is not kept; the clone is.
git -C /tmp/atis-heldout/clones/inngest__inngest-js worktree remove --force \
  /tmp/atis-heldout/work/corpus-11/inngest-js
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml` — five dev dependencies added at the workspace root
  (`checkride`, `fallow`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`,
  `@vitest/coverage-v8`), all exact-pinned. The lockfile keeps its version 9.0 format and gains
  167 package entries. No direct dependency of any workspace moves: vitest, typescript, biome
  and the rest stay at the versions the lockfile locked. Eighteen transitive entries were
  merged into other versions when pnpm de-duplicated against the new packages' ranges: five
  `@babel` packages (`generator`, `parser`, `types`, `helper-string-parser`,
  `helper-validator-identifier`, each to a newer 7.x, from 7.23.x or 7.28.x), `@jridgewell`
  `gen-mapping` 0.3.5 to 0.3.13, `set-array` 1.2.1 (dropped) and `trace-mapping` to 0.3.31,
  `istanbul-lib-coverage` 3.2.0 to 3.2.2, `istanbul-lib-report` 3.0.0 to 3.0.1,
  `istanbul-reports` 3.1.5 to 3.2.0, `jsesc` 2.5.2 to 3.1.0, `make-dir` 3.1.0 to 4.0.0,
  `to-fast-properties` 2.0.0 (dropped) and `tslib` 2.6.2 to 2.8.1. The peer suffixes on a few
  existing snapshots changed with them. A plain `pnpm add` was not tried; the
  `--lockfile-only` form is the one the tuning half settled on.
- `vitest.config.ts` — created at the root. The repo keeps its vitest config in
  `packages/inngest` and runs it from there (`vitest run` in the package; the root has no `test`
  script and no config), while checkride's `test` slot runs one `vitest run` from the root,
  which with no config would pick up every package's test files under vitest's defaults
  instead of this package's settings. The file names the package as the one project, so the package's own config (node
  environment, `vite-tsconfig-paths`, typecheck mode on, integration tests left out) is what
  runs, rooted at the package. It adds the three coverage settings: `reporter` `["json"]`,
  `reportsDirectory` `.check/coverage`, and `reportOnFailure` (vitest writes no coverage when a
  test fails by default, and the file must land either way), so `--coverage` writes istanbul JSON
  to `.check/coverage/coverage-final.json`, where atis reads it; `include` limits the report to
  `packages/inngest/src`. The other packages of the workspace (`ai`, `ci`, the middleware
  packages, `realtime`, `otel`, `test`, `test-harness`, the two ESLint plugins) are not run:
  the PR's source and test are in `packages/inngest`, so their files have no coverage entries.
- `@vitest/coverage-v8` at the root — see the lockfile entry above. The root had vitest but no
  provider (pnpm does not hoist `packages/inngest`'s), so the root run asked for one. The
  version is the one `packages/inngest` already locks (3.0.8, against vitest 3.2.4).
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself, so `dead`, `dupes` and `health` run. One line, `ignoreDependencies = ["checkride"]`,
  keeps the harness's own install from showing up as an unused dev dependency. The two stryker
  packages and the root's coverage provider did not need entries.
- `stryker.config.json` — created; `mutate` is limited to the PR's five changed non-test
  TypeScript source files (`git diff --name-only` between the merge base and the fixture
  commit), the JSON reporter writes `.check/mutation.json`, the file atis reads, and
  `inPlace` is on. The default sandbox copy follows the repo's `.gitignore`, which leaves out the
  generated `src/version.ts` the tests import, so every test would stop on it; in place, stryker
  mutates the worktree's files and restores them from its backup when it ends, and the
  worktree was clean (`git status`) afterwards. It leaves `stryker-setup-*.js` files at the
  root after a stopped run; they were removed. Two first attempts with `vitest.configFile`
  and `vitest.dir` pointing at the package stopped the initial run (the package config's
  typecheck `tsconfig` path resolves against the working directory), so neither is set.
- `biome.json` — `"!**/.check"` added to `files.includes`, so the `format` and `lint` slots do
  not check checkride's own `.check/*.json` artifacts (the equivalent of the tuning half's
  `.prettierignore` line, since this repo formats and lints with biome). The new `vitest.config.ts`
  and `stryker.config.json` are formatted by the repo's own biome.
- Run-time settings, not files: the corepack shims first on `PATH`, `HUSKY=0`,
  `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, `--concurrency 1` on the checkride run, and the
  package's own `node_modules/.bin` on `PATH` for the stryker run and the checkride run (see
  step 7), so vitest's typecheck mode can spawn `tsc`. A first `checkride --only test`, run to
  try the root config before the build step existed, failed 13 test files on the missing
  `version.ts`; that is why step 6 is there. It was a trial and was discarded: `.check/` is
  from the full run in step 8.
- No test was edited, skipped or deleted, and no timeout was raised: the suite passed in the
  run that produced the map, 177 test files, 5,316 tests passed, 2 skipped and 46 todo, with
  no type errors.

## Skipped slots

Named per D56. 12 slots ran, of 20.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation` — **not** skipped. It completed (17 minutes inside the full run, 18 minutes on its
  own, on a machine under load from a second agent's suites) and wrote `.check/mutation.json`:
  2,573 mutants across the five scoped source files.
- `types` — checkride 0.17.0 skips it ("no tool detected for slot"): the repo has no
  `tsconfig.json` at the root, only one in each package and example, and per the harness policy
  none was added. checkride's own warning names the 51 nested `tsconfig.json` files it leaves
  unchecked.
- `struct`, `docs`, `spell`, `prose`, `publint`, `attw` — checkride 0.17.0 skips these itself
  ("no tool detected for slot"); the repo has none of their detect files, and per the harness
  policy none was added.
- `test`, `build` — ran, and passed. `build` ran the root `build` script.
- `format`, `lint` — ran, as the repo has it (`biome.json` was already in the tree), and stay
  red: biome reports 206 and 500 diagnostics, all in the repo's own files under `examples/`,
  `packages/` and `scripts/`. None is a harness file.
- `dead`, `dupes`, `health` — ran, and are red because fallow reports findings (597, 150 and
  216); they are the instruments atis reads, left as run.
- `links` — ran, as the repo has it, and stays red on relative links in the repo's own Markdown
  that do not resolve.
- `snippets` — ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
- `pack` — ran at the repo root, which is a private package with no `name`, so `pnpm pack`
  stops with "Package name is not defined in the package.json". It is left as run.
- `smoke` — ran at the repo root, which has no `exports` or `main` to import. It is left as run.
