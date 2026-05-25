"""Round-trip tests: Pydantic Create → DB → Pydantic read.

Enforces Pydantic ↔ ORM lockstep (per CLAUDE.md). Any column added to one
side must be added to the other, or these tests fail.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
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
    PassRunCreate,
    PassStatus,
    RelationType,
)


@pytest.mark.integration
async def test_book_round_trip(session: AsyncSession) -> None:
    book = await repo.create_book(
        session,
        BookCreate(title="Alice in Wonderland", author="Lewis Carroll", language="en"),
    )
    fetched = await repo.get_book(session, book.id)
    assert fetched is not None
    assert fetched.title == "Alice in Wonderland"
    assert fetched.author == "Lewis Carroll"


@pytest.mark.integration
async def test_chunk_insert_and_list(session: AsyncSession) -> None:
    book = await repo.create_book(session, BookCreate(title="Test"))
    chunks_in = [
        ChunkCreate(
            book_id=book.id,
            atom_id=f"ch01_p{i:02d}",
            chapter=1,
            seq=i,
            text=f"chunk text {i}",
            token_count=10,
            char_offset_start=i * 100,
            char_offset_end=(i + 1) * 100,
        )
        for i in range(3)
    ]
    inserted = await repo.insert_chunks(session, chunks_in)
    assert len(inserted) == 3

    listed = await repo.list_chunks(session, book.id)
    assert [c.atom_id for c in listed] == ["ch01_p00", "ch01_p01", "ch01_p02"]


@pytest.mark.integration
async def test_entity_mention_edge_full_flow(session: AsyncSession) -> None:
    book = await repo.create_book(session, BookCreate(title="Flow"))
    [chunk] = await repo.insert_chunks(
        session,
        [
            ChunkCreate(
                book_id=book.id,
                atom_id="ch01_p00",
                chapter=1,
                seq=0,
                text="Alice met the White Rabbit.",
                token_count=6,
                char_offset_start=0,
                char_offset_end=27,
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
                aliases=["Alice Liddell"],
                note_md="# Alice\n\nProtagonist.",
                attributes={"age": 7},
            ),
            EntityCreate(
                book_id=book.id,
                canonical_id="ent_white_rabbit",
                type=EntityType.AGENT,
                canonical_name="White Rabbit",
            ),
        ],
    )
    assert alice.aliases == ["Alice Liddell"]
    assert alice.attributes == {"age": 7}

    mentions = await repo.insert_mentions(
        session,
        [
            MentionCreate(
                book_id=book.id,
                chunk_id=chunk.id,
                surface_form="Alice",
                type=EntityType.AGENT,
                char_start=0,
                char_end=5,
                evidence_span="Alice",
                entity_id=alice.id,
            ),
        ],
    )
    assert mentions[0].entity_id == alice.id

    edges = await repo.insert_edges(
        session,
        [
            EdgeCreate(
                book_id=book.id,
                src_entity_id=alice.id,
                dst_entity_id=rabbit.id,
                relation=RelationType.INTERACTS,
                chunk_id=chunk.id,
                evidence_span="Alice met the White Rabbit.",
                confidence=0.95,
                inference_depth=InferenceDepth.EXPLICIT,
            ),
        ],
    )
    assert edges[0].relation is RelationType.INTERACTS
    assert edges[0].confidence == pytest.approx(0.95)


@pytest.mark.integration
async def test_glucose_fact_round_trip(session: AsyncSession) -> None:
    book = await repo.create_book(session, BookCreate(title="Glucose Test"))
    [chunk] = await repo.insert_chunks(
        session,
        [
            ChunkCreate(
                book_id=book.id,
                atom_id="ch01_p00",
                chapter=1,
                seq=0,
                text="She felt sure something was wrong.",
                token_count=7,
                char_offset_start=0,
                char_offset_end=35,
            )
        ],
    )
    [alice] = await repo.insert_entities(
        session,
        [
            EntityCreate(
                book_id=book.id,
                canonical_id="ent_alice",
                type=EntityType.AGENT,
                canonical_name="Alice",
            )
        ],
    )

    facts = await repo.insert_glucose_facts(
        session,
        [
            GlucoseFactCreate(
                book_id=book.id,
                entity_id=alice.id,
                chunk_id=chunk.id,
                dimension=GlucoseDim.EMOTION,
                time_aspect=GlucoseTime.AFTER,
                statement="Alice feels uneasy after the encounter.",
                evidence_span="She felt sure something was wrong.",
                inference_depth=InferenceDepth.ONE_STEP,
                confidence=0.82,
            )
        ],
    )
    assert facts[0].dimension is GlucoseDim.EMOTION
    assert facts[0].time_aspect is GlucoseTime.AFTER


@pytest.mark.integration
async def test_pass_run_audit(session: AsyncSession) -> None:
    book = await repo.create_book(session, BookCreate(title="Pass Audit"))
    pr = await repo.upsert_pass_run(
        session,
        PassRunCreate(
            book_id=book.id,
            pass_num=1,
            status=PassStatus.DONE,
            stats={"chunks": 42, "cost_usd": 0.0},
        ),
    )
    assert pr.status is PassStatus.DONE

    runs = await repo.list_pass_runs(session, book.id)
    assert len(runs) == 1
    assert runs[0].stats == {"chunks": 42, "cost_usd": 0.0}
