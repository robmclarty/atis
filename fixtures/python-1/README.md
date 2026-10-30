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

## The toolchain

The tree is historical; the harness is current (D58). The repo's own tools, package manager lock
and test plugins stay as the commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.19.1 | the shared copy at `/tmp/atis-languages/harness`, run from outside the tree; the commit pins none and has no `package.json` |
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

# 4. The current harness (D58): the shared checkride 0.19.1, run from outside the tree. No
#    package.json is added, since a root package.json would make checkride treat the repo as
#    TypeScript, and no pins file is needed: uv.lock lists ruff, mypy and pytest. `doctor`
#    confirms the mode ("the repo is one python project at its root") and the three tools'
#    pin source, `uv-lock`.
node /tmp/atis-languages/harness/node_modules/checkride/dist/cli.js doctor

# 5. Harness edits: none (see the next section).

# 6. The .check/ atis reads for evidence, from a clean state. There is no `--skip security`:
#    the python pack has no security slot, and checkride exits 2 on that token ("unknown token
#    'security' in --skip. Valid tokens: types, format, lint, struct, test, docs, links, spell,
#    prose, unclaimed."), so the run is `--all` alone. It took 146,272 ms.
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

Named per D56. checkride 0.19.1 listed 9 slots for this repo: 5 ran and 4 skipped.

- `security`: the python pack has no such slot in this mode. `--skip security` is refused with
  exit 2 (see step 6), so it was left off. Nothing was audited against today's advisories, which
  is what D56 asks for.
- `types`: ran and passed. mypy 1.17.1 (`.venv/bin/mypy --output json .`) exited 0 in 72,235 ms,
  so it wrote no `types.jsonl` and the summary entry's `output_file` is `null`.
- `lint`: ran and passed. ruff 0.9.2 (`ruff check --no-cache --output-format=json .`) wrote
  `lint.json` as `[]`, in 886 ms.
- `format`: opt-in, run because `--all` includes it, and passed: `ruff format --no-cache --check .`
  reported "374 files already formatted".
- `test`: ran and passed. `pytest -q` reported "1128 passed, 3 skipped in 141.63s" and exited 0
  (146,255 ms in checkride's clock). pytest writes no report, so checkride's `output_file` for it
  is `null` and only `test.stdout.txt` is kept.
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

**Cells.** 31, of three kinds. One `package`, `package:.`, the root, which owns no organelle of
its own. One `folder`, `folder:src/agents`: barrel `src/agents/__init__.py`, 113 organelles, an
interface of 165 names, 22,182 lines, read by 88 files. And 29 `directory` cells: `docs/scripts`
(2 files) and 28 under `examples/` (`examples`, `examples/agent_patterns` with 11,
`examples/basic` with 20, `examples/memory` with 8, `examples/tools` with 9, and the rest of one
to seven files each). The cells are the language's folders and the producer reads every `.py`
file as an organelle, 225 of them, plus three `.js` files under `examples/realtime/app/static/`
that the TypeScript producer reads as JavaScript terrain (D184), 228 organelles in all.

**Where atis read the cells wrongly, or at least not as D115 describes them.** The 12 packages
under `src/agents/` that have their own `__init__.py` (`extensions`, `extensions/memory`,
`extensions/models`, `handoffs`, `mcp`, `memory`, `models`, `realtime`, `tracing`, `util`, `voice`
and `voice/models`) are not cells. `place()` in `libs/core/src/modules.ts` treats a first-level
folder under a package's `src/` as one cell and folds everything below it in, so all 113 files of
`src/agents/` are the organelles of `folder:src/agents`, and `src/agents/memory/__init__.py`
shows as `is_barrel: false` among the changed files. The PR's one new module,
`src/agents/memory/openai_responses_compaction_session.py`, and `models/chatcmpl_converter.py`
therefore sit in the same cell as `run.py` and `items.py`, so the weather over the change falls
in one cell where the repo's own package structure has three (`agents`, `agents.memory` and
`agents.models`). This is the TypeScript `src/<name>/` convention applied to a Python package. A
flat layout, with the package folders at the root, takes `place()`'s fallback instead, a
`directory` cell per folder. It is recorded, not fixed.

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

**Notices**, 4, in the order atis ranked them:

1. `interface-added` on `src/agents/items.py`, primary tier, weight 146.199: "the interface of
   `src/agents` grew (`CompactionItem` added) and 88 files read it; the shape of `T`, `TResponse`,
   `TResponseInputItem` and 2 more could not be compared".
2. `interface-added` on `src/agents/__init__.py`, secondary, weight 55.62: five names added
   (`CompactionItem`, `OpenAIResponsesCompactionArgs`, `OpenAIResponsesCompactionAwareSession` and
   two more), and the shape of `__version__` could not be compared.
3. `missing-cochange` on `src/agents/tool.py`, secondary, weight 9.592: "usually changes with
   `src/agents/items.py` (8 commits, rate 0.5) and did not".
4. `other-group`, tertiary, weight 2: "3 files no shore rule claims: .typed, .yml, Makefile".

The two `interface-added` notices are the PR's real structural news, a new exported item type
and its re-export, found through the barrel. The shapes it could not compare are module-level
assignments (a `TypeVar`, type aliases and `__version__`), which carry no printable signature.
`weather.reach` lists the examples that read `src/agents/__init__.py` (one hop), and
`terrain.edges_exceptional` holds one new cross-module edge,
`examples/memory/compaction_session_example.py` to `src/agents/__init__.py`.

**Verdict on the reading.** The cells are the language's folders and packages, with the one
exception above: atis folds a `src/` package's nested packages into one cell, so for this repo the
language's modules are not cells below the top. The evidence reads as D176 settles for what it
settles (pack tools resolved from `uv.lock`, the mypy slot ok with no artifact, pytest counted as
its verdict alone, no coverage channel and the reason in `meta.instruments`), and nothing is muted
that should not be. Nothing crashed, and no file landed on the shore that should be terrain.
