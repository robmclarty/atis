# Corpus fixture 9

An outside project's pull request, in the held-out half of the precision corpus (D88, D128,
D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `react-hook-form/react-hook-form` (<https://github.com/react-hook-form/react-hook-form>) |
| pull request | [#13676](https://github.com/react-hook-form/react-hook-form/pull/13676) `🪅 feat: add OpaqueTypes registry for opaque leaf types` |
| base branch | `master` |
| fixture commit | `b929bbbd3df4c0b536d1c38b7cf4c3ee540d2628` `🪅 feat: add OpaqueTypes registry for opaque leaf types`: the commit a human review was submitted against |
| merge base | `81e67207fa7170843a123ef36f07262a51c29bf6` `🐞 fix #13674: Controller under a null parent submits undefined instead of a value (#13675)` |
| size | 5 files, +149 −11; 4 TypeScript source files by `classifyFile`'s rule, no test files |

The TypeScript source files are `src/types/errors.ts`, `src/types/path/eager.ts`,
`src/types/utils.ts` and `src/__typetest__/opaqueTypes.test-d.ts` (new). The last is a type
test that `tsc` checks (`test:type` runs `tsc -p src/__typetest__/tsconfig.json`), but the
rule counts it as source: `.test-d.ts` is not `.test.ts`, and `__typetest__/` is not
`__tests__/`. Without it the count is 3, still in range. The fifth file is
`reports/api-extractor.api.md`.

The fixture commit is not on the PR's final branch, which was later force-pushed, so it is
fetched by SHA (`git fetch origin b929bbbd3df4c0b536d1c38b7cf4c3ee540d2628`); GitHub still
serves it, and the clone keeps it under a local branch, `atis-fixture`. The merge base is
`git merge-base` of the fixture commit and `origin/master`, and agrees with the compare API's
`merge_base_commit`; the fixture commit is one commit ahead of it.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm, from `pnpm-lock.yaml` (lockfileVersion 9.0); no `packageManager` field (CI installs pnpm 11.7.0 through `pnpm/action-setup`) |
| workspaces | none: `pnpm-workspace.yaml` holds only `allowBuilds` (`@swc/core`, `esbuild` and `unrs-resolver` set to `false`), no `packages` |
| test runner | jest `^30.4.2` (the lockfile resolves 30.4.2) with `@swc/jest` `^0.2.39` (0.2.39), `jest-environment-jsdom` `^30.4.1` (30.4.1) and `jest-fixed-jsdom` `^0.0.10` (0.0.10), from `devDependencies`; the `test` script runs `jest --config ./scripts/jest/jest.config.js`, whose two projects, `Web` (`**/__tests__/**/*.(spec\|test).ts?(x)` in `jest-fixed-jsdom`) and `Server` (`*.server.(spec\|test).ts?(x)` in node), are both rooted at `src`. That config's `collectCoverageFrom` leaves out `src/types/**`, where three of the four source files sit. `test:type` runs `tsc` over `src/__typetest__` |
| node | `>=18.0.0`, from `engines.node`; no `.nvmrc` or `.node-version`; CI runs on node 22 |
| TypeScript files at the fixture commit | 402 |

## Generation

Step 19 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride, fallow and stryker are
installed into the worktree at their latest versions, because atis only ever ships against
current checkride. The repo's own runner, transformer, lockfile and package manager stay as the
commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.17.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `engines.node` asks for `>=18.0.0`, CI runs node 22, and the suite ran without environmental trouble on 24 |
| pnpm | 11.7.0 | the version CI installs through `pnpm/action-setup`, since the commit has no `packageManager` field; run through corepack behind a one-line wrapper on `PATH` (the machine's own default is 11.28.5); `pnpm-lock.yaml` (lockfileVersion 9.0) is honoured by `--frozen-lockfile` |
| jest | 30.4.2 | the lockfile's, unchanged |
| `@swc/jest` | 0.2.39 | the lockfile's, unchanged |
| `jest-environment-jsdom` | 30.4.1 | the lockfile's, unchanged |
| `jest-fixed-jsdom` | 0.0.10 | the lockfile's, unchanged |
| typescript | 6.0.3 | the lockfile's, unchanged |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot |
| `@stryker-mutator/jest-runner` | 10.0.0 | added for the `mutation` slot; it has no jest peer range, so it admits jest 30.4.2 |

## The commands

```sh
# 0. The clone under /tmp/atis-heldout/clones was already a full clone holding the fixture
#    commit (kept on the local `atis-fixture` branch) and the merge base, with no promisor
#    remote and no missing object, so the blobless-clone repair the tuning fixtures needed
#    was not needed here.

# 1. The package manager CI uses, through a wrapper ahead of the machine's own pnpm on PATH, so
#    the `pnpm` the repo's scripts and checkride call is 11.7.0 too.
mkdir -p /tmp/atis-heldout/work/shims-9
cat > /tmp/atis-heldout/work/shims-9/pnpm <<'SHIM'
#!/bin/sh
exec corepack pnpm@11.7.0 "$@"
SHIM
chmod +x /tmp/atis-heldout/work/shims-9/pnpm
export PATH=/tmp/atis-heldout/work/shims-9:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# 2. A worktree at the fixture commit, named for the repo so meta.repo reads `react-hook-form`.
git -C /tmp/atis-heldout/clones/react-hook-form__react-hook-form worktree add \
  /tmp/atis-heldout/work/corpus-9/react-hook-form \
  b929bbbd3df4c0b536d1c38b7cf4c3ee540d2628 --detach

# 3. The repo's own package manager, honouring its lockfile. HUSKY=0 keeps the `prepare`
#    script (`husky`) from pointing the shared clone's core.hooksPath at the worktree.
cd /tmp/atis-heldout/work/corpus-9/react-hook-form
HUSKY=0 pnpm install --frozen-lockfile

# 4. The current harness (D58), plus stryker for the mutation slot, at the root. pnpm 11
#    refuses a release younger than its `minimumReleaseAge` (two days here; checkride 0.17.0
#    was about 27 hours old), so the gate is set to 0 for this command (a command-line
#    setting, not a file).
HUSKY=0 pnpm add -D -w --save-exact --ignore-scripts --config.minimumReleaseAge=0 \
  checkride@0.17.0 fallow@3.35.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/jest-runner@10.0.0

# 5. Harness edits (see the next section for why).
cat > jest.config.mjs <<'CONFIG'
import base from './scripts/jest/jest.config.js';

export default {
  ...base,
  collectCoverage: true,
  coverageDirectory: '.check/coverage',
  coverageReporters: ['json'],
};
CONFIG
cat > stryker.jest.mjs <<'CONFIG'
// Stryker only: the repo's `Web` jest project run as the one top-level project. Under the
// repo's `projects` list the initial test run failed with `document is not defined`.
import base from './scripts/jest/jest.config.js';

const [web] = base.projects;

export default web;
CONFIG
cat > stryker.config.json <<'CONFIG'
{
  "packageManager": "pnpm",
  "testRunner": "jest",
  "plugins": ["@stryker-mutator/jest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": {
    "fileName": ".check/mutation.json"
  },
  "mutate": [
    "src/types/errors.ts",
    "src/types/path/eager.ts",
    "src/types/utils.ts",
    "src/__typetest__/opaqueTypes.test-d.ts"
  ],
  "coverageAnalysis": "off",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true,
  "jest": {
    "configFile": "stryker.jest.mjs",
    "enableFindRelatedTests": false
  }
}
CONFIG
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
printf '\n.check\n' >> .prettierignore
node_modules/.bin/prettier --write jest.config.mjs stryker.jest.mjs stryker.config.json

# 6. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. Mutation completed (32 seconds), so it is kept.
rm -rf .check .stryker-tmp tsconfig.tsbuildinfo
HUSKY=0 node_modules/.bin/checkride --all --skip security

# 7. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-heldout/work/corpus-9/react-hook-form && pwd -P)" \
  --base 81e67207fa7170843a123ef36f07262a51c29bf6 \
  --out fixtures/corpus-9/map.json \
  --svg fixtures/corpus-9/atis.svg

# 8. The worktree is not kept; the clone is.
git -C /tmp/atis-heldout/clones/react-hook-form__react-hook-form worktree remove --force \
  /tmp/atis-heldout/work/corpus-9/react-hook-form
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml` — four dev dependencies added at the root (`checkride`,
  `fallow`, `@stryker-mutator/core`, `@stryker-mutator/jest-runner`), all exact-pinned. The
  lockfile keeps its version 9.0 format and gains 148 package entries; none of the 764 it had
  is dropped or moved to another version. Forty-seven of its snapshot keys are re-keyed when
  pnpm resolves the four new packages, their optional `supports-color` peer suffix changing;
  no version behind any of them moves. jest, `@swc/jest`, typescript and every other direct
  dependency stay at the versions the lockfile locked.
- `jest.config.mjs` — created at the root. The repo keeps its jest config at
  `scripts/jest/jest.config.js` and runs it with `--config`; checkride's `test` slot detects
  jest from a root config file and runs plain `jest --ci --json`. The file re-exports the repo's
  own config (its `Web` and `Server` projects, test matches, transforms, setup file and
  `collectCoverageFrom`) and adds three coverage options: turn coverage on, `json` reporter,
  `coverageDirectory` `.check/coverage`, which writes `.check/coverage/coverage-final.json`
  where atis reads it. The repo sets no coverage provider, so jest's default is kept. The
  repo's own `collectCoverageFrom` leaves out `src/types/**`, so three of the PR's four source
  files have no coverage entry by the repo's design; that is left as the repo has it. It is
  `.mjs`, not `.js`, because the repo's ESLint config forbids `require()` and the `lint` slot
  would otherwise report the harness's own file.
- `stryker.jest.mjs` — created; stryker only. With the repo's config as it is, its `projects`
  list, stryker's initial test run failed with `document is not defined`. The file hands
  stryker the `Web` project alone, as a top-level config, and the run then succeeds. The
  `Server` project's suites are not in it.
- `stryker.config.json` — created; `mutate` is the PR's four changed TypeScript source files
  (`git diff --name-only` between the merge base and the fixture commit, minus the report), and
  the JSON reporter writes `.check/mutation.json`, the file atis reads. `coverageAnalysis` is
  `off`: the `Web` project's environment, `jest-fixed-jsdom`, is a custom one and cannot report
  per-test coverage to stryker without a wrapper, and with so few mutants the whole project is
  cheap to run for each. `enableFindRelatedTests` is `false`, so each mutant runs against the
  whole `Web` project (1,269 tests), not only the tests jest's dependency graph relates to the
  mutated type files. The file is formatted by the repo's own prettier, so the `format` slot
  does not report it.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself. One line, `ignoreDependencies = ["checkride"]`, keeps the harness's own install from
  showing up as an unused dev dependency. The two stryker packages did not show up as unused,
  so they are not listed.
- `.prettierignore` — `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts.
- The first full run used a `jest.config.js` and a `stryker.jest.cjs` at the root, written with
  `require()`; the repo's ESLint rule `no-require-imports` made `lint` red on the harness's own
  two files, and `format` was red on the then-unformatted `stryker.config.json` and on the
  `.check` artifacts. That run was discarded and the files rewritten as above. The run that
  produced the map is the last.
- Run-time settings, not files: the wrapper first on `PATH` and `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`;
  `HUSKY=0` at install time and on the checkride run, so no `prepare` script rewrites the shared
  clone's `core.hooksPath` (it stayed unset throughout); `--config.minimumReleaseAge=0` on the one
  `pnpm add` that installs the harness.

## Skipped slots

Named per D56. 13 slots ran, of 20.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation` — **not** skipped. It completed in about 32 seconds and wrote
  `.check/mutation.json`: 6 mutants, all in the PR's one type-test file; the three type
  declaration files hold none.
- `struct`, `docs`, `spell`, `prose`, `publint`, `attw` — checkride 0.17.0 skips these itself
  ("no tool detected for slot"); the repo has none of their detect files, and per the harness
  policy none was added.
- `test` — ran and passed: 120 suites and 1,278 tests, none failed or skipped.
- `types`, `format`, `lint`, `build`, `smoke` — ran as the repo has them (`tsconfig.json`,
  `.prettierrc`, `eslint.config.mjs`, its `build` script and manifest) and passed.
- `dead`, `dupes`, `health` — ran with fallow's defaults, and are red on the tree as a whole.
- `pack` — ran and **stayed red**: the dry-run tarball is missing `dist/react-server.esm.mjs`,
  a file the manifest's `exports` names and the repo's build at this commit does not write. It
  belongs to the tree.
- `links` — ran and is red on the tree's own markdown. `snippets` — ran, and reports failure on
  a repo with no tagged doc fences: an opted-in slot with nothing to check refuses to pass
  vacuously, and `--all` opts it in. Both are left as run.
