# Ground truth · javascript fixture 1

An outside project's pull request in JavaScript, step 86's fixture for the language producers;
not part of a blind reading, so this file and [`README.md`](./README.md) name the repo freely.

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `dummdidumm` (MEMBER), 2025-06-11,
[review 2917805737](https://github.com/sveltejs/svelte/pull/16131#pullrequestreview-2917805737),
submitted against `b6a4afd6b2bbefd8371196601580bee68b059177`, the PR's seventeenth commit of
twenty.

The body:

> The debug field is necessary in each block cases like this:
>
> - [prod shows the correct stack back to the source](https://svelte.dev/playground/hello-world?version=5.33.19#H4sIAAAAAAAACnWQ0WrDMAxFf0VohSYQEvaapYE9DPYPTR9cR6Fmrm1sdV0x_vfhpNvasT0ZXenKVyeiEUfCFl9Jawtn6_UIBY2KaSyxwklpCthuI_LF5bksYPXlenauDu-kOWt7EegvXVrDZDhgi12QXjnuBzOwOjrrGV4M-wtM3h5hXTdzdbWu85QmBuG9uMAGVoEFU-3FudhGUGMLjxUcVAvsTwRpVw6ma35-MN3-xGwNWCO1km-bWJSw6b_X3e-YhA6Udqk_uVEwdc1inhfFBxLycDWKADRnLuanVmOZctJuuSTOaoKmH0xssi9hhUwfjG3Omap_WN6efk_zV-cfnplUvEZLmZbz1oWifMoXDLyiaSLJxcIgZmnglTLBkeSavZBUrGf3ulyac5HdnG7J3l-zq5CF0mdlRmwXhp-G9ZP4VAIAAA==)
> - [this PR ends up in generated code, making the stack useless](https://svelte.dev/playground/hello-world?version=pr-16131#H4sIAAAAAAAACnWQ0WrDMAxFf0VohSYQEvaapYE9DPYPTR9cR6Fmrm1sdV0x_vfhpNvasT0ZXenKVyeiEUfCFl9Jawtn6_UIBY2KaSyxwklpCthuI_LF5bksYPXlenauDu-kOWt7EegvXVrDZDhgi12QXjnuBzOwOjrrGV4M-wtM3h5hXTdzdbWu85QmBuG9uMAGVoEFU-3FudhGUGMLjxUcVAvsTwRpVw6ma35-MN3-xGwNWCO1km-bWJSw6b_X3e-YhA6Udqk_uVEwdc1inhfFBxLycDWKADRnLuanVmOZctJuuSTOaoKmH0xssi9hhUwfjG3Omap_WN6efk_zV-cfnplUvEZLmZbz1oWifMoXDLyiaSLJxcIgZmnglTLBkeSavZBUrGf3ulyac5HdnG7J3l-zq5CF0mdlRmwXhp-G9ZP4VAIAAA==)
>
> It's because the each block creates signals for each array entry if it needs to.
>
> Somehow it gets weirder [when using `$state` as now every part of the entry is logged for some reason](https://svelte.dev/playground/hello-world?version=pr-16131#H4sIAAAAAAAACnWQwWrDMBBEf2XZBmKDsenVdQw9FPoPcQ6KvCaiiiSkTdMg9O9FdtompT0Jze4sMy-iEUfCFl9Jawtn6_UIBY2KaSyxwklpCthuI_LF5b0sYPXlenauDu-kOWt7EegvXVrDZDhgi12QXjnuBzOwOjrrGV4M-wtM3h5hXTfz72pd5y1NDMJ7cYENrAILpmIbQY0tPFZwUC2wPxGkXTmYrvm5brr9idkasEZqJd82sShh03-fur8xCR0o7VJ_cqNg6prFPB-KDyTk4WoUAWjOW8xPrcYy5ZTd0iLOaoKmH0xssi9hhUwfjG3Omap_ON7Wvif5a_IPy0wpXqOlTMp560JRPuUGA69omkhysTCIWRp4pUxwJLlmLyQV69m9Lpfh_MluTrdk79vsKmSh9FmZEduF4SefL7fhUAIAAA==)

The review has no inline comments, and the PR has none at all: the body is the whole of it. The
three links are Svelte playground links. The first is built with `version=5.33.19`, the released
Svelte, and the other two with `version=pr-16131`, the PR's build.

## Why it qualifies

The reviewer names a behaviour regression in the PR's own JavaScript, not naming, style, docs or
a changelog. The PR tidies the dev-only `$inspect.trace()` code, and one thing it removes is the
`debug` field. `create_item`, in the `each` block's runtime, sets `debug` on the source it
creates for a reactive item: a closure that re-reads the collection at the item's index, so that
a trace of an item reaches back through the collection to the user's source. `log_entry` and
`get` read it. The PR body says of it: "I couldn't for the life of me figure out how to make
this do anything useful, and no tests failed when I removed it." The reviewer says it is needed
"in each block cases like this" and links one: with the released build "prod shows the correct
stack back to the source", and with the PR's build the stack "ends up in generated code, making
the stack useless". The removed code was load-bearing and no test covered it.

## The flagged thing

At the fixture commit, `b6a4afd6b2bbefd8371196601580bee68b059177`:

- `packages/svelte/src/internal/client/dom/blocks/each.js`: `create_item`, lines 525 to 527, the
  place between `var i = ...` (line 525) and the `EachItem` object (line 527) where the merge
  base's `if (DEV && reactive) { ... }` block stood and the PR deleted it: the block that set
  `v.debug = () => { ... get_collection()[collection_index] }`.
- `packages/svelte/src/internal/client/dev/tracing.js`: `log_entry`, lines 22 to 72, which no
  longer consults `signal.debug` (the merge base captured the signals `debug()` read and logged
  those in place of the item's own entry), and `trace`, lines 79 to 113.
- `packages/svelte/src/internal/client/runtime.js`: `get`, the `TracedAt` block at lines 764 to
  789, which no longer calls `signal.debug()` when it is set.
- `packages/svelte/src/internal/client/reactivity/sources.js`: `source`, lines 69 to 73, where
  `signal.debug = null` became `signal.updated = null` and `signal.set_during_effect = false`.
- `packages/svelte/src/internal/client/reactivity/types.d.ts`: the `Value` interface, lines 10
  to 32, which lost `debug`.

## What followed

The author, `Rich-Harris`, answered in a comment the same day, 2025-06-11 at 21:49 UTC:
"alright, that should be fixed now". Three commits followed the reviewed one, all his:
`1ece2eb1a` (`Revert "unused"`), `35783c376` (`complete revert`) and `281b97256` (`ok it works
now`). `dummdidumm` approved `281b97256` the same day at 22:42 UTC
([review 2918919844](https://github.com/sveltejs/svelte/pull/16131#pullrequestreview-2918919844),
no body), and `Rich-Harris` squash-merged it into `main` under two minutes later, at 22:44 UTC,
as `438349eb88335fce7f199aac0b95ef05bfb7f453`, whose one parent is `292af8d38` (#16117), two
commits on `main` past the merge base. The merged commit puts the link back, renamed: `each.js`
still sets a closure on the item's source, now called `trace`, `get` calls `signal.trace()` when
it is set, `sources.js` initialises `signal.trace = null`, and `types.d.ts` declares
`trace?: null | (() => void)`. No revert followed: the later commits on `main` that touch
`tracing.js` (among them #16452, #17001, #17154 and #17183) extend or change the code, and none
reverts the PR.

## Reviews ignored

- Bot reviews: none. Bot issue comments: `changeset-bot[bot]` (a changeset detected),
  `svelte-docs-bot[bot]` (a docs preview link) and `github-actions[bot]` (a pkg.pr.new
  playground link).
- Other human reviews: none; `dummdidumm` is the PR's only reviewer, with the two reviews above.
- Reviews by the PR's author: none. His one issue comment is quoted under "What followed".
