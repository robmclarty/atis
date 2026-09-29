# Retake fixture 3

An outside project's pull request, for the blind retake of glance-test round one (D59, D62).
Its ground truth is in [`truth.md`](./truth.md); a reader of the retake opens neither file
until the verdicts are in.

## The change

| | |
| --- | --- |
| repo | `trpc/trpc` (<https://github.com/trpc/trpc>) |
| pull request | [#6976](https://github.com/trpc/trpc/pull/6976) `feat(tanstack-react-query): Add QueryKey and MutationKey Prefix option` |
| base branch | `main` |
| fixture commit | `e11a7d2410fff83e45a0c7da14b6be50d952673e` `Format`: the commit a human review was submitted against |
| merge base | `cd64ab3b9684b24ceec8bc8d5b247db3db23cd06` `fix(client): do not emit "connecting" when initializing websocket subscription (#6970)` |
| size | 12 files, +245 −54; 10 TypeScript source files (3 of them tests) |

The TypeScript files are six under `packages/tanstack-react-query/src/internals/`
(`Context.tsx`, `createOptionsProxy.ts`, `mutationOptions.ts`, `subscriptionOptions.ts`,
`types.ts`, `utils.ts`) and `examples/.experimental/next-app-dir/src/trpc/rq-server.tsx`, with
three under `packages/tanstack-react-query/test/` (`__helpers.tsx`, `queryKeyable.test.tsx`,
`utils.test.ts`). The other two files are docs pages under `www/docs/`.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 9.12.2, from `packageManager` and `pnpm-lock.yaml` (lockfileVersion 9.0); `engines.pnpm` is `^9.12.2` |
| workspaces | `packages/*`, `examples/*`, `examples/.*/*`, `examples/minimal/*`, `examples/minimal-react/*`, `examples/minimal-content-types/*`, `www`, `www/og-image`, from `pnpm-workspace.yaml` |
| test runner | vitest `^3.1.2` (the lockfile resolves 3.1.3), from root `devDependencies` and the root `test` script (`vitest`, with `vitest.workspace.json`) |
| node | `^22.18.0`, from `engines.node`; `.nvmrc` says 22.18.0 (a stale `.tool-versions` says nodejs 20.10.0 and pnpm 8.15.5) |
| TypeScript files at the fixture commit | 748 |

## Generation

Step 33 generated `map.json` and `atis.svg` here by the D58 worktree procedure. Step 52
regenerated both in place after the fifth pass (steps 43 to 50, D78), by the same procedure at
the same harness versions. The toolchain, commands, harness changes and skipped slots below are
that rerun's. Two things differ from step 33's run:

- **Step 0 changed nothing.** The clone step 33 hydrated was still in `/tmp/atis-retake/`, full,
  with no object missing at the fixture commit. The step stays in the commands for a fresh
  clone.
- **The atis command no longer switches off pnpm's dependency check.** Since step 43, atis runs
  the worktree's own `node_modules/.bin/fallow` directly, never through `pnpm exec`, so no
  package manager re-lays the tree or writes ahead of fallow's JSON. The map's
  `meta.instruments.entry_points` reads `fallow`.

No harness file changed. The same 13 slots ran with the same nine red, the suite passed, and
mutation completed again.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, coverage provider and lockfile stay as the commit had them.
The one exception to "the machine's Node" is below: this repo's tests need the Node its
`.nvmrc` names.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.13.0 | installed into the workspace root; the commit pinned none |
| fallow | 3.30.0 | installed into the workspace root; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 22.18.0 | `.nvmrc` and `engines.node` (`^22.18.0`); the machine's 24.15.0 is not used, see below |
| pnpm | 9.12.2 | the `packageManager` pin; the machine's pnpm is 11.1.2 and switched to the pin itself |
| vitest | 3.1.3 | the lockfile's, unchanged |
| `@vitest/coverage-istanbul` | 3.1.3 | already a dev dependency at the repo's vitest version, unchanged |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot |
| `@stryker-mutator/vitest-runner` | 10.0.0 | added for the `mutation` slot; its peer range (`vitest >=2.0.0`) admits 3.1.3 |

On the machine's Node 24.15.0 the suite fails wholesale (87 of 157 test files): jsdom's
`AbortSignal` is not the one Node's `fetch` checks for, so every request with a signal throws.
On Node 22.18.0 the same suite passes, apart from one timing-sensitive test (see below). The fixture therefore runs under a scratch Node 22.18.0
installed with `npm install node@22.18.0` into `/tmp/node22`, first on `PATH` for every step
after the clone.

## The commands

```sh
# 0. The scratch clone was a blobless partial clone, and `git log --numstat` (which atis runs
#    over up to 5000 commits) failed on objects the promisor remote would not hand back. Make
#    it a full clone first, then fetch the fixture commit and any object still missing.
cd /tmp/atis-retake/trpc
rm -f .git/objects/info/commit-graph
git config --unset remote.origin.partialclonefilter
git config --unset remote.origin.promisor
git fetch --refetch --no-tags origin
git fetch --no-tags origin e11a7d2410fff83e45a0c7da14b6be50d952673e
for oid in $(git rev-list --objects --missing=print e11a7d2410fff83e45a0c7da14b6be50d952673e \
    | grep '^?' | tr -d '?'); do git fetch --no-tags origin "$oid"; done

# 1. The Node the repo asks for, in a scratch prefix, ahead of the machine's on PATH.
mkdir -p /tmp/node22 && (cd /tmp/node22 && npm init -y && npm install node@22.18.0)
export PATH=/tmp/node22/node_modules/node/bin:$PATH

# 2. A worktree at the fixture commit, named for the repo so meta.repo reads `trpc`.
git -C /tmp/atis-retake/trpc worktree add /tmp/atis-fixtures/retake-3/trpc \
  e11a7d2410fff83e45a0c7da14b6be50d952673e --detach

# 3. The repo's own package manager, honouring its lockfile.
cd /tmp/atis-fixtures/retake-3/trpc
pnpm install --frozen-lockfile

# 4. The current harness (D58), plus stryker for the mutation slot, at the workspace root.
pnpm add -D -w --save-exact \
  checkride@0.13.0 fallow@3.30.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/vitest-runner@10.0.0 \
  --config.minimumReleaseAge=0

# 5. Harness edits (see the next section for why).
python3 - <<'PYTHON'
p = 'vitest.config.ts'
s = open(p).read()
s = s.replace(
    "      provider: 'istanbul',\n      include: ['**/src/**'],",
    "      provider: 'istanbul',\n      reporter: ['json'],\n      reportsDirectory: '.check/coverage',\n"
    "      reportOnFailure: true,\n      include: ['**/src/**'],",
    1,
)
open(p, 'w').write(s)
p = 'eslint.config.js'
s = open(p).read()
s = s.replace(
    "{ ignores: ['**/vendor/**'] },",
    "{ ignores: ['**/vendor/**', 'examples/**/*.{js,mjs,cjs}'] },",
    1,
)
open(p, 'w').write(s)
PYTHON
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
cat > stryker.config.mjs <<'CONFIG'
export default {
  packageManager: 'pnpm',
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  reporters: ['clear-text', 'json'],
  jsonReporter: { fileName: '.check/mutation.json' },
  mutate: [
    'packages/tanstack-react-query/src/internals/Context.tsx',
    'packages/tanstack-react-query/src/internals/createOptionsProxy.ts',
    'packages/tanstack-react-query/src/internals/mutationOptions.ts',
    'packages/tanstack-react-query/src/internals/subscriptionOptions.ts',
    'packages/tanstack-react-query/src/internals/types.ts',
    'packages/tanstack-react-query/src/internals/utils.ts',
    'examples/.experimental/next-app-dir/src/trpc/rq-server.tsx',
  ],
  coverageAnalysis: 'perTest',
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
};
CONFIG
printf '\n.check\n' >> .prettierignore
pnpm exec prettier --write stryker.config.mjs vitest.config.ts eslint.config.js

# 6. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. CI=true turns on the repo's own `retry: 2` for CI, which absorbs one
#    timing-dependent codemod test that otherwise fails now and then under load; the
#    npm_config_node_options override gives ESLint (which pnpm's `node-options` setting would
#    otherwise pin to the default 4 GB heap) room to lint the whole workspace at once.
#    Mutation is kept; it completed well inside the fifteen-minute cap.
rm -rf .check .stryker-tmp
CI=true npm_config_node_options="--no-warnings --max-old-space-size=12288" \
  pnpm exec checkride --all --skip security

# 7. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points (step 43),
#    and meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/retake-3/trpc && pwd -P)" \
  --base cd64ab3b9684b24ceec8bc8d5b247db3db23cd06 \
  --out fixtures/retake-3/map.json \
  --svg fixtures/retake-3/atis.svg

# 8. The worktree is not kept.
git -C /tmp/atis-retake/trpc worktree remove --force /tmp/atis-fixtures/retake-3/trpc
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml` — four dev dependencies added to the workspace root
  (`checkride`, `fallow`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`), all
  exact-pinned. The root manifest had no `devDependencies` block, so this adds one. The
  `minimumReleaseAge` override applies to that one `pnpm add` only.
- `vitest.config.ts` — edited: `coverage.reporter` set to `['json']` and
  `coverage.reportsDirectory` to `.check/coverage`, so the `test` slot's coverage lands at
  `.check/coverage/coverage-final.json`, where atis reads it; the repo's istanbul provider and
  its `include` and `exclude` lists are unchanged. `coverage.reportOnFailure: true` is added
  as well, because vitest writes no coverage report when any test fails and the suite has one
  timing-sensitive test, so a single flaky failure would otherwise blank the coverage evidence.
- `eslint.config.js` — one line: `examples/**/*.{js,mjs,cjs}` added to the existing top-level
  `ignores`. The repo lints one package at a time (`eslint --cache src` per package), but
  checkride runs `eslint .` from the root, and six plain-JS files under `examples/` match an
  `examples/**/*` block that names a TypeScript rule without loading its plugin, which stops
  ESLint with a configuration error before it reports anything.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself. One line, `ignoreDependencies = ["checkride"]`, keeps the
  harness's own install from showing up as an unused dev dependency.
- `stryker.config.mjs` — created; `mutate` is limited to the PR's seven changed non-test
  source files, and the JSON reporter writes `.check/mutation.json`, the file atis reads. The
  repo's own prettier was run over it and the two edited configs, so the `format` slot does
  not report the harness.
- `.prettierignore` — `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts.
- Run-time settings, not files: the Node 22.18.0 `PATH` described above; `CI=true`, which
  switches on the repo's own `retry: process.env['CI'] ? 2 : 0` in `vitest.config.ts`; and
  `npm_config_node_options` with a 12 GB heap. On the default heap, ESLint over the whole
  workspace aborts out of memory after about 30 seconds.

## Skipped slots

Named per D56. 13 slots ran.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation` — **not** skipped. It completed in about 128 seconds on the seven scoped source
  files and wrote `.check/mutation.json`. The example file among them is outside every test,
  so its mutants report as uncovered.
- `struct`, `docs`, `spell`, `prose`, `publint`, `attw` — checkride 0.13.0 skips these itself
  ("no tool detected for slot"): the repo has none of their detect files, `publint` and
  `@arethetypeswrong/cli` are not dependencies, and per the harness policy none was added.
- `snippets` — ran, and is red on a repo with no tagged doc fences: an opted-in slot with
  nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
- `pack`, `smoke` — ran, and are red because checkride runs them at the workspace root, which
  is a private package with no `exports` or `main` to pack or import. They are left as run.
- `types` — ran, and is red on the repo's own root `tsconfig.json`, whose `include` reaches
  into `examples/` (several of which need their own tsconfig). It is left as run.
