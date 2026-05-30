"""Unit tests for the LLM canonicalization step (shared by Pass-3 + the CLI)."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest

from loregraph.llm.client import LLMClient
from loregraph.pipeline.canonicalize import canonicalize, localize_factions


def _fake_llm() -> LLMClient:
    """An LLMClient bypassing __init__; complete/extract_text are patched per test."""
    c = LLMClient.__new__(LLMClient)
    c.model = "stub"
    c._settings = None  # type: ignore[assignment]
    c._client = None  # type: ignore[assignment]
    return c


def _patched(payload: str):
    return (
        patch.object(LLMClient, "complete", new=AsyncMock(return_value=object())),
        patch.object(LLMClient, "extract_text", new=lambda self, msg: payload),
    )


@pytest.mark.unit
async def test_canonicalize_maps_names_factions_generic() -> None:
    items = [
        {"id": "e1", "name": "行者", "aliases": ["大圣", "悟空"], "type": "agent"},
        {"id": "e2", "name": "八戒", "aliases": ["天蓬元帅"], "type": "agent"},
        {"id": "e3", "name": "妖精", "aliases": [], "type": "agent"},
    ]
    payload = json.dumps(
        [
            {"id": "e1", "canon": "孙悟空", "faction": "取经队伍", "generic": False},
            {"id": "e2", "canon": "猪八戒", "faction": "取经队伍", "generic": False},
            {"id": "e3", "canon": "", "faction": "", "generic": True},
        ]
    )
    p_complete, p_extract = _patched(payload)
    with p_complete, p_extract:
        out = await canonicalize(_fake_llm(), "西游记", "zh", items, usage=None)
    assert out["e1"].canon == "孙悟空"
    assert out["e1"].faction == "取经队伍"
    assert out["e2"].canon == "猪八戒"
    assert out["e3"].generic is True


@pytest.mark.unit
async def test_canonicalize_best_effort_on_bad_output() -> None:
    """A malformed LLM response yields {} rather than raising — never aborts Pass-3."""
    items = [{"id": "e1", "name": "X", "aliases": [], "type": "agent"}]
    p_complete, p_extract = _patched("not json at all")
    with p_complete, p_extract:
        out = await canonicalize(_fake_llm(), "Book", "en", items, usage=None)
    assert out == {}


@pytest.mark.unit
async def test_canonicalize_empty_items() -> None:
    out = await canonicalize(_fake_llm(), "Book", "en", [], usage=None)
    assert out == {}


@pytest.mark.unit
async def test_localize_factions_fills_every_label() -> None:
    payload = json.dumps({"取经队伍": {"en": "Pilgrimage Party", "ja": "取経隊"}})
    p_complete, p_extract = _patched(payload)
    with p_complete, p_extract:
        out = await localize_factions(_fake_llm(), "西游记", "Chinese", ["取经队伍", "天庭"])
    assert out["取经队伍"]["en"] == "Pilgrimage Party"
    # labels missing from the model output still get an entry (no KeyError downstream)
    assert "天庭" in out
