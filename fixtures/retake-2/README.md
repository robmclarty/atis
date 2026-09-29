# Retake fixture 2

An outside project's pull request, for the blind retake of glance-test round one (D59, D62).
Its ground truth is in [`truth.md`](./truth.md); a reader of the retake opens neither file
until the verdicts are in.

## The change

| | |
| --- | --- |
| repo | `TanStack/form` (<https://github.com/TanStack/form>) |
| pull request | [#2259](https://github.com/TanStack/form/pull/2259) `fix(vue-form): generate an SSR-safe default formId` |
| base branch | `main` |
| fixture commit | `f3474c79beb28839b7a83e858e56c13e977d8eaa` `test(vue-form): assert real hydration, not just matching ids`: the commit a human review was submitted against |
| merge base | `5d1128141a705ebb24ade1275b3117bb4c8b1bdc` `ci: Version Packages (#2242)` |
| size | 4 files, +106 −1; 3 TypeScript source files (1 of them tests) |

The TypeScript files are `packages/vue-form/src/useForm.tsx` and
`packages/vue-form/src/useFormId.ts`, with the test `packages/vue-form/tests/useFormId.test.tsx`.
The fourth file is a changeset.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 11.3.0, from `packageManager` (with its sha512) and `pnpm-lock.yaml` (lockfileVersion 9.0); `engines.pnpm` is `>=11.0.0` |
| workspaces | `packages/**`, `examples/angular/**`, `examples/react/**`, `examples/preact/**`, `examples/solid/**`, `examples/vue/**`, `examples/lit/**`, `examples/svelte/**`, from `pnpm-workspace.yaml` (which also sets `allowBuilds`, a trust policy and an override) |
| test runner | vitest `^3.2.4`, from root `devDependencies`; `packages/vue-form` runs it as `test:lib` (`vitest`). The root `test` script is `pnpm run test:ci`, an nx `run-many` over lint, knip, sherif, docs, types, build and `test:lib` |
| node | 24.8.0, from `.nvmrc`; no `engines.node` |
| TypeScript files at the fixture commit | 381 |

## Generation

Step 33 generates `map.json` and `atis.svg` here by the D58 worktree procedure and records its
commands, skipped slots and harness changes in this section.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, coverage provider and lockfile stay as the commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.13.0 | installed into the workspace root; the commit pinned none |
| fallow | 3.30.0 | installed into the workspace root; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `.nvmrc` says 24.8.0 and no `engines.node` constrains it |
| pnpm | 11.3.0 | the `packageManager` pin; the machine's pnpm is 11.1.2 and switched to the pin itself |
| vitest | 3.2.4 | the lockfile's, unchanged |
| `@vitest/coverage-istanbul` | 3.2.4 | already a root dev dependency at the repo's vitest major, unchanged |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot |
| `@stryker-mutator/vitest-runner` | 10.0.0 | added for the `mutation` slot; its peer range (`vitest >=2.0.0`) admits 3.2.4 |

## The commands

```sh
# 0. The scratch clone was a blobless partial clone, and `git log --numstat` (which atis runs
#    over up to 5000 commits) failed on objects the promisor remote would not hand back. Make
#    it a full clone first, then fetch the fixture commit and any object still missing.
cd /tmp/atis-retake/form
rm -f .git/objects/info/commit-graph
git config --unset remote.origin.partialclonefilter
git config --unset remote.origin.promisor
git fetch --refetch --no-tags origin
git fetch --no-tags origin f3474c79beb28839b7a83e858e56c13e977d8eaa
for oid in $(git rev-list --objects --missing=print f3474c79beb28839b7a83e858e56c13e977d8eaa \
    | grep '^?' | tr -d '?'); do git fetch --no-tags origin "$oid"; done

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `form`.
git -C /tmp/atis-retake/form worktree add /tmp/atis-fixtures/retake-2/form \
  f3474c79beb28839b7a83e858e56c13e977d8eaa --detach

# 2. The repo's own package manager, honouring its lockfile.
cd /tmp/atis-fixtures/retake-2/form
pnpm install --frozen-lockfile

# 3. The current harness (D58), plus stryker for the mutation slot, at the workspace root.
pnpm add -D -w --save-exact \
  checkride@0.13.0 fallow@3.30.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/vitest-runner@10.0.0 \
  --config.minimumReleaseAge=0

# 4. Harness edits (see the next section for why).
cat > vitest.config.mjs <<'CONFIG'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        extends: './packages/vue-form/vite.config.ts',
        root: './packages/vue-form',
        // vitest globs `dir` from the process cwd, not from the project root.
        test: { dir: './packages/vue-form/tests' },
      },
    ],
    coverage: {
      provider: 'istanbul',
      include: ['packages/vue-form/src/**/*'],
      reporter: ['json'],
      reportsDirectory: '.check/coverage',
    },
  },
})
CONFIG
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
    'packages/vue-form/src/useForm.tsx',
    'packages/vue-form/src/useFormId.ts',
  ],
  coverageAnalysis: 'perTest',
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
}
CONFIG
printf '.check\n' >> .prettierignore
pnpm exec prettier --write vitest.config.mjs stryker.config.mjs

# 5. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. Mutation is kept; it completed well inside the fifteen-minute cap. The two
#    NX variables keep the `build` slot's nx call off the network and off a background daemon.
#    The heap flag is for `eslint .` over the whole workspace, which aborts out of memory on
#    node's default 4 GB.
rm -rf .check .stryker-tmp
NX_NO_CLOUD=true NX_DAEMON=false NODE_OPTIONS=--max-old-space-size=12288 \
  pnpm exec checkride --all --skip security

# 6. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis reads the entry points from the repo's own fallow through `pnpm exec`; switching
#    pnpm's dependency check off keeps its narration off stdout, ahead of fallow's JSON.
cd ~/Projects/atis/code/atis
pnpm_config_verify_deps_before_run=false node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/retake-2/form && pwd -P)" \
  --base 5d1128141a705ebb24ade1275b3117bb4c8b1bdc \
  --out fixtures/retake-2/map.json \
  --svg fixtures/retake-2/atis.svg

# 7. The worktree is not kept.
git -C /tmp/atis-retake/form worktree remove --force /tmp/atis-fixtures/retake-2/form
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml` — four root dev dependencies added (`checkride`,
  `fallow`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`), all exact-pinned. The
  `minimumReleaseAge` override applies to that one `pnpm add` only.
- `vitest.config.mjs` — created at the root. The repo has no root vitest config: its tests run
  per package under nx, and each package's `vite.config.ts` already enables istanbul coverage
  into its own `coverage/` folder. checkride's `test` slot runs vitest once from the root, so
  this config is the bridge: one project that extends the changed package's own
  `vite.config.ts` (`root` and `test.dir` re-pointed, since vitest globs `dir` from the
  process cwd), and root-level istanbul coverage with the `json` reporter and
  `reportsDirectory` set to `.check/coverage`, limited to that package's `src/`. Only the
  package the PR changes is a project, so the `test` slot reports on its 32 tests and
  nothing else in the workspace. It is `.mjs` and not `.ts` because the repo's ESLint config
  types every linted `.ts` file against a tsconfig, and a root `.ts` file is in none, so the
  `lint` slot reported the harness's own file as a parse error.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself. One line, `ignoreDependencies = ["checkride"]`, keeps the
  harness's own install from showing up as an unused dev dependency.
- `stryker.config.mjs` — created; `mutate` is limited to the PR's two changed non-test source
  files, and the JSON reporter writes `.check/mutation.json`, the file atis reads. Both new
  root configs were passed through the repo's own prettier so the `format` slot does not
  report the harness.
- `.prettierignore` — `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts.
- `NX_NO_CLOUD=true` and `NX_DAEMON=false` at run time (environment variables, not files),
  for the `build` slot, which runs `nx affected`. And `NODE_OPTIONS=--max-old-space-size=12288`,
  because checkride runs `eslint .` from the workspace root and over the whole workspace it
  aborts out of memory on node's default 4 GB heap after about 20 seconds, which leaves the
  `lint` slot red with no report at all.

## Skipped slots

Named per D56. 14 slots ran.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation` — **not** skipped. It completed in about 16 seconds on the two scoped source
  files and wrote `.check/mutation.json`.
- `struct`, `docs`, `spell`, `prose`, `attw` — checkride 0.13.0 skips these itself ("no tool
  detected for slot"): the repo has none of their detect files, `@arethetypeswrong/cli` is not
  a dependency, and per the harness policy none was added.
- `snippets` — ran, and is red on a repo with no tagged doc fences: an opted-in slot with
  nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
- `pack`, `smoke`, `publint` — ran, and are red because checkride runs them at the workspace
  root, which is a private package with no `exports` or `main` to pack or import. They are
  left as run.
