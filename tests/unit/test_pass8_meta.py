"""Unit tests for Pass-8 [META] block parsing + subtype validation."""

from __future__ import annotations

import pytest

from loregraph.models.enums import EntityType
from loregraph.pipeline.pass8_note import _parse_meta_and_strip

_NOTE = """[META]
subtype: Person

[CONTEXT]
The narrator.

[FACTS]
- leaves.
"""


@pytest.mark.unit
def test_parse_meta_strips_block_and_keeps_valid_subtype() -> None:
    subtype, body = _parse_meta_and_strip(_NOTE, EntityType.AGENT)
    assert subtype == "Person"
    assert body.startswith("[CONTEXT]")
    assert "[META]" not in body


@pytest.mark.unit
def test_parse_meta_drops_out_of_enum_subtype() -> None:
    raw = "[META]\nsubtype: Wizard\n\n[CONTEXT]\nx\n"
    subtype, body = _parse_meta_and_strip(raw, EntityType.AGENT)
    assert subtype is None
    assert body.startswith("[CONTEXT]")


@pytest.mark.unit
def test_parse_meta_allows_other() -> None:
    raw = "[META]\nsubtype: Other\n\n[CONTEXT]\nx\n"
    subtype, _ = _parse_meta_and_strip(raw, EntityType.OBJECT)
    assert subtype == "Other"


@pytest.mark.unit
def test_parse_meta_no_meta_returns_none_and_full_text() -> None:
    raw = "[CONTEXT]\njust context\n"
    subtype, body = _parse_meta_and_strip(raw, EntityType.AGENT)
    assert subtype is None
    assert body == "[CONTEXT]\njust context"
