"""Pydantic models for LoreGraph entities, edges, and pipeline artifacts.

Every model has a `*Create` counterpart for inserts and a base class for
reads. The two stay in lockstep with the SQLAlchemy schema in
`loregraph.db.schema`; the integration test suite enforces a round-trip.
"""

from __future__ import annotations

from loregraph.models.atoms import Book, BookCreate, Chunk, ChunkCreate
from loregraph.models.edges import Edge, EdgeCreate
from loregraph.models.entities import Entity, EntityCreate, Mention, MentionCreate
from loregraph.models.enums import (
    EntityType,
    GlucoseDim,
    GlucoseTime,
    InferenceDepth,
    PassStatus,
    RelationType,
)
from loregraph.models.glucose import GlucoseFact, GlucoseFactCreate
from loregraph.models.runs import PassRun, PassRunCreate

__all__ = [
    "Book",
    "BookCreate",
    "Chunk",
    "ChunkCreate",
    "Edge",
    "EdgeCreate",
    "Entity",
    "EntityCreate",
    "EntityType",
    "GlucoseDim",
    "GlucoseFact",
    "GlucoseFactCreate",
    "GlucoseTime",
    "InferenceDepth",
    "Mention",
    "MentionCreate",
    "PassRun",
    "PassRunCreate",
    "PassStatus",
    "RelationType",
]
