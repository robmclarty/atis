# Round-two fixture 2

An outside project's pull request, in glance round two (D95; see
[`../round-two.md`](../round-two.md)), read blind in the world at step 47. Its ground truth is
in [`truth.md`](./truth.md); the reader opens neither file until the reading is done (D62).

## The change

| | |
| --- | --- |
| repo | `modelcontextprotocol/typescript-sdk` (<https://github.com/modelcontextprotocol/typescript-sdk>) |
| pull request | [#2441](https://github.com/modelcontextprotocol/typescript-sdk/pull/2441) `fix(server): validate Content-Type by parsed media type instead of substring match` |
| base branch | `main` |
| fixture commit | `b2546a17c59f86bf4fb08b913be33c5b3b5179f9` `Merge branch 'main' into fweinberger/content-type-media-type-validation`: the PR's approved head |
| merge base | `7015d2129bc91e8cf8f143e2cca3ee2ba92808d3` `examples: web-standard twin of the bearer-auth story (#2424)` |
| size | 20 files, +452 −20; 9 TypeScript source files by `classifyFile`'s rule, 4 test files |

The TypeScript source files span five packages and an example:
`packages/core-internal/src/shared/mediaType.ts` (new), with its exports in
`packages/core-internal/src/index.ts` and `packages/core-internal/src/exports/public/index.ts`;
three in `packages/server/src/server/`, `createMcpHandler.ts`, `perRequestTransport.ts` and
`streamableHttp.ts`; `packages/middleware/hono/src/hono.ts`;
`packages/client/src/client/streamableHttp.ts`; and `examples/json-response/client.ts`. The
tests are `packages/core-internal/test/shared/mediaType.test.ts` (new),
`packages/server/test/server/contentTypeValidation.test.ts` (new),
`packages/middleware/hono/test/hono.test.ts` and `packages/client/test/client/middleware.test.ts`.
The other seven files are a changeset, `docs/migration/upgrade-to-v2.md`, a
`no-restricted-syntax` rule in `common/eslint-config/eslint.config.mjs` that bans
substring-matching `'application/json'`, and the dependency move that gives
`packages/core-internal` the `content-type` package: `packages/core-internal/package.json`,
`packages/server-legacy/package.json`, `pnpm-workspace.yaml` (the catalog entry moves from
`runtimeServerOnly` to `runtimeShared`) and `pnpm-lock.yaml`.

The fixture commit is a two-parent merge of `main` into the PR's branch, and its second parent
is the merge base: `git merge-base` of the fixture commit and `origin/main`, which agrees with
the compare API's `merge_base_commit`. The fixture commit is seven commits ahead of it, all the
author's and all on the PR's branch; three of them, the fixture commit among them, merge `main`
into the branch. The PR squash-merged
as `561c6d83456ef98d6c713bbda9837e64337f22c9`, whose one parent is the merge base, so nothing
landed on `main` between the approved head and the merge.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 10.26.1, from `packageManager` (no hash) and `pnpm-lock.yaml` (lockfileVersion 9.0). `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080` (seven days, with `@modelcontextprotocol/conformance` excluded), `linkWorkspacePackages: deep`, four named catalogs, and `onlyBuiltDependencies` of `better-sqlite3` (12.8.0, a native module that `examples/shared` uses) and `esbuild` |
| workspaces | `packages/**/*` (except `packages/codemod/batch-test/**`), `common/**/*`, `examples`, `examples/*`, `examples/**/*` and `test/**/*`, from `pnpm-workspace.yaml`; 53 `package.json` files in all. The SDK is `packages/core-internal`, `core`, `client`, `server`, `server-legacy`, `codemod` and the middleware under `packages/middleware/` (`express`, `fastify`, `hono`, `node`) |
| test runner | vitest, catalog `^4.0.15` (the lockfile resolves 4.1.2). Each package's `vitest.config.js` re-exports `@modelcontextprotocol/vitest-config` (`common/vitest-config`: node environment, `test/**/*.test.ts`, `globals`, `vite-tsconfig-paths` 5.1.4), and each package's `tsconfig.json` maps its workspace imports to their `src/`, so the suite runs without a build. Each package's `test` script runs `vitest run`; there is no root `test` script, and CI runs `pnpm -r --filter '!@modelcontextprotocol/test-e2e' test`. The root `vitest.workspace.js` calls `defineWorkspace`, which vitest 4 no longer has. No coverage provider is in the lockfile. typescript 5.9.3, with `@typescript/native-preview` for `typecheck` |
| node | `engines.node` `>=20`; no `.nvmrc` or `.node-version`; CI tests on node 20, 22 and 24 |
| TypeScript files at the fixture commit | 615 |

## Generation

Step 46 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, lockfile and package manager stay as the commit had them;
the coverage provider and the root test config are added, because the commit has neither.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.19.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `engines.node` is `>=20`, which admits it, there is no `.nvmrc` or `.node-version`, and CI tests node 20, 22 and 24 |
| pnpm | 10.26.1 | `packageManager` (no hash), run through corepack; `pnpm-lock.yaml` (lockfileVersion 9.0) is honoured by `--frozen-lockfile` |
| vitest | 4.1.2 | the lockfile's, unchanged (catalog `^4.0.15`), on vite 7.3.0 |
| `@vitest/coverage-v8` | 4.1.2 | added to match vitest; the lockfile had no coverage provider |
| `vite-tsconfig-paths` | 5.1.4 | the lockfile's, unchanged |
| typescript | 5.9.3 | the lockfile's, unchanged; fallow brings a second, private copy, 7.0.2, through `fallow-type-aware` |
| `@typescript/native-preview` | 7.0.0-dev.20260327.2 | the lockfile's, unchanged; no slot runs it |
| prettier | 3.6.2 | the lockfile's, unchanged |
| `better-sqlite3` | 12.8.0 | the lockfile's, unchanged; its install script fetched a prebuilt binary for node 24, so nothing was compiled |
| lefthook | 2.1.4 | the lockfile's, unchanged; see "Harness changes in the worktree" for what its `prepare` did |
| `@stryker-mutator/core` | 10.1.1 | added for the `mutation` slot, and kept: the slot completed |
| `@stryker-mutator/vitest-runner` | 10.1.1 | added for the `mutation` slot, and kept; its peer range (`vitest >=2.0.0`) admits 4.1.2 |

## The commands

```sh
# 0. A full clone (not blobless). The PR squash-merged, so its head is fetched from the PR ref;
#    the fixture commit and the merge base are both present after it.
git clone https://github.com/modelcontextprotocol/typescript-sdk.git \
  /tmp/atis-round-two/clones/modelcontextprotocol__typescript-sdk
git -C /tmp/atis-round-two/clones/modelcontextprotocol__typescript-sdk fetch origin pull/2441/head

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `typescript-sdk`.
git -C /tmp/atis-round-two/clones/modelcontextprotocol__typescript-sdk worktree add \
  /tmp/atis-round-two/work/round-two-2/typescript-sdk \
  b2546a17c59f86bf4fb08b913be33c5b3b5179f9 --detach

# 2. The repo's own package manager, honouring its lockfile. The machine's `pnpm` is a corepack
#    shim, which reads `packageManager` and runs 10.26.1. The three hook switches are set, but
#    the root `prepare` (`npx --no-install lefthook install`) still wrote a pre-push hook into
#    the shared clone's .git/hooks, so it is removed (see the next section).
cd /tmp/atis-round-two/work/round-two-2/typescript-sdk
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 HUSKY=0 LEFTHOOK=0 SKIP_INSTALL_SIMPLE_GIT_HOOKS=1
pnpm install --frozen-lockfile
rm /tmp/atis-round-two/clones/modelcontextprotocol__typescript-sdk/.git/hooks/pre-push

# 3. The current harness (D58) and the coverage provider, then stryker for the mutation slot, at
#    the workspace root. `pnpm-workspace.yaml` sets `minimumReleaseAge` to 10080 minutes, which
#    refuses a release under seven days old (checkride 0.19.0 was hours old), so the gate is set
#    to 0 on these commands; --ignore-scripts keeps `prepare` from running again.
pnpm add -D -w --save-exact --ignore-scripts --config.minimumReleaseAge=0 \
  checkride@0.19.0 fallow@3.35.0 @vitest/coverage-v8@4.1.2
pnpm add -D -w --save-exact --ignore-scripts --config.minimumReleaseAge=0 \
  @stryker-mutator/core@10.1.1 @stryker-mutator/vitest-runner@10.1.1

# 4. Harness files (see the next section for why).
cat > vitest.config.js <<'CONFIG'
// Fixture harness (atis D64), not the repo's: the root vitest.workspace.js calls defineWorkspace,
// which vitest 4 removed, so there is no root config to point coverage at. These are the
// projects CI's `pnpm -r --filter '!@modelcontextprotocol/test-e2e' test` runs, one vitest run
// over all of them, so coverage lands in one istanbul JSON file. pnpm runs the cli-client
// example after the client package it depends on, whose barrelClean test builds the dist/ the
// example imports, so it runs here in a later group.
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        projects: [
            'packages/**/vitest.config.js',
            'examples/shared',
            'test/integration',
            {
                extends: './examples/cli-client/vitest.config.js',
                test: { name: '@mcp-examples/cli-client', root: './examples/cli-client', sequence: { groupOrder: 1 } }
            }
        ],
        coverage: {
            enabled: true,
            provider: 'v8',
            reporter: ['json'],
            reportsDirectory: '.check/coverage',
            reportOnFailure: true
        }
    }
});
CONFIG
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
printf '\n.check\n' >> .prettierignore
cat > stryker.config.json <<'CONFIG'
{
  "packageManager": "pnpm",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": [
    "examples/json-response/client.ts",
    "packages/client/src/client/streamableHttp.ts",
    "packages/core-internal/src/exports/public/index.ts",
    "packages/core-internal/src/index.ts",
    "packages/core-internal/src/shared/mediaType.ts",
    "packages/middleware/hono/src/hono.ts",
    "packages/server/src/server/createMcpHandler.ts",
    "packages/server/src/server/perRequestTransport.ts",
    "packages/server/src/server/streamableHttp.ts"
  ],
  "vitest": { "configFile": "vitest.config.js" },
  "coverageAnalysis": "perTest",
  "inPlace": true,
  "concurrency": 4,
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG
node_modules/.bin/prettier --write stryker.config.json
node_modules/.bin/prettier --check vitest.config.js package.json stryker.config.json

# 5. Stryker's initial test run on its own, to see the configuration hold before the full run
#    (2,143 mutants; 1,724 tests in 44 seconds). It restores the files it instruments.
node_modules/.bin/stryker run --dryRunOnly

# 6. The .check/ atis reads for evidence. Run the installed binary, never a `test` script.
#    The dist/ folders are what earlier test runs built; the run builds its own.
rm -rf .check .stryker-tmp packages/client/dist packages/server/dist
node_modules/.bin/checkride --all --skip security
git status --short    # the harness files only; no source file left instrumented

# 7. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
pnpm -C ~/Projects/atis/code/atis exec tsc --build
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-round-two/work/round-two-2/typescript-sdk && pwd -P)" \
  --base 7015d2129bc91e8cf8f143e2cca3ee2ba92808d3 \
  --out fixtures/round-two-2/map.json \
  --svg fixtures/round-two-2/atis.svg

# 8. The worktree is not kept; the clone is.
git -C /tmp/atis-round-two/clones/modelcontextprotocol__typescript-sdk worktree remove --force \
  /tmp/atis-round-two/work/round-two-2/typescript-sdk
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml`: five dev dependencies added at the workspace root
  (`checkride`, `fallow`, `@vitest/coverage-v8`, `@stryker-mutator/core` and
  `@stryker-mutator/vitest-runner`), all exact-pinned. The lockfile keeps its version 9.0 format
  and gains 156 package entries and 158 snapshot entries (42 and 44 from the first three
  packages, 114 and 114 from stryker); none of the 1,059 package entries or 1,062 snapshots it
  had is dropped or moved to another version. Six lines move: in three importers (`examples`,
  `examples/schema-validators` and `test/integration`), the optional `typescript` peer of
  `valibot` 1.3.1 and of `@valibot/to-json-schema` 1.6.0 now resolves to fallow's private
  typescript 7.0.2 rather than 5.9.3, which adds the two snapshots above the 42. valibot and
  its JSON-schema twin load no typescript at run time, and no slot type-checks those importers.
  vitest, typescript and every other direct dependency stay at the versions the lockfile locked.
- `@vitest/coverage-v8` 4.1.2: **a package the lockfile lacked**. No coverage provider is in the
  lockfile, and vitest's `--coverage` needs one; 4.1.2 is the version that matches the
  lockfile's vitest. The v8 provider is vitest's default.
- `vitest.config.js`: **a root test config the commit lacks**, written for the harness. The
  root `vitest.workspace.js` calls `defineWorkspace`, which vitest 4 removed, so the repo has no
  root config that runs, and checkride's `test` slot detects only `vitest.config.*` at the root.
  The config lists the projects CI's `pnpm -r --filter '!@modelcontextprotocol/test-e2e' test`
  runs (every package with a `test` script but the end-to-end suite):
  `packages/**/vitest.config.js`, the glob the old workspace file used, which takes the ten
  packages under `packages/`, plus
  `examples/shared`, `test/integration` and `examples/cli-client`. Each project keeps its own
  config file (environment, `include`, `globals`, `vite-tsconfig-paths`). The `coverage` block
  sets `enabled`, the v8 provider, `reporter: ['json']`, `reportsDirectory: '.check/coverage'`
  and `reportOnFailure`, so the `test` slot writes istanbul JSON to
  `.check/coverage/coverage-final.json`, where atis reads it. The commit sets no coverage
  include, exclude or thresholds anywhere, so none is set here: vitest's defaults keep the
  files the tests load, which puts 85 files from `node_modules/.pnpm` (ajv among them), five
  built `dist/` chunks and four `package.json` files in the coverage file beside the sources,
  264 files in all.
- `vitest.config.js`, the cli-client group: the first test-only run listed `examples/cli-client`
  as a plain project, and its two suites that import `@modelcontextprotocol/client` failed to
  resolve it ("Failed to resolve entry for package"). The example imports the client's built
  `dist/`, which the client's own `test/client/barrelClean.test.ts` builds with tsdown in its
  `beforeAll`; CI's `pnpm -r` runs workspaces in dependency order, so the client's tests finish
  before the example's start. One vitest run mixes them, so the example is given
  `sequence.groupOrder: 1`, which runs it after every other project. From a tree with no
  `dist/`, the next run passed all 196 files.
- `fallow.toml`: created with fallow's defaults and no entry points, since fallow finds them
  itself. One line, `ignoreDependencies = ["checkride"]`, keeps the harness's own install from
  showing up as an unused dev dependency. fallow reads `@vitest/coverage-v8` and the stryker
  packages as used through the vitest and stryker configs, so they need no entry.
- `.prettierignore`: `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts. The three harness files that prettier checks (`vitest.config.js`,
  `stryker.config.json` and `package.json`) pass it.
- `stryker.config.json`: the vitest runner over the root harness config, `perTest` coverage, a
  concurrency of 4, the JSON report at `.check/mutation.json`, and `mutate` set to the PR's nine
  changed non-test TypeScript source files (`git diff --name-only` between the merge base and
  the fixture commit). `inPlace` is set because stryker's sandbox would link each package's
  `node_modules` back to the worktree, where the packages' `tsconfig.json` paths
  (`./node_modules/@modelcontextprotocol/core-internal/src/index.ts`) would load the
  unmutated sources of the other packages. In place, stryker backs the nine files up under
  `.stryker-tmp`, restores them at the end and removes the folder; `git status` after the run
  shows no source file changed.
- Side effect of the repo's own tests, left as run: the client's and the server's
  `barrelClean` tests build `packages/client/dist/` and `packages/server/dist/`, which are
  gitignored.
- Not a file in the worktree: `LEFTHOOK=0` stops lefthook's hooks from running, not
  `lefthook install` from writing them, so the root `prepare` wrote
  `.git/hooks/pre-push` into the shared clone. It was removed straight after the install and
  nothing wrote it again. `core.hooksPath` stayed unset throughout.
- Run-time settings, not files: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`; `HUSKY=0`, `LEFTHOOK=0`
  and `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1` on the install and the checkride run;
  `--config.minimumReleaseAge=0` and `--ignore-scripts` on the `pnpm add` commands.
- No `noEmit` was needed: there is no root `tsconfig.json`, so the `types` slot ran no `tsc`,
  and nothing was emitted beside the sources.

## Skipped slots

Named per D56. 10 slots ran, of 20. The run took 18 minutes 39 seconds, 18 minutes 6 seconds
of it the `mutation` slot, on a machine under load from a second agent's suites (load average
between 8 and 58).

- `security`: skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `types`: checkride 0.19.0 skips it ("no tool detected for slot"): there is no root
  `tsconfig.json`, and the repo type-checks each package on its own with `tsgo`. `checkride
  doctor` names the 20 nested `tsconfig.json` files it leaves unchecked. Per the harness policy
  no root config was added.
- `lint`: checkride 0.19.0 skips it ("no tool detected for slot"): the eslint configs are per
  package (`packages/*/eslint.config.mjs` and the like), none at the root.
- `build`: checkride 0.19.0 skips it ("no 'build' script in package.json"): the root has
  `build:all`, not `build`.
- `struct`, `docs`, `spell`, `prose`, `publint`, `attw`: checkride 0.19.0 skips these itself
  ("no tool detected for slot"); the repo has none of their detect files, and per the harness
  policy none was added.
- `test`: ran and passed: 196 test files and 3,833 tests, all passed, in 30 seconds.
- `mutation`: ran and **completed**. Stryker 10.1.1 with its vitest runner instrumented 2,143
  mutants in the nine files. The initial test run took 1 minute 12 seconds (1,724 tests, the
  ones related to the mutated files) and the mutation phase 16 minutes 50 seconds, inside the
  20 minutes allowed: 1,520 killed, 6 timed out, 451 survived, 164 with no test reaching them
  (37 of them in `examples/json-response/client.ts`, which no test loads) and 2 runtime errors,
  a score of 71.28%. Stryker sets no break threshold, so the slot passes.
- `dead`, `dupes`, `health`: ran with fallow's defaults, and are red on the tree as a whole
  (296, 165 and 266 findings).
- `format`: ran and **stays red**: 43 of the repo's own files fail `prettier --check .`, among
  them 34 pages under `docs/`, four workflow and config files under `.github/`,
  `.changeset/pre.json`, `CLAUDE.md`, `REVIEW.md` and two scripts. None is a harness file. The
  repo's own `lint` scripts run prettier inside each package, so the root's documents are
  outside what it checks. It belongs to the tree.
- `links`: ran and stays red on two links in `docs/` (`docs/index.md` and
  `docs/clients/machine-auth.md`) to the API pages under `docs/api/`, which typedoc generates
  and the repo gitignores.
- `pack`: ran at the repo root and stays red: the root `package.json` is private and names no
  `files`, so the dry-run tarball takes the whole tree, and 914 paths in it match checkride's
  forbidden patterns (`docs/`, `.ts` sources, and `.check/` itself). It belongs to the tree.
- `snippets`: ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. `smoke`: ran at the
  repo root, which is a private package with no `exports` or `main` to import. Both are left
  as run.
