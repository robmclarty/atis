# Ground truth · corpus fixture 2

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `aloisklink` (MEMBER), 2026-01-07,
[review 3635906370](https://github.com/mermaid-js/mermaid/pull/6995#pullrequestreview-3635906370),
submitted against `19cd1ed230123ab3f5ee33760f51f26756376ed9`.

> One big blocking issue, now the following ER diagram is broken:
>
> <details>
>
> `````markdown
> ```mermaid
> ---
> config:
>     flowchart:
>         htmlLabels: false
> ---
> erDiagram
>     CUSTOMER {
>         string id
>     }
> ```
> `````
>
> <img width="1733" height="953" alt="Image" src="https://github.com/user-attachments/assets/5f67be70-a852-4d8a-99ae-13aaadc2141d" />
>
> See [preview link](https://deploy-preview-6995--mermaid-js.netlify.app/edit#pako:eNpFjstuhDAMRX8FeQ2IkJIw2U67m1GlPjZVNikxAYkkoxDUB-LfC8y09ca-V_fYnqHxGkFAlmXSNd61vRHSJWu1g_9oOhXiTW_VRTuc1DsOo0haNYwo3Q5iuO-VCcpeo8fX55fH88NTMv-jYwy9M0mvr9YCKZjQaxAxTJiCxWDVJmFnJMQOLUoQ66ixVdMQJUi3YRfl3ry3v2Twk-lA7O-kMF20inj75s8N6DSGo59cBEELti8BMcMnCFKTnJYFq4pybQfOU_gCUfOc8uJA2Jpmd4SxJYXv_WqR16QitGIV5zWnJV1-AHztYX4)
>
> </details>

The body's screenshot and its deploy-preview link no longer resolve (both return 404 as of
2026-10-23); the diagram source in the quote reproduces the case, and the same diagram and a
working screenshot recur in the `erBox.ts` comment below.

Three of the review's fifteen inline comments, all on the fixture commit, carry the
substance.

On `packages/mermaid/src/diagrams/class/shapeUtil.ts:107`
([discussion r2669343329](https://github.com/mermaid-js/mermaid/pull/6995#discussion_r2669343329)):

> **issue(blocking)**: `anything || true` is `true`. Test out the following:
>
> Try:
>
> ````markdown
> ```mermaid
> ---
> config:
>     htmlLabels: false
> ---
> classDiagram
>     Animal <|-- Duck
>     Animal <|-- Fish
>     Animal <|-- Zebra
>     Animal : +int age
>     Animal : +String gender
>     Animal: +isMammal()
>     Animal: +mate()
>     class Duck{
>       +String beakColor
>       +swim()
>       +quack()
>     }
>     class Fish{
>       -int sizeInFeet
>       -canEat()
>     }
>     class Zebra{
>       +bool is_wild
>       +run()
>     }
> ```
> ````

On `packages/mermaid/src/rendering-util/rendering-elements/shapes/classBox.ts:17`
([discussion r2669506499](https://github.com/mermaid-js/mermaid/pull/6995#discussion_r2669506499)):

> **issue**: Same here, `anything || true` = `true`.

On `packages/mermaid/src/rendering-util/rendering-elements/shapes/erBox.ts:367`
([discussion r2669580937](https://github.com/mermaid-js/mermaid/pull/6995#discussion_r2669580937)):

> **issue(blocking)**: This value is different from the previous `useHtmlLabels`.
>
> I think this might be causing the following diagram to break:
>
> ````markdown
> ```mermaid
> ---
> config:
>     flowchart:
>         htmlLabels: false
> ---
> erDiagram
>     CUSTOMER {
>         string id
>     }
> ```
> ````
>
> <img width="1733" height="953" alt="Image" src="https://github.com/user-attachments/assets/fd787040-620b-43c4-813c-de413c4849d0" />

The other twelve inline comments are not the basis of the verdict: `??` versus `||` in the
plain-JavaScript `dagre-wrapper/shapes/note.js` (which the reviewer thinks is safe), an extra
newline in `dagre-wrapper/nodes.js`, a design objection to the `conf.htmlLabels ?? undefined`
pattern in `diagrams/mindmap/svgDraw.ts:185`, a question why `config.ts` does not reuse
`common.ts`'s `evaluate`, a nitpick about computing `useHtmlLabels` once in `erBox.ts`,
four docs suggestions on `directives.md` and `flowchart.md`, and three test-tidying
suggestions on `config.spec.ts` and `mermaidAPI.spec.ts`.

## Why it qualifies

The reviewer names behaviour regressions, each with a diagram that reproduces it. In the
class renderers the PR rewrote the default from `evaluate(config.htmlLabels) ?? true` to
`evaluate(config.htmlLabels ?? undefined) || true`, and `anything || true` is always `true`,
so a diagram configured with `htmlLabels: false` gets HTML labels anyway. In the ER renderer
the value that decides whether the label is laid out as HTML (`getEffectiveHtmlLabels`, which
honours the deprecated `flowchart.htmlLabels`) no longer agrees with the value the label is
created with (`config.htmlLabels ?? undefined`), so an ER diagram with
`flowchart.htmlLabels: false` renders broken, as the reviewer's screenshot shows. Both are
bugs in the PR's own TypeScript, not naming, style, docs or changelog. The PR's tests cover
the config helper, not these renderers.

## The flagged thing

- `packages/mermaid/src/diagrams/class/shapeUtil.ts`: `addText`, lines 106 and 107,
  `'useHtmlLabels' in node ? node.useHtmlLabels : evaluate(config.htmlLabels ?? undefined) || true`
  (at the merge base, `(evaluate(config.htmlLabels) ?? true)`).
- `packages/mermaid/src/rendering-util/rendering-elements/shapes/classBox.ts`: `classBox`,
  line 17, `node.useHtmlLabels ?? (evaluate(config.htmlLabels ?? undefined) || true)` (at the
  merge base, `?? evaluate(config.htmlLabels) ?? true`).
- `packages/mermaid/src/rendering-util/rendering-elements/shapes/erBox.ts`: in `erBox`, line
  38 (`node.useHtmlLabels = config.htmlLabels ?? undefined`) and line 64
  (`!getEffectiveHtmlLabels(getConfig())`); in `addText`, line 348 (the label created with
  `useHtmlLabels: config.htmlLabels ?? undefined`), line 355 and line 367
  (`if (getEffectiveHtmlLabels(getConfig()))`, the gate that disagrees with it).
- `packages/mermaid/src/config.ts`: `getEffectiveHtmlLabels` at lines 282 to 288, which
  falls back to `config.flowchart?.htmlLabels` where the renderers above do not.

## What followed

The author answered with
[`ca107a5`](https://github.com/mermaid-js/mermaid/pull/6995/commits/ca107a5b60e431259be678b325086f304873e956)
(2026-01-08, "refactor: update htmlLabels handling and remove deprecated settings"), which
restores the `?? true` default in `shapeUtil.ts` and `classBox.ts` and returns `erBox.ts` to
`config.htmlLabels` and `evaluate(config.htmlLabels)`, then
[`742f9b0`](https://github.com/mermaid-js/mermaid/pull/6995/commits/742f9b01ffa1bce67fef8dfc29bd2e6b0273ca5f)
("refactor: streamline useHtmlLabels assignment across shapes") and test and import tidying.
The same reviewer approved
[`2180ebc`](https://github.com/mermaid-js/mermaid/pull/6995/commits/2180ebc31b8453131b12f71dd53e712808e700d1)
on 2026-01-08
([review 3638799155](https://github.com/mermaid-js/mermaid/pull/6995#pullrequestreview-3638799155),
"I've got some non-blocking comments, which I think will be good to fix before merging.").
After one more docs and changeset commit, the PR was squash-merged into `develop` on
2026-01-12 as `9745f325cb9e1967640f0e85da193a2f820634f1`.

## Reviews ignored

- Bot reviews: none. Automated comments from `changeset-bot[bot]`, `netlify[bot]`,
  `pkg-pr-new[bot]`, `argos-ci[bot]` and `codecov[bot]` are also ignored; none raised the
  flagged code.
- Other human reviews: 35 `COMMENTED` reviews by the author `darshanr0107`, replies in
  threads; 2 `CHANGES_REQUESTED` by `aloisklink` before this one, at `e82e464` (2025-11-21,
  breaking changes visible in Argos screenshots) and at `75e245a` (2026-01-06, other call
  sites still to update); 1 `APPROVED` by `aloisklink` at `2180ebc` (2026-01-08), after the
  fix.
