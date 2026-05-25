"""Pass-1: deterministic chapter-aware text chunker. No LLM.

Strategy
--------

1. Locate chapter boundaries with a regex that matches "Chapter N",
   "CHAPTER N", "Chapter I.", "Chapter the First", etc. If no chapter
   header is found, the whole text is treated as chapter 1.
2. Inside each chapter, split into chunks of 600-1200 tokens with 20 %
   character overlap, preserving paragraph boundaries when possible.
3. Emit `atom_id = ch{NN}_p{PPP}` strings — the citable handle for the
   evidence_span policy.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from loregraph.models.atoms import ChunkCreate
from loregraph.utils.tokens import count_tokens

# Match "Chapter 12", "CHAPTER IV", "Chapter the First", optionally with title.
CHAPTER_HEADER_RE = re.compile(
    r"^[ \t]*(?:CHAPTER|Chapter)\s+"
    r"(?:[IVXLCDM]+|\d+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)"
    r"\.?(?:[ \t]*[\-:—][^\n]*)?[ \t]*$",
    flags=re.MULTILINE,
)


@dataclass(slots=True)
class ChunkerConfig:
    target_tokens: int = 900
    """Aim for chunks around this size; never exceed `max_tokens`."""

    max_tokens: int = 1200
    overlap_ratio: float = 0.20


@dataclass(slots=True)
class _ChapterSpan:
    chapter: int  # 1-indexed
    start: int  # char offset in book
    end: int  # exclusive char offset


def _split_into_chapters(text: str) -> list[_ChapterSpan]:
    matches = list(CHAPTER_HEADER_RE.finditer(text))
    if not matches:
        return [_ChapterSpan(chapter=1, start=0, end=len(text))]

    spans: list[_ChapterSpan] = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        spans.append(_ChapterSpan(chapter=i + 1, start=start, end=end))
    return spans


def _split_chapter_text(
    chapter_text: str, chapter_start: int, chapter_num: int, cfg: ChunkerConfig
) -> list[dict]:
    """Split one chapter's text into chunk dicts.

    Paragraph-aware: never split mid-paragraph except when a single
    paragraph alone exceeds `max_tokens`, in which case the long
    paragraph is hard-wrapped on whitespace.
    """
    paragraphs = re.split(r"(\n\s*\n)", chapter_text)  # keep separators
    # Recombine so each odd-index entry is a separator stuck to the previous para.
    units: list[str] = []
    buf = ""
    for piece in paragraphs:
        if re.fullmatch(r"\n\s*\n", piece or ""):
            buf += piece
            units.append(buf)
            buf = ""
        else:
            buf += piece
    if buf:
        units.append(buf)

    chunks: list[dict] = []
    current = ""
    current_start_in_chapter = 0
    cursor_in_chapter = 0
    seq = 0

    def emit(text_block: str, start_offset: int) -> None:
        nonlocal seq
        if not text_block.strip():
            return
        token_count = count_tokens(text_block)
        chunks.append(
            {
                "atom_id": f"ch{chapter_num:02d}_p{seq:03d}",
                "chapter": chapter_num,
                "seq": seq,
                "text": text_block,
                "token_count": token_count,
                "char_offset_start": chapter_start + start_offset,
                "char_offset_end": chapter_start + start_offset + len(text_block),
            }
        )
        seq += 1

    for unit in units:
        prospective = current + unit
        if count_tokens(prospective) > cfg.max_tokens and current:
            emit(current, current_start_in_chapter)
            # overlap: take the trailing overlap_ratio characters of `current`.
            overlap_len = int(len(current) * cfg.overlap_ratio)
            tail = current[-overlap_len:] if overlap_len > 0 else ""
            current = tail + unit
            current_start_in_chapter = cursor_in_chapter - len(tail)
        else:
            if not current:
                current_start_in_chapter = cursor_in_chapter
            current = prospective
        cursor_in_chapter += len(unit)

    if current.strip():
        emit(current, current_start_in_chapter)

    return chunks


class Pass1Chunker:
    """Deterministic chunker. Produces `ChunkCreate` for every chunk in a book."""

    def __init__(self, config: ChunkerConfig | None = None) -> None:
        self.config = config or ChunkerConfig()

    def chunk(self, *, book_id: int, text: str) -> list[ChunkCreate]:
        chapters = _split_into_chapters(text)
        all_chunks: list[ChunkCreate] = []
        for span in chapters:
            chapter_text = text[span.start : span.end]
            for raw in _split_chapter_text(
                chapter_text=chapter_text,
                chapter_start=span.start,
                chapter_num=span.chapter,
                cfg=self.config,
            ):
                all_chunks.append(ChunkCreate(book_id=book_id, **raw))
        return all_chunks
