"""Integration tests for the FastAPI web layer.

These tests run the FastAPI app in-process via httpx + ASGITransport and
hit a Postgres container managed by the shared `session` fixture from
conftest.py. We commit each test's seed data explicitly so the API
endpoints (which open their own sessions) can read it.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
from loregraph.models.atoms import BookCreate, ChunkCreate
from loregraph.models.edges import EdgeCreate
from loregraph.models.entities import EntityCreate, MentionCreate
from loregraph.models.enums import (
    EntityType,
    GlucoseDim,
    GlucoseTime,
    InferenceDepth,
    RelationType,
)
from loregraph.models.glucose import GlucoseFactCreate
from loregraph.web.server import create_app


@pytest_asyncio.fixture
async def client(session: AsyncSession) -> AsyncIterator[AsyncClient]:
    """A request client bound to a freshly-built FastAPI app."""
    app = create_app(enable_cors=False)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.mark.integration
async def test_healthz(client: AsyncClient) -> None:
    r = await client.get("/healthz")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "version" in body


@pytest.mark.integration
async def test_list_books_empty(client: AsyncClient) -> None:
    r = await client.get("/api/books")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.integration
async def test_graph_round_trip(session: AsyncSession, client: AsyncClient) -> None:
    # Seed a tiny graph: 2 entities, 3 mentions, 1 edge, 1 glucose fact.
    book = await repo.create_book(session, BookCreate(title="Web Test"))
    chunk_text = "Alice met the White Rabbit. She felt curious."
    [chunk] = await repo.insert_chunks(
        session,
        [
            ChunkCreate(
                book_id=book.id,
                atom_id="ch01_p000",
                chapter=1,
                seq=0,
                text=chunk_text,
                token_count=10,
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
                aliases=["She"],
            ),
            EntityCreate(
                book_id=book.id,
                canonical_id="ent_white_rabbit",
                type=EntityType.AGENT,
                canonical_name="White Rabbit",
            ),
        ],
    )
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
                surface_form="She",
                type=EntityType.AGENT,
                char_start=27,
                char_end=30,
                evidence_span="She felt curious",
                entity_id=alice.id,
            ),
            MentionCreate(
                book_id=book.id,
                chunk_id=chunk.id,
                surface_form="White Rabbit",
                type=EntityType.AGENT,
                char_start=13,
                char_end=25,
                evidence_span="Alice met the White Rabbit",
                entity_id=rabbit.id,
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
                statement="Alice is curious.",
                evidence_span="She felt curious",
                inference_depth=InferenceDepth.EXPLICIT,
                confidence=0.9,
            )
        ],
    )
    await session.commit()

    # /api/books — 1 book listed.
    r = await client.get("/api/books")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["title"] == "Web Test"

    # /api/books/{id}/graph — 2 nodes, 1 edge, mention_count correct.
    r = await client.get(f"/api/books/{book.id}/graph")
    assert r.status_code == 200
    body = r.json()
    assert {n["label"] for n in body["nodes"]} == {"Alice", "White Rabbit"}
    alice_node = next(n for n in body["nodes"] if n["label"] == "Alice")
    assert alice_node["mention_count"] == 2
    assert alice_node["type"] == "Agent"
    assert "She" in alice_node["aliases"]
    assert len(body["edges"]) == 1
    assert body["edges"][0]["relation"] == "INTERACTS"
    assert body["edges"][0]["source"] == "ent_alice"
    assert body["edges"][0]["target"] == "ent_white_rabbit"

    # /api/entities/{id} — Alice has 2 mentions, 1 outgoing edge, 1 glucose fact.
    r = await client.get(f"/api/entities/{alice.id}")
    assert r.status_code == 200
    body = r.json()
    assert body["entity"]["canonical_name"] == "Alice"
    assert body["mention_count"] == 2
    assert len(body["outgoing_edges"]) == 1
    assert len(body["incoming_edges"]) == 0
    assert len(body["glucose_facts"]) == 1
    assert body["glucose_facts"][0]["dimension"] == "emotion"

    # /api/chunks/{id} — chunk text + 3 mentions + 1 edge + 1 glucose fact.
    r = await client.get(f"/api/chunks/{chunk.id}")
    assert r.status_code == 200
    body = r.json()
    assert body["chunk"]["text"].startswith("Alice met the White Rabbit")
    assert len(body["mentions"]) == 3
    assert len(body["edges_in_chunk"]) == 1
    assert len(body["glucose_facts_in_chunk"]) == 1


@pytest.mark.integration
async def test_missing_book_returns_404(client: AsyncClient) -> None:
    r = await client.get("/api/books/99999")
    assert r.status_code == 404
    r = await client.get("/api/books/99999/graph")
    assert r.status_code == 404


@pytest.mark.integration
async def test_missing_entity_chunk_404(client: AsyncClient) -> None:
    r = await client.get("/api/entities/99999")
    assert r.status_code == 404
    r = await client.get("/api/chunks/99999")
    assert r.status_code == 404
