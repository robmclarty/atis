# Python fixture 1

An outside project's pull request in Python, step 86's fixture for the language producers,
reviewed at range 24's stop. It is not part of a blind reading, so this README and the truth name
the repo freely. Its ground truth is in [`truth.md`](./truth.md).

## The change

| | |
| --- | --- |
| repo | `openai/openai-agents-python` (<https://github.com/openai/openai-agents-python>), MIT (`LICENSE` at the fixture commit: "MIT License, Copyright (c) 2025 OpenAI") |
| pull request | [#2224](https://github.com/openai/openai-agents-python/pull/2224) `feat: #2206  Add responses.compact: auto-compact long conversations` |
| base branch | `main` |
| fixture commit | `cb496bf887b988d3c81848b90be3f7ea05cdbfef` `test: Add comprehensive tests for compaction session (#2206)`: the commit a human review was submitted against |
| merge base | `7404531696624f23f4e9c41a9bb84a8f7afb23a9` `Update all translated document pages (#2219)` |
| size | 10 files, +618 −9 at the fixture commit (the merged PR is 10 files, +679 −9); 9 Python files that atis's producer reads as terrain, 8 under `src/agents/` and one example, and 1 test file |

The eight source files are `src/agents/__init__.py`, `_run_impl.py`, `items.py`, `run.py`,
`memory/__init__.py`, `memory/session.py`, `memory/openai_responses_compaction_session.py` (new,
215 lines) and `models/chatcmpl_converter.py`. The ninth terrain file is
`examples/memory/compaction_session_example.py` (new), which the producer reads as terrain because
a Python file outside `tests/` is source. The test is
`tests/memory/test_openai_responses_compaction_session.py` (new).

The PR adds a session wrapper that calls the Responses API's `responses.compact` once enough of
the history is compactable, with a protocol (`OpenAIResponsesCompactionAwareSession`) that
`run.py` checks a session against after each turn.

The merge base is `git merge-base` of the fixture commit and `origin/main`, and agrees with the
compare API's `merge_base_commit`; the fixture commit is three commits ahead of it, all the PR
author's and all on the PR's branch, so it is reachable from `refs/pull/2224/head`. The PR's
last four commits (`5b64355`, `25e4e83`, `bf7874b`, `cc3c67a`) came after the review. It
squash-merged on 2026-01-09 as `09443fd044e5d58a523ab06e243ed68985788145`, whose one parent,
`b5d9152`, is not the merge base: `main` moved on 16 commits while the PR was open.

## The ecosystem

| | |
| --- | --- |
| package manager | uv. `uv.lock` is `version = 1`, `revision = 3`, `requires-python = ">=3.9"`, with 143 `[[package]]` entries. CI sets `UV_FROZEN: "1"` and installs with `make sync`, which is `uv sync --all-extras --all-packages --group dev` |
| layout | a `src/` layout: one distribution, `openai-agents` (hatchling, wheel `packages = ["src/agents"]`), imported as `agents`. `src/agents/` holds 113 Python files in 13 packages: the root and `extensions/`, `extensions/memory/`, `extensions/models/`, `handoffs/`, `mcp/`, `memory/`, `models/`, `realtime/`, `tracing/`, `util/`, `voice/` and `voice/models/`, each with an `__init__.py`. `pyproject.toml` has a `[tool.uv.workspace]` table naming a member `agents` that the commit has no directory for (uv accepted it), and no `[project.scripts]` |
| other Python | 110 files under `examples/` (79 with an `if __name__ == "__main__"` guard), 2 under `docs/scripts/` (both guarded), 148 under `tests/` (4 `conftest.py`). 373 Python files in all |
| test runner | pytest 8.4.1 with pytest-asyncio 1.1.0 (`asyncio_mode = "auto"` in `[tool.pytest.ini_options]`), pytest-mock 3.14.1 and inline-snapshot 0.27.2. `tests/conftest.py` sets `OPENAI_API_KEY` to `test_key` when it is unset, so no test needs a key. CI runs `make coverage` (`coverage run -m pytest`, failing under 95%) on Python 3.10 to 3.14 with `OPENAI_API_KEY: fake-for-tests` |
| linters | ruff 0.9.2 (the dev group pins `ruff==0.9.2`): `[tool.ruff]` with `line-length = 100`, `target-version = "py39"`, rules `E`, `W`, `F`, `I`, `B`, `C4` and `UP`, isort `combine-as-imports` with `known-first-party = ["agents"]`, and `E501` ignored under `examples/`. mypy 1.17.1, unpinned in the dev group and locked there: `[tool.mypy] strict = true` with `disallow_incomplete_defs`, `disallow_untyped_defs` and `disallow_untyped_calls` turned off and one override, `sounddevice.*` with `ignore_missing_imports`. CI's `make format-check`, `make lint` and `make mypy` are `ruff format --check`, `ruff check` and `mypy . --exclude site` |
| python | no `.python-version`. CI's lint and typecheck jobs name none, and its test matrix names 3.10, 3.11, 3.12, 3.13 and 3.14. The run uses 3.12, which both sit inside |

## Generation

Step 86 generated `map.json` and `atis.svg` here on 2026-10-28 by the D58 worktree procedure: a
full clone, a worktree at the fixture commit, the install CI's `make sync` runs, the current
checkride (0.19.1) run from outside the tree over a clean `.check/`, and atis's run over the
result. The tree pins ruff, mypy and pytest in `uv.lock`, so no pins file was needed and checkride
ran each from the uv-synced `.venv` at its locked version. Nothing in the tree was changed.

Step 124 regenerated both on 2026-10-31, once core gave a package under `src/<name>/` with its
own barrel a cell of its own (D187), by the same commands from a fresh clone, since a reboot had
cleared `/tmp`. The shared checkride moved to 0.19.2, released that day, per D58 (command 4 now
installs it); its changes are to its own report and `init`, and no artifact this pack writes
moved. The run took 95,259 ms. Its `test` slot passed 1,121 tests and skipped 4 where step 86's
passed 1,128 and skipped 3: Docker was not running, so
`tests/extensions/memory/test_dapr_redis_integration.py` skipped its 7 tests as one module
("Docker daemon is not available"). atis reads `test` as its verdict alone, which is the same.
atis's run took 5 seconds. "What atis read" says what moved.

## The toolchain

The tree is historical; the harness is current (D58). The repo's own tools, package manager lock
and test plugins stay as the commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.19.2 | the shared copy at `/tmp/atis-languages/harness`, run from outside the tree; the commit pins none and has no `package.json`. Step 86 ran 0.19.1 |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; checkride's runtime |
| uv | 0.11.7 | the machine's (Homebrew); CI's `astral-sh/setup-uv@v5` names no version |
| python | 3.12.13 | uv's own install (`cpython-3.12.13-macos-aarch64-none`), chosen with `uv sync --python 3.12`; `.venv/bin/python` |
| ruff | 0.9.2 | `uv.lock`; checkride records `pin_source: "uv-lock"` and `tool_version: "0.9.2"` for the `lint` and `format` checks |
| mypy | 1.17.1 | `uv.lock`; `pin_source: "uv-lock"`, `tool_version: "1.17.1"` for the `types` check |
| pytest | 8.4.1 | `uv.lock`; `pin_source: "uv-lock"`, `tool_version: "8.4.1"` for the `test` check |
| pytest-asyncio, pytest-mock, inline-snapshot | 1.1.0, 3.14.1, 0.27.2 | `uv.lock`, unchanged |
| basedpyright | not run | not in `uv.lock`, and no `pyrightconfig.json` or `[tool.pyright]` table at the commit, so the adapter is not detected; mypy fills `types` |
| python3 for atis's helper | 3.14.6 | the first `python3` on `PATH` (Homebrew); atis's helper runs it under `-I -S` and reads every file with `ast` alone |

## The commands

```sh
# 0. A full clone, not a blobless one. The fixture commit is on the PR's branch, so the PR's
#    head ref is fetched too.
git clone https://github.com/openai/openai-agents-python.git \
  /tmp/atis-languages/clones/openai__openai-agents-python
git -C /tmp/atis-languages/clones/openai__openai-agents-python \
  fetch origin pull/2224/head:refs/remotes/origin/pr-2224

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads
#    `openai-agents-python`.
git -C /tmp/atis-languages/clones/openai__openai-agents-python worktree add \
  /tmp/atis-languages/work/python-1/openai-agents-python \
  cb496bf887b988d3c81848b90be3f7ea05cdbfef --detach

# 2. Keep any installer off git hooks, and freeze the lockfile as CI does.
export HUSKY=0 LEFTHOOK=0 SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 UV_FROZEN=1

# 3. The repo's own install, as CI's `make sync` runs it. checkride's spawn environment sets
#    UV_OFFLINE=1, so everything a check needs is fetched here. Python 3.12 is named because the
#    repo names none (see "The ecosystem").
cd /tmp/atis-languages/work/python-1/openai-agents-python
uv sync --all-extras --all-packages --group dev --python 3.12

# 4. The current harness (D58): the shared checkride 0.19.2, run from outside the tree. No
#    package.json is added, since a root package.json would make checkride treat the repo as
#    TypeScript, and no pins file is needed: uv.lock lists ruff, mypy and pytest. `doctor`
#    confirms the mode ("the repo is one python project at its root") and the three tools'
#    pin source, `uv-lock`.
npm install --prefix /tmp/atis-languages/harness --save-exact --ignore-scripts checkride@0.19.2
node /tmp/atis-languages/harness/node_modules/checkride/dist/cli.js doctor

# 5. Harness edits: none (see the next section).

# 6. The .check/ atis reads for evidence, from a clean state. There is no `--skip security`:
#    the python pack has no security slot, and checkride exits 2 on that token ("unknown token
#    'security' in --skip. Valid tokens: types, format, lint, struct, test, docs, links, spell,
#    prose, unclaimed."), so the run is `--all` alone. It took 146,272 ms at step 86 and
#    95,259 ms at step 124.
rm -rf .check
node /tmp/atis-languages/harness/node_modules/checkride/dist/cli.js --all

# 7. The summary, kept for the reviewer.
cp .check/summary.json /tmp/atis-languages/work/python-1.summary.json

# 8. The map and the still render, from atis's current build. --repo takes the resolved path,
#    not the /tmp symlink (on macOS /tmp is /private/tmp). It took 3 seconds.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-languages/work/python-1/openai-agents-python && pwd -P)" \
  --base 7404531696624f23f4e9c41a9bb84a8f7afb23a9 \
  --out fixtures/python-1/map.json \
  --svg fixtures/python-1/atis.svg

# 9. Inspect.
node /tmp/atis-languages/tools/summarize.cjs fixtures/python-1/map.json --cells

# 10. The worktree is not kept; the clone is.
git -C /tmp/atis-languages/clones/openai__openai-agents-python worktree remove --force \
  /tmp/atis-languages/work/python-1/openai-agents-python
```

## Harness changes in the worktree

None. No file of the tree was added, edited or removed: no `package.json`, no pins file, no
`checkride.config.json`, and no change to `pyproject.toml` or `uv.lock`. What the run left in the
worktree is `.venv/` (uv's environment, which the repo's `.gitignore` covers) and `.check/`
(checkride's artifacts, the one untracked path). Run-time settings, not files: `HUSKY=0`,
`LEFTHOOK=0`, `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1` and `UV_FROZEN=1`, and the variables checkride's
python pack sets itself for every spawn (`PYTHONDONTWRITEBYTECODE=1`, `PIP_NO_INDEX=1`,
`UV_OFFLINE=1`). No test was edited, skipped or deleted, and no timeout was raised.

## Skipped slots

Named per D56. checkride lists 9 slots for this repo, 0.19.1 at step 86 and 0.19.2 at step 124:
5 ran and 4 skipped. The timings below are step 86's, with step 124's where they differ.

- `security`: the python pack has no such slot in this mode. `--skip security` is refused with
  exit 2 (see step 6), so it was left off. Nothing was audited against today's advisories, which
  is what D56 asks for.
- `types`: ran and passed. mypy 1.17.1 (`.venv/bin/mypy --output json .`) exited 0 in 72,235 ms
  (95,253 ms at step 124), so it wrote no `types.jsonl` and the summary entry's `output_file` is
  `null`.
- `lint`: ran and passed. ruff 0.9.2 (`ruff check --no-cache --output-format=json .`) wrote
  `lint.json` as `[]`, in 886 ms (851 ms).
- `format`: opt-in, run because `--all` includes it, and passed: `ruff format --no-cache --check .`
  reported "374 files already formatted".
- `test`: ran and passed. `pytest -q` reported "1128 passed, 3 skipped in 141.63s" and exited 0
  (146,255 ms in checkride's clock). At step 124 it reported "1121 passed, 4 skipped in 56.80s"
  (62,800 ms): with no Docker daemon running, the 7 tests of
  `tests/extensions/memory/test_dapr_redis_integration.py` skip as one module. pytest writes no
  report, so checkride's `output_file` for it is `null` and only `test.stdout.txt` is kept.
- `links`: ran and **stayed red** on the tree's own docs: 10 relative markdown links do not
  resolve to a file on disk, all under `docs/`: `running_agents.md:54`, `ja/running_agents.md:58`,
  `ja/sessions.md:457`, `ko/handoffs.md:89`, `ko/running_agents.md:58`, `ko/sessions.md:458`,
  `zh/running_agents.md:58`, `zh/sessions.md:458`, and `zh/models/index.md` at lines 55 and 74.
  Four point at `agents.run.Runner`, an mkdocstrings identifier used as a link target; three at
  `ref/memory/openai_conversations_session.md` from translated pages whose language folder has no
  `ref/`; two at `../litellm.md`, which resolves to `docs/zh/litellm.md` while the file is
  `docs/zh/models/litellm.md`; and one is a Korean sentence read into a link target. They belong
  to the tree and are left as run.
- `struct`, `docs`, `spell`, `prose`: checkride skips these itself ("no tool detected for slot");
  the repo has none of their detect files (`sgconfig.yml`, a markdownlint or rumdl config, a
  cspell or typos config, `.vale.ini`), and per the harness policy none was added. `typos` is on
  `PATH` but nothing in the repo turns the slot on.
- `mutation`: not a Python slot; mutation is attempted for JavaScript only.
- coverage: no pack writes coverage, so the run has none, and `meta.instruments` says so. The
  repo's CI measures coverage with `coverage run -m pytest`, which checkride does not run.

## What atis read

**Cells.** 43, of three kinds. One `package`, `package:.`, the root, which owns no organelle of
its own. 13 `folder` cells, one for each package under `src/agents/`, each entered through its
`__init__.py`: `src/agents` itself (28 organelles, an interface of 165 names, 8,325 lines, read by
134 files and reading 19), and beside it, under the same package, `extensions` (4 files),
`extensions/memory` (6), `extensions/models` (3), `handoffs` (2), `mcp` (3), `memory` (6),
`models` (12), `realtime` (15), `tracing` (12), `util` (7), `voice` (11) and `voice/models` (4).
And 29 `directory` cells: `docs/scripts` (2 files) and 28 under `examples/` (`examples`,
`examples/agent_patterns` with 11, `examples/basic` with 20, `examples/memory` with 8,
`examples/tools` with 9, and the rest of one to seven files each). The cells are the language's
packages and folders, and the producer reads every `.py` file as an organelle, 225 of them, plus
three `.js` files under `examples/realtime/app/static/` that the TypeScript producer reads as
JavaScript terrain (D184), 228 organelles in all.

**What moved at step 124.** Step 86's map had 31 cells: the 12 packages under `src/agents/` with
their own `__init__.py` were not cells, since `place()` in `libs/core/src/modules.ts` read a
first-level folder under a package's `src/` as one cell and folded everything below it in, so all
113 files were organelles of `folder:src/agents`. Step 124 gave each directory inside a
`src/<name>/` folder module with a barrel of its own a folder cell beside it (D187), and a
barrel-less directory still folds into the nearest package above it. What moved:

- `folder:src/agents` holds 28 files, not 113, and 8,325 lines, not 22,182. Its fan-in is 134,
  not 88, since its subpackages' files now read it from outside, and it reads 19 files outside
  it, not 0. It sits in band 1, not band 0. Its interface is the same 165 names.
- The change falls in three cells, as the repo's own packages have it: `memory/__init__.py`,
  `memory/session.py` and the new `memory/openai_responses_compaction_session.py` in
  `folder:src/agents/memory`, `models/chatcmpl_converter.py` in `folder:src/agents/models`, and
  the other four in `folder:src/agents`. `memory/__init__.py` reads `is_barrel: true`.
- `weather.reach` lists the same 164 files, across 37 cells, not 26.
- `terrain.edges_exceptional` holds three new cross-module edges, not one: the example to
  `src/agents/__init__.py` as before, and the new compaction session module to
  `src/agents/items.py` and to `src/agents/models/_openai_shared.py`, which now cross from one
  cell into another.
- Four of the new cells show an interface of 0 and no exports: `util` (read by 21 files),
  `extensions` (7), `extensions/models` (2) and `voice/models` (2). Their `__init__.py` exports
  nothing and their readers import the submodules directly, while a folder cell's interface is
  its barrel (D45). Interface notices still find those submodules, since they look for files
  imported from outside their cell; the cell's shown interface is what goes quiet.
- The bands, every organelle's band and reachability, the wiring's 351 edges, the slots and the
  outside packages are unchanged.

**Where the tests and manifests went.** All 148 files under `tests/` are in the shore's `tests`
group, not terrain: `tests/__init__.py`, the four `conftest.py` files, the `test_*.py` modules and
the helpers beside them (`fake_model.py`, `fake_models.py`, `helpers.py`, `streaming_app.py`,
`testing_processor.py`, `simple_session.py`). `pyproject.toml` and `uv.lock` are in `deps` with
two `requirements.txt` files under `examples/realtime/`. The other shore groups: `docs` 247
(238 `.md`, the `LICENSE`, images, two `.txt` and a stylesheet), `ci` 5 (`.github/workflows/`),
`examples` 10 (a notebook, images, a PDF, text samples, an HTML page and an icon), `settings` 3,
`prompts` 2 (`AGENTS.md`, `CLAUDE.md`), `config` 1 (`.prettierrc`) and `other` 3 (`Makefile`,
`mkdocs.yml`, `src/agents/py.typed`).

**Entry points.** `meta.instruments.entry_points` is `manifests`, with the reason "typescript:
no local fallow at node_modules/.bin/fallow; python: pyproject.toml scripts and \_\_main\_\_ name
the entry points". `pyproject.toml` has no `[project.scripts]` and there is no `__main__.py`, so
the entry points are the modules with a `__main__` guard: 79 under `examples/` and 2 under
`docs/scripts/`. `src/agents/` has none of its own, so its files take bands 0 to 6 by their
depth from the examples that import `agents`. 205 of the 228 organelles are reachable; the 23
that are not are 17 under `examples/` (mostly `__init__.py` files and the three `.js` files) and
6 under `src/agents/` (`extensions/__init__.py`, `extensions/models/__init__.py`,
`extensions/visualization.py`, `tracing/logger.py`, `util/__init__.py` and
`voice/models/__init__.py`). Nothing there looks misread:
`examples/realtime/twilio_sip/server.py` has no `__main__` guard (uvicorn starts it), and
`src/agents/util/__init__.py` is an empty file that the tree imports only through its
submodules.

**Instruments**, `meta.instruments` verbatim where it matters:

```text
"mode": "check"
"entry_points": "manifests"
"entry_points_reason": "typescript: no local fallow at node_modules/.bin/fallow; python: pyproject.toml scripts and __main__ name the entry points"
"muted": [
  "coverage: pytest writes none",
  "test: pytest writes no report, so the run counts as its verdict alone"
]
"structure": { "base": { "reason": "no local fallow at node_modules/.bin/fallow" },
               "head": { "reason": "no local fallow at node_modules/.bin/fallow" } }
```

The `muted` lines are the ones D176 settles: pytest writes no coverage and no report, so the
files have no coverage channel (no gap) and `test` counts as its verdict alone. `structure` is
fallow's, a TypeScript instrument, and a Python tree has no `node_modules`, so it reads nothing
for either side; the three `.js` files are why the entry-points reason names TypeScript at all.

**Slots as atis read them** (`weather.checks`, `checks_run` 5, category `MVFR`): `types` ok,
`format` ok, `lint` ok, `test` ok, `links` **not ok**, and `docs`, `prose`, `spell` and `struct`
skipped, every one with scope `global`. `weather.evidence` is `{}`: ruff found nothing, mypy
found nothing, and there is no patch coverage, so the `lint` and `types` channels carry no
finding on this tree. The fixture therefore shows the green path of D176's reading (the slots
read, `tool_version`s matched, no channel muted by mistake), not a finding passing through a
parser. The category is `MVFR` because the changed barrel `src/agents/__init__.py` is imported
from outside its cell, by the examples (D27's escaped interface), not because of `links`: that
slot is red on docs the change did not touch, so it is standing state (D69) and sets nothing.

**Notices**, 6, in the order atis ranked them:

1. `interface-added` on `src/agents/memory/session.py`, primary tier, weight 255.303: "the
   interface of `src/agents/memory` grew (`OpenAIResponsesCompactionArgs`,
   `OpenAIResponsesCompactionAwareSession` and `is_openai_responses_compaction_aware_session`
   added) and 8 files read it and it sits in band 4".
2. `interface-added` on `src/agents/items.py`, secondary, weight 157.829: "the interface of
   `src/agents` grew (`CompactionItem` added) and 134 files read it; the shape of `T`,
   `TResponse`, `TResponseInputItem` and 2 more could not be compared".
3. `interface-added` on `src/agents/memory/__init__.py`, secondary, weight 74.979: four names
   added (`OpenAIResponsesCompactionArgs`, `OpenAIResponsesCompactionAwareSession`,
   `OpenAIResponsesCompactionSession` and one more), read by 8 files, in band 4.
4. `interface-added` on `src/agents/__init__.py`, tertiary, weight 56.091: five names added
   (`CompactionItem`, `OpenAIResponsesCompactionArgs`, `OpenAIResponsesCompactionAwareSession` and
   two more), and the shape of `__version__` could not be compared.
5. `interface-uncompared` on `src/agents/models/chatcmpl_converter.py`, tertiary, weight 28.28:
   "the interface of `src/agents/models` was touched and 13 files read it; the shape of
   `ResponseInputContentWithAudioParam` could not be compared".
6. `interface-uncompared` on `src/agents/run.py`, tertiary, weight 26.926: "the interface of
   `src/agents` was touched and 134 files read it; the shape of `CallModelInputFilter` and
   `DEFAULT_AGENT_RUNNER` could not be compared".

Step 86's map had four: the notices on `items.py` and `src/agents/__init__.py`, then
`missing-cochange` on `src/agents/tool.py` (weight 9.592: "usually changes with
`src/agents/items.py` (8 commits, rate 0.5) and did not") and `other-group` (weight 2: "3 files
no shore rule claims: .typed, .yml, Makefile"). With the packages as cells, `agents.memory`'s
new surface is read from outside its cell, and so are the names `models` and `run.py` keep, so
four more interface notices outrank those two, and they fall below the six core keeps (one
primary, two secondary, three tertiary). The ghost is still in `weather.ghosts`, and the three
files are still in `other`.

The interface notices are the PR's real structural news: the session protocol and wrapper in
`agents.memory` and their re-export from its `__init__.py`, and a new exported item type in
`agents` with its re-export from the barrel. The shapes atis could not compare are module-level
assignments (a `TypeVar`, type aliases, `__version__` and the runner's default), which carry no
printable signature.

**Verdict on the reading.** The cells are the language's packages and folders: each of the 13
packages under `src/agents/` is a cell (D187), and the change's weather falls in the three the PR
touches. The evidence reads as D176 settles for what it settles (pack tools resolved from
`uv.lock`, the mypy slot ok with no artifact, pytest counted as its verdict alone, no coverage
channel and the reason in `meta.instruments`), and nothing is muted that should not be. Nothing
crashed, and no file landed on the shore that should be terrain. The one gap left is the four
packages whose `__init__.py` exports nothing, which show no interface of their own.
