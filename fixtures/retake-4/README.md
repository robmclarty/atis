# Retake fixture 4

An outside project's pull request, for the blind retake of glance-test round one (D59, D62).
Its ground truth is in [`truth.md`](./truth.md); a reader of the retake opens neither file
until the verdicts are in.

## The change

| | |
| --- | --- |
| repo | `remeda/remeda` (<https://github.com/remeda/remeda>) |
| pull request | [#793](https://github.com/remeda/remeda/pull/793) `feat(randomInt): add randomInt` |
| base branch | `main` |
| fixture commit | `77ac0658d2ad84fb9b9c6d3e75355ce935efb873` `allow floats`: the commit a human review was submitted against |
| merge base | `71be3884e05c30860e9db28b1c2d439669b877b0` `chore(deps-dev): bump eslint-plugin-unicorn from 54.0.0 to 55.0.0 (#800)` |
| size | 6 files, +138 −1; 4 TypeScript source files (2 of them tests) |

The TypeScript files are `src/randomInt.ts` and `src/index.ts`, with the tests
`src/randomInt.test.ts` and `src/randomInt.test-d.ts` (a type test). The other two files are
docs pages under `docs/src/content/mapping/lodash/`.

## The ecosystem

| | |
| --- | --- |
| package manager | npm, from `package-lock.json` (lockfileVersion 3); no `packageManager` field |
| workspaces | none (no `workspaces` field, no workspace file) |
| test runner | vitest `^2.0.1`, from `devDependencies`; the `test` script runs `tsc --project tsconfig.tests.json && vitest --typecheck.enabled --typecheck.ignoreSourceErrors`, with `vitest.config.ts` at the root |
| node | 22, from `.nvmrc`; no `engines` |
| TypeScript files at the fixture commit | 422 |

## Generation

Step 33 generated `map.json` and `atis.svg` here by the D58 worktree procedure. Step 52
regenerated both in place after the fifth pass (steps 43 to 50, D78), by the same procedure at
the same harness versions. The toolchain, commands, harness changes and skipped slots below are
that rerun's. Three things differ from step 33's run:

- **Step 0 changed nothing.** The clone step 33 hydrated was still in `/tmp/atis-retake/`, full.
  The step stays in the commands for a fresh clone.
- **The atis command no longer switches off pnpm's dependency check.** Since step 43, atis runs
  the worktree's own `node_modules/.bin/fallow` directly, never through `pnpm exec`, so no
  package manager re-lays the tree or writes ahead of fallow's JSON. The map's
  `meta.instruments.entry_points` reads `fallow`.
- **Step 7 now resets the shared clone's `core.hooksPath`.** `HUSKY=0` covers the install only.
  checkride's `pack` slot runs `npm pack`, which runs the repo's `prepare` script (`husky`)
  again, and husky set the shared clone's `core.hooksPath` to `.husky/_` mid-run. Setting
  `HUSKY=0` on the checkride run as well does not fix this: husky then prints
  `HUSKY=0 skip install` ahead of `npm pack`'s JSON, and the `pack` slot goes red. The rerun
  tried that once and discarded the result.

No harness file changed. The same 15 slots ran with the same six red, and mutation completed
again.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, coverage provider and lockfile stay as the commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.13.0 | installed into the worktree; the commit pinned none |
| fallow | 3.30.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `.nvmrc` says 22 and no `engines` field constrains it |
| npm | 11.12.1 | the machine's; `package-lock.json` (lockfileVersion 3) is honoured by `npm ci` |
| vitest | 2.0.5 | the lockfile's, unchanged |
| `@vitest/coverage-v8` | 2.0.5 | already a dev dependency at the repo's vitest major, unchanged |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot |
| `@stryker-mutator/vitest-runner` | 10.0.0 | added for the `mutation` slot; its peer range (`vitest >=2.0.0`) admits 2.0.5 |

## The commands

```sh
# 0. The scratch clone was a blobless partial clone, and `git log --numstat` (which atis runs
#    over up to 5000 commits) failed on objects the promisor remote would not hand back. Make
#    it a full clone first.
cd /tmp/atis-retake/remeda
rm -f .git/objects/info/commit-graph
git config --unset remote.origin.partialclonefilter
git config --unset remote.origin.promisor
git fetch --refetch --no-tags origin

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `remeda`.
git -C /tmp/atis-retake/remeda worktree add /tmp/atis-fixtures/retake-4/remeda \
  77ac0658d2ad84fb9b9c6d3e75355ce935efb873 --detach

# 2. The repo's own package manager, honouring its lockfile. HUSKY=0 keeps the `prepare`
#    script from pointing the shared clone's core.hooksPath at the worktree.
cd /tmp/atis-fixtures/retake-4/remeda
HUSKY=0 npm ci

# 3. The current harness (D58), plus stryker for the mutation slot.
npm install -D --save-exact --ignore-scripts \
  checkride@0.13.0 fallow@3.30.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/vitest-runner@10.0.0

# 4. Harness edits (see the next section for why).
cat > vitest.config.ts <<'CONFIG'
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      include: ["src/**"],
      exclude: ["src/index.ts", "src/**/*.test-d.ts"],
      reporter: ["json"],
      reportsDirectory: ".check/coverage",
    },
  },
});
CONFIG
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
cat > stryker.config.json <<'CONFIG'
{
  "packageManager": "npm",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": ["src/randomInt.ts", "src/index.ts"],
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG
printf '\n# checkride writes its artifacts here during the run\n.check/\n' >> .prettierignore

# 5. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. Mutation is kept; it completed well inside the fifteen-minute cap.
rm -rf .check
npx --no-install checkride --all --skip security

# 6. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points (step 43),
#    and meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/retake-4/remeda && pwd -P)" \
  --base 71be3884e05c30860e9db28b1c2d439669b877b0 \
  --out fixtures/retake-4/map.json \
  --svg fixtures/retake-4/atis.svg

# 7. The worktree is not kept. The `pack` slot's `npm pack` ran `prepare` (husky) without
#    HUSKY=0, which pointed the shared clone's core.hooksPath at .husky/_; unset it.
git -C /tmp/atis-retake/remeda worktree remove --force /tmp/atis-fixtures/retake-4/remeda
git -C /tmp/atis-retake/remeda config --unset core.hooksPath
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `package-lock.json` — four dev dependencies added (`checkride`, `fallow`,
  `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`), all exact-pinned. The lockfile
  keeps its version 3 format, and vitest, vite and typescript stay at the versions it locked.
- `vitest.config.ts` — edited: `coverage.reporter` set to `["json"]` and
  `coverage.reportsDirectory` to `.check/coverage`, so the `test` slot's `--coverage` writes
  istanbul JSON to `.check/coverage/coverage-final.json`, where atis reads it. The repo's own
  `include` and `exclude` lists are unchanged, and the v8 provider it already used is kept.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow's own
  detection finds them (171 of them by its `list --entry-points`), so `dead`, `dupes` and
  `health` run. One line, `ignoreDependencies = ["checkride"]`, keeps the harness's own install
  from showing up as an unused dev dependency.
- `stryker.config.json` — created; `mutate` is limited to the PR's two changed non-test source
  files, and the JSON reporter writes `.check/mutation.json`, the file atis reads. It is JSON
  rather than the `.mjs` form because the repo's ESLint config types every linted file against
  `tsconfig.json`, which does not include a root `.mjs`, so the `lint` slot reported the
  harness's own file as a parse error; checkride detects `stryker.config.json` just as well.
- `.prettierignore` — `.check/` appended. Without it the `format` slot checked checkride's own
  `.check/*.json` artifacts, so it went red or green depending on which files existed when it
  ran, not on the repo's formatting.
- `HUSKY=0` at install time (an environment variable, not a file), so the install's `prepare`
  script does not rewrite the shared clone's `core.hooksPath`. The `pack` slot's `npm pack`
  runs `prepare` again without it, and step 7 unsets what that writes.

## Skipped slots

Named per D56. 15 slots ran.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open. It is also `pnpm audit`, which
  checkride reports unavailable under npm.
- `mutation` — **not** skipped. It completed in about 4 seconds on the two scoped source files
  and wrote `.check/mutation.json`.
- `struct`, `docs`, `spell`, `prose` — checkride 0.13.0 skips these itself ("no tool detected
  for slot"); the repo has none of their detect files, and per the harness policy none was
  added.
- `snippets` — ran, and is red on a repo with no tagged doc fences: an opted-in slot with
  nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
