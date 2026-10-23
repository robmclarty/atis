# Corpus fixture 12

An outside project's pull request, in the held-out half of the precision corpus (D88, D128,
D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `logaretm/vee-validate` (<https://github.com/logaretm/vee-validate>) |
| pull request | [#4754](https://github.com/logaretm/vee-validate/pull/4754) `fix: ensure transformed values in field-level schemas are used on submit` |
| base branch | `main` |
| fixture commit | `61298cf2f415dc0a077f6181660c88fa5d9cfa4f` `fix: ensure transformed values in field-level schemas are used on submit`: the commit a human review was submitted against |
| merge base | `cd2e4c5dd2e3b54bac7ea714af7e02b27076dbd5` `docs: fix zod i18n reference closes #4708` |
| size | 9 files, +199 −82; 5 TypeScript source files by `classifyFile`'s rule, 3 test files |

The TypeScript source files are all in `packages/vee-validate/src/`: `types/forms.ts`,
`useFieldState.ts`, `useForm.ts`, `useValidateField.ts` and `validate.ts`. The tests are
`packages/vee-validate/tests/useForm.spec.ts`, `packages/yup/tests/yup.spec.ts` and
`packages/zod/tests/zod.spec.ts`. The ninth file, `packages/rules/src/toTypedSchema.ts`, is
TypeScript that the rule sends to the shore: the default `config` row's `rules/**` pattern is
not anchored, so it takes the sources of the repo's `packages/rules` package too.

The fixture commit is not on the PR's final branch, which was later rebased and force-pushed,
so it is fetched by SHA (`git fetch origin 61298cf2f415dc0a077f6181660c88fa5d9cfa4f`); GitHub
still serves it, and the clone keeps it under a local branch, `atis-fixture`. The merge base is
`git merge-base` of the fixture commit and `origin/main`, and agrees with the compare API's
`merge_base_commit`; the fixture commit is one commit ahead of it.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 9.1.0, from `packageManager` and `pnpm-lock.yaml` (lockfileVersion 9.0); the root `postinstall` runs `husky install` |
| workspaces | `packages/**`, `docs`, `!**/tests/**`, from `pnpm-workspace.yaml` |
| test runner | vitest `^1.6.0` (the lockfile resolves 1.6.0) with `@vitest/coverage-v8` `^1.6.0` (1.6.0), from root `devDependencies`; the root `vitest.config.ts` (jsdom, setup in `vitest.setup.ts`, `vite-tsconfig-paths`) resolves the packages' `@/…` imports to their `src` through `tsconfig.json`'s `paths`, so the suite runs without a build. The `test` script runs `vitest`, and `cover` runs `vitest run --coverage`; CircleCI builds before it runs `cover` |
| node | no `engines.node`, `.nvmrc` or `.node-version`; CircleCI runs on the `cimg/node:19.7` image |
| TypeScript files at the fixture commit | 171 |

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
| node | 24.15.0 | the machine's, for the install, the tests and checkride itself; the repo sets no `engines.node` and CircleCI at the commit runs node 19.7, which is not installed. The suite passed on 24. The one exception is the pre-build step, run under node 20.18.2 (see the commands) |
| node (build step only) | 20.18.2 | the closest the machine has to 19.7 (`/usr/local/n/versions/node/20.18.2`); the repo's build script uses JSON import assertions, which node 22 and later reject |
| pnpm | 9.1.0 | `packageManager`, run through corepack shims in a scratch directory ahead of the machine's own pnpm (11.28.5) on `PATH`, so the `pnpm` its scripts call is 9.1.0 too; `pnpm-lock.yaml` (lockfileVersion 9.0) is honoured by `--frozen-lockfile` |
| vitest | 1.6.0 | the lockfile's, unchanged |
| `@vitest/coverage-v8` | 1.6.0 | already a root dev dependency at the repo's vitest version, unchanged; the v8 provider is kept |
| typescript | 5.3.3 | the lockfile's, unchanged |
| `@stryker-mutator/core` | not installed | see "Skipped slots": the runner plugin's peer range excludes vitest 1.6.0 |
| `@stryker-mutator/vitest-runner` | 10.0.0 (not installed) | its peer range is `vitest >=2.0.0`, which does not admit the repo's 1.6.0; the repo's runner is not upgraded, so the `mutation` slot is dropped |

## The commands

```sh
# 0. The scratch clone is a full clone, made ahead of time (not the blobless partial clone the
#    tuning half started from). The fixture commit is not on a remote branch (the PR's branch
#    was rebased and force-pushed); the clone keeps it under a local `atis-fixture` branch, and
#    the commit SHA is used either way.
cd /tmp/atis-heldout/clones/logaretm__vee-validate
git cat-file -t 61298cf2f415dc0a077f6181660c88fa5d9cfa4f
git cat-file -t cd2e4c5dd2e3b54bac7ea714af7e02b27076dbd5

# 1. The package manager the repo pins, through corepack shims in a scratch directory ahead of
#    the machine's own pnpm (11.28.5) on PATH, so the `pnpm` its scripts call is 9.1.0 too.
mkdir -p /tmp/atis-heldout/shims
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack enable --install-directory /tmp/atis-heldout/shims pnpm yarn
export PATH=/tmp/atis-heldout/shims:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# 2. A worktree at the fixture commit, named for the repo so meta.repo reads `vee-validate`.
git -C /tmp/atis-heldout/clones/logaretm__vee-validate worktree add \
  /tmp/atis-heldout/work/corpus-12/vee-validate \
  61298cf2f415dc0a077f6181660c88fa5d9cfa4f --detach

# 3. The repo's own package manager, honouring its lockfile (`--frozen-lockfile` worked).
#    HUSKY=0 makes the root `postinstall` (`husky install`, husky 9) skip, so the shared
#    clone's core.hooksPath stays unset.
cd /tmp/atis-heldout/work/corpus-12/vee-validate
HUSKY=0 pnpm install --frozen-lockfile

# 4. The current harness (D58), at the workspace root. The lockfile is edited first and
#    installed frozen. No stryker: see "Skipped slots".
HUSKY=0 pnpm add -D -w --save-exact --lockfile-only --config.dedupe-peer-dependents=false \
  checkride@0.17.0 fallow@3.35.0
HUSKY=0 pnpm install --frozen-lockfile --ignore-scripts

# 5. Harness edits (see the next section for why).
python3 - <<'PY'
p = "vitest.config.ts"
s = open(p).read()
old = """    coverage: {
      exclude:"""
new = """    coverage: {
      reporter: ['json'],
      reportsDirectory: '.check/coverage',
      reportOnFailure: true,
      exclude:"""
s = s.replace(old, new)
open(p, "w").write(s)
# tsconfig.json has CRLF line endings; keep them.
p = "tsconfig.json"
s = open(p, newline="").read()
old = '    "declarationMap": true,\r\n'
s = s.replace(old, old + '    "noEmit": true,\r\n')
open(p, "w", newline="").write(s)
PY
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
printf '.check\n' > .prettierignore

# 6. The build the repo's CI runs ahead of its type check and tests. Node 24 cannot parse the
#    build script (`import tsconfig from '../tsconfig.json' assert { type: 'json' }` is a
#    syntax error there), so this one step runs under node 20.18.2.
PATH=/usr/local/n/versions/node/20.18.2/bin:$PATH HUSKY=0 pnpm build

# 7. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. Mutation is not attempted; see "Skipped slots".
rm -rf .check
HUSKY=0 node_modules/.bin/checkride --all --skip security,mutation

# 8. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-heldout/work/corpus-12/vee-validate && pwd -P)" \
  --base cd2e4c5dd2e3b54bac7ea714af7e02b27076dbd5 \
  --out fixtures/corpus-12/map.json \
  --svg fixtures/corpus-12/atis.svg

# 9. The worktree is not kept; the clone is.
git -C /tmp/atis-heldout/clones/logaretm__vee-validate worktree remove --force \
  /tmp/atis-heldout/work/corpus-12/vee-validate
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml` — two dev dependencies added at the workspace root
  (`checkride`, `fallow`), both exact-pinned. The lockfile keeps its version 9.0 format and
  gains 33 package entries. One transitive entry, `mute-stream@0.0.8`, is dropped, and the
  peer suffixes on ten existing snapshots (and six importer entries) are rewritten to the
  longer form pnpm writes with `dedupe-peer-dependents` off; no direct dependency of any
  workspace moves, and vitest, its coverage provider and typescript stay at the versions the
  lockfile locked. A first `pnpm add --lockfile-only` without that flag re-resolved the tree
  more widely (among others it dropped eslint 8.57.0, vite 4.5.3 and `@babel/core` 7.24.5), so
  it was discarded (`git checkout package.json pnpm-lock.yaml`) and the flagged form used.
- `vitest.config.ts` — edited in place: three settings added to the repo's own `coverage`
  block and nothing removed. `coverage.reporter` is `['json']` and `coverage.reportsDirectory`
  is `.check/coverage`, so the `test` slot's `--coverage` writes istanbul JSON to
  `.check/coverage/coverage-final.json`, where atis reads it; the repo sets no provider, so
  vitest's default (`@vitest/coverage-v8`, already installed) is kept. `coverage.reportOnFailure`
  is `true` because vitest writes no coverage when a test fails by default, and the file must
  land either way. The repo's `exclude` lists, jsdom environment and setup file are unchanged.
- `tsconfig.json` — `"noEmit": true` added (the file's CRLF line endings kept). The root
  config is the repo's build and editor config (`declaration: true`, `declarationMap`, no
  `outDir`), and checkride's `types` slot runs `tsc --build` against it, which would write
  `.js` and `.d.ts` files beside every source file and let the test slot load them. A trial run
  of the `types` slot alone, before the full run, wrote nothing into the tree with `noEmit` set.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself, so `dead`, `dupes` and `health` run. One line, `ignoreDependencies = ["checkride"]`,
  keeps the harness's own install from showing up as an unused dev dependency.
- `.prettierignore` — created (the repo has none) holding `.check`, so the `format` slot does
  not check checkride's own `.check/*.json` artifacts.
- Run-time settings, not files: the corepack shims first on `PATH`, `HUSKY=0`,
  `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, and node 20.18.2 first on `PATH` for the one build step
  (step 6). The trial `types` run came before the build and failed on the unbuilt sibling
  packages; it was discarded, and `.check/` is from the full run in step 7. The first attempt
  at the build, under node 24, stopped at once on the import assertion; no file changed.
- No test was edited, skipped or deleted, and no timeout was raised: the suite passed (66 test
  files; 429 tests passed, 2 skipped) in about 7 seconds.

## Skipped slots

Named per D56. 12 slots ran, of 20.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation` — **not attempted**. `@stryker-mutator/vitest-runner` 10.0.0 declares a peer range
  of `vitest >=2.0.0`, and the repo's runner is vitest 1.6.0, which the procedure does not
  upgrade, so neither stryker package was installed and the run used `--skip security,mutation`.
  The map carries no mutation evidence.
- `struct`, `docs`, `spell`, `prose`, `publint`, `attw` — checkride 0.17.0 skips these itself
  ("no tool detected for slot"); the repo has none of their detect files, and per the harness
  policy none was added.
- `test`, `lint`, `links` — ran, and passed. `lint` ran the repo's own `eslint.config.js`.
- `types` — ran at the root `tsconfig.json`, with `noEmit` as above, and stays red: 36
  errors, all in dependency declaration files under `node_modules/` (`@nuxt/schema`, `unplugin`,
  `nitropack`, `unstorage` and a handful more). The repo's own `typecheck` script passes
  `--skipLibCheck`; checkride's `tsc --build` does not. None is in the repo's own sources.
- `format` — ran, as the repo has it (`.prettierrc`), and stays red: 29 of the repo's own files
  (docs pages, config files, a locale JSON and `tsconfig.json`, whose CRLF line endings the
  repo's `endOfLine: lf` rejects) fail `prettier --check .`. None is a harness file.
- `build` — ran the root `build` script under node 24 and stays red: the script's import
  assertion is a syntax error there. The pre-built `dist/` directories from step 6 are what the
  type check and the sibling packages read; they are gitignored.
- `pack` — ran at the repo root and stays red: checkride runs `pnpm pack --json`, which the
  pinned pnpm 9.1.0 does not know ("Unknown option: 'json'").
- `dead`, `dupes`, `health` — ran, and are red because fallow reports findings (45, 21 and
  27); they are the instruments atis reads, left as run.
- `snippets` — ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
- `smoke` — ran at the repo root, which is a private package with no `exports` or `main` to
  import. It is left as run.
