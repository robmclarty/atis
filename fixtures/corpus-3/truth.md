# Ground truth · corpus fixture 3

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `richvdh` (MEMBER), 2025-12-04,
[review 3539501679](https://github.com/matrix-org/matrix-js-sdk/pull/5080#pullrequestreview-3539501679),
submitted against `fe0baa62e410379869345ba2cd8b743aa9f81aa1`.

> a few more comments. Main thing is the `inviter` param to `maybeAcceptKeyBundle`.

The inline comment the body calls the main thing, on
`src/rust-crypto/rust-crypto.ts:1746`
([discussion r2588689093](https://github.com/matrix-org/matrix-js-sdk/pull/5080#discussion_r2588689093)):

> `payload.message.sender` is the wrong thing here, isn't it? We only want to accept key bundles from the user that actually invited us to the room: passing `payload.message.sender` means we will accept key bundles from *any* user.
>
> I think you need to keep roomsPendingKeyBundles as a Map.

The other seven inline comments are not the basis of the verdict: an outdated code comment
(line 132), making the field `readonly` (line 133), a TODO line to update (line 338),
calling the message a `payload` (line 1745), two loops over the incoming messages (line
1743), where to place two functions (lines 2499 to 2500), and a reply on an earlier thread
in `src/client.ts` saying "I think it's fine as-is".

## Why it qualifies

The reviewer names a security-relevant bug in the PR's own TypeScript. The PR lets a client
that joined a room before its room-key bundle arrived import that bundle later. The rooms
waiting for one are kept as a `Set` of room ids, so the user who invited us is not recorded,
and when a bundle message arrives the code passes the bundle's sender to
`maybeAcceptKeyBundle` as the inviter. Any user who sends a bundle for a pending room is
therefore trusted as the inviter, although the backend's own interface says a pending bundle
is imported only "as long as the message author's ID matches the inviter's ID". That is a
bug, not naming, style, docs or changelog. The PR's integration test only covers a bundle
sent by the real inviter, so it does not catch it.

## The flagged thing

- `src/rust-crypto/rust-crypto.ts`: `roomsPendingKeyBundles`, a `Set<string>` of room ids, at
  line 133; `markRoomAsPendingKeyBundle(roomId)` at lines 404 and 405, which records only the
  room id; and the loop in `preprocessToDeviceMessages` at lines 1743 to 1750, whose call
  `this.maybeAcceptKeyBundle(payload.message.content.room_id, payload.message.sender)` at line
  1746 passes the sender as the inviter. `maybeAcceptKeyBundle(roomId, inviter)` at line 335
  then trusts that user's cross-signing keys and bundle data (lines 349 to 355).
- `src/client.ts`: `joinRoom` at lines 2410 to 2416, which knows the real `inviter` but calls
  `markRoomAsPendingKeyBundle(roomId)` without it.
- `src/common-crypto/CryptoBackend.ts`: `markRoomAsPendingKeyBundle(roomId: string)` at line
  105, whose doc comment (lines 99 to 104) promises the inviter check the implementation
  lacks.

## What followed

The author answered with
[`48d3621`](https://github.com/matrix-org/matrix-js-sdk/pull/5080/commits/48d36217b641097737bf662fdad5b193692d3733)
(2025-12-08, "refactor: Move late bundle importing to main preprocess loop."), which keeps a
room-to-inviter record (`markRoomAsPendingKeyBundle(roomId, inviter)`) and looks the inviter
up when a bundle arrives, then merged `develop` again
([`31cb4b3`](https://github.com/matrix-org/matrix-js-sdk/pull/5080/commits/31cb4b3c543e56bf78c8f1516dd1fdfbededc8e2)).
The same reviewer approved `31cb4b3` on 2025-12-08
([review 3552484264](https://github.com/matrix-org/matrix-js-sdk/pull/5080#pullrequestreview-3552484264),
"LGTM otherwise. Feel free to merge, after addressing the comments"). The author then pushed
[`f9ea673`](https://github.com/matrix-org/matrix-js-sdk/pull/5080/commits/f9ea67306a8ef6a0c07c7d87ee1c80f36849d3bf)
("fix: Use `Map` over `Record` to prevent prototype pollution."), and the PR was
squash-merged into `develop` the same day as `fdfddde55ad4e6d133498ef20fde512efd56a108`.

## Reviews ignored

- Bot reviews: none.
- Other human reviews: 1 `APPROVED` by `t3chguy` (MEMBER) at `1688268` (2025-11-27), empty
  body; 1 `CHANGES_REQUESTED` by `richvdh` at `1688268` (2025-11-28, "A few comments,
  generally looks good"), questions on entry points and on whether the sender check was
  needed at all, before the author dropped the inviter record; 18 `COMMENTED` reviews by the
  author `kaylendog`, thread replies; 1 `APPROVED` by `richvdh` at `31cb4b3` (2025-12-08),
  after the fix.
