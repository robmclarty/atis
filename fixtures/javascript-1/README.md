# JavaScript fixture 1

An outside project's pull request in JavaScript, step 86's fixture for the language producers,
reviewed at range 24's stop; not part of a blind reading, so this README and the truth name the
repo freely. Its ground truth is in [`truth.md`](./truth.md).

## The change

| | |
| --- | --- |
| repo | `sveltejs/svelte` (<https://github.com/sveltejs/svelte>), MIT: `LICENSE.md` at the fixture commit reads "Copyright (c) 2016-2025 Svelte Contributors" |
| pull request | [#16131](https://github.com/sveltejs/svelte/pull/16131) `fix: better $inspect.trace() output` |
| base branch | `main` |
| fixture commit | `b6a4afd6b2bbefd8371196601580bee68b059177` `lint`: the commit a human review was submitted against |
| merge base | `91272d702b9cafc310a0176e1e489bb487872fd9` `feat: add source name logging to $inspect.trace (#16060)` |
| size | 7 files, +61 −91 against the merge base: 4 JavaScript source files, 1 TypeScript declaration file, 1 test sample (a `_config.js`, which atis's producer reads as a fifth JavaScript source file; see "What atis read") and 1 changeset |

The JavaScript source files are `packages/svelte/src/internal/client/dev/tracing.js`,
`packages/svelte/src/internal/client/dom/blocks/each.js`,
`packages/svelte/src/internal/client/reactivity/sources.js` and
`packages/svelte/src/internal/client/runtime.js`. The declaration file is
`packages/svelte/src/internal/client/reactivity/types.d.ts`. The test is
`packages/svelte/tests/runtime-runes/samples/inspect-trace-reassignment/_config.js`, a sample the
`runtime-runes` suite runs, and the other file is `.changeset/strong-clouds-switch.md`. The
whole PR, as merged, is 11 files and +143 −83: the three commits after the review added
`packages/svelte/tests/runtime-runes/samples/inspect-trace-each/` (a sample with three files) and
touched `packages/svelte/tests/runtime-legacy/shared.ts`.

The merge base is `git merge-base` of the fixture commit and `origin/main`, and agrees with the
compare API's `merge_base_commit`; the fixture commit is 17 commits ahead of it, all the PR
author's and all on the PR's branch. The PR has 20 commits; the fixture commit is the 17th, the
one the `CHANGES_REQUESTED` review was submitted against, and it is reachable from
`refs/pull/16131/head`. The PR squash-merged as `438349eb88335fce7f199aac0b95ef05bfb7f453`,
whose one parent is `292af8d38` (#16117), two commits past the merge base.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 10.4.0, from the root `packageManager` field; CI's `pnpm/action-setup@v4` reads it and runs `pnpm install --frozen-lockfile`. `pnpm-lock.yaml` is lockfileVersion 9.0, and `.npmrc` sets `playwright_skip_browser_download=1`, so CI installs chromium itself with `pnpm playwright install chromium` |
| workspaces | `pnpm-workspace.yaml` lists `packages/*` and `playgrounds/*`: `packages/svelte` (svelte 5.33.19, `"type": "module"`, `engines.node` `>=18`) and `playgrounds/sandbox`. The code is in `packages/svelte/src/`, with the compiler in `src/compiler/` (phases `1-parse`, `2-analyze`, `3-transform`) and the runtime in `src/internal/` (`client/`, `server/`, `shared/`, `flags/`) |
| language | JavaScript typed by JSDoc: `packages/svelte/tsconfig.json` sets `strict`, `allowJs` and `checkJs`, and the public types are hand-written `.d.ts` files. At the fixture commit the tree tracks 2,818 JavaScript files (381 outside `tests/`), 72 TypeScript files and 3,678 `.svelte` files, most of which are test inputs |
| test runner | vitest 2.1.9 with the v8 coverage provider, from root `devDependencies`. The root `vitest.config.js` sets `dir: '.'`, includes `packages/svelte/**/*.test.ts`, `packages/svelte/tests/*/test.ts` and `packages/svelte/tests/runtime-browser/test-ssr.ts`, excludes `**/samples/**`, and keeps coverage on `packages/svelte/src/**` with `reportOnFailure: true`. `@vitest/coverage-v8` is declared `^2.0.5` and the lockfile locks 2.0.5, which does not run under vitest 2.1.9 (see the harness changes). The suites are driven by sample directories, `tests/<suite>/samples/<name>/` holding a `_config.js` and its inputs; the `runtime-browser` suite drives chromium through `@playwright/test` 1.46.1. CI's test step is `pnpm test`, which is `vitest run` |
| linters | eslint 9.9.1 (`eslint.config.js`, a flat config over `@sveltejs/eslint-config` `^8.1.0`, typescript-eslint 8.26.0, `eslint-plugin-svelte`, `eslint-plugin-lube` and a local `no_compiler_imports` rule) and prettier 3.2.4 with `prettier-plugin-svelte` (`.prettierrc`, `.prettierignore`). `pnpm lint` is `eslint && prettier --check .`. There is no oxlint |
| type checking | `pnpm check` builds `packages/svelte`, then runs `pnpm -r check`, which for `packages/svelte` is `tsc` on `tsconfig.runtime.json` and on `tsconfig.json`, then on `tests/types`. The root has no `tsconfig.json`, so checkride's `types` slot finds nothing to run |
| node | CI's test job runs 18 (Windows, macOS, Linux), 20, 22 and 24 (Linux); its lint job runs 18. The machine's node is 24.15.0 |

## Generation

Step 86 generated `map.json` and `atis.svg` here on 2026-10-28 by the D58 worktree procedure, from
a full clone of `sveltejs/svelte` and a detached worktree at the fixture commit, with the repo's
own pnpm, lockfile and CI install steps and the current harness (checkride 0.19.1, fallow
3.37.0). Stryker's vitest runner was tried on its own first, in a second worktree, and finished
in 18 minutes 23 seconds, inside the 20 minutes allowed, so the `mutation` slot is kept. Two
runs were stopped and discarded before the one the map reads, each for a fault of the harness's
(see "Harness changes in the worktree"). The run the map reads took 19 minutes 59 seconds, 19
minutes 3 seconds of it the `mutation` slot, and atis's run on it took 7 minutes 36 seconds.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current checkride.
The repo's own runner, package manager, linters and lockfile stay as the commit had them, save
the one coverage package named below.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.19.1 | installed into the worktree; the commit pinned none. Released 2026-10-28, the day of the run; pnpm 10.4.0 has no release-age gate and the repo sets none, so it installed as is and no override was needed |
| fallow | 3.37.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `engines.node` is `>=18` and CI's matrix reaches 24 |
| pnpm | 10.4.0 | the root `packageManager` field, run by corepack, which downloads and uses it; no wrapper was needed |
| vitest | 2.1.9 | the lockfile's, unchanged |
| `@vitest/coverage-v8` | 2.1.9 | raised from the lockfile's 2.0.5, the one tree dependency the harness moved (see the harness changes); the declared range `^2.0.5` already admits it |
| eslint | 9.9.1 | the lockfile's, unchanged |
| prettier | 3.2.4 | the lockfile's, unchanged |
| typescript | 5.5.4 | the lockfile's, unchanged; no check runs it, since the root has no tsconfig |
| playwright | 1.46.1 | the lockfile's, unchanged; its chromium (build 1129) was installed with `pnpm playwright install chromium`, as CI does, into the shared playwright cache |
| `@stryker-mutator/core` | 10.1.1 | added for the `mutation` slot, and kept |
| `@stryker-mutator/vitest-runner` | 10.1.1 | added for the `mutation` slot, and kept; its peer range (`vitest >=2.0.0`) admits 2.1.9 |

checkride records each tool's version as the check's `tool_version` in `.check/summary.json`, and
every one above that runs a slot matches it: prettier 3.2.4, eslint 9.9.1, fallow 3.37.0, vitest
2.1.9 and stryker 10.1.1.

## The commands

```sh
# 0. A full clone, not a blobless one. The fixture commit is on the PR's branch, not on main,
#    so it is fetched from the PR's head ref.
git clone https://github.com/sveltejs/svelte.git /tmp/atis-languages/clones/sveltejs__svelte
git -C /tmp/atis-languages/clones/sveltejs__svelte fetch origin pull/16131/head

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `svelte`.
git -C /tmp/atis-languages/clones/sveltejs__svelte worktree add \
  /tmp/atis-languages/work/javascript-1/svelte \
  b6a4afd6b2bbefd8371196601580bee68b059177 --detach

# 2. The environment. corepack reads the `packageManager` field and runs pnpm 10.4.0, so no
#    wrapper is needed. The hook switches keep any installer off git hooks.
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 HUSKY=0 LEFTHOOK=0 SKIP_INSTALL_SIMPLE_GIT_HOOKS=1

# 3. The repo's own install, as CI runs it: the frozen lockfile (without scripts, as the harness
#    always installs) and chromium for the runtime-browser suite. Then `pnpm build`, which CI's
#    lint job does through `pnpm check` before `pnpm lint`: eslint's svelte parser needs
#    packages/svelte/compiler/index.js, a build output that git ignores.
cd /tmp/atis-languages/work/javascript-1/svelte
pnpm install --frozen-lockfile --ignore-scripts
pnpm playwright install chromium
pnpm build

# 4. The current harness (D58) at the workspace root, exact-pinned and without scripts. `-w`
#    because the root is a workspace. The third line raises the coverage provider to the
#    version that runs under the vitest the lockfile locks.
pnpm add -D -w --save-exact --ignore-scripts checkride@0.19.1 fallow@3.37.0
pnpm add -D -w --save-exact --ignore-scripts @vitest/coverage-v8@2.1.9

# 5. Harness edits (see the next section for why).
python3 - <<'PY'
p = "vitest.config.js"
s = open(p).read()
old = ("\t\t\treporter: ['lcov', 'html'],\n"
       "\t\t\tinclude: ['packages/svelte/src/**'],\n"
       "\t\t\treportsDirectory: 'sites/svelte-5-preview/static/coverage',\n")
new = ("\t\t\treporter: ['json'],\n"
       "\t\t\tinclude: ['packages/svelte/src/**'],\n"
       "\t\t\treportsDirectory: '.check/coverage',\n")
assert old in s
open(p, "w").write(s.replace(old, new))
PY
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dev dependency.
ignoreDependencies = ["checkride"]
CONFIG
printf '.check\n' >> .prettierignore

# 6. The mutation attempt, on its own and first, in a second worktree so the first tree stays
#    as the run reads it. Stryker 10.1.1 with its vitest runner, scoped to the PR's four
#    changed JavaScript source files. It instrumented 1,476 mutants, ran its initial 5,293
#    tests in 29 seconds and finished in 18 minutes 23 seconds, inside the 20 minutes
#    allowed, so the slot is kept.
git -C /tmp/atis-languages/clones/sveltejs__svelte worktree add \
  /tmp/atis-languages/work/javascript-1/svelte-mutation-attempt \
  b6a4afd6b2bbefd8371196601580bee68b059177 --detach
cd /tmp/atis-languages/work/javascript-1/svelte-mutation-attempt
pnpm install --frozen-lockfile --ignore-scripts
pnpm add -D -w --save-exact --ignore-scripts \
  @stryker-mutator/core@10.1.1 @stryker-mutator/vitest-runner@10.1.1
cat > stryker.conf.json <<'CONFIG'
{
  "packageManager": "pnpm",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": {
    "fileName": ".check/mutation.json"
  },
  "mutate": [
    "packages/svelte/src/internal/client/dev/tracing.js",
    "packages/svelte/src/internal/client/dom/blocks/each.js",
    "packages/svelte/src/internal/client/reactivity/sources.js",
    "packages/svelte/src/internal/client/runtime.js"
  ],
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true,
  "disableTypeChecks": false
}
CONFIG
timeout 1200 node_modules/.bin/stryker run

# 7. The same packages and config into the first worktree, and the config through the repo's
#    own prettier so the `format` slot passes it.
cd /tmp/atis-languages/work/javascript-1/svelte
pnpm add -D -w --save-exact --ignore-scripts \
  @stryker-mutator/core@10.1.1 @stryker-mutator/vitest-runner@10.1.1
cp ../svelte-mutation-attempt/stryker.conf.json .
node_modules/.bin/prettier --write stryker.conf.json

# 8. The .check/ atis reads for evidence, from a clean state. Run the installed binary, never
#    the repo's own `test` script.
rm -rf .check .stryker-tmp
node_modules/.bin/checkride --all --skip security
cp .check/summary.json /tmp/atis-languages/work/javascript-1.summary.json

# 9. The map and the still render, from atis's built CLI. --repo takes the resolved path, not
#    the /tmp symlink: on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys
#    will not relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-languages/work/javascript-1/svelte && pwd -P)" \
  --base 91272d702b9cafc310a0176e1e489bb487872fd9 \
  --out fixtures/javascript-1/map.json \
  --svg fixtures/javascript-1/atis.svg

# 10. Inspect the map.
node /tmp/atis-languages/tools/summarize.cjs fixtures/javascript-1/map.json --cells

# 11. The worktrees are not kept; the clone is.
git -C /tmp/atis-languages/clones/sveltejs__svelte worktree remove --force \
  /tmp/atis-languages/work/javascript-1/svelte
git -C /tmp/atis-languages/clones/sveltejs__svelte worktree remove --force \
  /tmp/atis-languages/work/javascript-1/svelte-mutation-attempt
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml`: four dev dependencies added at the workspace root
  (`checkride`, `fallow`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`), all
  exact-pinned, and one moved: `@vitest/coverage-v8`, declared `^2.0.5`, now resolves to 2.1.9
  and pnpm wrote the range `^2.1.9`. The lockfile keeps its version 9.0 format. It grows from 518
  package entries to 706: 190 added, and two dropped, the old `@vitest/coverage-v8@2.0.5` and
  the `magicast@0.3.4` only it used. No other entry is dropped or moved to another version.
  `pnpm-workspace.yaml` is unchanged.
- Why `@vitest/coverage-v8` moved: the lockfile pairs vitest 2.1.9 with coverage-v8 2.0.5 (pnpm
  warns "unmet peer vitest@2.0.5: found 2.1.9" on a plain install), and with `--coverage` on, as
  checkride runs vitest, that pair dies in `V8CoverageProvider.initialize` with
  `TypeError: this.resolveReporters is not a function`. The repo's own `pnpm test` runs without
  coverage and never meets it. The first full run's `test` slot failed that way in under a
  second, so that run was discarded.
- `vitest.config.js`: edited in place, two values of the repo's own `coverage` block changed and
  nothing added or removed. `reporter` went from `['lcov', 'html']` to `['json']` and
  `reportsDirectory` from `sites/svelte-5-preview/static/coverage` to `.check/coverage`, so the
  `test` slot writes istanbul JSON to `.check/coverage/coverage-final.json`, where atis reads it.
  The `v8` provider, the `include` of `packages/svelte/src/**` and `reportOnFailure: true` were
  the repo's own already. `enabled` is not set, because checkride passes `--coverage` itself. The
  repo keeps its vitest config at the root, which checkride detects, so it is edited rather than
  shadowed.
- `fallow.toml`: created with fallow's defaults and no entry points, since fallow finds them
  itself, so `dead`, `dupes` and `health` run. One line, `ignoreDependencies = ["checkride"]`,
  keeps the harness's own install from showing up as an unused dev dependency. fallow did not
  report `fallow` or the two stryker packages as unused, so they are not listed.
- `.prettierignore`: `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts.
- `stryker.conf.json`: created, as in step 6 and 7. Its `mutate` list is the PR's four changed
  JavaScript source files, and its JSON reporter writes `.check/mutation.json`, the file atis
  reads. `disableTypeChecks` is `false`: with Stryker's default, its preprocessor rewrites the
  test samples' `.svelte` inputs to disable type checking, and the initial test run then failed
  on `head-svelte-components-raw-content` (the same test passes in the plain tree). The file was
  passed through the repo's prettier, because the second run, with the file as first written,
  had the `format` slot report it (the one red it added), so that run was discarded.
- `pnpm build` before the run (not a file change): `packages/svelte/compiler/index.js` is a
  build output that git ignores, and eslint's svelte parser requires it, so without the build
  the `lint` slot crashed with `Cannot find module .../svelte/compiler/index.js` (the first
  full run). CI's lint job builds first, through `pnpm check`. The build changes no tracked
  file, and checkride's own `build` slot then repeats it.
- No tsconfig was added: the root has none, so the `types` slot stays unavailable, as the repo's
  own checkride run would find it. No test was edited, skipped or deleted, and no timeout was
  raised.
- Run-time settings, not files: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, and `HUSKY=0`,
  `LEFTHOOK=0` and `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1` throughout. The repo carries no git hooks
  of its own at this commit.

## Skipped slots

Named per D56. 12 slots ran, of 20.

- `security`: skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation`: **not** skipped. Stryker 10.1.1 with its vitest runner, scoped to the PR's four
  changed JavaScript source files, instrumented 1,476 mutants (`tracing.js` 138, `each.js` 383,
  `sources.js` 179, `runtime.js` 776). The attempt on its own ran its initial test run of 5,293
  tests in 29 seconds and finished in 18 minutes 23 seconds, scoring 83.54%. In the full run
  the slot took 19 minutes 3 seconds and scored 80.42%: 1,141 killed, 46 timed out, 242
  survived, 47 with no coverage, no errors. The attempt's counts were 98 timed out and 196
  survived: mutants near the timeout moved between the two, since a timeout depends on the
  machine's load.
- `types`, `struct`, `docs`, `spell`, `prose`, `publint`, `attw`: checkride 0.19.1 skips these
  itself ("no tool detected for slot"); the repo has none of their detect files, and per the
  harness policy none was added. For `types`, checkride adds that four nested `tsconfig.json`
  files go unchecked (`benchmarking/tsconfig.json` and three more).
- `format`, `lint`, `test`, `build`: ran and passed. `format` is prettier 3.2.4 over the whole
  tree. `lint` is eslint 9.9.1 over 350 files with 0 errors and 0 warnings. `test` is vitest
  2.1.9 over 25 test files: 6,102 tests, 6,082 passed, 20 skipped by the repo, none failed, and
  `coverage-final.json` names 342 files, every one under `packages/svelte/src/`. `build` is the
  root `pnpm build`, 14 seconds.
- `dead`, `dupes`, `health`: ran with fallow's defaults, and are red on the tree as a whole.
  `dead` reports 4,057 findings: 3,865 unused files (3,855 are the `.svelte` and `.css` inputs
  under `tests/`, and 10 are scripts, templates and `debug.js`), 84 unresolved imports, 55 unused
  class members, 36 circular dependencies and 8 unused exports among them; `dupes` reports 657
  clone groups, 18.4% of the lines; `health` reports 212 functions over its thresholds.
- `links`: ran and **stayed red**: 172 relative link targets in `documentation/docs/` do not
  exist on disk (for example `../kit` and `/tutorial`, which are routes on the project's
  website). It belongs to the tree.
- `snippets`: ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
- `smoke`: ran and **stayed red**: "no `exports` subpaths or `main` to import": the root package
  is a private monorepo root, and the package that publishes is `packages/svelte`.
- `pack`: ran and **stayed red**: the dry-run tarball of the private root package, which has no
  `files` field, holds 544 paths the check forbids: 425 under `packages/` (its `src/` folders,
  `.ts` files and `scripts/`), 98 under `documentation/docs/`, 4 under `playgrounds/` and 17
  `.check/` files the run wrote itself. The 527 others belong to the tree.

## What atis read

**Cells.** 2,417 cells: 2,396 directory, 9 folder, 3 package and 9 single-file. The cells that
are the source's own modules number 40:

- the 3 packages, `.`, `packages/svelte` and `playgrounds/sandbox`;
- 9 folder cells, `packages/svelte/src/animate`, `attachments`, `compiler` (233 files),
  `easing`, `events`, `internal` (96 files), `motion`, `server` and `transition`, each a
  directory tree read as one cell, with the barrel the folder names;
- 9 single-file cells at the root of `packages/svelte/src/`: `ambient.d.ts`, `constants.js`,
  `escaping.js`, `html-tree-validation.js`, `index-client.js`, `index-server.js`, `index.d.ts`,
  `utils.js` and `version.js`;
- 19 directory cells: `benchmarking` and five below it, `packages/svelte` and
  `packages/svelte/types`, `packages/svelte/scripts` and two below it,
  `packages/svelte/src/action`, `legacy`, `reactivity`, `reactivity/window`, `store` and
  `store/shared`, and `playgrounds/sandbox` with its `scripts/`.

The other 2,377 cells are directories under `packages/svelte/tests/`, and they are not the
language's modules: 2,376 are the suites' sample directories (`runtime-legacy` 1,194,
`runtime-runes` 622, `compiler-errors` 141, `css` 91, `runtime-browser` 62, `hydration` 61,
`snapshot` 56, `server-side-rendering` 44, and ten more suites below 30), and one is
`packages/svelte/tests` itself. **This is an atis gap, recorded and not fixed here.** The
TypeScript producer's test rule (`TEST_DIR` in `apps/atis/src/sources/imports.ts`) is
`/(?:^|\/)(?:__tests__|test)\//`, a folder named `__tests__` or `test`, and a test file name
needs `.test.` or `.spec.`; svelte's folder is `tests/` and its suites are `tests/<suite>/test.ts`
and `_config.js`, so neither matches. The result is 2,465 of the 2,879 organelles (2,301 of them
`_config.js`, 17 `test.ts`) read as source terrain, not as tests, and only the 7 `*.test.ts`
files beside the source reach the shore's `tests` group. The 414 organelles outside `tests/`
are the repo's source: 377 JavaScript files and 37 `.d.ts` declaration files.

The gap shows in the weather. The `runtime.js` notice counts 2,092 cells reached, and 2,089 of
the 2,203 entries in `weather.reach` are paths under `tests/`; the one changed test sample,
`.../inspect-trace-reassignment/_config.js`, is listed under `weather.evidence.unmeasured` as a
source file no coverage report names; and `weather.evidence.stitches` is empty, since none of
the 7 files atis calls tests imports a changed file. It also costs: atis's run took 7 minutes
36 seconds, and `map.json` is 17.7 MB and `atis.svg` 4.9 MB, where the largest map before it is
9.1 MB (`corpus-5`). During that run git warned that "exhaustive rename detection was skipped due
to too many files" and asked for a `diff.renameLimit` of at least 2403; the run finished and the
map shows no sign of it.

**Tests and manifests on the shore.** `tests` holds 7 files, all `*.test.ts` beside the source:
`src/internal/client/proxy.test.ts`, `src/internal/shared/clone.test.ts` and
`src/reactivity/{date,map,set,url-search-params,url}.test.ts`. The manifests are in `deps` (6):
`package.json`, `packages/svelte/package.json`, `packages/svelte/compiler/package.json`,
`playgrounds/sandbox/package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml`. `config` (14)
holds the four JavaScript tool configs, `eslint.config.js`, `vitest.config.js`,
`packages/svelte/rollup.config.js` and `playgrounds/sandbox/vite.config.js`, with six
tsconfigs, `knip.json`, `.changeset/config.json`, `.prettierrc` and `.prettierignore`. The
`.svelte` files are not JavaScript and no producer claims them: 3,676 sit in `other` with 423
`.json` files (`FUNDING.json` and 422 test expectations; 4,099 files, 4,098 of them under
`packages/svelte/tests/`), one in `scripts` and one in `data`.

**Entry points.** `meta.instruments.entry_points` is `"fallow"`: fallow lists 2,517 entry points,
27 from `package.json` exports and main, 14 from its scripts, 26 from vitest, one each from
eslint, rollup and vite, and 2,447 from its playwright plugin, every one of them a file under
`packages/svelte/tests/` (2,301 are `_config.js`). 2,836 of the 2,879 organelles are reachable
from them and 43 are not, all of the 43 outside `tests/`.

**Evidence.** `meta.instruments`, verbatim:

```json
{
  "mode": "check",
  "entry_points": "fallow",
  "fallow_schemas": { "health": 12, "dead": 10, "dupes": 10 },
  "muted": [ "lint: atis has no parser for eslint" ],
  "structure": { "base": { "fallow": "3.37.0" }, "head": { "fallow": "3.37.0" } }
}
```

There is no `unread` line and no coverage reason, so the coverage report was read. As D176 and
D184 settle for a JavaScript repo, the evidence is the ts pack's:

- `test` ran and passed; coverage is read from `.check/coverage/coverage-final.json`. Patch
  coverage names the four source files: `tracing.js` 16 of 16 changed executable lines covered,
  `sources.js` 5 of 5, `runtime.js` 15 of 15, and `each.js` 0 of 0, since the PR only deletes
  lines there.
- `mutation` ran and passed; 18 mutants survive on changed lines: six in `tracing.js` (lines 58
  to 66) and twelve in `runtime.js` (lines 447 to 451 and 771 to 786). The `runtime.js` lines
  771 to 786 are the `TracedAt` block of `get` that the reviewer's concern touches.
- `lint` ran and passed but is muted: eslint is an adapter atis has no parser for, so the
  channel is named in `muted` and read as no evidence, never as clean (C2).
- `dead`, `dupes` and `health` were read through fallow's schemas 10, 10 and 12. Core's split
  of each red slot puts only one finding on the change: `health`'s, on `runtime.js`, a function
  over its threshold that is worse than at the base. The rest is standing state, though `dead`
  names three of the changed files (`tracing.js`, `sources.js`, `runtime.js`) among its 37 and
  `health` all four among its 127; `dupes` names 921 files, none of the four.
- Slot status, as `weather.checks` has it (category IFR, 12 checks run): `build`, `format`,
  `lint`, `mutation` and `test` ok; `dead`, `dupes`, `health`, `links`, `pack`, `smoke` and
  `snippets` not ok; `types`, `struct`, `docs`, `spell`, `prose`, `publint`, `attw` and
  `security` skipped.

**Notices.** Six, ranked:

1. `interface-change` on `runtime.js`, primary: "the interface of `packages/svelte/src/internal`
   changed (`set_captured_signals` removed) and 85 files read it and `svelte` publishes
   `deep_read`, `deep_read_state`, `exclude_from_object` and 6 more". One name removed, none
   added, none reshaped, 29 uncompared, as D184 has it for JavaScript.
2. `survived-mutants` on `runtime.js`, secondary: "12 mutants survived on the changed lines".
3. `interface-uncompared` on `each.js`, secondary: its four names' shapes "could not be
   compared".
4. `threshold-breached` on `runtime.js`, tertiary: "cognitive, crap, cyclomatic over threshold
   in a function worse than at the base".
5. `interface-uncompared` on `sources.js`, tertiary: eleven names.
6. `interface-uncompared` on `tracing.js`, tertiary: six names.

**Verdict on the read.** The JavaScript files are the cells' organelles, their shapes read
uncompared, and the notices weigh names added and removed, never reshaped: D184 holds. The
evidence reads as D176 settles for the ts pack, with `lint` muted by name, not silently. What
does not hold is the cells: the source's 40 cells are the language's modules, but 2,377 more are
test-sample directories that atis should have read as tests (the gap above), which makes the
map a poor picture of this PR and inflates reach to 2,092 cells.
