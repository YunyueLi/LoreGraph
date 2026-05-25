"""Integration tests for Pass-5 (typed relation extraction)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
from loregraph.llm.client import LLMClient
from loregraph.models.atoms import BookCreate, ChunkCreate
from loregraph.models.entities import EntityCreate, MentionCreate
from loregraph.models.enums import EntityType, InferenceDepth, RelationType
from loregraph.pipeline.pass5_relation import Pass5RelationExtractor


def _stub_message(text_body: str) -> object:
    return SimpleNamespace(
        content=[SimpleNamespace(text=text_body)],
        usage=SimpleNamespace(
            input_tokens=100,
            output_tokens=50,
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


async def _seed_minimal_book(session: AsyncSession) -> dict:
    """Create a book with one chunk, three entities, three mentions
    (one for each entity), all in the same chunk."""
    book = await repo.create_book(session, BookCreate(title="Pass-5 Test"))
    chunk_text = (
        "Alice met the White Rabbit in Wonderland. "
        "The rabbit was wearing a coat and seemed to live in Wonderland."
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
                token_count=24,
                char_offset_start=0,
                char_offset_end=len(chunk_text),
            )
        ],
    )
    alice, rabbit, wonderland = await repo.insert_entities(
        session,
        [
            EntityCreate(
                book_id=book.id,
                canonical_id="ent_alice",
                type=EntityType.AGENT,
                canonical_name="Alice",
            ),
            EntityCreate(
                book_id=book.id,
                canonical_id="ent_white_rabbit",
                type=EntityType.AGENT,
                canonical_name="White Rabbit",
                aliases=["the rabbit"],
            ),
            EntityCreate(
                book_id=book.id,
                canonical_id="ent_wonderland",
                type=EntityType.OBJECT,
                canonical_name="Wonderland",
            ),
        ],
    )
    # One mention per entity, all in the same chunk so list_entities_in_chunk
    # returns all three.
    await repo.insert_mentions(
        session,
        [
            MentionCreate(
                book_id=book.id,
                chunk_id=chunk.id,
                surface_form="Alice",
                type=EntityType.AGENT,
                char_start=0,
                char_end=5,
                evidence_span="Alice met the White Rabbit",
                entity_id=alice.id,
            ),
            MentionCreate(
                book_id=book.id,
                chunk_id=chunk.id,
                surface_form="White Rabbit",
                type=EntityType.AGENT,
                char_start=14,
                char_end=26,
                evidence_span="Alice met the White Rabbit",
                entity_id=rabbit.id,
            ),
            MentionCreate(
                book_id=book.id,
                chunk_id=chunk.id,
                surface_form="Wonderland",
                type=EntityType.OBJECT,
                char_start=30,
                char_end=40,
                evidence_span="Alice met the White Rabbit in Wonderland.",
                entity_id=wonderland.id,
            ),
        ],
    )
    return {
        "book_id": book.id,
        "chunk": chunk,
        "alice_id": alice.id,
        "rabbit_id": rabbit.id,
        "wonderland_id": wonderland.id,
    }


@pytest.mark.integration
async def test_pass5_extracts_known_edges(session: AsyncSession) -> None:
    seeded = await _seed_minimal_book(session)
    chunk_entities = await repo.list_entities_in_chunk(session, seeded["chunk"].id)
    assert len(chunk_entities) == 3

    fake_response = """```json
{
  "edges": [
    {
      "src_canonical_id": "ent_alice",
      "dst_canonical_id": "ent_white_rabbit",
      "relation": "INTERACTS",
      "evidence_span": "Alice met the White Rabbit",
      "confidence": 0.97,
      "inference_depth": "explicit"
    },
    {
      "src_canonical_id": "ent_white_rabbit",
      "dst_canonical_id": "ent_wonderland",
      "relation": "STRUCTURAL",
      "evidence_span": "seemed to live in Wonderland",
      "confidence": 0.85,
      "inference_depth": "one_step"
    }
  ]
}
```"""

    extractor = Pass5RelationExtractor(_fake_llm())
    with patch.object(
        LLMClient, "complete", new=AsyncMock(return_value=_stub_message(fake_response))
    ):
        edges = await extractor.extract_chunk(seeded["chunk"], chunk_entities)

    assert len(edges) == 2
    assert {(e.src_entity_id, e.dst_entity_id, e.relation) for e in edges} == {
        (seeded["alice_id"], seeded["rabbit_id"], RelationType.INTERACTS),
        (seeded["rabbit_id"], seeded["wonderland_id"], RelationType.STRUCTURAL),
    }
    # All evidence spans must be literal substrings of the chunk.
    for e in edges:
        assert e.evidence_span in seeded["chunk"].text


@pytest.mark.integration
async def test_pass5_drops_edges_with_unknown_endpoints(session: AsyncSession) -> None:
    seeded = await _seed_minimal_book(session)
    chunk_entities = await repo.list_entities_in_chunk(session, seeded["chunk"].id)

    # Endpoint `ent_cheshire_cat` is NOT in the entity list -> should be dropped.
    fake_response = """```json
{
  "edges": [
    {
      "src_canonical_id": "ent_alice",
      "dst_canonical_id": "ent_cheshire_cat",
      "relation": "INTERACTS",
      "evidence_span": "Alice met the White Rabbit",
      "confidence": 0.6,
      "inference_depth": "explicit"
    }
  ]
}
```"""
    extractor = Pass5RelationExtractor(_fake_llm())
    with patch.object(
        LLMClient, "complete", new=AsyncMock(return_value=_stub_message(fake_response))
    ):
        edges = await extractor.extract_chunk(seeded["chunk"], chunk_entities)
    assert edges == []


@pytest.mark.integration
async def test_pass5_drops_edges_with_nonliteral_evidence(session: AsyncSession) -> None:
    seeded = await _seed_minimal_book(session)
    chunk_entities = await repo.list_entities_in_chunk(session, seeded["chunk"].id)

    fake_response = """```json
{
  "edges": [
    {
      "src_canonical_id": "ent_alice",
      "dst_canonical_id": "ent_white_rabbit",
      "relation": "INTERACTS",
      "evidence_span": "Alice paraphrasingly encountered a rabbit",
      "confidence": 0.95,
      "inference_depth": "explicit"
    }
  ]
}
```"""
    extractor = Pass5RelationExtractor(_fake_llm())
    with patch.object(
        LLMClient, "complete", new=AsyncMock(return_value=_stub_message(fake_response))
    ):
        edges = await extractor.extract_chunk(seeded["chunk"], chunk_entities)
    assert edges == []


@pytest.mark.integration
async def test_pass5_persists_edges_via_orchestrator_layer(
    session: AsyncSession,
) -> None:
    """Smoke: extract + persist + retrieve."""
    seeded = await _seed_minimal_book(session)
    chunk_entities = await repo.list_entities_in_chunk(session, seeded["chunk"].id)

    fake_response = """```json
{
  "edges": [
    {
      "src_canonical_id": "ent_alice",
      "dst_canonical_id": "ent_wonderland",
      "relation": "STRUCTURAL",
      "evidence_span": "Alice met the White Rabbit in Wonderland.",
      "confidence": 0.7,
      "inference_depth": "one_step"
    }
  ]
}
```"""
    extractor = Pass5RelationExtractor(_fake_llm())
    with patch.object(
        LLMClient, "complete", new=AsyncMock(return_value=_stub_message(fake_response))
    ):
        edges_in = await extractor.extract_chunk(seeded["chunk"], chunk_entities)

    edges_out = await repo.insert_edges(session, edges_in)
    assert len(edges_out) == 1
    assert edges_out[0].relation is RelationType.STRUCTURAL
    assert edges_out[0].inference_depth is InferenceDepth.ONE_STEP
