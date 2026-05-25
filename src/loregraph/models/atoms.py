"""Book and Chunk models — the lowest-level units of a LoreGraph run."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BookCreate(BaseModel):
    """Input model for ingesting a new book."""

    title: str
    author: str = ""
    language: str = "en"
    source_path: str | None = None


class Book(BookCreate):
    """A book that has been ingested into the database."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class ChunkCreate(BaseModel):
    """A single chunk of source text — Pass-1 output, every later pass's input.

    `atom_id` is a stable string of the form `ch{chapter}_p{seq}`, used as
    the citable handle for evidence_span tracing in Pass-7.
    """

    book_id: int
    atom_id: str = Field(..., description="ch{N}_p{seq}; e.g. 'ch03_p07'")
    chapter: int
    seq: int
    text: str
    token_count: int
    char_offset_start: int
    char_offset_end: int


class Chunk(ChunkCreate):
    """A chunk that has been persisted."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    embedding: list[float] | None = None
