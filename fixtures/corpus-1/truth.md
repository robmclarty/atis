# Ground truth · corpus fixture 1

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `cliffhall` (MEMBER), 2025-10-27,
[review 3385489190](https://github.com/modelcontextprotocol/inspector/pull/770#pullrequestreview-3385489190),
submitted against `5b9e69f36a191f24d3f33387f9cb7f8200752a25`.

> Test logging issue and naming issue straightened out, but now there's a regression in sending general metadata to tool calls.

No inline comments are attached to this review; its substance is the body above.

## Why it qualifies

The reviewer, testing the branch by hand, reports a behaviour regression: the general
metadata a user enters on the new Metadata tab is no longer sent with a tool call. The code at
the fixture commit shows why. `callTool` takes a third parameter named `metadata` for the
tool-specific values, and that name shadows the component's `metadata` state, so the merge
meant to put the general metadata first and the tool-specific metadata over it spreads the
tool-specific argument twice and never reads the state. The general entries are silently
dropped from `tools/call`. That is a bug in the PR's own TypeScript, not naming, style, docs
or changelog. The PR's component tests exercise `MetadataTab` and `ToolsTab` but not
`App.callTool`, so nothing caught it.

## The flagged thing

- `client/src/App.tsx`: the `metadata` state at line 205 (persisted to `localStorage` by
  `handleMetadataChange` at lines 221 to 224); `callTool` at lines 808 to 811, whose third
  parameter `metadata?: Record<string, unknown>` at line 811 shadows that state; and the merge
  at lines 824 to 828 (`...metadata, // General metadata first` at line 825,
  `...(metadata ?? {}), // Tool-specific metadata overrides` at line 827), sent as `_meta` at
  line 836.
- `client/src/components/ToolsTab.tsx`: lines 572 to 581, which build the tool-specific
  metadata from the tab's entries and pass it to `callTool` (the prop is wired to `App`'s
  `callTool` at `App.tsx` lines 1148 to 1156).

## What followed

The author answered with
[`1c1afc3`](https://github.com/modelcontextprotocol/inspector/pull/770/commits/1c1afc30cc6e61a8a9216c3878c295c27191b975)
(2025-10-28, "Fix global metadata not being applied"), which renames the parameter to
`toolMetadata` and spreads it after the state. The same reviewer's next review, on
[`3044d8f`](https://github.com/modelcontextprotocol/inspector/pull/770/commits/3044d8f14c83dfb5de9d60e079dc25cbc0c705c1)
(2025-10-30), confirms "tool-specific metadata is being sent in addition to general
metadata" and asks for reserved `_meta` keys to be refused, which
[`a45247a`](https://github.com/modelcontextprotocol/inspector/pull/770/commits/a45247a4f289a6ee690f3500f0e08d7144012a09)
(2025-11-14, "add validations against spec, add reserved metadata key validations") added.
The reviewer approved
[`c0b3b95`](https://github.com/modelcontextprotocol/inspector/pull/770/commits/c0b3b952f5f6ee8fa54dacfe863b1f25ef875052)
on 2025-11-18
([review 3479499765](https://github.com/modelcontextprotocol/inspector/pull/770#pullrequestreview-3479499765),
"Tested locally. LGTM!"). The PR merged into `main` the same day as
`dff91a869683a309c69aaf2868e7982f76cc22f4`, a two-parent merge commit.

## Reviews ignored

- Bot reviews: none.
- Other human reviews: 1 `APPROVED` by `pascalheidmann` (NONE) at `842aa3c` (2025-10-16),
  empty body; 2
  `CHANGES_REQUESTED` by `cliffhall` before this one, at `842aa3c` (2025-10-21, rename "Meta
  Data" to "Metadata") and at `ddbc238` (2025-10-24, remove a committed test-output folder,
  label nits); 2 `COMMENTED` by `cliffhall` at `842aa3c` (2025-10-24), thread replies; 2
  `COMMENTED` by the author `ln-12`, thread replies; 2 `CHANGES_REQUESTED` by `cliffhall` after
  the fix, at `3044d8f` (2025-10-30, reserved `_meta` keys accepted) and at `c0b3b95`
  (2025-11-18, "Validation still has some kinks in it"); 1 `APPROVED` by `cliffhall` at
  `c0b3b95` (2025-11-18).
