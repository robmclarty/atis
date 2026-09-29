# Retake fixture 1

An outside project's pull request, for the blind retake of glance-test round one (D59, D62).
Its ground truth is in [`truth.md`](./truth.md); a reader of the retake opens neither file
until the verdicts are in.

## The change

| | |
| --- | --- |
| repo | `apollographql/apollo-client` (<https://github.com/apollographql/apollo-client>) |
| pull request | [#12633](https://github.com/apollographql/apollo-client/pull/12633) ``Cancel running `ObservableQuery` link on unsubscribe`` |
| base branch | `release-4.0` |
| fixture commit | `ea36754a35da7e9fa628d77a81c2713c8bb7d77a` ``do not autocall `.retain` in the `useLazyQuery` `execute` function, expose it instead``: the commit a human review was submitted against |
| merge base | `d2a60d45e734a2518dad2443f85d82553cd6456a` ``only advance `previousData` if `data` changed (#12637)`` |
| size | 12 files, +215 −115; 6 TypeScript source files (2 of them tests) |

The TypeScript files are `src/core/ObservableQuery.ts`, `src/core/QueryManager.ts`,
`src/react/hooks/useLazyQuery.ts` and `src/react/internal/types.ts`, with the tests
`src/core/__tests__/ApolloClient/general.test.ts` and
`src/react/hooks/__tests__/useLazyQuery.test.tsx`. The other six files are API reports under
`.api-reports/`, a changeset and `.size-limits.json`.

## The ecosystem

| | |
| --- | --- |
| package manager | npm, from `package-lock.json` (lockfileVersion 3); no `packageManager` field, `devEngines.packageManager` asks for npm `>=10.8.2` |
| workspaces | none (no `workspaces` field, no workspace file) |
| test runner | jest 29.7.0 with ts-jest 29.2.3, from root `devDependencies`; the `test` script runs `jest --config ./config/jest.config.ts` through `node --expose-gc --experimental-import-meta-resolve` |
| node | `>=23.6.0`, from `devEngines.runtime` in `package.json`; no `engines`, `.nvmrc` or `.node-version` |
| TypeScript files at the fixture commit | 490 |

## Generation

Step 33 generates `map.json` and `atis.svg` here by the D58 worktree procedure and records its
commands, skipped slots and harness changes in this section.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, transformer and lockfile stay as the commit had them. The one
exception to "the machine's Node" is below: this repo's tests are sensitive to it.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.13.0 | installed into the worktree; the commit pinned none |
| fallow | 3.30.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.1.0 | `devEngines.runtime` asks for `>=23.6.0`, and CI at the commit's date (30 May 2025) resolved that to 24.1.0; the machine's 24.15.0 is not used, see below |
| npm | 11.12.1 | the machine's; `devEngines.packageManager` asks for `>=10.8.2` |
| jest | 29.7.0 | the lockfile's, unchanged |
| ts-jest | 29.2.3 | the lockfile's, unchanged |

On the machine's Node 24.15.0 the suite has 22 failing tests across seven files, 13 more than on
Node 24.1.0 (multipart subscriptions and deferred-chunk queries, which read streamed `fetch`
responses). On Node 24.1.0 only nine fail, three `useLazyQuery` tests once for each of the three
React projects, and they fail on Node 24.6.0 as well, so they belong to this tree. The fixture therefore runs under a scratch Node 24.1.0 installed with
`npm install node@24.1.0` into `/tmp/node2401`, first on `PATH` for every step after the clone.

## The commands

```sh
# 0. The scratch clone was a blobless partial clone, and `git log --numstat` (which atis runs
#    over up to 5000 commits) failed on objects the promisor remote would not hand back. Make
#    it a full clone first, then fetch the fixture commit and any object still missing.
cd /tmp/atis-retake/apollo-client
rm -f .git/objects/info/commit-graph
git config --unset remote.origin.partialclonefilter
git config --unset remote.origin.promisor
git fetch --refetch --no-tags origin
git fetch --no-tags origin ea36754a35da7e9fa628d77a81c2713c8bb7d77a
for oid in $(git rev-list --objects --missing=print ea36754a35da7e9fa628d77a81c2713c8bb7d77a \
    | grep '^?' | tr -d '?'); do git fetch --no-tags origin "$oid"; done

# 1. The Node contemporary with the commit, in a scratch prefix, ahead of the machine's on PATH.
mkdir -p /tmp/node2401 && (cd /tmp/node2401 && npm init -y && npm install node@24.1.0)
export PATH=/tmp/node2401/node_modules/node/bin:$PATH

# 2. A worktree at the fixture commit, named for the repo so meta.repo reads `apollo-client`.
git -C /tmp/atis-retake/apollo-client worktree add /tmp/atis-fixtures/retake-1/apollo-client \
  ea36754a35da7e9fa628d77a81c2713c8bb7d77a --detach

# 3. The repo's own package manager, honouring its lockfile. `npm ci` refuses this lockfile
#    (it lacks the platform-specific optional packages for esbuild 0.21.5), so `npm install`
#    is used: it adds those entries and moves no locked version.
cd /tmp/atis-fixtures/retake-1/apollo-client
npm install

# 4. The current harness (D58). Mutation is not attempted past the point described in
#    "Skipped slots", so stryker is not installed.
npm install -D --save-exact checkride@0.13.0 fallow@3.30.0

# 5. Harness edits (see the next section for why).
cat > jest.config.mjs <<'CONFIG'
import base from "./config/jest.config.ts";

export default {
  ...base,
  collectCoverage: true,
  coverageReporters: ["json"],
  coverageDirectory: ".check/coverage",
};
CONFIG
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
printf '\n.check\n' >> .prettierignore

# 6. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. checkride runs plain `jest`, so the node flags the repo's `test` script
#    passes come in through NODE_OPTIONS.
rm -rf .check
NODE_OPTIONS="--expose-gc --experimental-import-meta-resolve --disable-warning=ExperimentalWarning" \
  npx --no-install checkride --all --skip security,mutation

# 7. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis reads the entry points from the repo's own fallow through `pnpm exec`. On this npm
#    repo, pnpm's dependency check would reinstall node_modules in pnpm's layout and print to
#    stdout ahead of fallow's JSON, so atis would quietly fall back to manifest-only entry
#    points. Switching that check off makes atis read fallow's list.
cd ~/Projects/atis/code/atis
pnpm_config_verify_deps_before_run=false node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/retake-1/apollo-client && pwd -P)" \
  --base d2a60d45e734a2518dad2443f85d82553cd6456a \
  --out fixtures/retake-1/map.json \
  --svg fixtures/retake-1/atis.svg

# 8. The worktree is not kept.
git -C /tmp/atis-retake/apollo-client worktree remove --force /tmp/atis-fixtures/retake-1/apollo-client
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `package-lock.json` — two dev dependencies added (`checkride`, `fallow`),
  both exact-pinned. The lockfile also gains 45 platform-specific optional entries from the
  `npm install` in step 3; no locked version moves.
- `jest.config.mjs` — created at the root. The repo keeps its jest config at
  `config/jest.config.ts` and its `test` script passes `--config` to it; checkride's `test` slot
  detects jest only from a root `jest.config.*` and runs plain `jest`. The file re-exports the
  repo's own config, four projects and all, and adds the three coverage options: turn coverage
  on, `json` reporter, `coverageDirectory` `.check/coverage`, which writes
  `.check/coverage/coverage-final.json` where atis reads it. It is `.mjs` and not `.ts` because
  a root `.ts` file falls outside the TypeScript project the repo's ESLint config types
  against, so the `lint` slot reported it as a parse error.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself. One line, `ignoreDependencies = ["checkride"]`, keeps the harness's own
  install from showing up as an unused dev dependency.
- `.prettierignore` — `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts.
- Run-time settings, not files: the Node 24.1.0 `PATH` described above, and `NODE_OPTIONS` set
  to the three flags the repo's `test` script passes to `node` (`--expose-gc`,
  `--experimental-import-meta-resolve`, `--disable-warning=ExperimentalWarning`).

## Skipped slots

Named per D56. 14 slots ran.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open. It is also `pnpm audit`, which
  checkride reports unavailable under npm.
- `mutation` — **dropped**: Stryker could not run against this repo. Its jest runner ignores
  `projects` and rewrites `rootDir` to its sandbox, and the repo's test environment is an
  ES-module-typed file that itself calls `require`, which the runner's `require` of that file
  cannot load. An inline single-project config, with the paths spelled from the sandbox root and
  scoped to the PR's changed line ranges, found its 64 mutants and stopped at the test
  environment. Its initial test run would also have met the nine failing tests above, which it
  does not tolerate. Both stryker packages and the config were removed, so nothing of the attempt
  is left in the worktree, and the run used `--skip security,mutation`.
- `struct`, `docs`, `spell`, `prose` — checkride 0.13.0 skips these itself ("no tool detected
  for slot"); the repo has none of their detect files, and per the harness policy none was
  added.
- `snippets` — ran, and is red on a repo with no tagged doc fences: an opted-in slot with
  nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
- `pack`, `smoke`, `publint`, `attw` — ran, and are red because checkride runs them at the
  repo root, whose `exports` point at TypeScript under `src/`: the package is published from a
  built `dist/` with a rewritten manifest. They are left as run.
