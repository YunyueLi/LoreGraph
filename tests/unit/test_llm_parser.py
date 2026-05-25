"""Unit tests for LLM JSON output parsing."""

from __future__ import annotations

import pytest
from pydantic import BaseModel

from loregraph.llm.parser import LLMOutputError, extract_json_payload, parse_into


class _Item(BaseModel):
    name: str
    n: int


@pytest.mark.unit
def test_extract_from_fenced_json_block() -> None:
    text = 'sure! here is the output:\n\n```json\n{"name": "Alice", "n": 1}\n```\n\nlet me know.'
    payload = extract_json_payload(text)
    assert payload == '{"name": "Alice", "n": 1}'


@pytest.mark.unit
def test_extract_from_bare_fence() -> None:
    text = 'output:\n```\n{"name": "Bob", "n": 2}\n```'
    payload = extract_json_payload(text)
    assert payload == '{"name": "Bob", "n": 2}'


@pytest.mark.unit
def test_extract_unfenced_falls_through() -> None:
    text = '{"name": "Carol", "n": 3}'
    payload = extract_json_payload(text)
    assert payload == text


@pytest.mark.unit
def test_extract_fence_with_inline_whitespace() -> None:
    """Closing fences sometimes appear indented; we should still match."""
    text = """```json
    {"name": "Dan", "n": 4}
    ```"""
    parsed = parse_into(_Item, text)
    assert parsed == _Item(name="Dan", n=4)


@pytest.mark.unit
def test_parse_into_validates() -> None:
    parsed = parse_into(_Item, '```json\n{"name": "x", "n": 7}\n```')
    assert parsed == _Item(name="x", n=7)


@pytest.mark.unit
def test_parse_into_raises_on_bad_json() -> None:
    with pytest.raises(LLMOutputError):
        parse_into(_Item, "not json at all")


@pytest.mark.unit
def test_parse_into_raises_on_schema_mismatch() -> None:
    with pytest.raises(LLMOutputError):
        parse_into(_Item, '{"name": "ok", "n": "not-an-int"}')
