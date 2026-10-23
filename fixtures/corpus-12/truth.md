# Ground truth · corpus fixture 12

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `logaretm` (OWNER), 2024-05-29,
[review 2085697225](https://github.com/logaretm/vee-validate/pull/4754#pullrequestreview-2085697225),
submitted against `61298cf2f415dc0a077f6181660c88fa5d9cfa4f`.

> Much better, thank you for the explanation. I think we are getting closer now, just a couple of concerns to address and it should be good to go!

Its two inline comments, both on the fixture commit, carry the substance.

On `packages/vee-validate/src/useForm.ts:537`
([discussion r1619062477](https://github.com/logaretm/vee-validate/pull/4754#discussion_r1619062477)):

> This might break some people using `yup.strip` and other kind of object transformations as you are merging the result of the current form values with the parsed ones. Instead of just returning the parsed ones.
>
> I will double check against that tonight. But is it necessary as far as I can tell you are building the value object with a loop anyways:
>
> ```ts
> if (validation.value) {
>   setInPath(values, validation.key, validation.value);
> }
> ```
>
> If not then maybe we can force the `validate` function on the field-level to always return a value to avoid doing a merge.

On `packages/vee-validate/src/types/forms.ts:7`
([discussion r1619058601](https://github.com/logaretm/vee-validate/pull/4754#discussion_r1619058601)):

> This is a public interface, lets default the generic `TValue` to `unknown`.

The reviewer confirmed the first comment four days later in an issue comment
([issue comment 2144015421](https://github.com/logaretm/vee-validate/pull/4754#issuecomment-2144015421)):

> Hey, I tested it against yup.strip  and it fails. I added a test case in the main branch and force pushed it to your branch. This is a major blocker. I will try to come up with something but we want to avoid using `assign` here as my latest review.

## Why it qualifies

The reviewer names a behaviour regression and then reproduces it with a failing test. The PR
makes field-level schemas' transformed values reach the submit handler. To do so, the submit
handler now merges the validated output over a deep copy of the raw form values
(`Object.assign(submittedValues, result.values)`), where the merge base replaced the raw values
with the output (`submittedValues = result.values`). Any key a form-level schema strips or
renames (`yup.strip`, for one) therefore survives into the submitted payload. The second comment
names an interface risk: the public `ValidationResult` interface gained a type parameter with no
default, which breaks every consumer who writes it bare. Both are in the PR's own TypeScript,
not naming, style, docs or changelog. The PR's tests cover field-level transforms with yup and
zod, not a form-level schema that strips a key, so nothing caught it.

## The flagged thing

- `packages/vee-validate/src/useForm.ts`: in `makeSubmissionFactory` (from line 511), the
  `submissionHandler` at lines 516 onward takes deep copies of the values at lines 529 and 532,
  picks `submittedValues` at line 533 and merges the output over it at lines 535 to 537
  (`if (result.values) { Object.assign(submittedValues, result.values); }`) before passing it to
  the handler at line 539. The output comes from `validate` (from line 844), which builds it
  field by field with `setInPath(values, validation.key, validation.value)` at line 892, the
  loop the reviewer quotes.
- `packages/vee-validate/src/types/forms.ts`: `export interface ValidationResult<TValue>` at
  line 7, with no default for `TValue`.

## What followed

The author answered the `TValue` comment ("Fixed"), explained in the `useForm.ts` thread that a
plain assignment broke other tests, and force-pushed `aa72445` (2024-05-30). The maintainer
tested `yup.strip`, added a failing test on `main`, rebased the PR onto it as `e29c760`
(2024-06-02), and pushed
[`3e292e6`](https://github.com/logaretm/vee-validate/pull/4754/commits/3e292e6ed8286dc38b62042b988c9365c54ff544)
("fix: only merge if the validation source is fields"), which merges only when the fields were
the validation source and assigns the whole output when a schema was. He approved `3e292e6` the
same day
([review 2092607469](https://github.com/logaretm/vee-validate/pull/4754#pullrequestreview-2092607469),
"Good to go once I get your opinion."), and once the author agreed the PR was squash-merged into
`main` on 2024-06-02 as `17a211da2d9e6a7e5feb8562e3db11808e0b7689`. No revert followed: the one
revert on `main` since, #5073, returns number inputs' values to strings in `utils/events.ts`, and
`useForm.ts` on `main` still branches on `result.source === 'schema'`.

## Reviews ignored

- Bot reviews: none. Automated comments from `codecov[bot]` are also ignored.
- Other human reviews: 1 `CHANGES_REQUESTED` by `logaretm` before this one, at `9ef7af0`
  (2024-05-28, the use of `never` in the new types, `FieldValidator` changes that may break
  callers, and a conflict with `main`); 3 `COMMENTED` by the author `mehcode`, thread replies;
  1 `APPROVED` by `logaretm` at `3e292e6` (2024-06-02), after the fix.
