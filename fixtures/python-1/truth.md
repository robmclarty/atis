# Ground truth · Python fixture 1

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `seratch` (MEMBER), 2026-01-08,
[review 3637601687](https://github.com/openai/openai-agents-python/pull/2224#pullrequestreview-3637601687),
submitted against `cb496bf887b988d3c81848b90be3f7ea05cdbfef`.

The body, a short opening line and then the diff the reviewer wants applied:

> Thank you again for working on this!
>
> I've checked the code changes and found a few changes would be necessary:
>
> ```diff
> diff --git a/examples/memory/compaction_session_example.py b/examples/memory/compaction_session_example.py
> index c84822e3..cc1f6cf5 100644
> --- a/examples/memory/compaction_session_example.py
> +++ b/examples/memory/compaction_session_example.py
> @@ -50,7 +50,8 @@ async def main():
>      print("=== Final Session State ===")
>      print(f"Total items: {len(items)}")
>      for item in items:
> -        item_type = item.get("type", "unknown")
> +        # Some inputs are stored as easy messages (only `role` and `content`).
> +        item_type = item.get("type") or ("message" if "role" in item else "unknown")
>          if item_type == "compaction":
>              print("  - compaction (encrypted content)")
>          elif item_type == "message":
> diff --git a/src/agents/memory/openai_responses_compaction_session.py b/src/agents/memory/openai_responses_compaction_session.py
> index e23c5909..95b9a61d 100644
> --- a/src/agents/memory/openai_responses_compaction_session.py
> +++ b/src/agents/memory/openai_responses_compaction_session.py
> @@ -29,12 +29,19 @@ def select_compaction_candidate_items(
>  
>      Excludes user messages and compaction items.
>      """
> +
> +    def _is_user_message(item: TResponseInputItem) -> bool:
> +        if not isinstance(item, dict):
> +            return False
> +        if item.get("type") == "message":
> +            return item.get("role") == "user"
> +        return item.get("role") == "user" and "content" in item
> +
>      return [
>          item
>          for item in items
>          if not (
> -            (item.get("type") == "message" and item.get("role") == "user")
> -            or item.get("type") == "compaction"
> +            _is_user_message(item) or (isinstance(item, dict) and item.get("type") == "compaction")
>          )
>      ]
>  
> @@ -160,7 +167,11 @@ class OpenAIResponsesCompactionSession(SessionABC, OpenAIResponsesCompactionAwar
>                  if isinstance(item, dict):
>                      output_items.append(item)
>                  else:
> -                    output_items.append(item.model_dump(exclude_unset=True))  # type: ignore
> +                    # Suppress Pydantic literal warnings: responses.compact can return
> +                    # user-style input_text content inside ResponseOutputMessage.
> +                    output_items.append(
> +                        item.model_dump(exclude_unset=True, warnings=False)  # type: ignore
> +                    )
>  
>          if output_items:
>              await self.underlying_session.add_items(output_items)
> diff --git a/tests/memory/test_openai_responses_compaction_session.py b/tests/memory/test_openai_responses_compaction_session.py
> index 204dbcb1..0b528701 100644
> --- a/tests/memory/test_openai_responses_compaction_session.py
> +++ b/tests/memory/test_openai_responses_compaction_session.py
> @@ -1,5 +1,6 @@
>  from __future__ import annotations
>  
> +import warnings as warnings_module
>  from typing import cast
>  from unittest.mock import AsyncMock, MagicMock
>  
> @@ -62,6 +63,15 @@ class TestSelectCompactionCandidateItems:
>          assert len(result) == 1
>          assert result[0].get("type") == "message"
>  
> +    def test_excludes_easy_user_messages_without_type(self) -> None:
> +        items: list[TResponseInputItem] = [
> +            cast(TResponseInputItem, {"content": "hi", "role": "user"}),
> +            cast(TResponseInputItem, {"type": "message", "role": "assistant", "content": "hello"}),
> +        ]
> +        result = select_compaction_candidate_items(items)
> +        assert len(result) == 1
> +        assert result[0].get("role") == "assistant"
> +
>  
>  class TestOpenAIResponsesCompactionSession:
>      def create_mock_session(self) -> MagicMock:
> @@ -205,6 +215,43 @@ class TestOpenAIResponsesCompactionSession:
>  
>          mock_client.responses.compact.assert_called_once()
>  
> +    @pytest.mark.asyncio
> +    async def test_run_compaction_suppresses_model_dump_warnings(self) -> None:
> +        mock_session = self.create_mock_session()
> +        mock_session.get_items.return_value = [
> +            cast(TResponseInputItem, {"type": "message", "role": "assistant", "content": "hi"})
> +            for _ in range(DEFAULT_COMPACTION_THRESHOLD)
> +        ]
> +
> +        class WarningModel:
> +            def __init__(self) -> None:
> +                self.received_warnings_arg: bool | None = None
> +
> +            def model_dump(self, *, exclude_unset: bool, warnings: bool | None = None) -> dict:
> +                self.received_warnings_arg = warnings
> +                if warnings:
> +                    warnings_module.warn("unexpected warning", stacklevel=2)
> +                return {"type": "message", "role": "assistant", "content": "ok"}
> +
> +        warning_model = WarningModel()
> +        mock_compact_response = MagicMock()
> +        mock_compact_response.output = [warning_model]
> +
> +        mock_client = MagicMock()
> +        mock_client.responses.compact = AsyncMock(return_value=mock_compact_response)
> +
> +        session = OpenAIResponsesCompactionSession(
> +            session_id="test",
> +            underlying_session=mock_session,
> +            client=mock_client,
> +        )
> +
> +        with warnings_module.catch_warnings():
> +            warnings_module.simplefilter("error")
> +            await session.run_compaction({"response_id": "resp-123"})
> +
> +        assert warning_model.received_warnings_arg is False
> +
>  
>  class TestTypeGuard:
>      def test_is_compaction_aware_session_true(self) -> None:
> ```

The review has no inline comments: the PR carries none from anyone, so the diff above is the
whole of it. It asks for five changes: two in the session module, one in the example, and two
new tests.

## Why it qualifies

The reviewer names a behaviour bug and a wrong test in the PR's own Python. The PR adds
`OpenAIResponsesCompactionSession`, a session wrapper that calls the Responses API's
`responses.compact` once the history holds enough compaction candidates, ten by default.
`select_compaction_candidate_items` decides what counts as a candidate by excluding user
messages and compaction items, but it recognises a user message only by `type == "message"`
and `role == "user"`. The reviewer's own comment in the diff says "Some inputs are stored as
easy messages (only `role` and `content`)": a dict with no `type`. Such a user message was not
excluded, so it counted as a candidate, and the default hook compacts once ten candidates
exist, so user turns stored that way brought compaction on early. The one test of the selector,
`test_excludes_user_messages`, builds its user message with `"type": "message"`, so it passes
whether or not an untyped user message is handled, which is why the reviewer's diff adds a
second case for exactly that item. The second named problem is
`item.model_dump(exclude_unset=True)` on the items `responses.compact` returns: the reviewer's
comment says "responses.compact can return user-style input_text content inside
ResponseOutputMessage", which draws Pydantic literal warnings, and the diff passes
`warnings=False` with a test that fails on any warning. None of it is naming, style, docs or
changelog. The first hunk, in `examples/memory/compaction_session_example.py`, is the same
untyped-item case in the example's own printing loop.

## The flagged thing

- `src/agents/memory/openai_responses_compaction_session.py`: `select_compaction_candidate_items`
  at lines 25 to 40, whose test for a user message is lines 36 and 37 (`item.get("type") ==
  "message" and item.get("role") == "user"`), and the three places that rely on it, lines 168,
  182 and 208, with `default_should_trigger_compaction` at lines 42 to 44 counting its result
  against `DEFAULT_COMPACTION_THRESHOLD` (line 22).
- The same file, line 163: `output_items.append(item.model_dump(exclude_unset=True))  # type:
  ignore`, inside `run_compaction`'s loop over `compacted.output`.
- `tests/memory/test_openai_responses_compaction_session.py`: `test_excludes_user_messages`, lines
  47 to 54, whose user message carries `"type": "message"`; the file has no test of an untyped
  user message and none that run `run_compaction` under `warnings` turned into errors.
- `examples/memory/compaction_session_example.py`: line 53, `item_type = item.get("type",
  "unknown")`, which reports an untyped easy message as `unknown`.

## What followed

The author, `ruskaruma` (CONTRIBUTOR), answered later the same day (UTC) with
[`5b64355`](https://github.com/openai/openai-agents-python/pull/2224/commits/5b64355819e14cc78a1005db601f3342df145ee7)
("fix: Address review feedback - handle easy messages and suppress warn…"), then `25e4e83` (a
merge of `main`), `bf7874b` ("fix mypy issue") and `cc3c67a` ("fix: format"), and commented
that all requested changes were applied. `seratch` asked the Codex bot to review again, which
found no major issues, and approved `cc3c67a`
([review 3641890884](https://github.com/openai/openai-agents-python/pull/2224#pullrequestreview-3641890884),
no body) at 00:42:06 UTC on 2026-01-09. He squash-merged the PR into `main` nine seconds later as
`09443fd044e5d58a523ab06e243ed68985788145`, whose one parent is `b5d9152`. The merged commit
carries the reviewer's diff nearly line for line: `select_compaction_candidate_items` gains the
inner `_is_user_message` helper (a typed message is a user message by its role, an untyped dict
by `role == "user"` and a `content` key) and an `isinstance(item, dict)` guard on the compaction
test, `model_dump` takes `warnings=False`, the example reads `item.get("type") or ("message" if
"role" in item else "unknown")`, and the test file gains `test_excludes_easy_user_messages_without_type`
and `test_run_compaction_suppresses_model_dump_warnings`. No revert followed: of the 1,620
commits on `main` since, 27 touch `openai_responses_compaction_session.py` (the first two
are #2322, deferring compaction while local tool outputs are present, and #2334, input-based
compaction), and none of the commits whose subjects say revert touches the PR's files.

## Reviews ignored

- Bot reviews: none. Bot comments: `chatgpt-codex-connector[bot]` ("Codex Review: Didn't find any
  major issues", 2026-01-08, after the fix) and `github-actions[bot]` (the stale notice of
  2026-01-03).
- Other human reviews: 1 `APPROVED` by `seratch` at `cc3c67a`, above. Two issue comments from him
  ("Thanks for sending this. This looks like a good port of the TS implementation I did. I will
  review the details early next year." and "@codex review again"), neither asking for a change.
- Reviews by the PR's author: none. Two issue comments by `ruskaruma`, the opening description and
  the note that the requested changes were applied.
