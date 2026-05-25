"""Integration tests for Pass-3 (cluster) and Pass-4 (coref).

Pass-3 mocks the LLM judge via `unittest.mock.patch` on `LLMClient.complete`,
returning canned same/different decisions for known pairs.

Pass-4 is fully deterministic — no LLM — so it runs against the real
canonical entities produced by Pass-3.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
from loregraph.llm.client import LLMClient
from loregraph.models.atoms import BookCreate, ChunkCreate
from loregraph.models.entities import MentionCreate
from loregraph.models.enums import EntityType
from loregraph.pipeline.pass3_cluster import Pass3Clusterer
from loregraph.pipeline.pass4_coref import Pass4CorefResolver


def _stub_message(text_body: str) -> object:
    return SimpleNamespace(
        content=[SimpleNamespace(text=text_body)],
        usage=SimpleNamespace(
            input_tokens=50,
            output_tokens=20,
            cache_creation_input_tokens=0,
            cache_read_input_tokens=0,
        ),
    )


def _judge(same: bool, confidence: float = 0.95) -> object:
    body = (
        '```json\n{"same": '
        + ("true" if same else "false")
        + f', "confidence": {confidence}, "reason": "test"}}\n```'
    )
    return _stub_message(body)


def _fake_llm_client() -> LLMClient:
    """Return an LLMClient bypassing __init__ — its dependencies aren't needed
    because `LLMClient.complete` is patched in each test."""
    c = LLMClient.__new__(LLMClient)
    c.model = "stub"
    c._settings = None  # type: ignore[assignment]
    c._client = None  # type: ignore[assignment]
    return c


async def _seed_book_with_mentions(
    session: AsyncSession, mention_specs: list[tuple[str, EntityType]]
) -> tuple[int, list[int]]:
    """Helper: create a book + one chunk + the given mentions; return book id +
    list of mention ids in insertion order."""
    book = await repo.create_book(session, BookCreate(title="Cluster test"))
    [chunk] = await repo.insert_chunks(
        session,
        [
            ChunkCreate(
                book_id=book.id,
                atom_id="ch01_p000",
                chapter=1,
                seq=0,
                text="placeholder text for evidence_span match purposes",
                token_count=10,
                char_offset_start=0,
                char_offset_end=50,
            )
        ],
    )
    mentions_in = [
        MentionCreate(
            book_id=book.id,
            chunk_id=chunk.id,
            surface_form=surface,
            type=ent_type,
            char_start=0,
            char_end=len(surface),
            evidence_span=surface,
        )
        for surface, ent_type in mention_specs
    ]
    mentions_out = await repo.insert_mentions(session, mentions_in)
    return book.id, [m.id for m in mentions_out]


@pytest.mark.integration
async def test_pass3_clusters_alias_pair_under_one_canonical(
    session: AsyncSession,
) -> None:
    book_id, _ = await _seed_book_with_mentions(
        session,
        [
            ("Alice", EntityType.AGENT),
            ("Alice", EntityType.AGENT),  # appears twice → most frequent
            ("Alice Liddell", EntityType.AGENT),
            ("Bob", EntityType.AGENT),
            ("White Rabbit", EntityType.AGENT),
            ("the White Rabbit", EntityType.AGENT),
        ],
    )

    # Judge map: (a_low, b_low) -> same?
    judgements = {
        ("alice", "alice liddell"): True,
        ("the white rabbit", "white rabbit"): True,
    }

    mentions = await repo.list_mentions(session, book_id)
    clusterer = Pass3Clusterer(_fake_llm_client())

    async def fake_complete(**kwargs):  # type: ignore[no-untyped-def]
        user = kwargs["user"]
        # Extract A and B from the rendered user prompt.
        a_line = next(line for line in user.splitlines() if line.startswith("A:"))
        b_line = next(line for line in user.splitlines() if line.startswith("B:"))
        a = a_line.split('"')[1].lower()
        b = b_line.split('"')[1].lower()
        same = judgements.get((min(a, b), max(a, b)), False)
        return _judge(same)

    with patch.object(LLMClient, "complete", new=AsyncMock(side_effect=fake_complete)):
        entities = await clusterer.cluster_book(book_id=book_id, mentions=mentions)

    canonical = {(e.canonical_name, tuple(e.aliases)) for e in entities}
    # Alice cluster: canonical "Alice" (most frequent), alias "Alice Liddell".
    assert ("Alice", ("Alice Liddell",)) in canonical
    # White Rabbit cluster.
    assert any("White Rabbit" in e.canonical_name for e in entities)
    # Bob stays alone with no aliases.
    assert ("Bob", ()) in canonical


@pytest.mark.integration
async def test_pass4_binds_mentions_to_canonical_entity(session: AsyncSession) -> None:
    book_id, _mention_ids = await _seed_book_with_mentions(
        session,
        [
            ("Alice", EntityType.AGENT),
            ("Alice Liddell", EntityType.AGENT),
            ("Bob", EntityType.AGENT),
        ],
    )

    mentions = await repo.list_mentions(session, book_id)

    clusterer = Pass3Clusterer(_fake_llm_client())

    async def fake_complete(**_kwargs):  # type: ignore[no-untyped-def]
        return _judge(True)  # always merge — only one pair survives the gate anyway

    with patch.object(LLMClient, "complete", new=AsyncMock(side_effect=fake_complete)):
        entities_in = await clusterer.cluster_book(book_id=book_id, mentions=mentions)

    entities = await repo.insert_entities(session, entities_in)

    resolver = Pass4CorefResolver()
    stats = await resolver.resolve_book(session=session, entities=entities, mentions=mentions)
    assert stats["mentions_total"] == 3
    assert stats["resolved"] == 3
    assert stats["unresolved"] == 0

    # Every mention now has entity_id set.
    refreshed = await repo.list_mentions(session, book_id)
    assert all(m.entity_id is not None for m in refreshed)

    # Both Alice and Alice Liddell should resolve to the same entity.
    alice_entity_ids = {
        m.entity_id for m in refreshed if m.surface_form in {"Alice", "Alice Liddell"}
    }
    assert len(alice_entity_ids) == 1
