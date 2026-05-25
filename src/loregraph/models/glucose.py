"""GlucoseFact: implicit information attached to an entity (Pass-6 output).

Each fact lives in one of 5 dimensions × 2 time aspects (= 10 dimensions
total in the original GLUCOSE schema, Mostafazadeh et al. EMNLP 2020).
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from loregraph.models.enums import GlucoseDim, GlucoseTime, InferenceDepth


class GlucoseFactCreate(BaseModel):
    """A single implicit fact about an entity along one GLUCOSE dimension."""

    book_id: int
    entity_id: int
    chunk_id: int
    dimension: GlucoseDim
    time_aspect: GlucoseTime
    statement: str = Field(..., description="Natural-language assertion of the implicit fact.")
    evidence_span: str
    inference_depth: InferenceDepth
    confidence: float = Field(..., ge=0.0, le=1.0)


class GlucoseFact(GlucoseFactCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
