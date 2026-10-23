# Corpus fixture 7

An outside project's pull request, in the held-out half of the precision corpus (D88, D128,
D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `marmelab/react-admin` (<https://github.com/marmelab/react-admin>) |
| pull request | [#11024](https://github.com/marmelab/react-admin/pull/11024) `Fix mutation hooks types` |
| base branch | `master` |
| fixture commit | `23a4edd89224ba7bb44e5d0f35009115773dbd86` `Refine mutationFn typing in mutation hooks`: the commit a human review was submitted against |
| merge base | `297599dd0766bc41eb43e5b572d48aac76bec46d` `Merge pull request #11191 from marmelab/array-field-base` |
| size | 8 files, +269 −100; 6 TypeScript source files by `classifyFile`'s rule, 2 test files |

The TypeScript source files are all in `packages/ra-core/src/`:
`controller/create/useCreateController.ts` and five data-provider hooks,
`dataProvider/useCreate.ts`, `dataProvider/useDelete.ts`, `dataProvider/useDeleteMany.ts`,
`dataProvider/useUpdate.ts` and `dataProvider/useUpdateMany.ts`. The tests are
`packages/ra-core/src/dataProvider/useDelete.spec.tsx` and
`packages/ra-core/src/dataProvider/useUpdate.spec.tsx`. There are no other files.

The PR merged with a two-parent merge commit, `ddb1709bd43c2e3cc290769edb56f43d03796d3d`, so
the fixture commit is already on `master`: `git merge-base` of it and `origin/master` is the
fixture commit itself, and so is the compare API's `merge_base_commit` for
`master...23a4edd`. The merge base above is therefore `git merge-base` of the fixture commit and
that merge commit's first parent, `95c16df9dfc98faef1ac3f779b036a55bb6e55a0`, and the compare
API's `merge_base_commit` for `95c16df...23a4edd` agrees. It is the `master` commit that the
branch's own merge of `origin/master` (`d48c6b3`) brought in, so the four commits between it
and the fixture commit are all on the PR's branch.

## The ecosystem

| | |
| --- | --- |
| package manager | yarn 4.0.2, from `packageManager` and `.yarnrc.yml` (`yarnPath` `.yarn/releases/yarn-4.0.2.cjs`, `nodeLinker: node-modules`); `yarn.lock` is berry format (`__metadata` version 8) |
| workspaces | `packages/*`, `examples/*`, `cypress`, `docs_headless`, from the root `workspaces` field; `lerna.json` runs the packages' builds |
| test runner | jest `^29.5.0` (the lockfile resolves 29.5.0) with ts-jest `^29.1.0` (29.1.0) and `jest-environment-jsdom` `^29.5.0` (29.5.0), from root `devDependencies`. The root `jest.config.js` (jsdom, ts-jest with `isolatedModules`, `test-global-setup.js` and `test-setup.js`) maps every package's name to its `src`, so the unit suite runs without a build. `test-unit` runs `jest` under `cross-env` with `NODE_ICU_DATA=./node_modules/full-icu`; the root `test` script runs `yarn test-unit && yarn test-e2e`, the second half Cypress |
| node | no `engines.node`, `.nvmrc` or `.node-version`; CI runs on node `22.x` |
| TypeScript files at the fixture commit | 1637 |

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
| node | 24.15.0 | the machine's; the commit has no `engines.node`, `.nvmrc` or `.node-version`, CI runs node 22, and the suite ran without environmental trouble on 24 |
| yarn | 4.0.2 | `packageManager` and `.yarnrc.yml`'s `yarnPath`, run through corepack; `yarn.lock` (berry format, `__metadata` version 8) is honoured by `--immutable` |
| jest | 29.5.0 | the lockfile's, unchanged |
| ts-jest | 29.1.0 | the lockfile's, unchanged |
| `jest-environment-jsdom` | 29.5.0 | the lockfile's, unchanged |
| typescript | 5.9.3 | the lockfile's, unchanged; fallow brings a second, private copy, 7.0.2, through `fallow-type-aware` |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot, then removed; see "Skipped slots" |
| `@stryker-mutator/jest-runner` | 10.0.0 | added for the `mutation` slot, then removed; it has no jest peer range, so it admits jest 29.5.0 |

## The commands

```sh
# 0. The clone under /tmp/atis-heldout/clones was already a full clone holding the fixture
#    commit and the merge base, with no promisor remote and no missing object, so the
#    blobless-clone repair the tuning fixtures needed was not needed here.

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `react-admin`.
git -C /tmp/atis-heldout/clones/marmelab__react-admin worktree add \
  /tmp/atis-heldout/work/corpus-7/react-admin \
  23a4edd89224ba7bb44e5d0f35009115773dbd86 --detach

# 2. The repo's own package manager, honouring its lockfile. The machine's `yarn` is a
#    corepack shim, which reads `packageManager` and runs 4.0.2. HUSKY=0 keeps the husky
#    install from pointing the shared clone's core.hooksPath at the worktree;
#    CYPRESS_INSTALL_BINARY=0 skips the browser-test binary, which no slot uses.
cd /tmp/atis-heldout/work/corpus-7/react-admin
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
HUSKY=0 CYPRESS_INSTALL_BINARY=0 yarn install --immutable

# 3. The current harness (D58), plus stryker for the mutation slot, at the workspace root.
#    YARN_ENABLE_SCRIPTS=0 keeps the install scripts from running a second time.
HUSKY=0 YARN_ENABLE_SCRIPTS=0 yarn add -D --exact \
  checkride@0.17.0 fallow@3.35.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/jest-runner@10.0.0

# 4. Harness edits (see the next section for why).
python3 - <<'PY'
p = "jest.config.js"
s = open(p).read()
old = "    moduleNameMapper,\n    testTimeout: 60000,\n};"
s = s.replace(old, "    moduleNameMapper,\n    testTimeout: 60000,\n    collectCoverage: true,\n    coverageDirectory: '.check/coverage',\n    coverageReporters: ['json'],\n};")
open(p, "w").write(s)
p = "tsconfig.json"
s = open(p).read()
old = "        \"sourceMap\": true /* Generates corresponding '.map' file. */,\n"
s = s.replace(old, old + '        "noEmit": true,\n')
open(p, "w").write(s)
PY
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
printf '\n.check\n' >> .prettierignore

# 5. The mutation attempt, run on its own first (see "Skipped slots"). The files below are
#    what the last attempt used; it was stopped about 22 minutes into the mutation phase,
#    and the packages and both files were removed.
cat > stryker.jest.cjs <<'CONFIG'
// Stryker only: the repo's own jest config, minus two example suites that pick the node
// environment by docblock and so report no coverage to stryker's jest environment.
const base = require('./jest.config.js');

module.exports = {
    ...base,
    testPathIgnorePatterns: [
        ...base.testPathIgnorePatterns,
        '/examples/crm/src/providers/commons/getContactAvatar\\.spec\\.ts$',
        '/examples/crm/src/providers/commons/getCompanyAvatar\\.spec\\.ts$',
    ],
};
CONFIG
cat > stryker.config.json <<'CONFIG'
{
  "packageManager": "yarn",
  "testRunner": "jest",
  "plugins": ["@stryker-mutator/jest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": [
    "packages/ra-core/src/controller/create/useCreateController.ts",
    "packages/ra-core/src/dataProvider/useCreate.ts",
    "packages/ra-core/src/dataProvider/useDelete.ts",
    "packages/ra-core/src/dataProvider/useDeleteMany.ts",
    "packages/ra-core/src/dataProvider/useUpdate.ts",
    "packages/ra-core/src/dataProvider/useUpdateMany.ts"
  ],
  "jest": { "configFile": "stryker.jest.cjs" },
  "dryRunTimeoutMinutes": 30,
  "concurrency": 4,
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG
HUSKY=0 npx --no-install stryker run    # stopped; not complete
rm -rf .stryker-tmp stryker.config.json stryker.jest.cjs
HUSKY=0 YARN_ENABLE_SCRIPTS=0 yarn remove @stryker-mutator/core @stryker-mutator/jest-runner

# 6. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. Mutation is dropped (see "Skipped slots").
rm -rf .check tsconfig.tsbuildinfo
HUSKY=0 node_modules/.bin/checkride --all --skip security,mutation

# 7. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-heldout/work/corpus-7/react-admin && pwd -P)" \
  --base 297599dd0766bc41eb43e5b572d48aac76bec46d \
  --out fixtures/corpus-7/map.json \
  --svg fixtures/corpus-7/atis.svg

# 8. The worktree is not kept; the clone is.
git -C /tmp/atis-heldout/clones/marmelab__react-admin worktree remove --force \
  /tmp/atis-heldout/work/corpus-7/react-admin
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `yarn.lock` — two dev dependencies added at the workspace root
  (`checkride`, `fallow`), both exact-pinned. The lockfile keeps its format and gains 34
  resolutions; none of the 2,476 it had is dropped or moved to another version. jest, ts-jest,
  typescript and every other direct dependency stay at the versions the lockfile locked.
- `jest.config.js` — edited in place: `collectCoverage: true` added, `coverageDirectory` set
  to `.check/coverage` and `coverageReporters` set to `['json']`, so the `test` slot writes
  istanbul JSON to `.check/coverage/coverage-final.json`, where atis reads it. The repo
  already keeps its jest config at the root, which checkride detects, so it is edited rather
  than shadowed. The repo sets no `collectCoverageFrom`, so jest's default (the files the tests
  load) is kept, and its `testTimeout` of 60 seconds, transform, setup files and ignore lists
  are unchanged. The `cross-env` settings of the repo's own `test-unit` script (`LANG`,
  `NODE_ENV`, `BABEL_ENV`, `NODE_ICU_DATA`) are not set: checkride runs `jest` directly, and
  node 24 ships full ICU.
- `tsconfig.json` — `"noEmit": true` added. The root config is the repo's build config
  (`declaration`, `sourceMap`, no `outDir`, `allowJs`), and checkride's `types` slot runs
  `tsc --build` against it, which writes `.js`, `.d.ts` and `.map` files beside every source
  file. The first full run did exactly that: 6,589 untracked files appeared in the worktree,
  and the `test` slot that ran beside it loaded the emitted `.js` as well as the `.ts` (213
  `.js` keys in the coverage file) and reported one failing suite. That run was discarded and
  the worktree cleaned with `git clean`; with `noEmit` the slot only checks, and the run that
  produced the map is the second.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself. One line, `ignoreDependencies = ["checkride"]`, keeps the harness's own install from
  showing up as an unused dev dependency.
- `.prettierignore` — `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts.
- Side effect of the repo's own `build` slot, left as run: the build (`lerna run build`) rewrote
  the `exports` map in 18 workspace `package.json` files (19 changed `package.json` files with
  the root one). It touches the worktree only and is not part of the harness.
- Run-time settings, not files: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`; `HUSKY=0` at install time
  and on the checkride run, so no hook installer touches the shared clone's `core.hooksPath`
  (it stayed unset throughout); `CYPRESS_INSTALL_BINARY=0` and `YARN_ENABLE_SCRIPTS=0` at
  install time.

## Skipped slots

Named per D56. 11 slots ran, of 20.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation` — **dropped**: attempted, and it did not complete in the time allowed. Stryker
  10.0.0 with its jest runner, scoped to the PR's six changed non-test TypeScript source files
  (`git diff --name-only` between the merge base and the fixture commit), instrumented 771
  mutants. Three things stopped or slowed the run until each had a stryker-only answer, none
  of which touches the tree or the `test` slot: the initial test run exceeded stryker's default
  five minutes on a loaded machine (`dryRunTimeoutMinutes` of 30, and `concurrency` of 4); two
  example suites select the node environment by docblock and report no coverage to stryker's
  jest environment (left out through `stryker.jest.cjs`, which wraps the repo's own config).
  With those the initial run succeeded, 2,543 tests in 6 minutes 42 seconds. The mutation
  phase was then given about 22 minutes, on a machine under load from a second agent's
  suites, and had not finished, so it was stopped. Both stryker packages and the two files
  were removed, so nothing of the attempt is left in the worktree, and the run used
  `--skip security,mutation`.
- `pack` — checkride 0.17.0 skips it ("`pnpm pack` is unavailable under yarn").
- `struct`, `docs`, `spell`, `prose`, `publint`, `attw` — checkride 0.17.0 skips these
  itself ("no tool detected for slot"); the repo has none of their detect files, and per the
  harness policy none was added.
- `test` — ran and passed: 284 suites and 2,767 tests, 2,757 passed and 10 pending, none failed.
- `build` — ran and passed, as the repo has it.
- `types` — ran at the root `tsconfig.json`, with `noEmit` as above, and **stayed red**: the
  root config reaches the examples and `docs_headless`, which do not resolve their own
  workspace imports under it, and tsc reports 2,056 errors. It belongs to the tree.
- `format` — ran and **stayed red**: checkride runs `yarn prettier --check .`, and yarn berry
  runs the repo's own root script named `prettier` (which carries `--write --list-different`)
  with the arguments appended, so prettier refuses the pair "--check and --list-different"
  and exits 1 before it writes anything. It belongs to the tree and the toolchain.
- `lint` — ran and **stayed red**: it timed out at checkride's default per-check cap of 600
  seconds, in both runs, with the whole-repo `eslint .` that checkride runs (the repo's own
  `lint` script names source globs). A standalone `yarn eslint .` was still running after 20
  minutes on a quieter machine and was stopped, so the cap was not raised.
- `dead`, `dupes`, `health` — ran with fallow's defaults, and are red on the tree as a whole.
- `links` — ran and is red on the tree's own markdown. `snippets` — ran, and reports failure
  on a repo with no tagged doc fences: an opted-in slot with nothing to check refuses to pass
  vacuously, and `--all` opts it in. `smoke` — ran at the repo root, which is a private
  package with no `exports` or `main` to import. All three are left as run.
