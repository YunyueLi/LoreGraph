"""Unit tests for Pydantic models — pure structural validation."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from loregraph.models import (
    BookCreate,
    ChunkCreate,
    EdgeCreate,
    EntityCreate,
    EntityType,
    GlucoseDim,
    GlucoseFactCreate,
    GlucoseTime,
    InferenceDepth,
    MentionCreate,
    PassRun,
    PassRunCreate,
    PassStatus,
    RelationType,
)


@pytest.mark.unit
def test_enums_have_expected_members() -> None:
    assert {e.value for e in EntityType} == {"Agent", "Object", "Event", "Concept"}
    assert {r.value for r in RelationType} == {
        "STRUCTURAL",
        "INTERACTS",
        "ASSERTS",
        "INFLUENCES",
        "PREDICTS",
    }
    assert {d.value for d in InferenceDepth} == {"explicit", "one_step", "multi_step"}
    assert {g.value for g in GlucoseDim} == {
        "cause",
        "emotion",
        "location",
        "possession",
        "attribute",
    }
    assert {t.value for t in GlucoseTime} == {"before", "after"}
    assert {s.value for s in PassStatus} == {"pending", "running", "done", "failed"}


@pytest.mark.unit
def test_book_create_defaults() -> None:
    book = BookCreate(title="Alice")
    assert book.author == ""
    assert book.language == "en"
    assert book.source_path is None


@pytest.mark.unit
def test_chunk_create_atom_id_round_trip() -> None:
    chunk = ChunkCreate(
        book_id=1,
        atom_id="ch03_p07",
        chapter=3,
        seq=7,
        text="It was a dark and stormy night.",
        token_count=8,
        char_offset_start=4200,
        char_offset_end=4231,
    )
    assert chunk.atom_id == "ch03_p07"
    dumped = chunk.model_dump()
    rehydrated = ChunkCreate.model_validate(dumped)
    assert rehydrated == chunk


@pytest.mark.unit
def test_mention_requires_evidence_span() -> None:
    with pytest.raises(ValidationError):
        MentionCreate(
            book_id=1,
            chunk_id=1,
            surface_form="Alice",
            type=EntityType.AGENT,
            char_start=0,
            char_end=5,
            # evidence_span missing
        )


@pytest.mark.unit
def test_entity_default_collections() -> None:
    ent = EntityCreate(
        book_id=1,
        canonical_id="ent_alice",
        type=EntityType.AGENT,
        canonical_name="Alice",
    )
    assert ent.aliases == []
    assert ent.note_md == ""
    assert ent.attributes == {}


@pytest.mark.unit
@pytest.mark.parametrize("bad", [-0.1, 1.01, 2.0])
def test_edge_confidence_must_be_unit_interval(bad: float) -> None:
    with pytest.raises(ValidationError):
        EdgeCreate(
            book_id=1,
            src_entity_id=1,
            dst_entity_id=2,
            relation=RelationType.STRUCTURAL,
            chunk_id=1,
            evidence_span="X",
            confidence=bad,
        )


@pytest.mark.unit
def test_edge_default_inference_depth_is_explicit() -> None:
    edge = EdgeCreate(
        book_id=1,
        src_entity_id=1,
        dst_entity_id=2,
        relation=RelationType.INTERACTS,
        chunk_id=1,
        evidence_span="Alice met Bob.",
        confidence=0.9,
    )
    assert edge.inference_depth == InferenceDepth.EXPLICIT


@pytest.mark.unit
def test_glucose_fact_all_fields_required() -> None:
    fact = GlucoseFactCreate(
        book_id=1,
        entity_id=1,
        chunk_id=1,
        dimension=GlucoseDim.EMOTION,
        time_aspect=GlucoseTime.AFTER,
        statement="Alice feels surprised at the rabbit.",
        evidence_span="she felt sure something was wrong",
        inference_depth=InferenceDepth.ONE_STEP,
        confidence=0.78,
    )
    assert fact.dimension is GlucoseDim.EMOTION
    assert fact.confidence == 0.78


@pytest.mark.unit
def test_pass_run_pass_num_bounds() -> None:
    for ok in (1, 4, 7):
        PassRunCreate(book_id=1, pass_num=ok)
    for bad in (0, 8, -1):
        with pytest.raises(ValidationError):
            PassRunCreate(book_id=1, pass_num=bad)


@pytest.mark.unit
def test_pass_run_with_timestamps_round_trip() -> None:
    now = datetime.now(tz=UTC)
    pr = PassRun(
        id=1,
        book_id=1,
        pass_num=2,
        status=PassStatus.DONE,
        stats={"tokens_in": 1234, "tokens_out": 567, "cost_usd": 0.0123},
        error=None,
        started_at=now,
        finished_at=now,
    )
    assert pr.status is PassStatus.DONE
    assert pr.stats["tokens_in"] == 1234
