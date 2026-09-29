# Ground truth · retake fixture 1

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `jerelmiller` (MEMBER), 2025-05-30,
[review 2881727885](https://github.com/apollographql/apollo-client/pull/12633#pullrequestreview-2881727885),
submitted against `ea36754a35da7e9fa628d77a81c2713c8bb7d77a`.

<!-- cspell:ignore thats -->

> The code generally looks good but I think we'll need to dig a bit deeper to change the value resolves/rejected from the promise when the in-flight query is aborted, otherwise it just resolves with `data: undefined` and that might be surprising.
>
> The `useLazyQuery` tests fail for this reason so we'll need to revisit those. I can confirm though calling `retain` in those tests does work as expected so thats great news!

No inline comments are attached to this review; its substance is the body above.

## Why it qualifies

The reviewer names a behaviour defect in the code at the fixture commit: when an in-flight
query is torn down, the promise returned by `ObservableQuery.reobserve` (and so by
`useLazyQuery`'s `execute`, which at this commit stopped calling `.retain()`) resolves with
`data: undefined` instead of settling in a way a caller can tell apart from a result. He also
reports that the `useLazyQuery` tests fail because of it. That is a bug plus failing tests, not
naming, style, docs or changelog.

## The flagged thing

- `src/core/ObservableQuery.ts`: the promise built in `_reobserve` by
  `getTrackingOperatorPromise` (called at line 1399 with the default `{ data: undefined }` at
  line 1412), whose `finalize` handler at line 1816 resolves with that default when the
  operation is torn down before a result arrives.
- `src/react/hooks/useLazyQuery.ts`: `execute` returns `observable.reobserve({ ... })` at
  lines 367 to 372 without `.retain()`, which exposes that resolution to callers.
- `src/react/hooks/__tests__/useLazyQuery.test.tsx`: the tests the reviewer reports failing.

## What followed

The author answered with
[`60180f5`](https://github.com/apollographql/apollo-client/pull/12633/commits/60180f5cda6c94997614675d4c3a2eee4a5da1e9)
(2025-06-02, "throw `AbortError` from `ObservableQuery.reobserve` promise if it is not retained
and not required anymore"), which changes `ObservableQuery.ts` to reject with an `AbortError`
when no result was seen and extends `useLazyQuery.test.tsx`, then
[`9c481ca`](https://github.com/apollographql/apollo-client/pull/12633/commits/9c481ca3623794daac3d31f12097375206ceb88c)
("run format"). The same reviewer approved `9c481ca` on 2025-06-02
([review 2889314706](https://github.com/apollographql/apollo-client/pull/12633#pullrequestreview-2889314706),
"Looks great! Thank you!"). The PR merged into `release-4.0` on 2025-06-03 as
`9bfb51fdbca69560da71f9012c74ee172b6c2b69`, after two merges of `release-4.0` into the branch.

## Reviews ignored

- Bot reviews: none.
- Other human reviews: 12 `COMMENTED` reviews by the author `phryneas` (MEMBER), notes on
  their own code and replies to the reviewer; 1 `COMMENTED` review by `jerelmiller` at `2300437` (2025-05-27), inline
  suggestions and questions before this review; 1 `APPROVED` review by `jerelmiller` at
  `9c481ca` (2025-06-02), after the fix.
