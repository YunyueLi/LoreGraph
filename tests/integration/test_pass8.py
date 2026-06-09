"""Integration tests for Pass-8 (Hybrid Note synthesis)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
from loregraph.llm.client import LLMClient, LLMResponse
from loregraph.models.atoms import BookCreate, ChunkCreate
from loregraph.models.entities import EntityCreate, MentionCreate
from loregraph.models.enums import EntityType
from loregraph.pipeline.pass8_note import Pass8NoteSynth


def _stub_message(text_body: str) -> LLMResponse:
    return LLMResponse(text=text_body, input_tokens=100, output_tokens=60)


def _fake_llm() -> LLMClient:
    c = LLMClient.__new__(LLMClient)
    c.model = "stub"
    c._settings = None  # type: ignore[assignment]
    c._client = None  # type: ignore[assignment]
    return c


_NOTE = """[META]
subtype: Person

[CONTEXT]
The unnamed narrator of the story.

[FACTS]
- Slams the door and storms out.

[INFERENCES]
- Likely distressed (confidence: medium).

[GAPS]
- Her name is never given.

[EVIDENCE]
- "She slammed the door behind her"
"""


async def _seed(session: AsyncSession) -> dict:
    book = await repo.create_book(session, BookCreate(title="Note Test"))
    text = (
        "She slammed the door behind her and stormed out into the rain. "
        "Inside, John sat by the fire, silent."
    )
    [chunk] = await repo.insert_chunks(
        session,
        [
            ChunkCreate(
                book_id=book.id,
                atom_id="ch01_p000",
                chapter=1,
                seq=0,
                text=text,
                token_count=25,
                char_offset_start=0,
                char_offset_end=len(text),
            )
        ],
    )
    narrator, john = await repo.insert_entities(
        session,
        [
            EntityCreate(
                book_id=book.id,
                canonical_id="ent_narrator",
                type=EntityType.AGENT,
                canonical_name="the narrator",
            ),
            EntityCreate(
                book_id=book.id,
                canonical_id="ent_john",
                type=EntityType.AGENT,
                canonical_name="John",
            ),
        ],
    )
    await repo.insert_mentions(
        session,
        [
            MentionCreate(
                book_id=book.id,
                chunk_id=chunk.id,
                surface_form="She",
                type=EntityType.AGENT,
                char_start=0,
                char_end=3,
                evidence_span="She slammed the door behind her",
                entity_id=narrator.id,
            ),
            MentionCreate(
                book_id=book.id,
                chunk_id=chunk.id,
                surface_form="John",
                type=EntityType.AGENT,
                char_start=70,
                char_end=74,
                evidence_span="John sat by the fire, silent",
                entity_id=john.id,
            ),
        ],
    )
    return {"book_id": book.id, "narrator_id": narrator.id, "john_id": john.id}


@pytest.mark.integration
async def test_pass8_writes_notes_subtypes_and_tiers(session: AsyncSession) -> None:
    seeded = await _seed(session)
    synth = Pass8NoteSynth(_fake_llm())
    with patch.object(LLMClient, "complete", new=AsyncMock(return_value=_stub_message(_NOTE))):
        stats = await synth.synthesise_all(session=session, book_id=seeded["book_id"])

    assert stats["notes_written"] == 2
    assert stats["subtypes_assigned"] == 2
    assert stats["tiers_assigned"] == 2  # both entities are Agents

    by_id = {e.id: e for e in await repo.list_entities(session, seeded["book_id"])}
    narrator = by_id[seeded["narrator_id"]]
    assert "[CONTEXT]" in narrator.note_md
    assert "[META]" not in narrator.note_md  # meta block stripped before persist
    assert narrator.attributes.get("subtype") == "Person"
    assert narrator.attributes.get("tier") in {"T1", "T2", "T3"}


@pytest.mark.integration
async def test_pass8_stubs_note_for_entity_without_evidence(session: AsyncSession) -> None:
    book = await repo.create_book(session, BookCreate(title="No Evidence"))
    await repo.insert_entities(
        session,
        [
            EntityCreate(
                book_id=book.id,
                canonical_id="ent_fate",
                type=EntityType.CONCEPT,
                canonical_name="Fate",
            )
        ],
    )
    synth = Pass8NoteSynth(_fake_llm())
    complete_mock = AsyncMock(return_value=_stub_message(_NOTE))
    with patch.object(LLMClient, "complete", new=complete_mock):
        stats = await synth.synthesise_all(session=session, book_id=book.id)

    # No mentions / edges / glucose ⇒ stub note, and the LLM is never called.
    complete_mock.assert_not_awaited()
    assert stats["notes_written"] == 1
    assert stats["subtypes_assigned"] == 0
    [entity] = await repo.list_entities(session, book.id)
    assert "insufficient evidence" in entity.note_md
