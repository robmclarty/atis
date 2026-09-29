# Retake fixture 5

An outside project's pull request, for the blind retake of glance-test round one (D59, D62).
Its ground truth is in [`truth.md`](./truth.md); a reader of the retake opens neither file
until the verdicts are in.

## The change

| | |
| --- | --- |
| repo | `honojs/hono` (<https://github.com/honojs/hono>) |
| pull request | [#5266](https://github.com/honojs/hono/pull/5266) `fix(reg-exp-router): associate wildcard middleware with matching routes` |
| base branch | `main` |
| fixture commit | `0a2157321843847d3f46862b4fdd18ecc79dbd82` `perf(reg-exp-router): compact route registration`: the commit a human review was submitted against |
| merge base | `a19462879716e7b600daed8eb3a1b2af4bd68feb` `fix(pattern-router/linear-router): prevent prefix overmatch on wildcard routes (#5252)` |
| size | 4 files, +175 −101; 4 TypeScript source files (2 of them tests) |

The TypeScript files are `src/router/reg-exp-router/node.ts` and
`src/router/reg-exp-router/router.ts`, with the tests `src/router/common.case.test.ts` and
`src/router/linear-router/router.test.ts`.

## The ecosystem

| | |
| --- | --- |
| package manager | bun 1.2.20, from `packageManager` and `bun.lock` (the text lockfile, lockfileVersion 1); `bunfig.toml` at the root |
| workspaces | none (no `workspaces` field, no workspace file) |
| test runner | vitest `^4.1.9`, from `devDependencies`; the `test` script runs `tsc -p tsconfig.spec.json && vitest --run`, with `vitest.config.ts` at the root |
| node | `>=16.9.0`, from `engines.node`; `.tool-versions` pins nodejs 24.7.0, bun 1.2.19 and deno 2.4.5 |
| TypeScript files at the fixture commit | 359 |

## Generation

Step 33 generates `map.json` and `atis.svg` here by the D58 worktree procedure and records its
commands, skipped slots and harness changes in this section.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, coverage provider and lockfile stay as the commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.13.0 | installed into the worktree; the commit pinned none |
| fallow | 3.30.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `.tool-versions` pins 24.7.0 and `engines.node` is `>=16.9.0` |
| bun | 1.3.10 | the machine's; `packageManager` pins 1.2.20, and bun does not switch versions itself |
| vitest | 4.1.9 | the lockfile's, unchanged |
| `@vitest/coverage-v8` | 4.1.7 | already a dev dependency at the repo's vitest major, unchanged |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot |
| `@stryker-mutator/vitest-runner` | 10.0.0 | added for the `mutation` slot; its peer range (`vitest >=2.0.0`) admits 4.1.9 |

## The commands

```sh
# 0. The scratch clone was a blobless partial clone, and `git log --numstat` (which atis runs
#    over up to 5000 commits) failed on objects the promisor remote would not hand back. Make
#    it a full clone first, then fetch the fixture commit and any object still missing.
cd /tmp/atis-retake/hono
rm -f .git/objects/info/commit-graph
git config --unset remote.origin.partialclonefilter
git config --unset remote.origin.promisor
git fetch --refetch --no-tags origin
git fetch --no-tags origin 0a2157321843847d3f46862b4fdd18ecc79dbd82
for oid in $(git rev-list --objects --missing=print 0a2157321843847d3f46862b4fdd18ecc79dbd82 \
    | grep '^?' | tr -d '?'); do git fetch --no-tags origin "$oid"; done

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `hono`.
git -C /tmp/atis-retake/hono worktree add /tmp/atis-fixtures/retake-5/hono \
  0a2157321843847d3f46862b4fdd18ecc79dbd82 --detach

# 2. The repo's own package manager, honouring its lockfile.
cd /tmp/atis-fixtures/retake-5/hono
bun install --frozen-lockfile

# 3. The current harness (D58), plus stryker for the mutation slot.
bun add -d --exact \
  checkride@0.13.0 fallow@3.30.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/vitest-runner@10.0.0

# 4. Harness edits (see the next section for why).
python3 - <<'PYTHON'
p = 'vitest.config.ts'
s = open(p).read()
s = s.replace("reportsDirectory: './coverage/raw/default',", "reportsDirectory: './.check/coverage',")
s = s.replace("reporter: ['json', 'text', 'html'],", "reporter: ['json'],")
s = s.replace(
    "export default defineConfig({",
    "// checkride runs every slot with NO_COLOR=1, and this repo's colour tests expect it unset.\n"
    "delete process.env.NO_COLOR\n\nexport default defineConfig({",
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
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  reporters: ['clear-text', 'json'],
  jsonReporter: { fileName: '.check/mutation.json' },
  mutate: ['src/router/reg-exp-router/node.ts', 'src/router/reg-exp-router/router.ts'],
  coverageAnalysis: 'perTest',
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
}
CONFIG
printf '.check/\n' > .prettierignore

# 5. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. Clear .stryker-tmp too: a stryker run that dies in its dry run leaves its
#    sandbox behind, and the `lint` slot then lints the sandbox. Mutation is kept; it completed
#    well inside the fifteen-minute cap.
rm -rf .check .stryker-tmp
bunx --no-install checkride --all --skip security

# 6. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis reads the entry points from the repo's own fallow through `pnpm exec`. On this bun
#    repo, pnpm's dependency check would reinstall node_modules in pnpm's layout and print to
#    stdout ahead of fallow's JSON, so atis would quietly fall back to manifest-only entry
#    points. Switching that check off makes atis read fallow's list.
cd ~/Projects/atis/code/atis
pnpm_config_verify_deps_before_run=false node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/retake-5/hono && pwd -P)" \
  --base a19462879716e7b600daed8eb3a1b2af4bd68feb \
  --out fixtures/retake-5/map.json \
  --svg fixtures/retake-5/atis.svg

# 7. The worktree is not kept.
git -C /tmp/atis-retake/hono worktree remove --force /tmp/atis-fixtures/retake-5/hono
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `bun.lock` — four dev dependencies added (`checkride`, `fallow`,
  `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`), all exact-pinned.
- `vitest.config.ts` — edited, three changes. `coverage.reportsDirectory` is now
  `./.check/coverage` and `coverage.reporter` is `['json']`, so the `test` slot's coverage
  lands at `.check/coverage/coverage-final.json`, where atis reads it; the repo's provider
  (v8), `enabled: true` and exclude list are unchanged. And `delete process.env.NO_COLOR` at
  the top: checkride runs every slot with `NO_COLOR=1`, and three of the repo's test files
  (colour detection, the logger, the dev helper) assert colour is on. With `NO_COLOR` set
  they failed, the `test` slot went red, vitest wrote no coverage, and stryker's dry run
  refused to start. Clearing the variable in the config puts the tests in the environment
  they were written for; it does not touch any test.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself. One line, `ignoreDependencies = ["checkride"]`, keeps the harness's own install from
  showing up as an unused dev dependency.
- `stryker.config.mjs` — created; `mutate` is limited to the PR's two changed non-test source
  files, and the JSON reporter writes `.check/mutation.json`, the file atis reads. It sets no
  `packageManager`: stryker accepts only npm, yarn and pnpm there, and rejects `bun`.
- `.prettierignore` — created with `.check/`, so the `format` slot does not check checkride's
  own `.check/*.json` artifacts. The repo had none. The two new configs already satisfy the
  repo's `.prettierrc`.

## Skipped slots

Named per D56. 13 slots ran.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open. It is also `pnpm audit`, which
  checkride reports unavailable under bun.
- `mutation` — **not** skipped. It completed in about 110 seconds on the two scoped source
  files and wrote `.check/mutation.json`.
- `struct`, `docs`, `spell`, `prose`, `attw` — checkride 0.13.0 skips these itself ("no tool
  detected for slot"): the repo has none of their detect files, `@arethetypeswrong/cli` is not
  a dependency, and per the harness policy none was added.
- `pack` — checkride skips it itself: its built-in speaks `pnpm pack` and `npm pack` only and
  is unavailable under bun.
- `snippets` — ran, and is red on a repo with no tagged doc fences: an opted-in slot with
  nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
