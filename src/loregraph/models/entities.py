"""Mention (pre-clustering) and Entity (canonical, post-clustering)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from loregraph.models.enums import EntityType


class MentionCreate(BaseModel):
    """A single textual mention of an entity inside a specific chunk.

    Produced by Pass-2 with `entity_id=None`; populated by Pass-4 once
    the mention is resolved to its canonical entity.
    """

    book_id: int
    chunk_id: int
    surface_form: str
    type: EntityType
    char_start: int
    char_end: int
    evidence_span: str = Field(
        ...,
        description="Literal substring of chunks.text; Pass-7 enforces ≥95% match rate.",
    )
    entity_id: int | None = None


class Mention(MentionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class EntityCreate(BaseModel):
    """Canonical entity, produced by Pass-3 from clustered mentions."""

    book_id: int
    canonical_id: str = Field(
        ...,
        description="Stable within-book identifier; typically a hash of canonical_name + type.",
    )
    type: EntityType
    canonical_name: str
    aliases: list[str] = Field(default_factory=list)
    note_md: str = ""
    attributes: dict = Field(default_factory=dict)


class Entity(EntityCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    embedding: list[float] | None = None
