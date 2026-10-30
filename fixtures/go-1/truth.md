# Ground truth · Go fixture 1

An outside project's pull request in Go, step 86's fixture for the language producers; not part
of a blind reading, so [`README.md`](./README.md) names the repo freely.

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `sixcolors` (MEMBER), 2026-02-11,
[review 3786255688](https://github.com/gofiber/fiber/pull/4079#pullrequestreview-3786255688),
submitted against `7ccc68c4b1710c58aaddeb26388f7641d9377de9`, the reviewer's own merge of `main`
into the branch, made eight minutes earlier.

The body:

> ## Follow-up: All middleware keys are unexported - helpers required anyway
>
> Just realized something important: **all middleware use unexported context keys**, which means
> external services can't access the values directly even if they're stored in
> `context.Context`.
>
> ```go
> // All these are unexported (lowercase or private types)
> requestid:   requestIDKey contextKey = iota
> session:     middlewareContextKey middlewareKey = iota
> basicauth:   usernameKey contextKey = iota
> keyauth:     tokenKey contextKey = iota
> csrf:        tokenKey contextKey = iota
> ```
>
> So in an external service layer, this **won't work**:
>
> ```go
> // ❌ Can't access - key is unexported
> ctx.Value(requestIDKey)  // Compile error - requestIDKey not accessible
> ```
>
> External services **must** import the middleware package:
>
> ```go
> // ✅ Required approach
> import "github.com/gofiber/fiber/v3/middleware/requestid"
>
> rid := requestid.FromContext(ctx)  // Must use this helper
> ```
>
> **This means:** Whether we store in `context.Context` eagerly or on-demand, external services
> need the same import and helper call. The only difference is whether we pay the performance
> cost on every request vs only when needed.
>
> If we're already requiring `import + FromContext()`, why not let users opt into the allocation
> cost instead of forcing it on everyone?

No inline comments go with it. The cost it refers to is the one the same reviewer measured in a
`COMMENTED` review eleven minutes earlier, at `7c57b9abb7541f7efe7c6a65ddec1e118c17db20`
([review 3786204049](https://github.com/gofiber/fiber/pull/4079#pullrequestreview-3786204049)),
which opens:

> ## Performance impact concerns
>
> Looking at the benchmark results:
>
> ```text
> Benchmark_Middleware_BasicAuth
> - B/op:        48 → 112  (+133%)
> - allocs/op:    3 → 5    (+67%)
> ```
>
> This hits **every request** to store values in `context.Context`, even though both
> `*fasthttp.RequestCtx` and `context.Context` support is for external library interop - not
> core Fiber usage.

and proposes, as alternatives, an on-demand `ToContext` helper or an opt-in `StoreInContext`
config field. That review ends "Not blocking the PR"; the changes-requested one that followed it
is the hold.

## Why it qualifies

The reviewer names a design and performance cost in the PR's own Go. The PR widens five
middlewares' `FromContext` helpers to read from a `fiber.Ctx`, a `*fasthttp.RequestCtx` or a
`context.Context`, through a new generic `fiber.ValueFromContext`, and to make the third work,
each middleware now writes its value into the request's `context.Context` on every request it
handles, beside the `c.Locals` store it already made. Each such write wraps the context in a
new `context.WithValue`, which is the allocation growth the reviewer's benchmark shows. The
reviewer's point is that the eager write buys nothing: every key is unexported, so code outside
the package must call the package's helper either way, and the helper could read from the
locals. So the PR makes every Fiber user pay, on every request, for an interop path only some
use. None of it is naming, style, docs or changelog.

## The flagged thing

- The eager writes, one per middleware, at the fixture commit:
  `middleware/basicauth/basicauth.go` line 106,
  `middleware/csrf/csrf.go` lines 111 and 218,
  `middleware/keyauth/keyauth.go` line 53,
  `middleware/requestid/requestid.go` line 37, and
  `middleware/session/middleware.go` line 126, each
  `c.SetContext(context.WithValue(c.Context(), <key>, <value>))`.
- The unexported keys the reviewer lists: `basicauth.go` line 22, `csrf.go` line 44,
  `keyauth.go` line 20, `requestid.go` line 16 and `session/middleware.go` line 27.
- `helpers.go` lines 61 to 76, `ValueFromContext`, which reads a `fiber.Ctx` through its
  `Value` and a `context.Context` through its own, so it depends on the eager writes to find a
  value in a plain `context.Context`.

## What followed

`ReneWerner87` (MEMBER) also requested changes at the same commit that evening
([review 3787061220](https://github.com/gofiber/fiber/pull/4079#pullrequestreview-3787061220),
"lets discuss this feature in the maintainer round"), and on 2026-02-17 left one inline comment
on `helpers.go`, "fetch it from the locals"
([discussion r2816725499](https://github.com/gofiber/fiber/pull/4079#discussion_r2816725499)).
The author, `gaby`, answered with a pull request into the branch,
[#4093](https://github.com/gofiber/fiber/pull/4093) ("🧹 chore: Improve context helpers"), whose
commits `984daea` ("rename context storage helper and update docs"), `1396f70`, `175ad0e` and
`719a67b` add `fiber.StoreInContext`, which always writes the locals and writes the
`context.Context` only when the new `Config.PassLocalsToContext` is set, `false` by default.
`ReneWerner87` merged #4093 into the branch as `05d6ba8455869ac6915539e609cd354f5c44976b` and
approved that head on 2026-02-23
([review 3839825233](https://github.com/gofiber/fiber/pull/4079#pullrequestreview-3839825233)),
then merged the PR into `main` the same day as
`87ce0f9b05f880ba2d7c35c69d7f710b11fd9987`, a two-parent merge commit. Its middlewares call
`fiber.StoreInContext`, the opt-in the reviewer asked for. No revert followed: `main` still
gates the write on `PassLocalsToContext`.

## Reviews ignored

- Bot reviews: 2 `COMMENTED` by `gemini-code-assist[bot]`, 4 by `coderabbitai[bot]`, 2 by
  `copilot-pull-request-reviewer[bot]`, and 1 by `github-actions[bot]` (a benchmark alert).
- Other human reviews: `ReneWerner87`'s `APPROVED` at 08:03 on 2026-02-11 and `sixcolors`'
  `APPROVED` at 17:27 the same day, both before the hold, and both reported by the API against
  `2929278f710b310ffc7b3f4239daf31ce34dc25c`, a merge of `main` made on 2026-02-19, so the API
  moved them to a later head; `sixcolors`' `COMMENTED` review quoted above;
  `ReneWerner87`'s `CHANGES_REQUESTED`, his `COMMENTED` review carrying the inline comment, and
  his final `APPROVED`, all under "What followed".
- Reviews by the PR's author: none.
