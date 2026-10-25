# Round-two fixture 5

An outside project's pull request, in glance round two (D95; see
[`../round-two.md`](../round-two.md)), read blind in the world at step 47. Its ground truth is
in [`truth.md`](./truth.md); the reader opens neither file until the reading is done (D62).

## The change

| | |
| --- | --- |
| repo | `vuejs/router` (<https://github.com/vuejs/router>) |
| pull request | [#2829](https://github.com/vuejs/router/pull/2829) `fix(unplugin): support definePage with webpack and rspack` |
| base branch | `main` |
| fixture commit | `47f174217a5dc77f6974937c5751e91edccb8c19` `fix(unplugin): support definePage with webpack and rspack`: the PR's approved head |
| merge base | `596d4816a5d524853dc9785827860ca858e3b799` `release: vue-router@5.4.0` |
| size | 6 files, +66 −13; 5 TypeScript source files by `classifyFile`'s rule, 1 test file |

The TypeScript source files are all in `packages/router/src/unplugin/`:
`codegen/generateRouteRecords.ts`, `codegen/generateRouteResolver.ts`,
`core/moduleConstants.ts`, `index.ts` and `options.ts`. The test is
`packages/router/src/unplugin/codegen/generateRouteRecords.spec.ts`. There are no other files.

The merge base is `git merge-base` of the fixture commit and `origin/main`, and agrees with the
compare API's `merge_base_commit`; the fixture commit is the PR's only commit, one ahead of it.
The PR squash-merged as `8c91f980bd7294bac30c368ba650fe93f1e8610a`, whose one parent is the merge
base.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 12.9.1, from `packageManager`. `pnpm-lock.yaml` holds two YAML documents, both lockfileVersion 9.0: the first pins pnpm 12.9.1 under `packageManagerDependencies`, the second is the lockfile proper. `pnpm-workspace.yaml` sets `shamefullyHoist: true`, overrides for vite, vue, the babel packages and `@types/node`, and `allowBuilds` for esbuild, `simple-git-hooks`, chromedriver and geckodriver (the last two no longer in the lockfile). `postinstall` runs `simple-git-hooks` |
| workspaces | `packages/*`, from `pnpm-workspace.yaml` and the root `workspaces` field: `router` (the library), `docs`, `playground`, `playground-file-based` and `experiments-playground` |
| test runner | vitest `^5.0.3` (the lockfile resolves 5.0.3) with `@vitest/coverage-v8` 5.0.3, from root `devDependencies`, and happy-dom 20.14.5 from the router's. The root `vitest.config.ts` has one project, `router`, extending `packages/router/vitest.config.ts`: `__tests__/**/*.spec.ts` and `src/**/*.spec.ts`, the playwright HMR tests excluded, compile-time flags such as `__DEV__` and `__TEST__` defined, `@vitejs/plugin-vue` loaded, typecheck off, and coverage over `src/**/*.ts` minus the entry points (`src/unplugin/index.ts` among them) and `src/volar/**`. The router's `test:unit` runs `vitest --coverage run`; its `test` runs the build, `test:unit`, `tsgo` type tests and playwright end-to-end tests, and the root `test` runs `pnpm run -r test`. typescript 6.0.3, with `@typescript/native-preview` for `test:types` |
| node | `.node-version` 26.9.0; `engines.node` `>=22.18.0` |
| TypeScript files at the fixture commit | 307 |

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
| node | 24.15.0 | the machine's; `.node-version` says 26.9.0, but `engines.node` is `>=22.18.0`, which admits 24, CI sets up `lts/*`, and the suite ran without environmental trouble, so no node 26 was installed |
| pnpm | 12.9.1 | `packageManager`, run through corepack, which fetched the 12.9.1 binary; the lockfile's first YAML document pins the same version. `pnpm-lock.yaml` (lockfileVersion 9.0) is honoured by `--frozen-lockfile` |
| vitest | 5.0.3 | the lockfile's, unchanged |
| `@vitest/coverage-v8` | 5.0.3 | already a root dev dependency, unchanged; the router's config names no provider, so vitest's default, v8, is kept |
| happy-dom | 20.14.5 | the lockfile's, unchanged |
| typescript | 6.0.3 | the lockfile's, unchanged; fallow brings a second, private copy, 7.0.2, through `fallow-type-aware` |
| oxlint | 1.87.0 | the lockfile's, unchanged |
| tsdown | 0.23.0 | the lockfile's, unchanged; the router's `build` |
| `@stryker-mutator/core` | 10.1.1 | added for the `mutation` slot, and kept |
| `@stryker-mutator/vitest-runner` | 10.1.1 | added for the `mutation` slot, and kept; its peer range (`vitest >=2.0.0`) admits 5.0.3 |

checkride records each tool's version as the check's `tool_version` in `.check/summary.json`,
and every one above that runs a slot matches it.

## The commands

```sh
# 0. A full clone, not a blobless one, so `git log --numstat` needs no promisor remote. The PR
#    squash-merged, so the fixture commit is fetched from the PR's head ref.
git clone https://github.com/vuejs/router.git /tmp/atis-round-two/clones/vuejs__router
git -C /tmp/atis-round-two/clones/vuejs__router fetch origin pull/2829/head

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `router`.
git -C /tmp/atis-round-two/clones/vuejs__router worktree add \
  /tmp/atis-round-two/work/round-two-5/router \
  47f174217a5dc77f6974937c5751e91edccb8c19 --detach

# 2. The repo's own package manager, honouring its lockfile. The machine's `pnpm` is a
#    corepack shim, which reads `packageManager` and runs 12.9.1. The root `postinstall` runs
#    `simple-git-hooks`, which SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 turns into a no-op, so it writes
#    no hook into the shared clone; the other switches are set for the same reason, and
#    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 keeps any browser download off, since no slot uses one.
cd /tmp/atis-round-two/work/round-two-5/router
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 HUSKY=0 LEFTHOOK=0 SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
pnpm install --frozen-lockfile

# 3. The current harness (D58), at the workspace root. pnpm 12 refuses a release younger than
#    its default minimumReleaseAge (the cutoff it named was two days back); checkride 0.19.0
#    was under two hours old and the stryker packages about 30, so the gate is set to 0 for
#    these commands (a command-line setting, not a file).
pnpm add -D -w --save-exact --ignore-scripts --config.minimumReleaseAge=0 \
  checkride@0.19.0 fallow@3.35.0

# 4. Harness edits (see the next section for why).
python3 - <<'PY'
p = "vitest.config.ts"
s = open(p).read()
old = "export default defineConfig({\n  test: {\n    projects: [\n"
new = """export default defineConfig({
  test: {
    // Fixture harness: vitest reads coverage from the root config only, so the
    // router's own include and exclude (packages/router/vitest.config.ts) are
    // rebased here, and the report goes where atis reads it.
    coverage: {
      enabled: true,
      reporter: ['json'],
      reportsDirectory: '.check/coverage',
      reportOnFailure: true,
      include: ['packages/router/src/**/*.ts'],
      exclude: [
        'packages/router/src/**/*.d.ts',
        'packages/router/src/**/*.test-d.ts',
        'packages/router/src/**/*.spec.ts',
        'packages/router/src/index.ts',
        'packages/router/src/devtools.ts',
        'packages/router/src/experimental/index.ts',
        'packages/router/src/**/test-utils.ts',
        'packages/router/src/unplugin/index.ts',
        'packages/router/src/unplugin/vite.ts',
        'packages/router/src/unplugin/webpack.ts',
        'packages/router/src/unplugin/rollup.ts',
        'packages/router/src/unplugin/rolldown.ts',
        'packages/router/src/unplugin/esbuild.ts',
        'packages/router/src/unplugin/types.ts',
        'packages/router/src/volar/**',
      ],
    },
    projects: [
"""
s = s.replace(old, new)
open(p, "w").write(s)
PY
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG

# 5. Stryker for the mutation slot, scoped to the PR's five changed non-test TypeScript source
#    files (`git diff --name-only` between the merge base and the fixture commit).
pnpm add -D -w --save-exact --ignore-scripts --config.minimumReleaseAge=0 \
  @stryker-mutator/core@10.1.1 @stryker-mutator/vitest-runner@10.1.1
cat > stryker.conf.json <<'CONFIG'
{
  "packageManager": "pnpm",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": [
    "packages/router/src/unplugin/codegen/generateRouteRecords.ts",
    "packages/router/src/unplugin/codegen/generateRouteResolver.ts",
    "packages/router/src/unplugin/core/moduleConstants.ts",
    "packages/router/src/unplugin/index.ts",
    "packages/router/src/unplugin/options.ts"
  ],
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG

# 6. The mutation attempt, run on its own first: it completed in 41 seconds, so the slot is
#    kept.
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
  --repo "$(cd /tmp/atis-round-two/work/round-two-5/router && pwd -P)" \
  --base 596d4816a5d524853dc9785827860ca858e3b799 \
  --out fixtures/round-two-5/map.json \
  --svg fixtures/round-two-5/atis.svg

# 9. The worktree is not kept; the clone is.
git -C /tmp/atis-round-two/clones/vuejs__router worktree remove --force \
  /tmp/atis-round-two/work/round-two-5/router
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml`: four dev dependencies added at the workspace root
  (`checkride`, `fallow`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`), all
  exact-pinned. The lockfile keeps both of its YAML documents, version 9.0, and the first, which
  pins pnpm 12.9.1, is unchanged. checkride and fallow add 32 package entries to the 742 it had,
  typescript 7.0.2 and its platform binaries among them; with the two stryker packages the gain
  is 153. One entry is dropped: `yaml@2.9.0`. The lockfile held both 2.9.0 and 2.9.1, and on the
  harness's add pnpm 12.9.1 resolved vite's optional `yaml` peer to 2.9.1, so the 14 snapshot
  entries keyed on vite 8.3.3 with `yaml@2.9.0` (vite itself, `@vitejs/plugin-vue`, tsup,
  `postcss-load-config`, the unplugin and vite-plugin family) are re-keyed to `yaml@2.9.1`, each
  at the version it had. It is pnpm's own dedupe, not the harness's: `pnpm dedupe --check` on
  the untouched lockfile already names `yaml@2.9.0` for removal, and an add with
  `--config.dedupe-peer-dependents=false` left the same diff. The stryker add removes no line.
  No direct dependency moves: vitest, its coverage provider, happy-dom, typescript, vite and
  every other stay at the versions the lockfile locked, and `pnpm-workspace.yaml` is unchanged.
- `vitest.config.ts` (the root one): edited in place, one `coverage` block added to the repo's
  own `test` block and nothing removed. vitest reads coverage options only from the root config,
  so the router's coverage block in `packages/router/vitest.config.ts` applies only when vitest
  runs from that package, as the router's `test:unit` does; checkride runs it from the repo
  root, where a probe run on one spec with `--coverage` reported only the 9 files that spec
  loads, not the router's `include`. The block carries the router's own `include` and its 15
  `exclude` patterns, each rebased onto `packages/router/`, so the excluded entry points,
  `src/unplugin/index.ts` among them, stay out as the repo has them. `enabled` is `true`,
  `reporter` is `['json']` and `reportsDirectory` is `.check/coverage`, so the `test` slot writes
  istanbul JSON to `.check/coverage/coverage-final.json`, where atis reads it.
  `reportOnFailure` is `true` because vitest writes no coverage when a test fails by default,
  and the file must land either way. The router's config sets no thresholds and no provider, so
  none is added. The one project, its `extends`, defines, plugin and include and exclude lists
  are unchanged, and the edit passes the repo's oxfmt.
- `fallow.toml`: created with fallow's defaults and no entry points, since fallow finds them
  itself, so `dead`, `dupes` and `health` run. One line, `ignoreDependencies = ["checkride"]`,
  keeps the harness's own install from showing up as an unused dev dependency. fallow did not
  report the two stryker packages as unused, so they are not listed.
- `stryker.conf.json`: created, as in step 5. Its `mutate` list is the PR's five changed
  non-test source files, and its JSON reporter writes `.check/mutation.json`, the file atis
  reads. It passes the repo's oxfmt.
- No `.prettierignore` and no `tsconfig.json`: the repo formats with oxfmt, which checkride does
  not detect, so no `format` slot runs, and the repo has no root `tsconfig.json`, so no `types`
  slot runs and nothing is emitted. The run left no untracked file outside `.check/`; the `build`
  slot's `dist/` folders and fallow's `.fallow/` cache are ignored by git.
- Run-time settings, not files: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, `HUSKY=0`, `LEFTHOOK=0`,
  `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1` and `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` throughout, and
  `--config.minimumReleaseAge=0` on the two `pnpm add` commands. The root `postinstall` ran and
  skipped its hook install; the shared clone's `core.hooksPath` stayed unset and its
  `.git/hooks` holds only git's samples.
- No test was edited, skipped or deleted, and no timeout was raised.

## Skipped slots

Named per D56. 11 slots ran, of 20.

- `security`: skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation`: **not** skipped. Stryker 10.1.1 with its vitest runner, scoped to the PR's five
  changed non-test TypeScript source files, instrumented 696 mutants. Its vitest runner runs only
  the tests related to the mutated files: the attempt on its own ran an initial test run of 425
  tests in 1 second and finished in 41 seconds, inside the 20 minutes allowed. In the run that
  produced the map the slot took 43 seconds and scored 69.54%: 481 killed, 3 timed out, 98
  survived, 114 with no coverage, no errors. All 74 mutants in `src/unplugin/index.ts` have no
  coverage.
- `types`: checkride 0.19.0 skips it ("no tool detected for slot"): the repo has no root
  `tsconfig.json` (its own `test:types` runs `tsgo --build` inside `packages/router`), and per
  the harness policy none was added. checkride's `doctor` notes that six nested `tsconfig.json`
  files go unchecked as a result.
- `format`, `struct`, `docs`, `spell`, `prose`, `publint`, `attw`: checkride 0.19.0 skips these
  itself ("no tool detected for slot"); the repo has none of their detect files (its formatter,
  oxfmt, is not one checkride detects), and per the harness policy none was added.
- `test`: ran and passed: 82 test files, and 2,006 tests, 1,972 passed, 19 skipped and 15 todo,
  none failed. The coverage file holds 98 files under `packages/router/src`.
- `lint`: ran and passed. checkride detects oxlint from the root dev dependency and runs
  `oxlint --format=json`, without `--type-aware`, since the tree has no `oxlint-tsgolint`.
- `build`: ran and passed: the root `build` runs `pnpm run -r build`, the router's tsdown and
  the two playgrounds' vite builds.
- `dead`, `dupes`, `health`: ran with fallow's defaults, and are red on the tree as a whole
  (267, 54 and 74 findings).
- `links`: ran and **stayed red** on 81 links in 32 of the docs package's Markdown files, which
  link to other pages without the `.md` extension (`./file-based-routing#…`), as VitePress
  resolves them; checkride looks for the target on disk. It belongs to the toolchain's reading
  of the tree and is left as run.
- `smoke` and `pack`: ran at the repo root and **stayed red**: the root is a private package
  with no `exports` or `main` to import, and no `version`, so `pnpm pack` exits 1
  (`ERR_PNPM_PACKAGE_VERSION_NOT_FOUND`). Both are left as run.
- `snippets`: ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
