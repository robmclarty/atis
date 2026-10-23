# Corpus fixture 8

An outside project's pull request, in the held-out half of the precision corpus (D88, D128,
D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `vercel/swr` (<https://github.com/vercel/swr>) |
| pull request | [#4336](https://github.com/vercel/swr/pull/4336) `Add cache tag revalidation support` |
| base branch | `main` |
| fixture commit | `d3f28b6ea7a605169e5d629d1082dc077ef52c23` `rename invalidateTag to revalidateTag`: the commit a human review was submitted against |
| merge base | `57a71f71c05c865ae15758610110ef04e6b7b2a6` `Chore: Fix X handle link (#4334)` |
| size | 11 files, +500 −17; 7 TypeScript source files by `classifyFile`'s rule, 4 test files |

The TypeScript source files are five in `src/_internal/`, `index.ts`, `types.ts`,
`utils/cache.ts`, `utils/config-context.ts` and `utils/config.ts`, and two in `src/index/`,
`index.ts` and `use-swr.ts`. The tests are all under `test/`: `test/use-swr-tags.test.tsx`
(new), `test/type/config.tsx`, and an end-to-end pair, `test/e2e/cache-tags.test.ts` (new)
and `test/e2e/site/app/cache-tags/page.tsx` (new). There are no other files.

The merge base is `git merge-base` of the fixture commit and `origin/main`, and agrees with the
compare API's `merge_base_commit`; the fixture commit is four commits ahead of it, all on the
PR's branch.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 10.33.0, from `packageManager` (with its sha512) and `pnpm-lock.yaml` (lockfileVersion 9.0) |
| workspaces | `_internal`, `core`, `immutable`, `infinite`, `mutation`, `test/e2e/site`, from `pnpm-workspace.yaml` (which also sets `allowBuilds` and a `minimumReleaseAge`); the source is the root package's `src/` |
| test runner | jest `30.2.0` (the lockfile resolves 30.2.0) with `@swc/jest` `0.2.39` (0.2.39) and `jest-environment-jsdom` `29.7.0` (29.7.0), from root `devDependencies`; the `test` script runs `jest`, with `jest.config.js` at the root (jsdom, tests matching `/test/.*\.test\.tsx?$` outside `/e2e/`, setup in `test/jest-setup.ts`, and a `moduleNameMapper` from `swr` and its subpaths to `src`). `test:build` runs jest against the build, and `test:e2e` runs Playwright against the Next.js site in `test/e2e/site` |
| node | no `engines.node`, `.nvmrc` or `.node-version`; CI sets up node 24 |
| TypeScript files at the fixture commit | 197 |

## Generation

Step 19 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, transformer, lockfile and package manager stay as the commit
had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.17.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; the commit has no `engines.node`, `.nvmrc` or `.node-version`, CI sets up node 24, and the suite ran without environmental trouble |
| pnpm | 10.33.0 | `packageManager` (with its sha512), run through corepack; `pnpm-lock.yaml` (lockfileVersion 9.0) is honoured by `--frozen-lockfile` |
| jest | 30.2.0 | the lockfile's, unchanged |
| `@swc/jest` | 0.2.39 | the lockfile's, unchanged |
| `jest-environment-jsdom` | 29.7.0 | the lockfile's, unchanged |
| `@edge-runtime/jest-environment` | 4.0.0 | the lockfile's, unchanged; two suites select it by docblock |
| typescript | 7.0.2 | the lockfile's, unchanged (the native compiler, with no JavaScript API) |
| oxlint | 1.72.0 | the lockfile's, unchanged |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot, then removed; see "Skipped slots" |
| `@stryker-mutator/jest-runner` | 10.0.0 | added for the `mutation` slot, then removed; it has no jest peer range, so it admits jest 30.2.0 |

## The commands

```sh
# 0. The clone under /tmp/atis-heldout/clones was already a full clone holding the fixture
#    commit and the merge base, with no promisor remote and no missing object, so the
#    blobless-clone repair the tuning fixtures needed was not needed here.

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `swr`.
git -C /tmp/atis-heldout/clones/vercel__swr worktree add \
  /tmp/atis-heldout/work/corpus-8/swr \
  d3f28b6ea7a605169e5d629d1082dc077ef52c23 --detach

# 2. The repo's own package manager, honouring its lockfile. The machine's `pnpm` is a
#    corepack shim, which reads `packageManager` and runs 10.33.0. HUSKY=0 keeps the
#    `prepare` script (`husky install`) from pointing the shared clone's core.hooksPath at the
#    worktree.
cd /tmp/atis-heldout/work/corpus-8/swr
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
HUSKY=0 pnpm install --frozen-lockfile

# 3. The current harness (D58), plus stryker for the mutation slot, at the workspace root.
#    `pnpm-workspace.yaml` sets `minimumReleaseAge` to 2880 minutes, which refuses a release
#    under two days old; checkride 0.17.0 was 26 hours old, so the gate is set to 0 for these
#    commands (a command-line setting, not a file; the `pnpm_config_` environment variable
#    did not override the workspace file).
HUSKY=0 pnpm add -D -w --save-exact --ignore-scripts --config.minimumReleaseAge=0 \
  checkride@0.17.0 fallow@3.35.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/jest-runner@10.0.0

# 4. Harness edits (see the next section for why).
python3 - <<'PY'
p = "jest.config.js"
s = open(p).read()
old = "  coverageReporters: ['text', 'html'],\n"
s = s.replace(old, "  collectCoverage: true,\n  coverageDirectory: '.check/coverage',\n  coverageReporters: ['json'],\n")
open(p, "w").write(s)
PY
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dev dependency.
ignoreDependencies = ["checkride"]
CONFIG

# 5. The mutation attempt, run on its own first (see "Skipped slots"). The files below are
#    what the last attempt used; it was stopped about 22 minutes into the mutation phase.
cat > stryker.jest.mjs <<'CONFIG'
// Stryker only: the repo's own jest config, minus three suites that pick the node
// environment by docblock and so report no coverage to stryker's jest environment.
import base from './jest.config.js'

export default {
  ...base,
  testPathIgnorePatterns: [
    ...base.testPathIgnorePatterns,
    '/test/unit/utils\\.test\\.tsx$',
    '/test/use-swr-node-env\\.test\\.tsx$',
    '/test/unit/serialize\\.test\\.ts$'
  ]
}
CONFIG
cat > stryker.config.json <<'CONFIG'
{
  "packageManager": "pnpm",
  "testRunner": "jest",
  "plugins": ["@stryker-mutator/jest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": [
    "src/_internal/index.ts",
    "src/_internal/types.ts",
    "src/_internal/utils/cache.ts",
    "src/_internal/utils/config-context.ts",
    "src/_internal/utils/config.ts",
    "src/index/index.ts",
    "src/index/use-swr.ts"
  ],
  "jest": { "configFile": "stryker.jest.mjs" },
  "tsconfigFile": "stryker.no-tsconfig.json",
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG
HUSKY=0 npx --no-install stryker run    # stopped; not complete
rm -rf .stryker-tmp stryker.config.json stryker.jest.mjs .check

# 6. Back out the attempt: package.json and the lockfile are restored from git, and only the
#    two tools the run needs are added again. Stryker's presence had re-keyed three of the
#    lockfile's snapshot entries; this leaves none moved.
git checkout package.json pnpm-lock.yaml
HUSKY=0 pnpm install --frozen-lockfile
HUSKY=0 pnpm add -D -w --save-exact --ignore-scripts --config.minimumReleaseAge=0 \
  checkride@0.17.0 fallow@3.35.0

# 7. A coverage provider that works in the edge-runtime suites (see the next section).
python3 - <<'PY'
p = "jest.config.js"
s = open(p).read()
s = s.replace("  collectCoverage: true,\n", "  collectCoverage: true,\n  coverageProvider: 'v8',\n")
open(p, "w").write(s)
PY

# 8. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. Mutation is dropped (see "Skipped slots").
rm -rf .check
HUSKY=0 node_modules/.bin/checkride --all --skip security,mutation

# 9. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-heldout/work/corpus-8/swr && pwd -P)" \
  --base 57a71f71c05c865ae15758610110ef04e6b7b2a6 \
  --out fixtures/corpus-8/map.json \
  --svg fixtures/corpus-8/atis.svg

# 10. The worktree is not kept; the clone is.
git -C /tmp/atis-heldout/clones/vercel__swr worktree remove --force \
  /tmp/atis-heldout/work/corpus-8/swr
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml` — two dev dependencies added at the workspace root
  (`checkride`, `fallow`), both exact-pinned. The lockfile keeps its version 9.0 format and
  gains 11 package entries; none of the 713 it had is dropped or moved to another version, and
  the only line it loses is the `optional: true` marker on `detect-libc`. jest, `@swc/jest`,
  typescript and every other direct dependency stay at the versions the lockfile locked.
- `jest.config.js` — edited in place: `collectCoverage: true` added, `coverageDirectory` set to
  `.check/coverage`, and `coverageReporters` changed from `['text', 'html']` to `['json']`, so
  the `test` slot writes istanbul JSON to `.check/coverage/coverage-final.json`, where atis
  reads it. The repo already keeps its jest config at the root, which checkride detects, so it
  is edited rather than shadowed. Its test regex, jsdom environment, setup file, `@swc/jest`
  transform, `coveragePathIgnorePatterns` and reporters are unchanged.
- `jest.config.js`, `coverageProvider: 'v8'` — **a change of coverage provider**, the one place
  this fixture departs from "keep the repo's own provider". The repo sets none, so jest's
  default, babel instrumentation, applies; under it two suites that select
  `@edge-runtime/jest-environment` by docblock (`test/unit/utils.test.tsx` and
  `test/unit/serialize.test.ts`) fail to load, because istanbul's generated counters call
  `new Function`, which that environment forbids ("Code generation from strings disallowed for
  this context"). The first run, with the default provider, failed exactly those two suites and
  was discarded. With the v8 provider, which is built into jest and needs no package, all 36
  suites pass, and the `json` reporter still writes istanbul-shaped JSON through
  `v8-to-istanbul`, mapped back to the TypeScript through the `@swc/jest` source maps. The
  coverage file holds the 33 files the tests load.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself. One line, `ignoreDependencies = ["checkride"]`, keeps the harness's own install from
  showing up as an unused dev dependency.
- No `.prettierignore`: the repo formats with oxfmt, which checkride does not detect, so no
  `format` slot runs. `tsconfig.json` is unchanged: its `outDir` is `dist`, which is ignored,
  so the `types` slot's `tsc --build` leaves the worktree as the commit had it.
- Run-time settings, not files: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`; `HUSKY=0` at install time
  and on the checkride run, so no `prepare` script rewrites the shared clone's `core.hooksPath`
  (it stayed unset throughout); `--config.minimumReleaseAge=0` on the `pnpm add` commands that
  install the harness.

## Skipped slots

Named per D56. 12 slots ran, of 20.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation` — **dropped**: attempted, and it did not complete in the time allowed. Stryker
  10.0.0 with its jest runner, scoped to the PR's seven changed non-test TypeScript source
  files (`git diff --name-only` between the merge base and the fixture commit), instrumented
  793 mutants. Two things stopped the run until each had a stryker-only answer, neither of
  which touches the tree or the `test` slot: stryker's `tsconfig.json` rewrite calls the
  TypeScript JavaScript API, which the repo's typescript 7.0.2 does not have
  ("ts.parseConfigFileTextToJson is not a function"; `tsconfigFile` pointed at a file that does
  not exist, so the step finds nothing to rewrite), and three suites select the node or edge-runtime environment by
  docblock and report no coverage to stryker's jest environment (left out through
  `stryker.jest.mjs`, which wraps the repo's own config). With those the initial run
  succeeded, 394 tests in 34 seconds. The mutation phase was then given about 22 minutes,
  with child processes repeatedly crashing on mutants that threw outside a test, and had not
  finished, so it was stopped. Both stryker packages and the two files were removed (and
  `package.json` and the lockfile restored before the harness went back in), so nothing of the
  attempt is left in the worktree, and the run used `--skip security,mutation`.
- `format`, `struct`, `docs`, `spell`, `prose`, `publint` — checkride 0.17.0 skips these
  itself ("no tool detected for slot"); the repo has none of their detect files (its formatter,
  oxfmt, is not one checkride detects), and per the harness policy none was added.
- `test` — ran and passed: 36 suites and 402 tests, 397 passed and 5 skipped, none failed.
- `types`, `lint`, `build`, `attw`, `pack`, `links` — ran as the repo has them and passed.
- `dead`, `dupes`, `health` — ran with fallow's defaults, and are red on the tree as a whole.
- `snippets` — ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
- `smoke` — ran and **stayed red**: the probe imports the built package and expects every
  name in its declared exports to be a live value, and the root entry also exports types, which
  have no value at run time. It belongs to the toolchain's reading of the tree and is left as
  run.
