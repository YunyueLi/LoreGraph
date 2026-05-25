"""Integration tests for Pass-6 (GLUCOSE implicit information)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
from loregraph.llm.client import LLMClient
from loregraph.models.atoms import BookCreate, ChunkCreate
from loregraph.models.entities import EntityCreate, MentionCreate
from loregraph.models.enums import (
    EntityType,
    GlucoseDim,
    GlucoseTime,
    InferenceDepth,
)
from loregraph.pipeline.pass6_glucose import Pass6GlucoseExtractor


def _stub_message(text_body: str) -> object:
    return SimpleNamespace(
        content=[SimpleNamespace(text=text_body)],
        usage=SimpleNamespace(
            input_tokens=120,
            output_tokens=80,
            cache_creation_input_tokens=0,
            cache_read_input_tokens=0,
        ),
    )


def _fake_llm() -> LLMClient:
    c = LLMClient.__new__(LLMClient)
    c.model = "stub"
    c._settings = None  # type: ignore[assignment]
    c._client = None  # type: ignore[assignment]
    return c


async def _seed(session: AsyncSession) -> dict:
    book = await repo.create_book(session, BookCreate(title="GLUCOSE Test"))
    chunk_text = (
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
                text=chunk_text,
                token_count=25,
                char_offset_start=0,
                char_offset_end=len(chunk_text),
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
    return {
        "book_id": book.id,
        "chunk": chunk,
        "narrator_id": narrator.id,
        "john_id": john.id,
    }


@pytest.mark.integration
async def test_pass6_extracts_emotion_and_location_facts(
    session: AsyncSession,
) -> None:
    seeded = await _seed(session)
    chunk_entities = await repo.list_entities_in_chunk(session, seeded["chunk"].id)
    assert len(chunk_entities) == 2

    fake_response = """```json
{
  "facts": [
    {
      "entity_canonical_id": "ent_narrator",
      "dimension": "emotion",
      "time_aspect": "before",
      "statement": "She is angry.",
      "evidence_span": "slammed the door behind her",
      "inference_depth": "one_step",
      "confidence": 0.85
    },
    {
      "entity_canonical_id": "ent_narrator",
      "dimension": "location",
      "time_aspect": "after",
      "statement": "She is outside in the rain.",
      "evidence_span": "stormed out into the rain",
      "inference_depth": "explicit",
      "confidence": 0.95
    },
    {
      "entity_canonical_id": "ent_john",
      "dimension": "emotion",
      "time_aspect": "after",
      "statement": "John is despondent.",
      "evidence_span": "sat by the fire, silent",
      "inference_depth": "one_step",
      "confidence": 0.7
    }
  ]
}
```"""

    extractor = Pass6GlucoseExtractor(_fake_llm())
    with patch.object(
        LLMClient, "complete", new=AsyncMock(return_value=_stub_message(fake_response))
    ):
        facts = await extractor.extract_chunk(seeded["chunk"], chunk_entities)

    assert len(facts) == 3
    by_dim = {(f.entity_id, f.dimension, f.time_aspect) for f in facts}
    assert (seeded["narrator_id"], GlucoseDim.EMOTION, GlucoseTime.BEFORE) in by_dim
    assert (seeded["narrator_id"], GlucoseDim.LOCATION, GlucoseTime.AFTER) in by_dim
    assert (seeded["john_id"], GlucoseDim.EMOTION, GlucoseTime.AFTER) in by_dim
    for f in facts:
        assert f.evidence_span in seeded["chunk"].text


@pytest.mark.integration
async def test_pass6_drops_unknown_entity_and_paraphrased_evidence(
    session: AsyncSession,
) -> None:
    seeded = await _seed(session)
    chunk_entities = await repo.list_entities_in_chunk(session, seeded["chunk"].id)

    fake_response = """```json
{
  "facts": [
    {
      "entity_canonical_id": "ent_unknown_ghost",
      "dimension": "emotion",
      "time_aspect": "before",
      "statement": "Ghost is sad.",
      "evidence_span": "slammed the door behind her",
      "inference_depth": "multi_step",
      "confidence": 0.4
    },
    {
      "entity_canonical_id": "ent_narrator",
      "dimension": "emotion",
      "time_aspect": "before",
      "statement": "Paraphrased.",
      "evidence_span": "she was clearly upset (paraphrase)",
      "inference_depth": "one_step",
      "confidence": 0.8
    }
  ]
}
```"""

    extractor = Pass6GlucoseExtractor(_fake_llm())
    with patch.object(
        LLMClient, "complete", new=AsyncMock(return_value=_stub_message(fake_response))
    ):
        facts = await extractor.extract_chunk(seeded["chunk"], chunk_entities)
    assert facts == []


@pytest.mark.integration
async def test_pass6_persists_facts_round_trip(session: AsyncSession) -> None:
    seeded = await _seed(session)
    chunk_entities = await repo.list_entities_in_chunk(session, seeded["chunk"].id)

    fake_response = """```json
{
  "facts": [
    {
      "entity_canonical_id": "ent_john",
      "dimension": "attribute",
      "time_aspect": "after",
      "statement": "John is withdrawn.",
      "evidence_span": "John sat by the fire, silent",
      "inference_depth": "one_step",
      "confidence": 0.78
    }
  ]
}
```"""

    extractor = Pass6GlucoseExtractor(_fake_llm())
    with patch.object(
        LLMClient, "complete", new=AsyncMock(return_value=_stub_message(fake_response))
    ):
        facts_in = await extractor.extract_chunk(seeded["chunk"], chunk_entities)

    facts_out = await repo.insert_glucose_facts(session, facts_in)
    assert len(facts_out) == 1
    persisted = facts_out[0]
    assert persisted.dimension is GlucoseDim.ATTRIBUTE
    assert persisted.time_aspect is GlucoseTime.AFTER
    assert persisted.inference_depth is InferenceDepth.ONE_STEP
    assert persisted.confidence == pytest.approx(0.78)
