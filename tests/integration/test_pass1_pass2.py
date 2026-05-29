"""Integration tests for Pass-1 (chunk) and Pass-2 (entity extraction).

Pass-1 runs against real text and a real DB.
Pass-2 is mocked at the Anthropic SDK boundary so we don't burn API
spend in CI; the fixture returns a deterministic JSON payload.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
from loregraph.llm.client import LLMClient, LLMResponse
from loregraph.models.atoms import BookCreate, ChunkCreate
from loregraph.models.enums import EntityType
from loregraph.pipeline.pass1_chunk import ChunkerConfig, Pass1Chunker
from loregraph.pipeline.pass2_entity import Pass2EntityExtractor

# ---- Pass-1 ----


@pytest.mark.integration
async def test_pass1_chunks_persist_correctly(session: AsyncSession) -> None:
    book = await repo.create_book(
        session, BookCreate(title="Test Novel", source_path="/tmp/fake.txt")
    )
    text = (
        "Chapter 1\n\n"
        + "\n\n".join([f"This is paragraph {i}." + (" filler " * 60) for i in range(8)])
        + "\n\nChapter 2\n\n"
        + "\n\n".join([f"Chapter 2 paragraph {i}." + (" filler " * 60) for i in range(6)])
    )
    chunker = Pass1Chunker(ChunkerConfig(max_tokens=300))
    chunks_in = chunker.chunk(book_id=book.id, text=text)
    assert len(chunks_in) >= 4

    chunks_out = await repo.insert_chunks(session, chunks_in)
    assert all(c.id is not None for c in chunks_out)
    assert {c.chapter for c in chunks_out} == {1, 2}

    listed = await repo.list_chunks(session, book.id)
    assert len(listed) == len(chunks_out)


# ---- Pass-2 ----


def _stub_message(text_body: str) -> LLMResponse:
    """Return the normalized LLMResponse that `LLMClient.complete` yields."""
    return LLMResponse(
        text=text_body,
        input_tokens=100,
        output_tokens=50,
        cache_creation_input_tokens=0,
        cache_read_input_tokens=0,
    )


@pytest.mark.integration
async def test_pass2_extracts_mentions_with_valid_evidence_spans(
    session: AsyncSession,
) -> None:
    book = await repo.create_book(session, BookCreate(title="Mock book"))
    chunk_text = (
        "Alice was beginning to get very tired of sitting by her sister on the bank. "
        "Suddenly a White Rabbit with pink eyes ran close by her."
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

    fake_response_round1 = """```json
    {
      "entities": [
        {
          "surface_form": "Alice",
          "type": "Agent",
          "evidence_span": "Alice was beginning to get very tired"
        },
        {
          "surface_form": "White Rabbit",
          "type": "Agent",
          "evidence_span": "Suddenly a White Rabbit with pink eyes ran close by her."
        }
      ]
    }
    ```"""
    fake_response_round2 = """```json
    {
      "entities": [
        {
          "surface_form": "the bank",
          "type": "Object",
          "evidence_span": "sitting by her sister on the bank"
        }
      ]
    }
    ```"""

    fake_client = LLMClient.__new__(LLMClient)
    fake_client.model = "stub"
    fake_client._settings = None  # type: ignore[assignment]
    fake_client._client = None  # type: ignore[assignment]

    with patch.object(LLMClient, "complete", new=AsyncMock()) as mock_complete:
        mock_complete.side_effect = [
            _stub_message(fake_response_round1),
            _stub_message(fake_response_round2),
        ]
        extractor = Pass2EntityExtractor(fake_client)
        mentions = await extractor.extract_chunk(chunk)

    assert len(mentions) == 3
    assert {(m.surface_form, m.type) for m in mentions} == {
        ("Alice", EntityType.AGENT),
        ("White Rabbit", EntityType.AGENT),
        ("the bank", EntityType.OBJECT),
    }
    # Every evidence_span must literally appear in the chunk.
    for m in mentions:
        assert m.evidence_span in chunk.text
        # And the recorded surface offset must point at the surface form.
        assert chunk.text[m.char_start : m.char_end] == m.surface_form


@pytest.mark.integration
async def test_pass2_drops_nonliteral_evidence_spans(session: AsyncSession) -> None:
    book = await repo.create_book(session, BookCreate(title="Mock 2"))
    chunk_text = "Alice met the Rabbit."
    [chunk] = await repo.insert_chunks(
        session,
        [
            ChunkCreate(
                book_id=book.id,
                atom_id="ch01_p000",
                chapter=1,
                seq=0,
                text=chunk_text,
                token_count=5,
                char_offset_start=0,
                char_offset_end=len(chunk_text),
            )
        ],
    )

    # The Rabbit's evidence_span is paraphrased — must be dropped.
    fake_response = """```json
    {
      "entities": [
        {"surface_form": "Alice", "type": "Agent", "evidence_span": "Alice met the Rabbit."},
        {"surface_form": "Rabbit", "type": "Agent", "evidence_span": "rabbit appeared (paraphrased)"}
      ]
    }
    ```"""

    fake_client = LLMClient.__new__(LLMClient)
    fake_client.model = "stub"
    fake_client._settings = None  # type: ignore[assignment]
    fake_client._client = None  # type: ignore[assignment]

    with patch.object(LLMClient, "complete", new=AsyncMock()) as mock_complete:
        # First call returns both; the gleaning loop's second call returns
        # nothing new so the loop converges fast.
        mock_complete.side_effect = [
            _stub_message(fake_response),
            _stub_message('```json\n{"entities": []}\n```'),
        ]
        extractor = Pass2EntityExtractor(fake_client)
        mentions = await extractor.extract_chunk(chunk)

    assert len(mentions) == 1
    assert mentions[0].surface_form == "Alice"
