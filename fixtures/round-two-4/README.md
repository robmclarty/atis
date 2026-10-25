# Round-two fixture 4

An outside project's pull request, in glance round two (D95; see
[`../round-two.md`](../round-two.md)), read blind in the world at step 47. Its ground truth is
in [`truth.md`](./truth.md); the reader opens neither file until the reading is done (D62).

## The change

| | |
| --- | --- |
| repo | `lingui/js-lingui` (<https://github.com/lingui/js-lingui>) |
| pull request | [#2583](https://github.com/lingui/js-lingui/pull/2583) `feat: add pseudolocalize options` |
| base branch | `main` |
| fixture commit | `a5215b97d151212b8584c5d803c59dc1e142bc89` `add pseudolocalize options`: the commit a human review was submitted against |
| merge base | `5070bcae400a7d457cccc84cb4634e7dea921cda` `docs: highlight native SolidJS support across landing and README (#2577)` |
| size | 18 files, +275 −22; 13 TypeScript source files by `classifyFile`'s rule, 3 test files |

The TypeScript source files span six packages. Five are in `packages/conf/`:
`src/getPseudoLocale.ts` (new), `src/index.ts`, `src/makeConfig.ts`, `src/types.ts`, and
`__typetests__/index.tst.ts`, a tstyche type test that counts as source because its name matches
neither `*.test.*` nor `*.spec.*`. Five are in `packages/cli/src/`: `api/compile.ts`,
`api/compile/compileLocale.ts`, `api/pseudoLocalize.ts`, `api/stats.ts` and
`services/translationIO.ts`. The other three are `packages/loader/src/webpackLoader.ts`,
`packages/metro-transformer/src/metroTransformer.ts` and `packages/vite-plugin/src/index.ts`.
The tests are `packages/cli/src/api/compile.test.ts`, `packages/cli/src/api/pseudoLocalize.test.ts`
and `packages/conf/src/getPseudoLocale.test.ts` (new). The other two files are
`packages/cli/src/api/__snapshots__/compile.test.ts.snap` and `website/docs/ref/conf.md`.

The merge base is `git merge-base` of the fixture commit and `origin/main`, and agrees with the
compare API's `merge_base_commit`; the fixture commit is the PR's first commit, one ahead of it.
The PR squash-merged as `35476887e8601b9a3dd0361c8c1a04ed2e8669a3`, on top of the later `main`
commit `8aa816a868` (`chore(cli): raise esbuild dependency floor (#2604)`).

## The ecosystem

| | |
| --- | --- |
| package manager | yarn 4.14.1, from `packageManager` and `.yarnrc.yml` (`yarnPath` `.yarn/releases/yarn-4.14.1.cjs`, `nodeLinker: node-modules`, `enableGlobalCache: false`, and a `catalog` pinning vitest, `@vitest/coverage-v8`, typescript and unbuild); `yarn.lock` is berry format (`__metadata` version 9). `prepare` runs `husky install` |
| workspaces | `packages/*` and `test/*`, from the root `workspaces` field; 19 packages under `packages/` and three end-to-end packages under `test/`. The packages' `exports` point at their built `dist/` (`test-utils` alone has none), which `unbuild` 3.6.1 writes |
| test runner | vitest, catalog 4.1.5 (the lockfile resolves 4.1.5), with `@vitest/coverage-v8` 4.1.5, from root `devDependencies`. The root `vitest.config.ts` lists `projects: ["packages/*"]` and sets the v8 provider over `packages/**/*.{ts,tsx}`, excluding build output, fixtures, `test/`, `__typetests__/`, configs and declarations; each package has its own `vitest.config.ts`. The `test` script runs `vitest --run`, `test:ci:coverage` adds `--coverage`, and CI runs `yarn release:build` (every package's build, in topological order) before either. Type tests run separately in tstyche (`test:types`) and end-to-end tests in `test/*` (`test:e2e`). typescript 5.9.3 |
| node | `.nvmrc` `22`; `engines.node` `>=22.19.0`; CI tests node 22 and 24 on Ubuntu and Windows |
| TypeScript files at the fixture commit | 435 |

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
| fallow | 3.35.0 | installed into the worktree; the commit pinned none. Its optional `fallow-type-aware` companion is left out; see "Harness changes in the worktree" |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `.nvmrc` says `22`, `engines.node` is `>=22.19.0`, which admits 24, and CI tests node 22 and 24 |
| yarn | 4.14.1 | `packageManager` and `.yarnrc.yml`'s `yarnPath`, run through corepack; `yarn.lock` (berry format, `__metadata` version 9, `cacheKey` 10) is honoured by `--immutable`. This yarn's `enableScripts` defaults to false, so no dependency's build script runs, as in CI |
| vitest | 4.1.5 | the lockfile's, unchanged (catalog 4.1.5) |
| `@vitest/coverage-v8` | 4.1.5 | the lockfile's, unchanged; the v8 provider is kept |
| typescript | 5.9.3 | the lockfile's, unchanged (catalog 5.9.3) |
| unbuild | 3.6.1 | the lockfile's, unchanged; it builds the packages' `dist/` |
| vite | 8.0.10 | the lockfile's, unchanged; the vite plugin's tests build with it |
| webpack | 5.76.1 | the lockfile's, unchanged; the loader's tests build with it |
| eslint | 9.39.3 | the lockfile's, unchanged |
| prettier | 3.8.1 | the lockfile's, unchanged |
| husky | 8.0.3 | the lockfile's, unchanged; the install log shows no `prepare` and no `husky install`, and `HUSKY=0` was set besides |
| tstyche | 7.1.0 | the lockfile's, unchanged; no slot runs it |
| `@stryker-mutator/core` | 10.1.1 | added for the `mutation` slot, and kept: the slot completed |
| `@stryker-mutator/vitest-runner` | 10.1.1 | added for the `mutation` slot, and kept; its peer range (`vitest >=2.0.0`) admits 4.1.5 |

## The commands

```sh
# 0. A full clone (not blobless). The PR squash-merged, so its head is fetched from the PR ref;
#    the fixture commit and the merge base are both present after it.
git clone https://github.com/lingui/js-lingui.git /tmp/atis-round-two/clones/lingui__js-lingui
git -C /tmp/atis-round-two/clones/lingui__js-lingui fetch origin pull/2583/head

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `js-lingui`.
git -C /tmp/atis-round-two/clones/lingui__js-lingui worktree add \
  /tmp/atis-round-two/work/round-two-4/js-lingui \
  a5215b97d151212b8584c5d803c59dc1e142bc89 --detach

# 2. The repo's own package manager, honouring its lockfile. The machine's `yarn` is a corepack
#    shim, which reads `packageManager` and runs the repo's own .yarn/releases/yarn-4.14.1.cjs.
cd /tmp/atis-round-two/work/round-two-4/js-lingui
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 HUSKY=0 LEFTHOOK=0 SKIP_INSTALL_SIMPLE_GIT_HOOKS=1
yarn install --immutable

# 3. The current harness (D58), then stryker for the mutation slot, at the workspace root.
#    The resolution comes first: without it yarn 4.14.1 cannot fetch fallow's optional
#    type-aware companion (see the next section).
mkdir -p .yarn/harness/fallow-type-aware-omitted
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.resolutions={'fallow-type-aware':'link:./.yarn/harness/fallow-type-aware-omitted'};fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
yarn add -D --exact checkride@0.19.0 fallow@3.35.0
yarn add -D --exact @stryker-mutator/core@10.1.1 @stryker-mutator/vitest-runner@10.1.1

# 4. Harness edits (see the next section for why).
python3 - <<'PY'
p = "vitest.config.ts"
s = open(p).read()
old = '''    coverage: {
      provider: "v8",
'''
new = '''    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["json"],
      reportsDirectory: ".check/coverage",
      reportOnFailure: true,
'''
assert s.count(old) == 1
s = s.replace(old, new)
open(p, "w").write(s)
PY
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
printf '.check\n' >> .prettierignore
cat > checkride.config.json <<'CONFIG'
{
  "checks": {
    "format": {
      "name": "prettier",
      "description": "Prettier formatting check",
      "command": "node_modules/.bin/prettier",
      "args": ["--check", "."],
      "note": "Fixture harness: checkride's prettier adapter, run as the binary. Under yarn the adapter's `yarn prettier --check .` runs the root script named prettier, which carries --write."
    }
  }
}
CONFIG
cat > stryker.config.json <<'CONFIG'
{
  "packageManager": "yarn",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": [
    "packages/cli/src/api/compile.ts",
    "packages/cli/src/api/compile/compileLocale.ts",
    "packages/cli/src/api/pseudoLocalize.ts",
    "packages/cli/src/api/stats.ts",
    "packages/cli/src/services/translationIO.ts",
    "packages/conf/src/getPseudoLocale.ts",
    "packages/conf/src/index.ts",
    "packages/conf/src/makeConfig.ts",
    "packages/conf/src/types.ts",
    "packages/loader/src/webpackLoader.ts",
    "packages/metro-transformer/src/metroTransformer.ts",
    "packages/vite-plugin/src/index.ts"
  ],
  "vitest": { "configFile": "vitest.config.ts", "pool": "forks" },
  "coverageAnalysis": "perTest",
  "disableTypeChecks": false,
  "inPlace": true,
  "concurrency": 4,
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG
node_modules/.bin/prettier --check vitest.config.ts package.json checkride.config.json stryker.config.json

# 5. The repo's own build, as CI runs it before the tests: the packages import each other
#    through their built dist/. There is no root `build` script, so no slot runs it.
yarn release:build

# 6. Stryker's initial test run on its own, to see the configuration hold before the full run
#    (637 mutants; 174 tests in 13 seconds). It restores the files it instruments.
node_modules/.bin/stryker run --dryRunOnly

# 7. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script.
rm -rf .check .stryker-tmp
node_modules/.bin/checkride --all --skip security
git status --short    # the harness files and tsconfig.tsbuildinfo; no source file changed

# 8. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
pnpm -C ~/Projects/atis/code/atis exec tsc --build
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-round-two/work/round-two-4/js-lingui && pwd -P)" \
  --base 5070bcae400a7d457cccc84cb4634e7dea921cda \
  --out fixtures/round-two-4/map.json \
  --svg fixtures/round-two-4/atis.svg

# 9. The worktree is not kept; the clone is.
git -C /tmp/atis-round-two/clones/lingui__js-lingui worktree remove --force \
  /tmp/atis-round-two/work/round-two-4/js-lingui
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `yarn.lock`: four dev dependencies added at the workspace root
  (`checkride`, `fallow`, `@stryker-mutator/core` and `@stryker-mutator/vitest-runner`), all
  exact-pinned. The lockfile keeps its format and gains 126 resolutions (11 with checkride and
  fallow, 115 with stryker); none of the 1,451 it had is dropped or moved to another version.
  Six existing entries have a new range merged into their key line (`detect-libc` with fallow;
  `chalk`, `inherits`, `rxjs`, `source-map` and `tree-kill` with stryker). vitest, its coverage
  provider, typescript and every other direct dependency stay at the versions the lockfile
  locked.
- `package.json`, `resolutions`: **fallow's optional `fallow-type-aware` companion is left
  out.** fallow 3.35.0 lists `fallow-type-aware` 3.35.0 among its `optionalDependencies`, and
  it depends on typescript 7.0.2. yarn wraps every `typescript` dependency in its built-in
  compat patch (`optional!builtin<compat/typescript>`), and 4.14.1's patch reaches for
  `lib/_tsc.js`, which typescript 7.0.2 does not ship; yarn forgives an optional patch only a
  hunk that fails to apply, not a missing file, so `yarn add` stopped in its fetch step
  ("ENOENT: no such file or directory, lstat '/node_modules/typescript/lib/_tsc.js'") and
  installed nothing. A yarn patch of fallow's manifest does not help, because yarn resolves a
  patched package's dependencies from the original. The resolution
  `"fallow-type-aware": "link:./.yarn/harness/fallow-type-aware-omitted"` points the companion
  at an empty folder (gitignored under `.yarn/*`), which `link:` installs as a folder that is
  not a package, so fallow's launcher finds no `fallow-type-aware/package.json` and runs
  without it, the state an install without optional dependencies leaves. The companion only
  serves `--type-aware`, which neither checkride's fallow slots (`dead-code`, `dupes`,
  `health`) nor atis (`list --entry-points`) pass, so every fallow command the run and the map
  use is the one a full install runs. The fallow binary itself is the signed 3.35.0
  (`fallow --version` verifies it).
- `vitest.config.ts`: edited in place: `coverage.enabled` set to `true`, `coverage.reporter`
  to `["json"]`, `coverage.reportsDirectory` to `.check/coverage`, and
  `coverage.reportOnFailure` to `true` (vitest writes no coverage when a test fails by default,
  and the file must land either way), so the `test` slot writes istanbul JSON to
  `.check/coverage/coverage-final.json`, where atis reads it. The repo already keeps its vitest
  config at the root, which checkride detects, so it is edited rather than shadowed. The v8
  provider, the `include` of `packages/**/*.{ts,tsx}`, the `exclude` list and the `projects`
  are unchanged; the commit sets no thresholds. The coverage file holds 138 files.
- `checkride.config.json`: **the `format` slot is filled with checkride's own prettier
  command, run as the binary.** Under yarn, checkride turns its adapter's
  `pnpm exec prettier --check .` into `yarn prettier --check .`, and yarn berry runs a root
  script of that name before a binary. The repo's root script `prettier` is
  `prettier --write '**/*.{ts,tsx,js,jsx}'`, so the slot would run
  `prettier --write '**/*.{ts,tsx,js,jsx}' --check .`, and prettier 3.8.1 accepts the pair: in
  a scratch directory it rewrote both unformatted files and exited 0. In the worktree that
  would have reformatted the repo's files while the other slots of the same wave read them, and
  passed. The config's `format` entry runs `node_modules/.bin/prettier --check .`, the
  adapter's own arguments, under the adapter's name; it writes nothing, and `git status` after
  the run shows no source file changed.
- `fallow.toml`: created with fallow's defaults and no entry points, since fallow finds them
  itself. One line, `ignoreDependencies = ["checkride"]`, keeps the harness's own install from
  showing up as an unused dev dependency. fallow reads the stryker packages as used through the
  stryker config, so they need no entry.
- `.prettierignore`: `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts. The harness's JSON files pass prettier.
- `stryker.config.json`: the vitest runner over the root config, `perTest` coverage, a
  concurrency of 4, the JSON report at `.check/mutation.json`, and `mutate` set to twelve of the
  PR's thirteen TypeScript source files (`git diff --name-only` between the merge base and the
  fixture commit, tests left out). The thirteenth, `packages/conf/__typetests__/index.tst.ts`,
  is a tstyche type test that counts as source only by `classifyFile`'s name rule; no vitest
  suite loads it, so every mutant in it would report no coverage, and it is left out.
  `inPlace` is set so stryker works on the worktree rather than a copy of its 2,641 files (the
  yarn cache among them), backing the twelve files up under `.stryker-tmp` and restoring them
  at the end. `vitest.pool` is set to `forks`, vitest 4's own default, because the runner
  defaults to `threads`, and the first dry runs failed under it: the cli's `.vitest/setup.ts`
  assignment `process.env.TZ = "UTC"` did not take in a worker thread, so the extractor's PO
  test wrote a `-0700` creation date, and with `TZ=UTC` set on the process instead a catalog
  test failed on `process.chdir() is not supported in workers`. Under `forks` neither happens
  and `TZ` needs no setting. `disableTypeChecks` is `false` because the default pass, which
  prepends `// @ts-nocheck`, rewrote files beyond the twelve, and the first dry run's restore
  left `packages/cli/src/lingui.ts` and `.yarn/releases/yarn-4.14.1.cjs` without their
  executable bit (put back with `chmod +x`); vitest strips types without checking them, so the
  pass does nothing for this runner. With both, the later dry runs and the full run left every
  tracked file as the commit has it.
- Side effects of the repo's own build and tests, left as run: `yarn release:build` writes each
  package's `dist/`, and the cli's extractor tests write `actual/` folders under
  `packages/cli/test/`; all are gitignored. The `types` slot's `tsc --build` writes
  `tsconfig.tsbuildinfo` at the root, which is untracked and not ignored; the root config
  already sets `noEmit`, so nothing is emitted beside the sources.
- Run-time settings, not files: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`; `HUSKY=0`, `LEFTHOOK=0`
  and `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1` on the install and the checkride run. The shared clone's
  `core.hooksPath` stayed unset and its `.git/hooks` holds only git's samples.

## Skipped slots

Named per D56. 11 slots ran, of 20. The run took 1 minute 43 seconds, 1 minute 18 seconds of
it the `mutation` slot, on a machine under load from a second agent's suites (load average
near 45).

- `security`: skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open. It is also `pnpm audit`, which
  checkride reports unavailable under yarn.
- `pack`: checkride 0.19.0 skips it ("'pnpm pack' is unavailable under yarn").
- `build`: checkride 0.19.0 skips it ("no 'build' script in package.json"): the root has
  `release:build`, which step 5 runs by hand before the checkride run.
- `struct`, `docs`, `spell`, `prose`, `publint`, `attw`: checkride 0.19.0 skips these itself
  ("no tool detected for slot"); the repo has none of their detect files, and per the harness
  policy none was added.
- `test`: ran and passed: 88 test files and 1,388 tests, 1,386 passed and 2 skipped, none
  failed, in 19 seconds.
- `mutation`: ran and **completed**. Stryker 10.1.1 with its vitest runner instrumented 637
  mutants in the twelve files. The initial test run took 9 seconds (174 tests, the ones
  related to the mutated files) and the mutation phase 63 seconds, well inside the 20 minutes
  allowed: 437 killed, 1 timed out, 115 survived and 84 with no test reaching them, a score of
  68.76%. 47 of the 84 are all of `packages/loader/src/webpackLoader.ts`'s mutants: the
  loader's tests run it inside a webpack compile through jiti (`test/loader.cjs`), outside
  the module graph stryker's runner traces, while v8 coverage, which counts the whole process,
  has 22 of its 24 statements covered. Stryker sets no break threshold, so the slot passes.
- `types`: ran at the root `tsconfig.json` and **stays red**: 2,620 errors, the first of them
  `Cannot find module '@lingui/conf'`. The root config sets `module: commonjs`, whose default
  resolution (`node10`) does not read the packages' `exports`, while the repo type-checks each
  package on its own (`lint:types` runs every workspace's `check-types`, `tsc --noEmit`). It
  belongs to the tree.
- `lint`: ran and **stays red**: checkride runs `eslint .`, which reaches the `examples/`
  apps, which are not workspaces and are not installed: 110 of its 112 errors are
  `import/no-unresolved` there, with one more under `test/` and one under `website/`. The
  repo's own `lint:eslint` lints `./packages`, where there are none. It belongs to the tree.
- `format`: ran, as the `checkride.config.json` entry above, and **stays red**: 27 of the
  repo's own files fail `prettier --check .`: `.yarn/releases/yarn-4.14.1.cjs`, 24 Markdown
  files (19 changelogs, four READMEs and `CODE_OF_CONDUCT.md`), `tstyche.json` and
  `vercel.json`. None is a harness file. The repo's own
  `prettier:check` checks only `**/*.{ts,tsx,js,jsx}`. It belongs to the tree.
- `dead`, `dupes`, `health`: ran with fallow's defaults, and are red on the tree as a whole
  (272, 21 and 30 findings).
- `links`: ran and stays red on 364 links in `website/docs` and `website/blog`, among them the
  docs site's absolute routes (`/ref/core`, `/tutorials/javascript`), which name pages rather
  than files.
- `snippets`: ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. `smoke`: ran at the
  repo root, which is a private package with no `exports` or `main` to import. Both are left
  as run.
