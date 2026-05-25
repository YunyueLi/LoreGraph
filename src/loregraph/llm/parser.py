"""JSON output parsing with Pydantic schema validation.

The LLM is instructed to return a fenced ```json``` block whose body
deserialises into a target Pydantic model. This module isolates the
parsing + validation logic so the extractor classes stay clean.
"""

from __future__ import annotations

import json
import re
from typing import TypeVar

from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)


# Accept inline whitespace on either side of the closing fence, so a
# model that indents the body of its code block doesn't trip parsing:
#
#     ```json
#         {...}
#     ```
_FENCED_JSON_RE = re.compile(
    r"```(?:json)?[ \t]*\n(?P<body>.*?)\n[ \t]*```",
    flags=re.DOTALL | re.IGNORECASE,
)


class LLMOutputError(ValueError):
    """Raised when LLM output cannot be parsed into the target schema."""


def extract_json_payload(text: str) -> str:
    """Return the JSON body from the first fenced block, or the whole text.

    Order of attempts:
    1. The body of the first ```json ... ``` fence (preferred).
    2. The body of the first ``` ... ``` fence.
    3. The whole `text` (in case the model didn't fence at all).
    """
    match = _FENCED_JSON_RE.search(text)
    if match:
        return match.group("body").strip()
    return text.strip()


def parse_into(model_cls: type[T], text: str) -> T:
    """Parse and validate JSON `text` into an instance of `model_cls`."""
    payload = extract_json_payload(text)
    try:
        raw = json.loads(payload)
    except json.JSONDecodeError as exc:
        msg = f"LLM output is not valid JSON: {exc}\n----\n{payload[:500]}"
        raise LLMOutputError(msg) from exc
    try:
        return model_cls.model_validate(raw)
    except ValidationError as exc:
        msg = f"LLM JSON did not validate as {model_cls.__name__}: {exc}\n----\n{payload[:500]}"
        raise LLMOutputError(msg) from exc
