# Ground truth · round-two fixture 4

Glance round two (D95; see [`../round-two.md`](../round-two.md)), read blind in the world at
step 47; the reader opens neither this file nor [`README.md`](./README.md) until the reading is
done (D62).

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `timofei-iatsenko` (COLLABORATOR), 2026-06-26,
[review 4578775440](https://github.com/lingui/js-lingui/pull/2583#pullrequestreview-4578775440),
submitted against `a5215b97d151212b8584c5d803c59dc1e142bc89`.

The review has no body; its substance is one inline comment, on line 4 of
`packages/conf/src/index.ts`
([discussion r3480810491](https://github.com/lingui/js-lingui/pull/2583#discussion_r3480810491)):

> i suggest not export that from the package, but instead apply and normalize config in the
> `makeConfig`. So all consumers would receive normalized (expanded) option

## Why it qualifies

The reviewer names an interface risk in the PR's own TypeScript. The PR lets `pseudoLocale` be
either a locale string or an object carrying the locale and options for the `pseudolocale`
library. It widens the type to `string | PseudoLocaleConfig` in `LinguiConfig`, and through it
in `LinguiConfigNormalized`, the config every tool receives after `makeConfig`, which leaves the
value as the user wrote it. Instead of normalizing there, the PR adds two helpers,
`getPseudoLocale` and `getPseudoLocaleOptions`, exports them from `@lingui/conf`'s public entry,
and has each consumer unpack the union itself: seven call sites across the CLI, the webpack
loader, the metro transformer and the vite plugin. Every comparison of a locale against
`config.pseudoLocale` now depends on its caller remembering the helper, inside the repo and in
any outside tool that reads a normalized config, and the package's public surface grows by two
functions that exist only to undo a shape the config loader could have settled once. None of it
is naming, style, docs or changelog.

## The flagged thing

- `packages/conf/src/index.ts`: the new export of `getPseudoLocale` and `getPseudoLocaleOptions`
  at line 4.
- `packages/conf/src/getPseudoLocale.ts`: the two helpers, lines 1 to 22.
- `packages/conf/src/makeConfig.ts`: the default at line 72, `"" as string | PseudoLocaleConfig`,
  with no normalization of the option; and `packages/conf/src/types.ts` line 346,
  `pseudoLocale?: string | PseudoLocaleConfig`, which `LinguiConfigNormalized` (line 536)
  inherits.
- The consumers that unpack it: `packages/cli/src/api/compile/compileLocale.ts` lines 38 and 119
  to 120, `packages/cli/src/api/stats.ts` line 38, `packages/cli/src/services/translationIO.ts`
  line 27, `packages/loader/src/webpackLoader.ts` lines 78 and 96 to 97,
  `packages/metro-transformer/src/metroTransformer.ts` lines 85 to 86, and
  `packages/vite-plugin/src/index.ts` lines 98 and 116 to 117.

## What followed

The author, `ThibaultJanBeyer`, answered three days later with
[`8065ec2`](https://github.com/lingui/js-lingui/pull/2583/commits/8065ec24785d8cac40ee95564a00e6d87273cfd7)
(2026-06-29, "apply and normalize config in the makeConfig"), replying on the thread "Ok I
normalized it in makeConfig". `andrii-bodnar` then requested a docs change at `8065ec2` and
committed his own suggestion as `e00ee57`; `timofei-iatsenko` approved `e00ee57` on 2026-07-01
([review 4607346039](https://github.com/lingui/js-lingui/pull/2583#pullrequestreview-4607346039),
no body). After the author's `44e070a` (2026-07-02, "add deprecation warning & fix errors"),
which marks the string form deprecated as `andrii-bodnar` had proposed, `andrii-bodnar` approved
the head on 2026-07-06 and squash-merged it into `main` as
`35476887e8601b9a3dd0361c8c1a04ed2e8669a3`. The merged `packages/conf/src/index.ts` exports no
helper, and the merged commit adds neither `getPseudoLocale.ts` nor its test. No revert followed: the later commits to
`makeConfig.ts` on `main` build on the option, among them `4c00decb` (#2652, 2026-09-11, an RTL
pseudolocale and several pseudolocales).

## Reviews ignored

- Bot reviews: none. Bot issue comments came from `vercel[bot]` and `codecov[bot]`.
- Other human reviews: 1 `CHANGES_REQUESTED` by `andrii-bodnar` (CONTRIBUTOR) at `8065ec2`
  (2026-06-30, a suggested rewrite of the options table in `website/docs/ref/conf.md`); 1
  `APPROVED` by `timofei-iatsenko` at `e00ee57`; 1 `APPROVED` by `andrii-bodnar` at `44e070a`.
  `andrii-bodnar`'s issue comments proposed deprecating the string form for the next major and
  asked for the docs pipeline to be fixed.
- Reviews by the PR's author: 1 `COMMENTED` by `ThibaultJanBeyer` at `a5215b9`, the thread reply
  above.
