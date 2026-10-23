# Corpus fixture 10

An outside project's pull request, in the held-out half of the precision corpus (D88, D128,
D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `excalidraw/excalidraw` (<https://github.com/excalidraw/excalidraw>) |
| pull request | [#10964](https://github.com/excalidraw/excalidraw/pull/10964) `fix(editor): Lost focus point on transition to inside-inside` |
| base branch | `master` |
| fixture commit | `87a99e6309a45a31f48cd94ef38db5260c2d1770` `fix: Use the other start point`: the commit a human review was submitted against |
| merge base | `e9c856d262a14c12bd0bdc3f4ac55c7a86a71577` `chore(editor): streamline getSelectedElementsByGroup (#11636)` |
| size | 5 files, +127 −57; 4 TypeScript source files by `classifyFile`'s rule, no test files |

The TypeScript source files are three in `packages/element/src/`, `arrows/focus.ts`,
`binding.ts` and `linearElementEditor.ts`, and `packages/excalidraw/components/App.tsx`. The
fifth file is a snapshot the PR updated,
`packages/excalidraw/tests/__snapshots__/regressionTests.test.tsx.snap`.

The merge base is `git merge-base` of the fixture commit and `origin/master`, and agrees with
the compare API's `merge_base_commit`; the fixture commit is three commits ahead of it, all on
the PR's branch.

## The ecosystem

| | |
| --- | --- |
| package manager | yarn classic 1.22.22, from `packageManager` and `yarn.lock` (yarn lockfile v1) |
| workspaces | `excalidraw-app`, `packages/*`, `examples/*`, from the root `workspaces` field |
| test runner | vitest `3.0.6` (the lockfile resolves 3.0.6) with `@vitest/coverage-v8` `3.0.7` (3.0.7) and `vitest-canvas-mock`, from root `devDependencies`; the root `vitest.config.mts` (jsdom, setup in `setupTests.ts`, coverage thresholds) aliases every `@excalidraw/*` package to its source. The `test` script runs `yarn test:app`, which is `vitest`, and `test:coverage` runs `vitest --coverage` |
| node | `>=18.0.0`, from `engines.node`; no `.nvmrc` or `.node-version`; CI runs on node `20.x` |
| TypeScript files at the fixture commit | 616 |

## Generation

Step 19 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, coverage provider, lockfile and package manager stay as the
commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.17.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `engines.node` is `>=18.0.0`, which admits it, and CI at the commit runs node 20. The suite passed on 24, so no older node was installed |
| yarn | 1.22.22 | `packageManager`; the machine's yarn classic is the same version, so no corepack shim was used. `yarn.lock` (yarn lockfile v1) is honoured by `--frozen-lockfile` |
| vitest | 3.0.6 | the lockfile's, unchanged |
| `@vitest/coverage-v8` | 3.0.7 | already a root dev dependency, unchanged (a different patch from vitest's); the v8 provider is kept |
| typescript | 5.9.3 | the lockfile's, unchanged |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot, then removed; see "Skipped slots" |
| `@stryker-mutator/vitest-runner` | 10.0.0 | added for the `mutation` slot, then removed; its peer range (`vitest >=2.0.0`) admits 3.0.6; see "Skipped slots" |

## The commands

```sh
# 0. The scratch clone is a full clone, made ahead of time (not the blobless partial clone the
#    tuning half started from), and already holds the fixture commit and the merge base.
cd /tmp/atis-heldout/clones/excalidraw__excalidraw
git cat-file -t 87a99e6309a45a31f48cd94ef38db5260c2d1770
git cat-file -t e9c856d262a14c12bd0bdc3f4ac55c7a86a71577

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `excalidraw`.
git -C /tmp/atis-heldout/clones/excalidraw__excalidraw worktree add \
  /tmp/atis-heldout/work/corpus-10/excalidraw \
  87a99e6309a45a31f48cd94ef38db5260c2d1770 --detach

# 2. The repo's own package manager, honouring its lockfile (`--frozen-lockfile` worked).
#    HUSKY=0 is set, but the repo's husky is 7.0.4, whose `husky install` (the `prepare`
#    script) does not read it: see "Harness changes in the worktree".
cd /tmp/atis-heldout/work/corpus-10/excalidraw
HUSKY=0 yarn install --frozen-lockfile

# 3. The current harness (D58), plus stryker for the mutation slot, at the workspace root.
#    --ignore-scripts keeps `prepare` from running a second time.
HUSKY=0 yarn add -D -W --exact --ignore-scripts \
  checkride@0.17.0 fallow@3.35.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/vitest-runner@10.0.0

# 4. Harness edits (see the next section for why).
python3 - <<'PY'
p = "vitest.config.mts"
s = open(p).read()
old = '''      reporter: ["text", "json-summary", "json", "html", "lcovonly"],
'''
new = '''      reporter: ["json"],
      reportsDirectory: ".check/coverage",
      reportOnFailure: true,
'''
s = s.replace(old, new)
open(p, "w").write(s)
PY
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
printf '.check\n' >> .eslintignore

# 5. The mutation attempt, run on its own first (see "Skipped slots"). The config below is
#    what the attempt used, formatted with the repo's own prettier; it was stopped after about
#    21 minutes of the mutation phase, and the packages and the file were removed.
cat > stryker.config.json <<'CONFIG'
{
  "packageManager": "yarn",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": [
    "packages/element/src/arrows/focus.ts",
    "packages/element/src/binding.ts",
    "packages/element/src/linearElementEditor.ts",
    "packages/excalidraw/components/App.tsx"
  ],
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG
node_modules/.bin/prettier --write stryker.config.json
HUSKY=0 node_modules/.bin/stryker run    # stopped; not complete
rm -rf .stryker-tmp stryker.config.json
HUSKY=0 yarn remove -W --ignore-scripts @stryker-mutator/core @stryker-mutator/vitest-runner

# 6. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. YARN_SILENT=1 keeps yarn classic's banner off stdout, ahead of fallow's
#    JSON. Mutation is skipped; see "Skipped slots".
rm -rf .check tsconfig.tsbuildinfo
HUSKY=0 YARN_SILENT=1 node_modules/.bin/checkride --all --skip security,mutation

# 7. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-heldout/work/corpus-10/excalidraw && pwd -P)" \
  --base e9c856d262a14c12bd0bdc3f4ac55c7a86a71577 \
  --out fixtures/corpus-10/map.json \
  --svg fixtures/corpus-10/atis.svg

# 8. The worktree is not kept; the clone is.
git -C /tmp/atis-heldout/clones/excalidraw__excalidraw worktree remove --force \
  /tmp/atis-heldout/work/corpus-10/excalidraw
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `yarn.lock` — two dev dependencies added at the workspace root
  (`checkride`, `fallow`), both exact-pinned. The lockfile keeps its v1 format and gains 33
  resolved specs; no line of it is removed and no locked version moves. vitest, its coverage
  provider, typescript and every other direct dependency stay at the versions the lockfile
  locked. (With the two stryker packages in, five existing entries had a new range merged into
  their key line; removing the packages put those back.)
- `vitest.config.mts` — edited in place: `coverage.reporter` set to `["json"]`,
  `coverage.reportsDirectory` to `.check/coverage`, and `coverage.reportOnFailure` to `true`
  (vitest writes no coverage when a test fails by default, and the file must land either way),
  so the `test` slot's `--coverage` writes istanbul JSON to `.check/coverage/coverage-final.json`,
  where atis reads it. The repo already keeps its vitest config at the root, which checkride
  detects, so it is edited rather than shadowed. The v8 provider, `ignoreEmptyLines`, the
  coverage thresholds and everything else are unchanged; the thresholds were met.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself, so `dead`, `dupes` and `health` run. One line, `ignoreDependencies = ["checkride"]`,
  keeps the harness's own install from showing up as an unused dev dependency. The stryker
  packages were removed, so they needed no entry.
- `.eslintignore` — `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts. It is `.eslintignore`, not `.prettierignore`: checkride runs
  `yarn prettier --check .`, and the repo's `prettier` script passes
  `--ignore-path=.eslintignore`, which replaces the default `.prettierignore` (empty in the
  repo). A full run with `.prettierignore` edited instead reported the three fallow JSON files
  as unformatted.
- Run-time settings, not files: `HUSKY=0` on the install and on the checkride run, and
  `YARN_SILENT=1` on the checkride run. yarn classic prints a `yarn run v1.22.22` line and the
  command line on stdout ahead of the tool's own output, so fallow's JSON was not valid JSON
  and checkride reported `dead`, `dupes` and `health` as "fallow did not emit valid JSON"; the
  first full run did that and was discarded. The second full run, with `YARN_SILENT=1` but the
  `.check` ignore on `.prettierignore`, was discarded for the formatting reason above. The run
  that produced the map is the third.
- Not a file in the worktree: the repo's husky is 7.0.4, whose `husky install` (the root
  `prepare` script) ignores `HUSKY=0`, so the install set `core.hooksPath` to `.husky` in the
  shared clone's git config. The command to unset it was refused by the session's permission
  check, so the setting stays in that scratch clone. No hook ran: nothing was committed there.
  The tuning half's note that `core.hooksPath` stayed unset does not hold for this fixture.
- No test was edited, skipped or deleted, and no timeout was raised: the suite passed (108 test
  files; 1,501 tests passed, 47 skipped, 1 todo) in about 65 seconds on a machine under load.

## Skipped slots

Named per D56. 11 slots ran, of 20.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open. It is also `pnpm audit`, which
  checkride reports unavailable under yarn.
- `mutation` — **dropped**: attempted, and it did not complete in the time allowed. Stryker
  10.0.0 with its vitest runner, scoped to the PR's four changed non-test TypeScript source
  files (`git diff --name-only` between the merge base and the fixture commit), instrumented
  12,484 mutants. Its initial test run succeeded, 1,184 tests in 2 minutes 48 seconds; the
  mutation phase was then given about 21 minutes, on a machine under heavy load (load average
  near 40, from a second agent's suites), and had not finished, so it was stopped. Both stryker
  packages and `stryker.config.json` were removed, so nothing of the attempt is left in the
  worktree, and the run used `--skip security,mutation`.
- `struct`, `docs`, `spell`, `prose`, `publint`, `attw` — checkride 0.17.0 skips these itself
  ("no tool detected for slot"); the repo has none of their detect files, and per the harness
  policy none was added.
- `pack` — checkride 0.17.0 skips it ("`pnpm pack` is unavailable under yarn").
- `types`, `lint`, `test`, `build` — ran, and passed: `tsconfig.json`, `.eslintrc.json` and
  `vitest.config.mts` were already in the tree (the last edited as above), and `build` ran the
  root `build` script.
- `dead`, `dupes`, `health` — ran, and are red because fallow reports findings (408, 114 and
  315); they are the instruments atis reads, left as run.
- `format` — ran, as the repo has it, and stays red: 26 of the repo's own files (twenty
  `dev-docs` pages, `.lintstagedrc.js` and five TypeScript files) fail `prettier --check .`.
  None is a harness file.
- `links` — ran, as the repo has it, and stays red on relative links in the repo's own
  Markdown that do not resolve.
- `snippets` — ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
- `smoke` — ran at the repo root, which is a private package with no `exports` or `main` to
  import. It is left as run.
