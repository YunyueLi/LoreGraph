"""Unit tests for span-matching utilities."""

from __future__ import annotations

import pytest

from loregraph.utils.spans import find_literal_span, is_literal_match, match_rate


@pytest.mark.unit
def test_find_literal_span_simple() -> None:
    source = "Alice was beginning to get very tired."
    result = find_literal_span(source, "beginning to get")
    assert result is not None
    assert result.start == 10
    assert result.matched_text == "beginning to get"
    assert source[result.start : result.end] == "beginning to get"


@pytest.mark.unit
def test_find_literal_span_returns_none_when_missing() -> None:
    assert find_literal_span("hello world", "missing") is None
    assert find_literal_span("hello world", "") is None  # empty span guards


@pytest.mark.unit
def test_is_literal_match_negative_on_normalisation() -> None:
    """We intentionally do NOT normalise whitespace or punctuation."""
    source = "Alice  was beginning"  # two spaces
    assert is_literal_match(source, "Alice was beginning") is False
    assert is_literal_match(source, "Alice  was beginning") is True


@pytest.mark.unit
def test_match_rate_basic() -> None:
    pairs = [
        ("hello world", "hello"),
        ("hello world", "WORLD"),
        ("foo bar", "bar"),
        ("foo bar", "baz"),
    ]
    assert match_rate(pairs) == pytest.approx(0.5)
    assert match_rate([]) == 0.0
