"""PassRun: audit trail for each pass execution on a book."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from loregraph.models.enums import PassStatus


class PassRunCreate(BaseModel):
    """Pipeline-pass run record. `stats` carries cost, token, match-rate counters."""

    book_id: int
    pass_num: int = Field(..., ge=1, le=10)  # 1-7 extract · 8 reconcile · 9 community · 10 note
    status: PassStatus = PassStatus.PENDING
    stats: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


class PassRun(PassRunCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    started_at: datetime | None = None
    finished_at: datetime | None = None
