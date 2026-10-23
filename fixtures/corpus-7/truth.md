# Ground truth · corpus fixture 7

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `ThieryMichel` (CONTRIBUTOR), 2026-03-20,
[review 3982614949](https://github.com/marmelab/react-admin/pull/11024#pullrequestreview-3982614949),
submitted against `23a4edd89224ba7bb44e5d0f35009115773dbd86`.

The review has no body; its substance is its seven inline comments, all on the fixture commit.

Three name the same bug. On `packages/ra-core/src/dataProvider/useCreate.ts` lines 194 to 202
([discussion r2966851785](https://github.com/marmelab/react-admin/pull/11024#discussion_r2966851785)):

> There is a bug here:  `dataProviderCreate.bind(dataProvider)` return `{data: resultType }`.
> But customMutationFn({ resource, ...params,}) return  `resultType` directly.

On `packages/ra-core/src/dataProvider/useUpdate.ts` lines 262 to 270
([discussion r2966856235](https://github.com/marmelab/react-admin/pull/11024#discussion_r2966856235)):

> Same bug here: dataProviderUpdate.bind(dataProvider) return {data: resultType }.
> But `customMutationFn({ resource, ...params,})` return `resultType` directly.

On `packages/ra-core/src/dataProvider/useUpdateMany.ts` lines 243 to 251
([discussion r2966861393](https://github.com/marmelab/react-admin/pull/11024#discussion_r2966861393)):

> Same bug here: `dataProviderUpdateMany.bind(dataProvider)` return `{data: resultType }`.
> But `customMutationFn({ resource, ...params,})` return `resultType` directly.

One asks for the hooks' guards on the new path. On
`packages/ra-core/src/dataProvider/useDelete.ts` lines 115 to 124
([discussion r2966884497](https://github.com/marmelab/react-admin/pull/11024#discussion_r2966884497)):

> Shouldn't we do those check even when receiving a customMutationFn ?
> Same for other hooks.

Three name missing tests, on `useCreate.ts:118`
([discussion r2966723487](https://github.com/marmelab/react-admin/pull/11024#discussion_r2966723487)),
`useDeleteMany.ts:110`
([discussion r2966725201](https://github.com/marmelab/react-admin/pull/11024#discussion_r2966725201))
and `useUpdateMany.ts:243`
([discussion r2966727659](https://github.com/marmelab/react-admin/pull/11024#discussion_r2966727659)).
The first reads:

> No test has been added on this  new mutationFn for useCreate

and the other two read the same with `useDeleteMany` and `useUpdateMany`.

## Why it qualifies

The reviewer names a bug in the PR's own TypeScript. The PR lets a caller pass their own
`mutationFn` to the mutation hooks. On the plain path each hook wraps the custom function so
that it resolves to the data provider's shape, `{ data }`. On the middleware path,
`getMutateWithMiddlewares`, it does not: the middleware chain is handed either the raw
`customMutationFn(...)`, which resolves to the bare record, or
`dataProviderCreate.bind(dataProvider)`, which resolves to `{ data }`. With a middleware
registered, a custom mutation function therefore yields a result of the wrong shape, in
`useCreate`, `useUpdate` and `useUpdateMany` alike. The other comments add a behaviour gap
(the custom path in `useDelete` and `useDeleteMany` skips the `resource` and id guards) and
missing tests for the new paths. None of it is naming, style, docs or changelog. The PR's one
middleware test, in `useUpdate.spec.tsx`, asserts what the custom function was called with,
not the shape of what the hook returns, so nothing caught it.

## The flagged thing

- `packages/ra-core/src/dataProvider/useCreate.ts`: `getMutateWithMiddlewares` at lines 189
  to 213, which passes `customMutationFn({ resource, ...params })` (lines 194 to 201) or
  `dataProviderCreate.bind(dataProvider)` (line 202) to the middlewares, where the plain path
  wraps the custom function as `{ data: await customMutationFn(params) }` at lines 118 to 121.
- `packages/ra-core/src/dataProvider/useUpdate.ts`: the same in `getMutateWithMiddlewares` at
  lines 257 to 281, the custom function at lines 262 to 269 and
  `dataProviderUpdate.bind(dataProvider)` at line 270.
- `packages/ra-core/src/dataProvider/useUpdateMany.ts`: the same at lines 238 to 262, the
  custom function at lines 243 to 250 and `dataProviderUpdateMany.bind(dataProvider)` at
  line 251.
- `packages/ra-core/src/dataProvider/useDelete.ts` and `useDeleteMany.ts`: the custom branch
  at lines 110 to 113 of each, which skips the `resource == null` and `id` (or `ids`) `== null`
  guards that the plain branch runs from line 114.

## What followed

The PR's second committer, `WiXSL`, answered the same day with
[`abbedc7`](https://github.com/marmelab/react-admin/pull/11024/commits/abbedc7355746e456de8065719a2b90ab9910865)
(2026-03-20, "Fix custom mutationFn middleware handling"), which gives each hook one wrapper
that runs the guards and returns `{ data }` on both paths, and adds tests for `useCreate`,
`useDeleteMany` and `useUpdateMany`. The same reviewer approved `abbedc7` on 2026-03-23
([review 3990186250](https://github.com/marmelab/react-admin/pull/11024#pullrequestreview-3990186250),
no body) and merged the PR into `master` that day as
`ddb1709bd43c2e3cc290769edb56f43d03796d3d`, a two-parent merge commit. No revert followed:
the one revert on `master` since that touches these hooks, `ca34b93` (#11331), undoes a later
PR's error types (#11322), and `useCreate.ts` on `master` still routes the custom function
through its `{ data }` wrapper on the middleware path.

## Reviews ignored

- Bot reviews: 1 `COMMENTED` by `copilot-pull-request-reviewer[bot]` at `3448aad`
  (2025-11-06), with five inline comments that the options type accepted a `mutationFn` the
  hooks then overrode. The PR has no issue comments.
- Other human reviews: 1 `APPROVED` by `slax57` (CONTRIBUTOR) at `3448aad` (2025-11-06), empty
  body; 1 `CHANGES_REQUESTED` by `slax57` at `3448aad` (2025-11-06, agreeing with the bot that
  the type and the runtime disagreed, and asking for the PR to target `master`); 1
  `COMMENTED` by `WiXSL` at `5738e6a` (2026-03-18), a thread note explaining a cast; 1
  `CHANGES_REQUESTED` by `ThieryMichel` at `d48c6b3` (2026-03-20, one inline comment
  suggesting the options type be changed instead of the cast); 1 `APPROVED` by
  `ThieryMichel` at `abbedc7` (2026-03-23), after the fix.
