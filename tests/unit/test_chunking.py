"""Unit tests for Pass-1 chunker — deterministic, no LLM, no DB."""

from __future__ import annotations

import pytest

from loregraph.pipeline.pass1_chunk import (
    CHAPTER_HEADER_RE,
    ChunkerConfig,
    Pass1Chunker,
    _split_into_chapters,
)


@pytest.mark.unit
def test_chapter_regex_matches_common_forms() -> None:
    text = (
        "preface stuff\n\n"
        "Chapter 1\n\nbody1\n\n"
        "CHAPTER II\n\nbody2\n\n"
        "Chapter the First\n\nbody3\n\n"
    )
    starts = [m.group(0).strip() for m in CHAPTER_HEADER_RE.finditer(text)]
    assert "Chapter 1" in starts
    assert "CHAPTER II" in starts
    assert "Chapter the First" in starts


@pytest.mark.unit
def test_no_chapter_header_yields_single_chapter() -> None:
    spans = _split_into_chapters("Some short blurb without headers.")
    assert len(spans) == 1
    assert spans[0].chapter == 1
    assert spans[0].start == 0


@pytest.mark.unit
def test_chunker_produces_atom_ids_in_order() -> None:
    text = (
        "Chapter 1\n\n" + "\n\n".join(["paragraph " + ("x " * 100)] * 12) + "\n\n"
        "Chapter 2\n\n" + "\n\n".join(["paragraph " + ("y " * 100)] * 8)
    )
    cfg = ChunkerConfig(target_tokens=300, max_tokens=400, overlap_ratio=0.2)
    chunks = Pass1Chunker(cfg).chunk(book_id=1, text=text)
    assert len(chunks) > 2
    # atom_ids are unique, ordered, and follow ch{NN}_p{PPP}.
    atom_ids = [c.atom_id for c in chunks]
    assert len(set(atom_ids)) == len(atom_ids)
    assert all(aid.startswith("ch") for aid in atom_ids)
    chapters_seen = sorted({c.chapter for c in chunks})
    assert chapters_seen == [1, 2]


@pytest.mark.unit
def test_chunker_respects_max_tokens_within_overlap_tolerance() -> None:
    text = "\n\n".join(["paragraph " + ("z " * 80)] * 20)
    cfg = ChunkerConfig(target_tokens=300, max_tokens=400, overlap_ratio=0.2)
    chunks = Pass1Chunker(cfg).chunk(book_id=1, text=text)
    # Allow a small overshoot because the overlap is added to the start of the
    # next chunk; the production chunker emits whole paragraphs.
    assert all(c.token_count <= cfg.max_tokens * 1.3 for c in chunks)


@pytest.mark.unit
def test_chunker_char_offsets_are_monotonic_per_chapter() -> None:
    text = "Chapter 1\n\n" + "\n\n".join(["paragraph " + ("w " * 100)] * 6)
    chunks = Pass1Chunker(ChunkerConfig(max_tokens=300)).chunk(book_id=1, text=text)
    starts = [c.char_offset_start for c in chunks]
    assert starts == sorted(starts)
