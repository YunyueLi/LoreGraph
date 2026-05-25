"""Enum types shared across Pydantic models and the SQLAlchemy schema.

All enums inherit `str` so they round-trip naturally through JSON, JSONB,
and Postgres ENUM columns.
"""

from __future__ import annotations

from enum import Enum


class EntityType(str, Enum):
    """The 4 top-level ontological categories.

    Synthesized from WMG (Pillar 1) and LitBank (Bamman 2020): every node
    in the graph is exactly one of these.
    """

    AGENT = "Agent"
    OBJECT = "Object"
    EVENT = "Event"
    CONCEPT = "Concept"


class RelationType(str, Enum):
    """The 5 relation classes produced by Pass-5.

    See `docs/7-pass-pipeline.md` for the semantics of each.
    """

    STRUCTURAL = "STRUCTURAL"
    INTERACTS = "INTERACTS"
    ASSERTS = "ASSERTS"
    INFLUENCES = "INFLUENCES"
    PREDICTS = "PREDICTS"


class InferenceDepth(str, Enum):
    """How many inference steps separate a claim from its source text."""

    EXPLICIT = "explicit"
    ONE_STEP = "one_step"
    MULTI_STEP = "multi_step"


class GlucoseDim(str, Enum):
    """Five GLUCOSE dimensions (Mostafazadeh et al. EMNLP 2020)."""

    CAUSE = "cause"
    EMOTION = "emotion"
    LOCATION = "location"
    POSSESSION = "possession"
    ATTRIBUTE = "attribute"


class GlucoseTime(str, Enum):
    """Cause-side (`before`) vs consequence-side (`after`) of an event."""

    BEFORE = "before"
    AFTER = "after"


class PassStatus(str, Enum):
    """Lifecycle of a single pass run on a book."""

    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
