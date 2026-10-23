# Ground truth · corpus fixture 4

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `Qjuh` (MEMBER), 2026-02-21,
[review 3835499750](https://github.com/discordjs/discord.js/pull/11410#pullrequestreview-3835499750),
submitted against `4d0e88d62f335633b27c1cce54b4ddc1d9e8e830`.

The review body is empty; its substance is the inline comment on
`packages/builders/src/components/checkbox/RadioGroup.ts:68`
([discussion r2836112638](https://github.com/discordjs/discord.js/pull/11410#discussion_r2836112638)):

> This shouldn't validate on `addOptions` call already, because then it'll throw as soon as you add options one by one, because having only one options is invalid. Same applies to checkbox group but less severe. But even there a builder should be allowed to be in a state where it has more or less options than allowed, as long as that changes before the builder gets turned into JSON.

The review's other inline comment, on `packages/builders/src/components/checkbox/Assertions.ts:86`,
is a suggestion to reword an error message ("There doesn't have to be a default set.") and is
not the basis of the verdict.

## Why it qualifies

The reviewer names a behaviour bug in the new builders. `RadioGroupBuilder#addOptions` checks
the running option count against the group's limits before it adds anything, and a radio
group needs at least two options, so building one option at a time, the usual builder
pattern, throws on the first `addOptions` call. `spliceOptions` makes the same check, so
removing an option to leave one throws too, and `CheckboxGroupBuilder` repeats the pattern
with a minimum of one. The reviewer's point is that the bounds belong at `toJSON()`, which
already validates the whole component. That is a bug in the PR's own TypeScript, not naming,
style, docs or changelog. The PR's tests build groups from whole batches of options and never
add them one at a time, so none meets the intermediate state.

## The flagged thing

- `packages/builders/src/components/checkbox/RadioGroup.ts`: `addOptions` at lines 65 to 82,
  whose `radioGroupOptionsLengthValidator.parse(this.options.length + normalizedOptions.length)`
  at line 68 runs before the push; `spliceOptions` from line 103, with the same check on the
  spliced copy at line 126. `toJSON` at line 144 already parses the whole component with
  `radioGroupPredicate` (line 150).
- `packages/builders/src/components/checkbox/Assertions.ts`: `radioGroupOptionsLengthValidator`
  at lines 107 to 112 (at least 2, at most 10) and `checkboxGroupOptionsLengthValidator` at
  lines 100 to 105 (at least 1).
- `packages/builders/src/components/checkbox/CheckboxGroup.ts`: `addOptions` from line 71
  with the eager check at line 74, and `spliceOptions` from line 109 with the check at line
  132.

## What followed

The author applied the message suggestion in
[`c9f77cb`](https://github.com/discordjs/discord.js/pull/11410/commits/c9f77cbcdfb01432e864c53e1720dc547fafccae)
and answered the main comment with
[`db61fb6`](https://github.com/discordjs/discord.js/pull/11410/commits/db61fb68c7e063b2e00609d1d8eb56ae5a764fc7)
(2026-02-21, "fix(builders): remove length validators from add/splice options"), which deletes
both length validators and their calls in `addOptions` and `spliceOptions`, after asking in
the thread whether `spliceOptions` should lose the check too (the reviewer: "Yes"). The same
reviewer approved on 2026-02-21
([review 3835757880](https://github.com/discordjs/discord.js/pull/11410#pullrequestreview-3835757880);
the API records it against `2ffee5c`, a later merge of `v14` into the branch). After a second
reviewer's change request was answered by
[`6e8c8df`](https://github.com/discordjs/discord.js/pull/11410/commits/6e8c8df6c8c2795d02560b8a34f3db2298e3d4c6)
("fix(builders): return Result.err instead of throw in validators"), `vladfrangu` approved
[`cf38149`](https://github.com/discordjs/discord.js/pull/11410/commits/cf381496f2e3d368f8abe602c9e1d901e71ec1bd)
on 2026-03-11
([review 3927862740](https://github.com/discordjs/discord.js/pull/11410#pullrequestreview-3927862740)).
The PR was squash-merged into `v14` on 2026-03-11 as
`ca7719e822e02a83e5a7b769de3c5fd615dc24fd`.

## Reviews ignored

- Bot reviews: none.
- Other human reviews: 1 `CHANGES_REQUESTED` by `vladfrangu` (MEMBER) at `0644fe7`
  (2026-03-10), a later commit, asking the new validators to return `Result.err` rather than
  throw; 5 `COMMENTED` reviews by `Jiralite` (MEMBER) at `212e6fd` (2026-02-24 and 25), on a
  test file's name and the casing of `ID` in doc comments; 1 `COMMENTED` by `Qjuh` (the
  "Yes" reply above); 5 `COMMENTED` by the author `faceboy1392`, thread replies; 1 `APPROVED`
  by `Qjuh` and 1 `APPROVED` by `vladfrangu`, after the fixes.
