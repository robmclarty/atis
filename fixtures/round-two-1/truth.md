# Ground truth · round-two fixture 1

Glance round two (D95; see [`../round-two.md`](../round-two.md)), read blind in the world at
step 47; the reader opens neither this file nor [`README.md`](./README.md) until the reading is
done (D62).

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `hugop95` (CONTRIBUTOR), 2026-01-04,
[review 3625019934](https://github.com/azat-io/eslint-plugin-perfectionist/pull/673#pullrequestreview-3625019934),
submitted against `b34bffb601f91a67f1d1413457e5d6041325e57e`.

The body:

> Thanks for the changes, we are getting closer to what I had envisionned.
>
> There are still a couple of things we can improve, I've added comments for that. Please let
> me know if something isn't clear.
>
> In particular, there should be no change in `sort-nodes-by-groups` in the end.

Five inline comments go with it. One names a test too weak to prove the feature. On
`test/rules/sort-classes.test.ts`
([discussion r2659695630](https://github.com/azat-io/eslint-plugin-perfectionist/pull/673#discussion_r2659695630)):

> I think we can make this test a bit stronger by ensuring subgrouping is still done correctly.
> Otherwise, you can get the same output (albeit with a different error) with the following
> configuration:
>
> ```ts
> options: [
>   {
>     ...options,
>     groups: ['get-method', 'set-method', 'unknown']
>   },
> ],
> ```

and it goes on to give a stronger test, with two getters and two setters. Three ask for the
shared sorter to stay as it was. On `utils/compare/build-subgroup-order-comparator.ts`
([discussion r2659699492](https://github.com/azat-io/eslint-plugin-perfectionist/pull/673#discussion_r2659699492)):

> The `getSubgroupOrder` function in `sort-nodes-by-groups` should be here instead, and
> `sortNodesByGroups` should be completely unchanged.

followed by pseudo-code for a comparator that finds each node's subgroup in `groups` itself. On
`test/utils/sort-nodes-by-groups.subgroup-order.test.ts`
([discussion r2659698287](https://github.com/azat-io/eslint-plugin-perfectionist/pull/673#discussion_r2659698287)):

> Those tests (and the ones added in `sortNodesByGroups`) shouldn't be needed as
> `sortNodesByGroups` doesn't need to know that this new sort type exists.
>
> `sort-nodes-by-groups` should be unchanged.

On `rules/sort-enums/build-comparator-by-options-computer.ts`
([discussion r2659696839](https://github.com/azat-io/eslint-plugin-perfectionist/pull/673#discussion_r2659696839)):

> I've wrote a new comment regarding where to put `getSubgroupOrder`. This line shouldn't be
> updated in the end (same for other similar cases).

The fifth, on `docs/content/rules/sort-imports.mdx`
([discussion r2659690038](https://github.com/azat-io/eslint-plugin-perfectionist/pull/673#discussion_r2659690038)),
asks for the documentation to go in `sort-classes.mdx` instead; it is docs and is not counted.

## Why it qualifies

The reviewer names a wrong test and a behaviour risk in the PR's own TypeScript. The PR adds a
`subgroup-order` fallback sort: inside a group written as a list of subgroups, such as
`[['get-method', 'set-method'], 'unknown']`, ties fall back to the order the subgroups are
listed in. The one rule-level test sorts a single setter and getter of the same name, and the
reviewer shows that a plain configuration with separate groups gives the same output, so the
test passes whether or not the subgroup fallback runs. The implementation threads the feature
through `sortNodesByGroups`, the shared sorter every rule calls: it works out each group's
subgroup order there, adds it to that group's options as `subgroupOrder`, and widens the
function's options type, so the options every rule's comparator receives change for a sort type
the sorter should not need to know about. The tests added for `sortNodesByGroups` test one
comparator computer through the shared sorter, which the reviewer asks to remove with the change
they cover. None of it is naming, style, docs or changelog.

## The flagged thing

- `test/rules/sort-classes.test.ts`: the test `sorts getters and setters using subgroup-order
  fallback` at lines 1838 to 1866, whose one setter and one getter named `a` sort the same way
  without the fallback.
- `utils/sort-nodes-by-groups.ts`: lines 134 to 137, which compute
  `getSubgroupOrder(groups[groupIndex])` and spread it into the group's options as
  `subgroupOrder`; line 154, which passes those options to `sortNodes`; `getSubgroupOrder`
  itself at lines 168 to 186; and the options type widened at line 102.
- The comparator computers that read `options.subgroupOrder`:
  `utils/compare/default-comparator-by-options-computer.ts` and the four rules' computers, for
  example `rules/sort-enums/build-comparator-by-options-computer.ts` lines 51 to 60, with
  `utils/compare/build-subgroup-order-comparator.ts` taking the precomputed array rather than
  the groups.
- `test/utils/sort-nodes-by-groups.subgroup-order.test.ts` and the cases added to
  `test/utils/sort-nodes-by-groups.test.ts`.

## What followed

The author, `Lievesley`, answered the same afternoon with
[`bf3cf09`](https://github.com/azat-io/eslint-plugin-perfectionist/pull/673/commits/bf3cf09807e112c1de6b2f5ef3ee6048c065e213)
("feat: add subgroup order to group option overrides"), `5ada4d0` ("test: align subgroup-order
tests with group-aware comparator"), `ad5f1b2` ("feat: refine subgroup-order comparator and
tests") and `a522441` ("test: made sort classes subgroup-order test more robust"). `hugop95`
approved `a522441` that day
([review 3625091620](https://github.com/azat-io/eslint-plugin-perfectionist/pull/673#pullrequestreview-3625091620)),
noting coverage at 99.82%. Seven more commits followed (two adding coverage ignores, one
removing the noisy tests, two dropping casts, one formatting, and one taking the
`pnpm-workspace.yaml` change back out), and the owner, `azat-io`, approved the head `62c7d9f` on 2026-01-05
([review 3628589162](https://github.com/azat-io/eslint-plugin-perfectionist/pull/673#pullrequestreview-3628589162),
no body) and squash-merged it into `main` that day as
`3c8fecfb61ff6cce606a375a2c35c257b89ca97c`. The merged commit leaves `utils/sort-nodes-by-groups.ts`
untouched, drops both `sort-nodes-by-groups` test additions, grows
`build-subgroup-order-comparator.ts` to 77 lines with a test file of its own, and its
`sort-classes.test.ts` case is the reviewer's two-getter, two-setter test word for word. No
revert followed: the one later commit on `main` that touches the comparator is `845fa80`
(2026-01-06, "refactor: general typing improvements").

## Reviews ignored

- Bot reviews: 5 `COMMENTED` by `coderabbitai[bot]`, at `9904dcc`, `6c98d6b`, `265cc74`,
  `7924f5c` and `68b3336`; bot issue comments from `coderabbitai[bot]` (a walkthrough) and
  `codecov[bot]`.
- Other human reviews: 1 `CHANGES_REQUESTED` by `hugop95` at `1057887` (2026-01-04, before the
  rebase: the rules' new tests mock nodes and only satisfy coverage, the use case has no test in
  `sort-classes`, and `comparatorByOptionsComputer` should not be overridden in
  `sort-nodes-by-groups`); 6 `COMMENTED` by `hugop95` (thread replies, among them that
  `computeOverriddenOptionsByGroupIndex` must not learn about subgroups either, and a request
  to remove the noisy tests); 1 `APPROVED` by `hugop95` at `a522441`; 1 `CHANGES_REQUESTED` by
  `azat-io` (OWNER) at `44d28c5` (2026-01-05: run the formatter, and the `pnpm-workspace.yaml`
  change is unnecessary because the project is not a monorepo), 1 `COMMENTED` reply from him,
  and his `APPROVED` at `62c7d9f`.
- Reviews by the PR's author: 19 `COMMENTED` by `Lievesley`, all thread replies.
