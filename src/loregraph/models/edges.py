"""Edge: a typed relation between two entities (Pass-5 output)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from loregraph.models.enums import InferenceDepth, RelationType


class EdgeCreate(BaseModel):
    """A relation extracted from a single chunk between two canonical entities."""

    book_id: int
    src_entity_id: int
    dst_entity_id: int
    relation: RelationType
    chunk_id: int
    evidence_span: str = Field(..., description="Literal substring of chunks.text.")
    confidence: float = Field(..., ge=0.0, le=1.0)
    inference_depth: InferenceDepth = InferenceDepth.EXPLICIT
    attributes: dict = Field(default_factory=dict)


class Edge(EdgeCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
