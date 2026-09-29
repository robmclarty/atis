# Ground truth · retake fixture 3

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `KATT` (MEMBER), 2025-10-19,
[review 3354593515](https://github.com/trpc/trpc/pull/6976#pullrequestreview-3354593515),
submitted against `e11a7d2410fff83e45a0c7da14b6be50d952673e`.

> No breaking changes pls 🙃

No inline comments are attached to this review. The same reviewer had spelled out the break
about 90 minutes earlier, in a separate `COMMENTED` review against the same commit, on
`www/docs/client/tanstack-react-query/server-components.mdx:339`, the docs line where
consumer code had to change from `queryKey[1]` to `queryKey[2]`
([comment r2443362936](https://github.com/trpc/trpc/pull/6976#discussion_r2443362936)):

> This will cause a breaking change for some - can we do it so we only prepend a prefix if there is one?

and in a reply on the same thread
([comment r2443364937](https://github.com/trpc/trpc/pull/6976#discussion_r2443364937)):

> `TRPCQueryKey` should probably become `TRPCQueryKey<TIsPrefixed extends boolean = false /* for backwards compat*/>`?

## Why it qualifies

The review blocks the PR on an interface risk in the code at the fixture commit: the public
`TRPCQueryKey` and `TRPCMutationKey` types gain a leading `prefix` element, and every query and
mutation key is built with that element even when no prefix is configured, so any consumer
that reads or builds keys by index breaks. That is a breaking change to a public interface, not
naming, style, docs or changelog; the docs line the reviewer commented on is where the break
shows, not the thing he asks to change.

## The flagged thing

- `packages/tanstack-react-query/src/internals/types.ts`: `TRPCQueryKey` (line 86) and
  `TRPCMutationKey` (line 95) now start with `prefix: readonly string[]`.
- `packages/tanstack-react-query/src/internals/utils.ts`: `getQueryKeyInternal` (line 85) and
  `getMutationKeyInternal` (line 145) default the prefix to `[]` (lines 98, 151) and always
  prepend it (lines 107, 132, 157); `getClientArgs` now reads the path from `queryKey[1]`
  (line 34).
- `createOptionsProxy.ts` in the same directory builds the prefix array (empty when none is
  configured) and passes it to every key builder; `Context.tsx` adds the `queryKeyPrefix`
  provider prop.

## What followed

The author answered with
[`7ac72b1`](https://github.com/trpc/trpc/pull/6976/commits/7ac72b1d883a74352550dec6fee9899050e12123)
(2025-10-19, "WIP: add type-level feature flag for prefixing query") and
[`9cace90`](https://github.com/trpc/trpc/pull/6976/commits/9cace906a3c6b7c7b313de890217109215aa37da)
(2025-10-20, "Move to defaults for existing TRPCQueryKey type"), then further refactors; the
reviewer's own branches #6986 ("simplify") and #6987 ("Prefix query key 2") merged into the PR
on 2025-10-25. In the merged code `TRPCQueryKey<TPrefixEnabled extends boolean = false>`
defaults to the unprefixed shape and the key builders prepend a prefix only when one is set.
The reviewer approved the head `2d023e1` on 2025-10-25 with no comment, and the PR merged into
`main` the same day as `1e14c1ab4122b7a6964086b69928a5369534edaa`.

## Reviews ignored

- Bot reviews: 19, from `coderabbitai[bot]` (16) and `cursor[bot]` (3).
- Other human reviews: 3 `COMMENTED` reviews by `KATT` at the fixture commit (the two quoted
  above, and a third with a sketch of prefixed and unprefixed key types); 4 `COMMENTED` reviews
  by the author `Nick-Lucas` (CONTRIBUTOR), replies and a note on e2e flakiness; 1 `COMMENTED`
  review by `juliusmarminge` (MEMBER) at the fixture commit, agreeing with the feature-flag
  option; 1 `APPROVED` review by `KATT` at `2d023e1` (2025-10-25), after the fix.
