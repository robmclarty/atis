# Corpus fixture 3

An outside project's pull request, in the tuning half of the precision corpus (D88, D127,
D128, D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `matrix-org/matrix-js-sdk` (<https://github.com/matrix-org/matrix-js-sdk>) |
| pull request | [#5080](https://github.com/matrix-org/matrix-js-sdk/pull/5080) `Import room key bundles received after invite.` |
| base branch | `develop` |
| fixture commit | `fe0baa62e410379869345ba2cd8b743aa9f81aa1` `Merge branch 'develop' into kaylendog/msc4268/pending-bundles`: the commit a human review was submitted against |
| merge base | `3d1bcb73c1a0fb4f7a19f792072ef51f4a7c84c3` `Allow msc4354_sticky_key to be optional on sticky events. (#5073)` |
| size | 4 files, +177 −5; 3 TypeScript source files by `classifyFile`'s rule, 1 test file |

The TypeScript source files are `src/client.ts`, `src/common-crypto/CryptoBackend.ts` and
`src/rust-crypto/rust-crypto.ts`, with the test `spec/integ/crypto/history-sharing.spec.ts`.
There are no other files.

The fixture commit merges `develop` into the PR branch, and the merge base is the `develop`
commit it brought in, so the diff holds only the PR's own work.

## The ecosystem

| | |
| --- | --- |
| package manager | yarn classic, from `yarn.lock` (yarn lockfile v1); no `packageManager` field |
| workspaces | none (no `workspaces` field, no workspace file) |
| test runner | jest `^30.0.0` (the lockfile resolves 30.2.0) with babel-jest `^30.0.0` (30.2.0), from `devDependencies`; the `test` script runs `jest`, with `jest.config.ts` at the root (node environment, `spec/**/*.spec.{js,ts}`, setup in `spec/setupTests.ts`, results processed by `@casualbot/jest-sonar-reporter`) |
| node | `>=22.0.0`, from `engines.node`; no `.nvmrc` or `.node-version`; CI runs jest on `lts/*` and 22 |
| TypeScript files at the fixture commit | 384 |

## Generation

Step 17 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, transformer and lockfile stay as the commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.17.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `engines.node` asks for `>=22.0.0`, CI at the commit runs `lts/*` and 22, and the suite ran without environmental trouble on 24 |
| yarn | 1.22.22 | the machine's yarn classic; the commit has no `packageManager` field, and `yarn.lock` (lockfile v1) is honoured by `--frozen-lockfile` |
| jest | 30.2.0 | the lockfile's, unchanged |
| babel-jest | 30.2.0 | the lockfile's, unchanged |
| typescript | 5.8.3 | the lockfile's, unchanged |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot, then removed; see "Skipped slots" |
| `@stryker-mutator/jest-runner` | 10.0.0 | added for the `mutation` slot, then removed; see "Skipped slots" |

## The commands

```sh
# 0. The scratch clone was a blobless partial clone, and `git log --numstat` (which atis runs
#    over up to 5000 commits) failed on objects the promisor remote would not hand back. Make
#    it a full clone first, then fetch the fixture commit, the merge base and any object still
#    missing.
cd /tmp/atis-corpus/clones/matrix-org__matrix-js-sdk
rm -f .git/objects/info/commit-graph
git config --unset remote.origin.partialclonefilter
git config --unset remote.origin.promisor
git fetch --refetch --no-tags origin
git fetch --no-tags origin fe0baa62e410379869345ba2cd8b743aa9f81aa1
git fetch --no-tags origin 3d1bcb73c1a0fb4f7a19f792072ef51f4a7c84c3
for oid in $(git rev-list --objects --missing=print \
    fe0baa62e410379869345ba2cd8b743aa9f81aa1 3d1bcb73c1a0fb4f7a19f792072ef51f4a7c84c3 \
    | grep '^?' | tr -d '?'); do git fetch --no-tags origin "$oid"; done

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `matrix-js-sdk`.
git -C /tmp/atis-corpus/clones/matrix-org__matrix-js-sdk worktree add \
  /tmp/atis-corpus/work/corpus-3/matrix-js-sdk \
  fe0baa62e410379869345ba2cd8b743aa9f81aa1 --detach

# 2. The repo's own package manager, honouring its lockfile (`--frozen-lockfile` worked). The
#    `prepare` script (`yarn build`) runs as part of it and writes the compiled `lib/` and
#    the declaration files. HUSKY=0 keeps any hook installer from touching the shared clone.
cd /tmp/atis-corpus/work/corpus-3/matrix-js-sdk
HUSKY=0 yarn install --frozen-lockfile

# 3. The current harness (D58), plus stryker for the mutation slot, at the root.
#    --ignore-scripts keeps `prepare` from rebuilding a second time.
HUSKY=0 yarn add -D --exact --ignore-scripts \
  checkride@0.17.0 fallow@3.35.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/jest-runner@10.0.0

# 4. Harness edits (see the next section for why).
python3 - <<'PY'
p = "jest.config.ts"
s = open(p).read()
old = '''    collectCoverageFrom: ["<rootDir>/src/**/*.{js,ts}"],
    coverageReporters: ["text-summary", "lcov"],
'''
s = s.replace(old, '''    collectCoverage: true,
    collectCoverageFrom: ["<rootDir>/src/**/*.{js,ts}"],
    coverageDirectory: ".check/coverage",
    coverageReporters: ["json"],
''')
open(p, "w").write(s)
PY
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
printf '\n.check\n' >> .prettierignore

# 5. The mutation attempt, run on its own first (see "Skipped slots"). The config below is
#    what the last attempt used; it was stopped after about 21 minutes of the mutation phase,
#    and the packages and the file were removed.
cat > stryker.config.json <<'CONFIG'
{
  "packageManager": "yarn",
  "testRunner": "jest",
  "plugins": ["@stryker-mutator/jest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": [
    "src/client.ts",
    "src/common-crypto/CryptoBackend.ts",
    "src/rust-crypto/rust-crypto.ts"
  ],
  "ignorePatterns": ["examples"],
  "jest": {
    "projectType": "custom",
    "config": {
      "testEnvironment": "node",
      "testMatch": ["<rootDir>/spec/**/*.spec.{js,ts}"],
      "setupFilesAfterEnv": ["<rootDir>/spec/setupTests.ts"],
      "transformIgnorePatterns": ["/node_modules/(?!(uuid|p-retry|is-network-error)).+$"],
      "testPathIgnorePatterns": [
        "/node_modules/",
        "<rootDir>/spec/unit/embedded.spec.ts",
        "<rootDir>/spec/unit/oidc/authorize.spec.ts",
        "<rootDir>/spec/unit/oidc/tokenRefresher.spec.ts"
      ],
      "testTimeout": 240000
    }
  },
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG
HUSKY=0 npx --no-install stryker run    # stopped; not complete
rm -rf .stryker-tmp stryker.config.json
HUSKY=0 yarn remove --ignore-scripts @stryker-mutator/core @stryker-mutator/jest-runner

# 6. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. YARN_SILENT=1 keeps yarn classic's banner off stdout, ahead of fallow's
#    JSON. Mutation is skipped; see "Skipped slots".
rm -rf .check tsconfig.tsbuildinfo
HUSKY=0 YARN_SILENT=1 npx --no-install checkride --all --skip security,mutation

# 7. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-corpus/work/corpus-3/matrix-js-sdk && pwd -P)" \
  --base 3d1bcb73c1a0fb4f7a19f792072ef51f4a7c84c3 \
  --out fixtures/corpus-3/map.json \
  --svg fixtures/corpus-3/atis.svg

# 8. The worktree is not kept; the clone is.
git -C /tmp/atis-corpus/clones/matrix-org__matrix-js-sdk worktree remove --force \
  /tmp/atis-corpus/work/corpus-3/matrix-js-sdk
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `yarn.lock` — two dev dependencies added at the root (`checkride`,
  `fallow`), both exact-pinned. The lockfile gains 33 resolved specs and no locked version
  moves; jest, babel-jest, typescript and every other direct dependency stay at the versions
  it locked.
- `jest.config.ts` — edited in place: `collectCoverage: true` added, `coverageDirectory` set
  to `.check/coverage`, and `coverageReporters` changed from `["text-summary", "lcov"]` to
  `["json"]`, so the `test` slot writes istanbul JSON to `.check/coverage/coverage-final.json`,
  where atis reads it. The repo already keeps its jest config at the root, which checkride
  detects, so it is edited rather than shadowed by a second config file (jest takes one config
  per directory). The repo's `collectCoverageFrom`, test environment, setup file, transform
  ignore list, reporters and sonar results processor are unchanged.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself. One line, `ignoreDependencies = ["checkride"]`, keeps the harness's own install from
  showing up as an unused dev dependency.
- `.prettierignore` — `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts.
- Run-time settings, not files: `YARN_SILENT=1` on the checkride run. yarn classic prints a
  `yarn run v1.22.22` line and the command line on stdout ahead of the tool's own output, so
  fallow's JSON was not valid JSON and checkride kept it as `dead.stdout.txt`, `dupes.stdout.txt`
  and `health.stdout.txt` rather than as the `.json` files atis reads. The first full run did
  that and was discarded; the run that produced the map is the second. `HUSKY=0` at install
  time and on the checkride run, so no hook installer touches the shared clone's
  `core.hooksPath`; it stayed unset throughout.

## Skipped slots

Named per D56. 11 slots ran.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open. It is also `pnpm audit`, which
  checkride reports unavailable under yarn.
- `mutation` — **dropped**: attempted, and it did not complete in the time allowed. Stryker
  10.0.0 with its jest runner, scoped to the PR's three changed non-test TypeScript source
  files (`git diff --name-only` between the merge base and the fixture commit), instrumented
  4,268 mutants, 142 of them static (each needs the whole suite). Three things stopped the
  initial test run until each had a stryker-only answer, none of which touches the tree or
  the `test` slot: a tracked symlink under `examples/` that points at a build output the
  commit does not contain (`ignorePatterns`); three suites that select the jsdom environment
  by docblock and report no coverage to stryker's jest environment (left out of stryker's
  inline jest config); and two libolm-migration tests that exceeded jest's 60 second default
  under stryker's instrumentation on a loaded machine (`testTimeout` of 240 seconds, inline).
  With those the initial run succeeded, 2,579 tests in 2 minutes 16 seconds. The mutation
  phase was then given about 21 minutes, on a machine under load from a second agent's suites,
  with child processes repeatedly crashing on mutants that threw outside a test, and had not
  finished, so it was stopped. Both stryker packages and `stryker.config.json` were removed,
  so nothing of the attempt is left in the worktree, and the run used
  `--skip security,mutation`.
- `pack` — checkride 0.17.0 skips it ("'pnpm pack' is unavailable under yarn").
- `struct`, `docs`, `spell`, `prose`, `publint`, `attw` — checkride 0.17.0 skips these
  itself ("no tool detected for slot"); the repo has none of their detect files, and per the
  harness policy none was added.
- `format`, `lint`, `types` — ran as the repo has them: `.prettierrc.cjs`, `.eslintrc.cjs`
  and `tsconfig.json` were already in the tree, and none was edited. checkride runs
  `eslint .` where the repo's own `lint:js` script names `src spec`, and the tree holds
  `lib/`, the build the install's `prepare` script writes, so the slot reaches files the
  script would not.
- `snippets` — ran: an opted-in slot with nothing to check, and `--all` opts it in.
- `build`, `smoke` — ran as checkride runs them at the repo root; the repo's build script and
  manifest are what they read.
