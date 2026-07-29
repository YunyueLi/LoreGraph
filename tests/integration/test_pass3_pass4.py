"""Integration tests for Pass-3 (cluster) and Pass-4 (coref).

Pass-3 mocks the LLM via `unittest.mock.patch` on `LLMClient.complete`, answering
whichever of its two prompts it is handed: the batched anchor/candidate judge, and
the transitivity sanity check on clusters of three or more forms.

Pass-4 is fully deterministic — no LLM — so it runs against the real
canonical entities produced by Pass-3.
"""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
from loregraph.llm.client import LLMClient, LLMResponse
from loregraph.models.atoms import BookCreate, ChunkCreate
from loregraph.models.entities import MentionCreate
from loregraph.models.enums import EntityType
from loregraph.pipeline.pass3_cluster import Pass3Clusterer
from loregraph.pipeline.pass4_coref import Pass4CorefResolver


def _stub_message(text_body: str) -> LLMResponse:
    return LLMResponse(
        text=text_body,
        input_tokens=50,
        output_tokens=20,
        cache_creation_input_tokens=0,
        cache_read_input_tokens=0,
    )


def _json_message(payload: dict[str, object]) -> LLMResponse:
    return _stub_message("```json\n" + json.dumps(payload) + "\n```")


# Pass-3 sends one call per anchor carrying its whole candidate set, and reads the
# verdicts back by candidate id. These parse the rendered prompt so the fake
# answers the ids the pass actually asked about — the candidate order is shuffled
# to blunt position bias, so a fixed answer list would bind to the wrong forms.
_ANCHOR_RE = re.compile(r'^ANCHOR:\s*"([^"]*)"', re.MULTILINE)
_CANDIDATE_RE = re.compile(r'^\[(\d+)\]\s*"([^"]*)"', re.MULTILINE)


def _batch_reply(user: str, same: Callable[[str, str], bool]) -> LLMResponse:
    """Answer a batched judge prompt: one verdict per candidate id."""
    anchor_match = _ANCHOR_RE.search(user)
    assert anchor_match, f"no ANCHOR in prompt:\n{user}"
    anchor = anchor_match.group(1).lower()
    return _json_message(
        {
            "matches": [
                {"id": int(cid), "same": same(anchor, surface.lower()), "confidence": 0.95}
                for cid, surface in _CANDIDATE_RE.findall(user)
            ]
        }
    )


def _fake_complete(same: Callable[[str, str], bool]) -> Callable[..., object]:
    """An `LLMClient.complete` that judges pairs by `same` and never splits a
    cluster in the sanity pass."""

    async def complete(**kwargs: object) -> object:
        user = str(kwargs["user"])
        if "ANCHOR:" in user:
            return _batch_reply(user, same)
        return _json_message({"outliers": []})

    return complete


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

    # Judge map: the unordered pair of surface forms -> same entity?
    judgements = {
        ("alice", "alice liddell"): True,
        ("the white rabbit", "white rabbit"): True,
    }

    def same(a: str, b: str) -> bool:
        return judgements.get((min(a, b), max(a, b)), False)

    mentions = await repo.list_mentions(session, book_id)
    clusterer = Pass3Clusterer(_fake_llm_client())

    with patch.object(LLMClient, "complete", new=AsyncMock(side_effect=_fake_complete(same))):
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

    # Merge whatever is put in front of it — only Alice/Alice Liddell clears the
    # blocking gate anyway, so Bob is never offered as a candidate.
    def always(_a: str, _b: str) -> bool:
        return True

    with patch.object(LLMClient, "complete", new=AsyncMock(side_effect=_fake_complete(always))):
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
