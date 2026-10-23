# Corpus fixture 2

An outside project's pull request, in the tuning half of the precision corpus (D88, D127,
D128, D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `mermaid-js/mermaid` (<https://github.com/mermaid-js/mermaid>) |
| pull request | [#6995](https://github.com/mermaid-js/mermaid/pull/6995) `Deprecate flowchart-level htmlLabels config option` |
| base branch | `develop` |
| fixture commit | `19cd1ed230123ab3f5ee33760f51f26756376ed9` `Merge branch 'deprecate-flowchart.htmlLabels' of https://github.com/mermaid-js/mermaid into deprecate-flowchart.htmlLabels`: the commit a human review was submitted against |
| merge base | `66f0c6c91a6a6247f922aa04b8f0cb1551d4dae7` `Merge pull request #7296 from mermaid-js/requirement-and-ER-diagram-edge-labels` |
| size | 47 files, +378 −153; 14 TypeScript source files by `classifyFile`'s rule, 2 test files |

The TypeScript source files are all under `packages/mermaid/src/`: `assignWithDepth.ts`,
`config.ts`, `config.type.ts`, `mermaidAPI.ts`, `diagrams/class/classRenderer-v2.ts`,
`diagrams/class/shapeUtil.ts`, `diagrams/common/common.ts`, `diagrams/mindmap/svgDraw.ts`,
and six shapes under `rendering-util/rendering-elements/shapes/` (`classBox.ts`, `erBox.ts`,
`note.ts`, `rectWithTitle.ts`, `triangle.ts`, `util.ts`). The tests are
`packages/mermaid/src/config.spec.ts` and `packages/mermaid/src/mermaidAPI.spec.ts`. The other
31 files are nine plain-JavaScript renderers (six under `packages/mermaid/src/dagre-wrapper/`,
three under `packages/mermaid/src/rendering-util/rendering-elements/`), 17 generated docs
pages under `docs/`, three doc sources under `packages/mermaid/src/docs/`, the config schema
`packages/mermaid/src/schemas/config.schema.yaml` and a changeset.

The fixture commit merges the remote branch into the author's local copy of it; every commit
between the merge base and the fixture commit is in the PR's own commit list.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 10.4.1, from `packageManager` (with its sha512) and `pnpm-lock.yaml` (lockfileVersion 9.0); no `engines` |
| workspaces | `packages/*`, `packages/mermaid/src/docs`, `packages/mermaid/src/vitepress`, `tests/*`, from `pnpm-workspace.yaml` |
| test runner | vitest `^3.2.4` (the lockfile resolves 3.2.4) with `@vitest/coverage-v8` `^3.2.4`, from root `devDependencies`; `vitest.workspace.js` names the root `vite.config.ts` (jsdom environment) and `packages/mermaid/src/docs/vite.config.ts`. The root `test` script runs `pnpm lint && vitest run`, and `ci` runs `vitest run`. jest `^30.1.3` is also a root dev dependency, with no jest config in the tree; Cypress drives the e2e suite |
| node | 22.14.0, from `.node-version`; no `engines.node` |
| TypeScript files at the fixture commit | 472 |

## Generation

Step 17 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, coverage provider and lockfile stay as the commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.17.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `.node-version` says 22.14.0 and no `engines.node` constrains it, and the suite ran without environmental trouble on 24 |
| pnpm | 10.4.1 | `packageManager` (with its sha512), run through corepack; `pnpm-lock.yaml` (lockfileVersion 9.0) is honoured by `--frozen-lockfile` |
| vitest | 3.2.4 | the lockfile's, unchanged |
| `@vitest/coverage-v8` | 3.2.4 | already a dev dependency at the repo's vitest version, unchanged; the v8 provider is kept |
| typescript | 5.7.3 | the lockfile's, unchanged |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot, then removed; see "Skipped slots" |
| `@stryker-mutator/vitest-runner` | 10.0.0 | added for the `mutation` slot, then removed; see "Skipped slots" |

## The commands

```sh
# 0. The scratch clone was a blobless partial clone, and `git log --numstat` (which atis runs
#    over up to 5000 commits) failed on objects the promisor remote would not hand back. Make
#    it a full clone first, then fetch the fixture commit, the merge base and any object still
#    missing.
cd /tmp/atis-corpus/clones/mermaid-js__mermaid
rm -f .git/objects/info/commit-graph
git config --unset remote.origin.partialclonefilter
git config --unset remote.origin.promisor
git fetch --refetch --no-tags origin
git fetch --no-tags origin 19cd1ed230123ab3f5ee33760f51f26756376ed9
git fetch --no-tags origin 66f0c6c91a6a6247f922aa04b8f0cb1551d4dae7
for oid in $(git rev-list --objects --missing=print \
    19cd1ed230123ab3f5ee33760f51f26756376ed9 66f0c6c91a6a6247f922aa04b8f0cb1551d4dae7 \
    | grep '^?' | tr -d '?'); do git fetch --no-tags origin "$oid"; done

# 1. The package manager the repo pins, through corepack shims in a scratch directory ahead of
#    the machine's own pnpm (11.1.2) on PATH, so the `pnpm` its scripts call is 10.4.1 too.
mkdir -p /tmp/atis-corpus/shims
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack enable --install-directory /tmp/atis-corpus/shims pnpm
export PATH=/tmp/atis-corpus/shims:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# 2. A worktree at the fixture commit, named for the repo so meta.repo reads `mermaid`.
git -C /tmp/atis-corpus/clones/mermaid-js__mermaid worktree add \
  /tmp/atis-corpus/work/corpus-2/mermaid \
  19cd1ed230123ab3f5ee33760f51f26756376ed9 --detach

# 3. The repo's own package manager, honouring its lockfile. HUSKY=0 keeps the `prepare`
#    script (`husky && pnpm build`) from pointing the shared clone's core.hooksPath at the
#    worktree; the build half of `prepare` still runs, which writes the generated config
#    types and the parser. CYPRESS_INSTALL_BINARY=0 skips the browser-test binary, which no
#    slot uses.
cd /tmp/atis-corpus/work/corpus-2/mermaid
HUSKY=0 CYPRESS_INSTALL_BINARY=0 pnpm install --frozen-lockfile

# 4. The current harness (D58), at the workspace root. --ignore-scripts keeps the repo's
#    `prepare` from rebuilding everything a second time.
HUSKY=0 pnpm add -D -w --save-exact --ignore-scripts checkride@0.17.0 fallow@3.35.0

# 5. Harness edits (see the next section for why).
python3 - <<'PY'
p = "vite.config.ts"
s = open(p).read()
s = s.replace("""      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/vitest',""", """      reporter: ['json'],
      reportsDirectory: '.check/coverage',""")
open(p, "w").write(s)
p = "tsconfig.json"
s = open(p).read()
old = '    "noEmitOnError": false /* Disable emitting files if any type checking errors are reported. */,'
s = s.replace(old, old + '\n    "noEmit": true,')
open(p, "w").write(s)
PY
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
printf '\n.check\n' >> .prettierignore

# 6. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. Mutation is skipped; see "Skipped slots".
rm -rf .check tsconfig.tsbuildinfo
HUSKY=0 pnpm exec checkride --all --skip security,mutation

# 7. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-corpus/work/corpus-2/mermaid && pwd -P)" \
  --base 66f0c6c91a6a6247f922aa04b8f0cb1551d4dae7 \
  --out fixtures/corpus-2/map.json \
  --svg fixtures/corpus-2/atis.svg

# 8. The worktree is not kept; the clone is.
git -C /tmp/atis-corpus/clones/mermaid-js__mermaid worktree remove --force \
  /tmp/atis-corpus/work/corpus-2/mermaid
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml` — two dev dependencies added at the workspace root
  (`checkride`, `fallow`), both exact-pinned. The lockfile keeps its version 9.0 format and
  gains 58 package entries. One transitive entry moved when pnpm de-duplicated against the new
  packages: `@babel/generator` 7.28.3 to 7.28.5. Every direct dependency, vitest, vite and
  typescript stay at the versions the lockfile locked.
- `vite.config.ts` — edited: `coverage.reporter` set to `['json']` and
  `coverage.reportsDirectory` to `.check/coverage`, so the `test` slot's `--coverage` writes
  istanbul JSON to `.check/coverage/coverage-final.json`, where atis reads it. The repo's own
  `exclude` list is unchanged, and the v8 provider it already used is kept. The root
  `vitest.workspace.js` already names this config and the docs package's, so the one run
  reaches every package's tests.
- `tsconfig.json` — `"noEmit": true` added. The root config is the repo's build config
  (`declaration: true`, no `outDir`, `allowJs`), and checkride's `types` slot runs
  `tsc --build` against it, which writes `.js` and `.d.ts` files beside every source file. The
  first full run did exactly that: 1,055 untracked files appeared in the worktree, one
  tracked hand-written declaration was overwritten, and the `test` slot that ran after them
  loaded the emitted `.js` as well as the `.ts` (433 `.js` keys in the coverage file, and a
  suite of 5,268 tests where the kept run has 3,707). That run was discarded; with `noEmit` the slot only checks, and
  the worktree stays as the commit had it. The run that produced the map is the second.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself. One line, `ignoreDependencies = ["checkride"]`, keeps the harness's own install from
  showing up as an unused dev dependency.
- `.prettierignore` — `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts.
- Run-time settings, not files: the corepack shims first on `PATH`, and `HUSKY=0` at install
  time and on the checkride run, so no `prepare` script rewrites the shared clone's
  `core.hooksPath`; it stayed unset throughout. `CYPRESS_INSTALL_BINARY=0` at install time.

## Skipped slots

Named per D56. 13 slots ran.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation` — **dropped**: attempted, and it did not complete in the time allowed. Stryker
  10.0.0 with its vitest runner, scoped to the PR's 14 changed non-test TypeScript source
  files (`git diff --name-only` between the merge base and the fixture commit), instrumented
  2,795 mutants, 184 of them static (each needs the whole suite). Its initial test run
  succeeded, 3,185 tests in 2 minutes 39 seconds; the mutation phase was then given about 20
  minutes, on a machine under heavy load from a second agent's suites (load average near 90),
  and had not finished, so it was stopped. Both stryker packages and `stryker.config.json`
  were removed, so nothing of the attempt is left in the worktree, and the run used
  `--skip security,mutation`.
- `struct`, `docs`, `prose`, `publint`, `attw` — checkride 0.17.0 skips these itself ("no tool
  detected for slot"); the repo has none of their detect files, and per the harness policy
  none was added.
- `format`, `lint`, `spell` — ran as the repo has them: `.prettierrc.json`,
  `eslint.config.js` and `cspell.config.yaml` were already in the tree, and none was edited.
- `types` — ran at the root `tsconfig.json`, with `noEmit` as above.
- `snippets` — ran: an opted-in slot with nothing to check, and `--all` opts it in.
- `build`, `pack`, `smoke` — ran as checkride runs them at the repo root; the repo's build
  script and manifest are what they read.
