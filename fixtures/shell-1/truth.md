# Ground truth · shell fixture 1

An outside project's pull request in shell, step 86's fixture for the language producers; not
part of a blind reading, so [`README.md`](./README.md) names the repo freely.

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `akinomyoga` (CONTRIBUTOR), 2026-02-10,
[review 3778032073](https://github.com/Bash-it/bash-it/pull/2366#pullrequestreview-3778032073),
submitted against `9e88c2a345d84713e1f314dfd333674c299344d6`.

The body:

> I was about to request separating the necessary changes and cosmetic changes (to make the
> intent of the changes clearer in the Git history), but I realized that this plugin was actually
> introduced by `@BarbUk`. Then, I wouldn't require explanations on the style changes, etc.

The body is about commit hygiene and is not what qualifies. Three inline comments go with it, all
anchored at the fixture commit. Two name a bug in the PR's shell. On `lib/command_duration.bash`
line 66
([discussion r2787053322](https://github.com/Bash-it/bash-it/pull/2366#discussion_r2787053322)):

> Is this correct? For example, when the time is `1770718327.000009`, I think the above
> evaluates to `9` because `current_time_deciseconds` contains `9` as a string. However, this
> should rather evaluate to `0`.
>
> This hasn't been correct even before the PR, but other problems seem to be fixed in this PR.
> So shouldn't this be fixed too?

On `plugins/available/cmd-returned-notify.plugin.bash` line 10
([discussion r2787061517](https://github.com/Bash-it/bash-it/pull/2366#discussion_r2787061517)):

> The point raised in the previous review should be applied to all the relevant places. Here, the
> problem with an arbitrary `decimal_point` in different locales persists.

"The previous review" is the same reviewer's 2026-02-03 thread on `lib/command_duration.bash`
([discussion r2760681820](https://github.com/Bash-it/bash-it/pull/2366#discussion_r2760681820),
in a `COMMENTED` review): `,` and `.` are not the only possibilities of `decimal_point`, since a
locale can define an arbitrary string as it, and one typically removes all non-digit characters
from `$EPOCHREALTIME`. The third inline comment, on `lib/command_duration.bash` line 12
([discussion r2787089723](https://github.com/Bash-it/bash-it/pull/2366#discussion_r2787089723)),
asks for the reasons behind the `LC_ALL=C` and `//[!0-9]/` choices to be kept in the code
comments; it is about comments and is not counted.

## Why it qualifies

The reviewer names a wrong result and a locale bug in the PR's own bash. The PR rewrites
`lib/command_duration.bash`, the prompt's command duration, to read `$EPOCHREALTIME` without a
subshell and restructures the block that works out tenths of a second. That block parses each
timestamp's fraction with `10#`, which drops the leading zeros (lines 61 and 62), then takes the
"first digit" of the resulting integer with `${...:0:1}` (lines 65 and 66). A fraction of
`.000009` therefore becomes the integer `9` and its first digit `9`, where the first digit of the
fraction is `0`, so the prompt would show a duration off by up to nine tenths of a second. The
reviewer works the example through and says the flaw predates the PR but that the PR is
rewriting the block. The plugin `cmd-returned-notify.plugin.bash` computes the same duration
with its own `${EPOCHREALTIME//,/.}`, which fixes a comma decimal point and no other, while the
library in the same PR already strips every non-digit. The first point proved real: after the
rewrite, the author's own bats tests hit the same fault, in his words "there was still an issue
with leading 0 while doing the microseconds truncate (same issue as this review:
...#discussion_r2787053322)". None of it is naming, style, docs or changelog.

## The flagged thing

- `lib/command_duration.bash` at the fixture commit: lines 59 to 74, the deciseconds block, with
  the `10#` parse at lines 61 and 62, the first-digit truncation at lines 65 and 66 (the comment
  is on line 66), and the comparison and borrow at lines 68 to 73.
- `plugins/available/cmd-returned-notify.plugin.bash`: line 10,
  `current_time="${EPOCHREALTIME//,/.}"`, inside lines 8 to 14 that choose `$EPOCHREALTIME` or
  `$SECONDS` and feed line 14's duration.
- Not counted: `lib/command_duration.bash` lines 5 to 15, where the PR dropped the explanation
  of why `LC_ALL=C` and `LC_NUMERIC` were not used.

## What followed

The author, `BarbUk`, answered the same day, 2026-02-10, in the two threads: on the plugin
"Fixed in" `f775bbd` ("Get the current time from command_duration lib function"), and on the
deciseconds comment "great review, thanks. I've fixed this with" `53de05d` ("Work with
microseconds, truncate the output to display"). Later that day he added bats tests for the lib,
which showed a leading-zero fault in the new microseconds truncate (`42b80862` and `5ef3b70c`,
both "Handle case with leading 0 in microseconds"). `akinomyoga` requested changes a second time
that evening, at `964e9bc` (review 3781286274, no body), on the wording of the code
comments, which is not counted; he commented again on 2026-02-11, and
[approved](https://github.com/Bash-it/bash-it/pull/2366#pullrequestreview-3794126694) the head
`ed314d5ed9066022347ef8c8092940e6e80a6d35` on 2026-02-12 ("Thank you! LGTM now!"). `seefood`
squash-merged it into `master` about seven hours later, on 2026-02-13, as
`bc7e726f4fda220fb094665246c922a6513b6104`, 37 commits, all the author's. The merged `lib/command_duration.bash` no longer takes a first digit
of an integer: it pads the microseconds to six digits with `printf -v microseconds '%06d'` and
keeps the first `COMMAND_DURATION_PRECISION` of them, and the plugin takes its time from
`_command_duration_current_time`. No revert followed: neither script has changed on `master`
since the merge (checked to `master`'s tip, `72ea9e285fe1828977d1cd2bc596b901bcc57440` of
2026-10-27); the later commits that touch the PR's files are `c0a7e449` (2026-10-11, a tweak to
the plugin's bats test) and `ca668a06` (2026-10-23, the vendored `bash-preexec` updated from
0.6.0 to 0.7.0), and the one revert on `master` since, `496e52ec`, reverts a barbuk theme
prompt-segment fix and not this PR.

## Reviews ignored

- Bot reviews: 3 `COMMENTED` by `github-advanced-security[bot]`, at `f630441`, `7373708` and
  `c0f2a5d`, with 14 inline comments between them; no bot issue comments.
- Other human reviews: by `akinomyoga` (CONTRIBUTOR), 1 more `CHANGES_REQUESTED` at `964e9bc`
  (2026-02-10, no body, inline comments on the wording of the explanation comments), 4
  `COMMENTED` (at `5ae5522` on 2026-02-03, the decimal-point thread above; at `9e88c2a` and
  `964e9bc` on 2026-02-10, thread follow-ups; at `71a8a71` on 2026-02-11, a suggested
  simplification of the output branch that the author took in `dd80054`), 2 issue comments from 2026-02-03
  (asking what the original problem was and whether both the vendor update and the subshell
  removal were needed), and his `APPROVED` at `ed314d5`. No other human reviewed the PR.
- Reviews by the PR's author: 6 `COMMENTED` by `BarbUk`, carrying his 6 inline thread replies,
  and 7 issue comments.
