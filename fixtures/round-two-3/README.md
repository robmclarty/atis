# Round-two fixture 3

An outside project's pull request, in glance round two (D95; see
[`../round-two.md`](../round-two.md)), read blind in the world at step 47. Its ground truth is
in [`truth.md`](./truth.md); the reader opens neither file until the reading is done (D62).

## The change

| | |
| --- | --- |
| repo | `jest-community/eslint-plugin-jest` (<https://github.com/jest-community/eslint-plugin-jest>) |
| pull request | [#1845](https://github.com/jest-community/eslint-plugin-jest/pull/1845) ``feat: create new `valid-mock-module-path` rule`` |
| base branch | `main` |
| fixture commit | `fee7e7af6bebecd66ee8522b648ffbf950f83ea0` ``build(dev-deps): update `markdown-link-check` ``: the commit a human review was submitted against |
| merge base | `2557a2029390287620dc7b6fbe6a3ae15f6763e2` ``chore: downgrade `eslint-plugin-eslint-plugin` (#1841)`` |
| size | 14 files, +243 −14; 3 TypeScript source files by `classifyFile`'s rule, 4 test files |

The TypeScript source files are all in `src/rules/`: the new rule,
`valid-mocked-module-path.ts` (renamed `valid-mock-module-path` later in the PR), and the move
of its helper `findModuleName` out of `no-untyped-mock-factory.ts` into `utils/misc.ts`. The
tests are `src/rules/__tests__/valid-mocked-module-path.test.ts` (new),
`src/__tests__/rules.test.ts`, and two fixture modules the rule's tests resolve against,
`src/rules/__tests__/fixtures/module/foo.ts` and `index.ts`, which count as tests because they
sit under `__tests__/`. The other seven files are `README.md`,
`docs/rules/valid-mocked-module-path.md`, `src/__tests__/__snapshots__/rules.test.ts.snap`, a
third fixture module `src/rules/__tests__/fixtures/module/foo.js`, and a link-checker change the
reviewer asked to have reverted: `markdown_link_check_config.json`, and `package.json` with
`yarn.lock`, which bump `markdown-link-check` from `^3.13.7` to `^3.14.1`.

The merge base is `git merge-base` of the fixture commit and `origin/main`, and agrees with the
compare API's `merge_base_commit`; the fixture commit is five commits ahead of it, all the
author's and all on the PR's branch, and it and its parent are the link-checker change. The PR
squash-merged as `a8625f1e77758aacb1daedc4eb628050a797082a`, on top of the later `main` commit
`59927d91c3` (`ci: don't update uses-with in actions (#1856)`).

## The ecosystem

| | |
| --- | --- |
| package manager | yarn 4.10.3, from `packageManager` and `.yarnrc.yml` (`yarnPath` `.yarn/releases/yarn-4.10.3.cjs`, `nodeLinker: node-modules`, `enableGlobalCache: true`); `yarn.lock` is berry format (`__metadata` version 8). `postinstall` runs `is-ci \|\| husky` |
| workspaces | none: one package, its source in `src/`, built by babel into `lib/` |
| test runner | jest `^30.0.0` (the lockfile resolves 30.2.0) with babel-jest 30.2.0 and `babel.config.js` (`@babel/preset-typescript` and `@babel/preset-env`, `@babel/core` 7.28.5), from root `devDependencies`. `jest.config.ts`, read through ts-node 10.9.2, defines two projects: `test`, the unit suite, and `lint`, which runs `jest-runner-eslint` 2.3.0 over every `.js` and `.ts` file as a test. It sets a 100% global coverage threshold on branches, functions, lines and statements. The `test` script runs `jest`, and CI runs `yarn test --coverage` on its eslint 8 legs. The lockfile resolves typescript 5.9.3, eslint 8.57.1 and `@typescript-eslint/utils` 8.46.2 |
| node | `engines.node` `^20.12.0 \|\| ^22.0.0 \|\| >=24.0.0`; no `.nvmrc` or `.node-version`; CI tests node 20.x, 22.x and 24.x against eslint 8 and 9 |
| TypeScript files at the fixture commit | 155 |

## Generation

Step 46 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, transformer, lockfile and package manager stay as the commit
had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.19.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `engines.node` is `^20.12.0 \|\| ^22.0.0 \|\| >=24.0.0`, which admits it, and CI tests node 24.x among others |
| yarn | 4.10.3 | `packageManager` and `.yarnrc.yml`'s `yarnPath`, run through corepack; `yarn.lock` (berry format, `__metadata` version 8) is honoured by `--immutable` |
| jest | 30.2.0 | the lockfile's, unchanged |
| babel-jest | 30.2.0 | the lockfile's, unchanged, with `@babel/core` 7.28.5 and the repo's `babel.config.js` |
| ts-node | 10.9.2 | the lockfile's, unchanged; jest reads `jest.config.ts` through it |
| `jest-runner-eslint` | 2.3.0 | the lockfile's, unchanged; it runs the `lint` jest project |
| typescript | 5.9.3 | the lockfile's, unchanged; fallow's optional `fallow-type-aware` is resolved onto this copy too (see "Harness changes in the worktree") |
| eslint | 8.57.1 | the lockfile's, unchanged |
| prettier | 3.6.2 | the lockfile's, unchanged |
| `@stryker-mutator/core` | 10.1.1 | added for the `mutation` slot, and kept |
| `@stryker-mutator/jest-runner` | 10.1.1 | added for the `mutation` slot, and kept; it has no jest peer range, so it admits jest 30.2.0 |

checkride records each tool's version as the check's `tool_version` in `.check/summary.json`,
and every one above that runs a slot matches it.

## The commands

```sh
# 0. A full clone, not a blobless one, so `git log --numstat` needs no promisor remote. The PR
#    squash-merged, so the fixture commit is fetched from the PR's head ref.
git clone https://github.com/jest-community/eslint-plugin-jest.git \
  /tmp/atis-round-two/clones/jest-community__eslint-plugin-jest
git -C /tmp/atis-round-two/clones/jest-community__eslint-plugin-jest fetch origin pull/1845/head

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads
#    `eslint-plugin-jest`.
git -C /tmp/atis-round-two/clones/jest-community__eslint-plugin-jest worktree add \
  /tmp/atis-round-two/work/round-two-3/eslint-plugin-jest \
  fee7e7af6bebecd66ee8522b648ffbf950f83ea0 --detach

# 2. The repo's own package manager, honouring its lockfile. The machine's `yarn` is a
#    corepack shim, which reads `packageManager` and runs 4.10.3. HUSKY=0 keeps the
#    `postinstall` (`is-ci || husky`) from pointing the shared clone's core.hooksPath at the
#    worktree; the other two switches are set for the same reason.
cd /tmp/atis-round-two/work/round-two-3/eslint-plugin-jest
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 HUSKY=0 LEFTHOOK=0 SKIP_INSTALL_SIMPLE_GIT_HOOKS=1
yarn install --immutable

# 3. The current harness (D58) at the workspace root. yarn 4.10.3 cannot install
#    typescript 7.0.2, which fallow's optional `fallow-type-aware` depends on (see the next
#    section), so one `resolutions` entry points that package's typescript at the tree's own
#    5.9.3 first. YARN_ENABLE_SCRIPTS=0 keeps the install scripts from running a second time.
python3 - <<'PY'
import json
p = "package.json"
d = json.load(open(p))
d["resolutions"] = {"fallow-type-aware/typescript": "5.9.3"}
open(p, "w").write(json.dumps(d, indent=2) + "\n")
PY
YARN_ENABLE_SCRIPTS=0 yarn add -D --exact checkride@0.19.0 fallow@3.35.0

# 4. Harness edits (see the next section for why).
python3 - <<'PY'
p = "jest.config.ts"
s = open(p).read()
old = "  resetMocks: true,\n"
new = old + "  collectCoverage: true,\n  coverageDirectory: '.check/coverage',\n  coverageReporters: ['json'],\n"
s = s.replace(old, new)
open(p, "w").write(s)
PY
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
printf '.check\n' >> .prettierignore

# 5. Stryker for the mutation slot, scoped to the PR's three changed non-test TypeScript source
#    files (`git diff --name-only` between the merge base and the fixture commit). Its jest
#    config is the repo's own file with the `test` project's settings in place of `projects`,
#    so stryker runs the unit suite and not the `lint` project.
YARN_ENABLE_SCRIPTS=0 yarn add -D --exact \
  @stryker-mutator/core@10.1.1 @stryker-mutator/jest-runner@10.1.1
cat > stryker.conf.json <<'CONFIG'
{
  "packageManager": "yarn",
  "testRunner": "jest",
  "plugins": ["@stryker-mutator/jest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": [
    "src/rules/no-untyped-mock-factory.ts",
    "src/rules/utils/misc.ts",
    "src/rules/valid-mocked-module-path.ts"
  ],
  "jest": {
    "projectType": "custom",
    "configFile": "jest.config.ts",
    "config": {
      "projects": [],
      "displayName": "test",
      "testPathIgnorePatterns": [
        "<rootDir>/lib/.*",
        "<rootDir>/src/rules/__tests__/fixtures/*",
        "<rootDir>/src/rules/__tests__/test-utils.ts"
      ],
      "coveragePathIgnorePatterns": ["/node_modules/"]
    }
  },
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG

# 6. The mutation attempt, run on its own first: it completed in 2 minutes 40 seconds, so the
#    slot is kept.
node_modules/.bin/stryker run

# 7. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script.
rm -rf .check .stryker-tmp
node_modules/.bin/checkride --all --skip security

# 8. The map and the still render, from atis's current source. --repo takes the resolved
#    path, not the /tmp symlink: on macOS /tmp is /private/tmp, and istanbul's absolute
#    coverage keys will not relativise against the unresolved one, which silently empties
#    patch_coverage. atis runs the worktree's own node_modules/.bin/fallow for the entry
#    points, and meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
pnpm exec tsc --build
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-round-two/work/round-two-3/eslint-plugin-jest && pwd -P)" \
  --base 2557a2029390287620dc7b6fbe6a3ae15f6763e2 \
  --out fixtures/round-two-3/map.json \
  --svg fixtures/round-two-3/atis.svg

# 9. The worktree is not kept; the clone is.
git -C /tmp/atis-round-two/clones/jest-community__eslint-plugin-jest worktree remove --force \
  /tmp/atis-round-two/work/round-two-3/eslint-plugin-jest
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json`, `resolutions`: one entry, `"fallow-type-aware/typescript": "5.9.3"`. fallow
  3.35.0 lists `fallow-type-aware` as an optional dependency, and it depends on typescript
  7.0.2. yarn applies its built-in typescript compat patch to every typescript it installs, and
  the patch in yarn 4.10.3 has a hunk for `lib/_tsc.js` on every version from 5.7.1-rc up;
  typescript 7.0.2 ships no such file, the fetch step fails with ENOENT, and `yarn add` installs
  nothing. yarn bounded that hunk below 7.0.0 in `@yarnpkg/plugin-compat` 4.0.13 (yarn
  4.17.1), after this commit. A `resolutions` entry for the patched typescript descriptor
  itself does not help, because the compat patch is applied again to whatever it resolves to.
  Pointing the sidecar's typescript at the tree's own 5.9.3 lets yarn 4.10.3 install fallow
  with no new typescript. The sidecar runs only under fallow's `--type-aware`, which neither
  checkride nor atis passes, so no fallow output depends on it.
- `package.json` and `yarn.lock`: four dev dependencies added at the workspace root
  (`checkride`, `fallow`, `@stryker-mutator/core`, `@stryker-mutator/jest-runner`), all
  exact-pinned. The lockfile keeps its berry format (`__metadata` version 8, `cacheKey` 10c0).
  checkride and fallow add 12 resolutions to the 1,181 it had, and the `resolutions` entry adds
  the range `5.9.3` to the two existing typescript key lines, which still resolve to 5.9.3; with
  the two stryker packages the gain is 113 resolutions, and eight more existing key lines have
  a new range merged in. None of the 1,181 is dropped or moved to another version. jest,
  babel-jest, typescript, eslint and every other direct dependency stay at the versions the
  lockfile locked.
- `jest.config.ts`: edited in place: `collectCoverage: true` added, `coverageDirectory` set to
  `.check/coverage` and `coverageReporters` set to `['json']`, so the `test` slot writes
  istanbul JSON to `.check/coverage/coverage-final.json`, where atis reads it. The repo keeps
  its jest config at the root, which checkride detects, so it is edited rather than shadowed.
  Both projects (`test` and `lint`), the 100% global threshold, the ignore patterns and the
  rest are unchanged, and the edit passes the repo's eslint and prettier.
- `fallow.toml`: created with fallow's defaults and no entry points, since fallow finds them
  itself, so `dead`, `dupes` and `health` run. One line, `ignoreDependencies = ["checkride"]`,
  keeps the harness's own install from showing up as an unused dev dependency. fallow did not
  report the two stryker packages as unused, so they are not listed.
- `.prettierignore`: `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts. The root has no script named `prettier`, so `yarn prettier --check .`
  runs the prettier binary and rewrites nothing.
- `stryker.conf.json`: created, as in step 5. Its `jest.config` is merged over the repo's file
  by stryker alone and replaces `projects` with the `test` project's settings, so stryker leaves
  out the `lint` project, which runs eslint over every file as a test and has no coverage to
  give. It touches neither the tree nor the `test` slot.
- `tsconfig.json` is unchanged: it already sets `noEmit: true`, so the `types` slot's
  `tsc --build` wrote no `.js` or `.d.ts` beside the sources. It did write
  `tsconfig.tsbuildinfo` at the root, the one untracked file the run left outside `.check/`. The
  `build` slot's babel writes `lib/`, which `.gitignore` covers.
- Run-time settings, not files: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, and `HUSKY=0`,
  `LEFTHOOK=0` and `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1` throughout, so the `postinstall` installed
  no hook: the shared clone's `core.hooksPath` stayed unset and its `.git/hooks` holds only
  git's samples. `YARN_ENABLE_SCRIPTS=0` on the two `yarn add` commands.
- No test was edited, skipped or deleted, and no timeout was raised.

## Skipped slots

Named per D56. 12 slots ran, of 20.

- `security`: skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation`: **not** skipped. Stryker 10.1.1 with its jest runner, scoped to the PR's three
  changed non-test TypeScript source files, instrumented 227 mutants. The attempt on its own ran
  its initial test run of 3,886 tests in 12 seconds and finished in 2 minutes 40 seconds, inside
  the 20 minutes allowed. In the run that produced the map the slot took 2 minutes 37 seconds
  and scored 81.78%: 161 killed, 23 timed out, 38 survived, 3 with no coverage, 2 errors.
- `struct`, `docs`, `spell`, `prose`, `publint`, `attw`: checkride 0.19.0 skips these itself
  ("no tool detected for slot"); the repo has none of their detect files, and per the harness
  policy none was added.
- `pack`: checkride 0.19.0 skips it ("'pnpm pack' is unavailable under yarn").
- `test`: ran and passed: both jest projects, 227 suites, 218 passed and 9 skipped (the
  fixture files the repo's eslint ignores, run as `lint` suites), and 4,063 tests, all passed.
  The 100% global coverage threshold was met. The coverage file holds the 74 files the unit
  tests load.
- `types`, `format`, `lint`, `build`, `links`, `smoke`: ran as the repo has them and passed.
- `dead`, `dupes`, `health`: ran with fallow's defaults, and are red on the tree as a whole
  (7, 5 and 28 findings).
- `snippets`: ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
