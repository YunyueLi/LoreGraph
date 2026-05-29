"""Integration tests for Pass-7 (CoVe verification gate)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
from loregraph.llm.client import LLMClient, LLMResponse
from loregraph.models.atoms import BookCreate, ChunkCreate
from loregraph.models.edges import EdgeCreate
from loregraph.models.entities import EntityCreate
from loregraph.models.enums import (
    EntityType,
    GlucoseDim,
    GlucoseTime,
    InferenceDepth,
    RelationType,
)
from loregraph.models.glucose import GlucoseFactCreate
from loregraph.pipeline.pass7_cove import CoVeGateError, Pass7CoVeVerifier


def _stub_message(text_body: str) -> LLMResponse:
    return LLMResponse(
        text=text_body,
        input_tokens=80,
        output_tokens=30,
        cache_creation_input_tokens=0,
        cache_read_input_tokens=0,
    )


def _judge(supported: bool, confidence: float = 0.95) -> object:
    body = (
        '```json\n{"supported": '
        + ("true" if supported else "false")
        + f', "confidence": {confidence}, "reason": "test"}}\n```'
    )
    return _stub_message(body)


def _fake_llm() -> LLMClient:
    c = LLMClient.__new__(LLMClient)
    c.model = "stub"
    c._settings = None  # type: ignore[assignment]
    c._client = None  # type: ignore[assignment]
    return c


async def _seed_book_with_edge_and_fact(session: AsyncSession) -> dict:
    book = await repo.create_book(session, BookCreate(title="CoVe Test"))
    chunk_text = (
        "Alice met the White Rabbit in Wonderland. She felt curious about the strange creature."
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
                token_count=20,
                char_offset_start=0,
                char_offset_end=len(chunk_text),
            )
        ],
    )
    alice, rabbit = await repo.insert_entities(
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
            ),
        ],
    )
    await repo.insert_edges(
        session,
        [
            EdgeCreate(
                book_id=book.id,
                src_entity_id=alice.id,
                dst_entity_id=rabbit.id,
                relation=RelationType.INTERACTS,
                chunk_id=chunk.id,
                evidence_span="Alice met the White Rabbit",
                confidence=0.95,
                inference_depth=InferenceDepth.EXPLICIT,
            )
        ],
    )
    await repo.insert_glucose_facts(
        session,
        [
            GlucoseFactCreate(
                book_id=book.id,
                entity_id=alice.id,
                chunk_id=chunk.id,
                dimension=GlucoseDim.EMOTION,
                time_aspect=GlucoseTime.AFTER,
                statement="Alice feels curious.",
                evidence_span="She felt curious about the strange creature.",
                inference_depth=InferenceDepth.EXPLICIT,
                confidence=0.9,
            )
        ],
    )
    return {"book_id": book.id, "chunk_id": chunk.id}


@pytest.mark.integration
async def test_pass7_passes_gate_when_all_supported(session: AsyncSession) -> None:
    seeded = await _seed_book_with_edge_and_fact(session)
    verifier = Pass7CoVeVerifier(_fake_llm(), sample_size=10, rng_seed=42)

    with patch.object(LLMClient, "complete", new=AsyncMock(return_value=_judge(True))):
        stats = await verifier.verify_book(session=session, book_id=seeded["book_id"])

    assert stats.edges_total == 1
    assert stats.edges_sampled == 1
    assert stats.edges_literal_match == 1
    assert stats.edges_supported == 1
    assert stats.glucose_total == 1
    assert stats.glucose_sampled == 1
    assert stats.glucose_literal_match == 1
    assert stats.glucose_supported == 1
    assert stats.literal_match_rate() == 1.0
    assert stats.supported_rate() == 1.0


@pytest.mark.integration
async def test_pass7_fails_gate_when_literal_match_below_floor(
    session: AsyncSession,
) -> None:
    """Inject a deliberately paraphrased evidence_span past the per-pass
    drop logic by hand to simulate a contaminated DB."""
    book = await repo.create_book(session, BookCreate(title="Gate Failure"))
    chunk_text = "A short clean sentence."
    [chunk] = await repo.insert_chunks(
        session,
        [
            ChunkCreate(
                book_id=book.id,
                atom_id="ch01_p000",
                chapter=1,
                seq=0,
                text=chunk_text,
                token_count=4,
                char_offset_start=0,
                char_offset_end=len(chunk_text),
            )
        ],
    )
    a, b = await repo.insert_entities(
        session,
        [
            EntityCreate(
                book_id=book.id,
                canonical_id="ent_a",
                type=EntityType.AGENT,
                canonical_name="A",
            ),
            EntityCreate(
                book_id=book.id,
                canonical_id="ent_b",
                type=EntityType.AGENT,
                canonical_name="B",
            ),
        ],
    )
    # 100 edges, none of whose evidence_span is in the chunk.
    bad_edges = [
        EdgeCreate(
            book_id=book.id,
            src_entity_id=a.id,
            dst_entity_id=b.id,
            relation=RelationType.INTERACTS,
            chunk_id=chunk.id,
            evidence_span="this is paraphrased text not in the chunk",
            confidence=0.5,
            inference_depth=InferenceDepth.MULTI_STEP,
        )
        for _ in range(100)
    ]
    await repo.insert_edges(session, bad_edges)

    verifier = Pass7CoVeVerifier(_fake_llm(), sample_size=50, rng_seed=7)
    with (
        patch.object(LLMClient, "complete", new=AsyncMock(return_value=_judge(False))),
        pytest.raises(CoVeGateError) as exc_info,
    ):
        await verifier.verify_book(session=session, book_id=book.id)

    msg = str(exc_info.value)
    assert "literal_match_rate" in msg
    assert "gate fails" in msg


@pytest.mark.integration
async def test_pass7_stats_dict_has_expected_keys(session: AsyncSession) -> None:
    seeded = await _seed_book_with_edge_and_fact(session)
    verifier = Pass7CoVeVerifier(_fake_llm(), sample_size=5, rng_seed=0)
    with patch.object(LLMClient, "complete", new=AsyncMock(return_value=_judge(True))):
        stats = await verifier.verify_book(session=session, book_id=seeded["book_id"])

    d = stats.to_dict()
    expected_keys = {
        "edges_total",
        "edges_sampled",
        "edges_literal_match",
        "edges_supported",
        "glucose_total",
        "glucose_sampled",
        "glucose_literal_match",
        "glucose_supported",
        "literal_match_rate",
        "supported_rate",
    }
    assert expected_keys <= d.keys()
