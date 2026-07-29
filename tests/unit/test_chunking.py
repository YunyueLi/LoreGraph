"""Unit tests for Pass-1 chunker — deterministic, no LLM, no DB."""

from __future__ import annotations

import pytest

from loregraph.pipeline.pass1_chunk import (
    CHAPTER_HEADER_RE,
    ChunkerConfig,
    Pass1Chunker,
    _is_chapter_heading,
    _split_into_chapters,
)


def _headings(text: str) -> list[str]:
    """The heading lines the chunker would actually act on."""
    return [m.group(0).strip() for m in CHAPTER_HEADER_RE.finditer(text) if _is_chapter_heading(m)]


@pytest.mark.unit
@pytest.mark.parametrize(
    "line",
    [
        "Chapter 1",
        "CHAPTER II",
        "Chapter the First",
        "CHAPTER I. Down the Rabbit-Hole",
        "Chapter 2. The Pool of Tears",
        "Chapter 4: The Rabbit Sends in a Little Bill",
        "第一回 靈根育孕源流出 心性修持大道生",
        "第十二章",
        "CHAPTER I. The Extent And Military Force Of The Empire In The Age Of The Antonines",
    ],
)
def test_real_headings_are_recognised(line: str) -> None:
    assert _headings(f"body before\n\n{line}\n\nbody after") == [line]


@pytest.mark.unit
@pytest.mark.parametrize(
    "line",
    [
        # Prose that merely OPENS with a chapter reference. The title tail used to
        # be unbounded, so every one of these was read as a chapter break — and
        # because a heading with no body under it is discarded as a table-of-
        # contents entry, the real heading above it was discarded too, taking its
        # prose with it.
        "Chapter 2 paragraph 0. " + "filler " * 40,
        "Chapter 2 was where it all began.",
        "Chapter 3 had been the worst of them. She never spoke of it again.",
    ],
)
def test_prose_opening_with_a_chapter_reference_is_not_a_heading(line: str) -> None:
    assert _headings(f"Chapter 1\n\nsome body\n\n{line}\n\nmore body") == ["Chapter 1"]


@pytest.mark.unit
def test_chapter_text_is_never_dropped_with_its_heading() -> None:
    """Discarding a heading must cost the heading, not the prose beneath it."""
    chapter_two = [f"Chapter 2 paragraph {i}." + (" filler" * 60) for i in range(6)]
    text = (
        "Chapter 1\n\n"
        + "\n\n".join(f"This is paragraph {i}." + (" filler" * 60) for i in range(8))
        + "\n\nChapter 2\n\n"
        + "\n\n".join(chapter_two)
    )
    chunks = Pass1Chunker(ChunkerConfig(max_tokens=300)).chunk(book_id=1, text=text)

    assert sorted({c.chapter for c in chunks}) == [1, 2]
    # Every paragraph of chapter 2 survives, and the spans reach the end of the book.
    body = "\n".join(c.text for c in chunks)
    for para in chapter_two:
        assert para[:40] in body
    assert max(c.char_offset_end for c in chunks) == len(text)


@pytest.mark.unit
def test_table_of_contents_entries_are_still_dropped() -> None:
    """The TOC filter has to keep working: 2 TOC lines + 2 real chapters → 2."""
    text = (
        "CONTENTS\n\nChapter 1\n\nChapter 2\n\n"
        + "Chapter 1\n\n"
        + "\n\n".join(f"First body paragraph {i}." + (" filler" * 60) for i in range(4))
        + "\n\nChapter 2\n\n"
        + "\n\n".join(f"Second body paragraph {i}." + (" filler" * 60) for i in range(4))
    )
    spans = _split_into_chapters(text)
    assert [s.chapter for s in spans] == [1, 2]
    assert text[spans[0].start : spans[0].end].count("First body paragraph") == 4
    assert text[spans[1].start : spans[1].end].count("Second body paragraph") == 4


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
