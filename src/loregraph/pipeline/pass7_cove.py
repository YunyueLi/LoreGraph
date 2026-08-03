"""Pass-7: Chain-of-Verification audit gate.

Two different numbers, doing two different jobs:

  literal_match_rate  — fraction of evidence_spans that are literal
                        substrings of their chunk. This is an **invariant
                        tripwire, not a quality measure**: Pass-2/5/6 drop
                        non-literal spans before persisting, using this very
                        same `is_literal_match`, so on a healthy pipeline it
                        is 1.0 by construction. It fails only when a bug
                        upstream lets a span through — which is worth
                        catching, but it says nothing about whether the
                        extraction is any good.

  supported_rate      — fraction of sampled claims the judge finds actually
                        *entailed* by their evidence span. This is the
                        number that measures extraction quality: a claim can
                        cite a perfectly literal quote that does not support
                        it. **This is the real gate.**

Both are enforced. `supported_rate` has a configurable floor
(`LOREGRAPH_COVE_SUPPORTED_FLOOR`, 0 disables) because no calibrated
distribution exists yet — measure a book with `loregraph eval entailment`
before trusting a threshold.

The sample is **stratified** by (relation | dimension) x inference_depth
rather than drawn uniformly, so rare-but-risky strata are not swamped by
the `explicit`/`INTERACTS` bulk. Every `multi_step` claim is verified,
never sampled: it is the deepest inference the pipeline makes and the most
likely to be wrong.

For v0.1 we don't *delete* unsupported claims — we record the stats and
fail the run so the operator can inspect them. Auto-purge based on
confidence threshold is out of scope until v0.2.
"""

from __future__ import annotations

import logging
import random
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, TypeVar

from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.config import get_settings
from loregraph.db import schema as orm
from loregraph.llm.client import LLMClient, LLMUsage
from loregraph.llm.parser import LLMOutputError, parse_into
from loregraph.models.enums import InferenceDepth
from loregraph.utils.spans import is_literal_match

_R = TypeVar("_R")

log = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "llm" / "prompts"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_PROMPTS_DIR)),
    autoescape=select_autoescape(default=False),
    keep_trailing_newline=True,
)

LITERAL_MATCH_FLOOR = 0.95
DEFAULT_SAMPLE_SIZE = 150
DEFAULT_CONFIDENCE_FLOOR = 0.6
# Strata whose every member is verified rather than sampled. `multi_step` is
# the deepest inference the pipeline makes and the likeliest to be wrong; it
# is also rare enough that exhaustive checking is affordable.
_ALWAYS_VERIFY_DEPTHS = frozenset({InferenceDepth.MULTI_STEP})


class _CoVeResponse(BaseModel):
    supported: bool
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str = ""


def _stratum(kind: object, depth: object) -> str:
    """Stable stratum label, e.g. `INTERACTS/explicit` or `emotion/one_step`."""
    return f"{getattr(kind, 'value', kind)}/{getattr(depth, 'value', depth)}"


def stratified_sample(
    rows: Sequence[_R],
    *,
    key: Callable[[_R], object],
    budget: int,
    exhaustive: Callable[[_R], bool] | None = None,
    rng: random.Random,
) -> list[_R]:
    """Sample `budget` rows spread across strata, not drawn uniformly.

    A uniform sample of a book's edges is ~63% `INTERACTS`/`explicit` — the
    easiest claims to get right — so it reports a rate that says little about
    the strata that actually fail. Allocate proportionally instead, with at
    least one row per non-empty stratum, and take every row for which
    `exhaustive` is true regardless of budget.

    Returns rows in input order. Deterministic given `rng`.
    """
    if budget <= 0 or not rows:
        return []

    forced_idx = {i for i, r in enumerate(rows) if exhaustive and exhaustive(r)}
    strata: dict[object, list[int]] = {}
    for i, row in enumerate(rows):
        if i in forced_idx:
            continue
        strata.setdefault(key(row), []).append(i)

    remaining = budget - len(forced_idx)
    picked: set[int] = set(forced_idx)
    if remaining > 0 and strata:
        sampleable = sum(len(v) for v in strata.values())
        # Deterministic stratum order — dict order depends on row order, which
        # is stable, but sort anyway so the sample survives a schema reorder.
        order = sorted(strata, key=lambda k: (str(type(k)), str(k)))
        quota: dict[object, int] = {}
        for k in order:
            share = len(strata[k]) / sampleable * remaining
            quota[k] = min(len(strata[k]), max(1, int(share)))
        # Proportional rounding over- or under-shoots; settle it round-robin.
        while sum(quota.values()) > remaining:
            for k in sorted(order, key=lambda k: -quota[k]):
                if quota[k] > 1:
                    quota[k] -= 1
                    if sum(quota.values()) == remaining:
                        break
            else:
                break  # every quota is already at its floor of 1
        while sum(quota.values()) < remaining:
            grew = False
            for k in order:
                if quota[k] < len(strata[k]):
                    quota[k] += 1
                    grew = True
                    if sum(quota.values()) == remaining:
                        break
            if not grew:
                break
        for k in order:
            picked.update(rng.sample(strata[k], quota[k]))

    return [rows[i] for i in sorted(picked)]


@dataclass(slots=True)
class CoVeStats:
    edges_total: int = 0
    edges_sampled: int = 0
    edges_literal_match: int = 0
    edges_supported: int = 0

    glucose_total: int = 0
    glucose_sampled: int = 0
    glucose_literal_match: int = 0
    glucose_supported: int = 0

    # supported / sampled, keyed by stratum — this is what tells an operator
    # *which* kind of claim is failing, which the pooled rate hides.
    by_stratum: dict[str, list[int]] = field(default_factory=dict)

    def record(self, stratum: str, *, supported: bool) -> None:
        bucket = self.by_stratum.setdefault(stratum, [0, 0])
        bucket[1] += 1
        if supported:
            bucket[0] += 1

    def literal_match_rate(self) -> float:
        sampled = self.edges_sampled + self.glucose_sampled
        if sampled == 0:
            return 1.0
        return (self.edges_literal_match + self.glucose_literal_match) / sampled

    def supported_rate(self) -> float:
        sampled = self.edges_sampled + self.glucose_sampled
        if sampled == 0:
            return 1.0
        return (self.edges_supported + self.glucose_supported) / sampled

    def weakest_strata(self, limit: int = 5) -> list[dict[str, Any]]:
        """Worst-scoring strata first — the operator's read on what to fix."""
        ranked = sorted(
            ((hits / n, -n, name, hits) for name, (hits, n) in self.by_stratum.items() if n),
        )
        return [
            {
                "stratum": name,
                "supported": hits,
                "sampled": -neg_n,
                "rate": round(rate, 4),
            }
            for rate, neg_n, name, hits in ranked[:limit]
        ]

    def to_dict(self) -> dict[str, Any]:
        return {
            "edges_total": self.edges_total,
            "edges_sampled": self.edges_sampled,
            "edges_literal_match": self.edges_literal_match,
            "edges_supported": self.edges_supported,
            "glucose_total": self.glucose_total,
            "glucose_sampled": self.glucose_sampled,
            "glucose_literal_match": self.glucose_literal_match,
            "glucose_supported": self.glucose_supported,
            "literal_match_rate": round(self.literal_match_rate(), 4),
            "supported_rate": round(self.supported_rate(), 4),
            "by_stratum": {
                k: {"supported": v[0], "sampled": v[1]} for k, v in self.by_stratum.items()
            },
            "weakest_strata": self.weakest_strata(),
        }


class CoVeGateError(RuntimeError):
    """Raised when Pass-7's literal or entailment gate fails."""


class Pass7CoVeVerifier:
    """Chain-of-Verification audit pass."""

    SYSTEM_TEMPLATE = "pass7_cove_system.j2"
    USER_TEMPLATE = "pass7_cove_user.j2"

    def __init__(
        self,
        llm: LLMClient,
        *,
        sample_size: int | None = None,
        confidence_floor: float = DEFAULT_CONFIDENCE_FLOOR,
        supported_floor: float | None = None,
        rng_seed: int | None = None,
    ) -> None:
        settings = get_settings()
        self.llm = llm
        self.sample_size = sample_size if sample_size is not None else settings.cove_sample_size
        self.confidence_floor = confidence_floor
        self.supported_floor = (
            supported_floor if supported_floor is not None else settings.cove_supported_floor
        )
        self._rng = random.Random(rng_seed)
        self.usage = LLMUsage()
        self._system_prompt = _jinja_env.get_template(self.SYSTEM_TEMPLATE).render()
        self._user_template = _jinja_env.get_template(self.USER_TEMPLATE)

    async def verify_book(
        self,
        *,
        session: AsyncSession,
        book_id: int,
    ) -> CoVeStats:
        stats = CoVeStats()

        # Sample edges with their chunk + endpoint entity context.
        edge_rows = await self._sample_edges(session, book_id)
        stats.edges_total = await self._count_edges(session, book_id)
        stats.edges_sampled = len(edge_rows)
        for row in edge_rows:
            literal = is_literal_match(row["chunk_text"], row["evidence_span"])
            if literal:
                stats.edges_literal_match += 1
            supported = literal and await self._judge_edge(row)
            if supported:
                stats.edges_supported += 1
            stats.record(row["stratum"], supported=supported)

        # Sample glucose_facts with chunk + entity context.
        fact_rows = await self._sample_glucose(session, book_id)
        stats.glucose_total = await self._count_glucose(session, book_id)
        stats.glucose_sampled = len(fact_rows)
        for row in fact_rows:
            literal = is_literal_match(row["chunk_text"], row["evidence_span"])
            if literal:
                stats.glucose_literal_match += 1
            supported = literal and await self._judge_glucose(row)
            if supported:
                stats.glucose_supported += 1
            stats.record(row["stratum"], supported=supported)

        self._enforce(stats)
        return stats

    def _enforce(self, stats: CoVeStats) -> None:
        """Both gates. Literal first — it points at a bug, not at quality."""
        if stats.literal_match_rate() < LITERAL_MATCH_FLOOR:
            raise CoVeGateError(
                f"literal_match_rate {stats.literal_match_rate():.3f} < "
                f"{LITERAL_MATCH_FLOOR:.2f}. This is an upstream invariant, not a "
                "quality signal — Pass-2/5/6 drop non-literal spans, so a span "
                "reaching Pass-7 unmatched means a bug in span handling."
            )

        rate = stats.supported_rate()
        weakest = stats.weakest_strata(3)
        if self.supported_floor <= 0:
            log.warning(
                "Pass-7: entailment gate disabled (LOREGRAPH_COVE_SUPPORTED_FLOOR=0); "
                "supported_rate %.3f recorded but not enforced. Weakest strata: %s",
                rate,
                weakest,
            )
            return
        if rate < self.supported_floor:
            raise CoVeGateError(
                f"supported_rate {rate:.3f} < {self.supported_floor:.2f}; Pass-7 "
                f"entailment gate fails. Weakest strata: {weakest}. These claims "
                "cite a real quote that does not support them."
            )
        log.info(
            "Pass-7: supported_rate %.3f over %d sampled claims (floor %.2f). Weakest strata: %s",
            rate,
            stats.edges_sampled + stats.glucose_sampled,
            self.supported_floor,
            weakest,
        )

    # ---- sampling ----

    async def _sample_edges(self, session: AsyncSession, book_id: int) -> list[dict[str, Any]]:
        stmt = (
            select(orm.Edge, orm.Chunk, orm.Entity)
            .join(orm.Chunk, orm.Chunk.id == orm.Edge.chunk_id)
            .join(orm.Entity, orm.Entity.id == orm.Edge.src_entity_id)
            .where(orm.Edge.book_id == book_id)
        )
        all_rows = (await session.execute(stmt)).all()
        if not all_rows:
            return []
        # Resolve dst entity names in a second pass for clarity.
        dst_ids = {edge.dst_entity_id for edge, _, _ in all_rows}
        dst_stmt = select(orm.Entity).where(orm.Entity.id.in_(dst_ids))
        dst_rows = {e.id: e for e in (await session.execute(dst_stmt)).scalars().all()}

        sample = stratified_sample(
            all_rows,
            key=lambda r: _stratum(r[0].relation, r[0].inference_depth),
            budget=self.sample_size,
            exhaustive=lambda r: r[0].inference_depth in _ALWAYS_VERIFY_DEPTHS,
            rng=self._rng,
        )
        return [
            {
                "claim_type": "edge",
                "chunk_text": chunk.text,
                "evidence_span": edge.evidence_span,
                "src_name": src.canonical_name,
                "dst_name": dst_rows[edge.dst_entity_id].canonical_name,
                "relation": edge.relation,
                "stratum": _stratum(edge.relation, edge.inference_depth),
            }
            for edge, chunk, src in sample
        ]

    async def _sample_glucose(self, session: AsyncSession, book_id: int) -> list[dict[str, Any]]:
        stmt = (
            select(orm.GlucoseFact, orm.Chunk, orm.Entity)
            .join(orm.Chunk, orm.Chunk.id == orm.GlucoseFact.chunk_id)
            .join(orm.Entity, orm.Entity.id == orm.GlucoseFact.entity_id)
            .where(orm.GlucoseFact.book_id == book_id)
        )
        all_rows = (await session.execute(stmt)).all()
        if not all_rows:
            return []
        sample = stratified_sample(
            all_rows,
            key=lambda r: _stratum(r[0].dimension, r[0].inference_depth),
            budget=self.sample_size,
            exhaustive=lambda r: r[0].inference_depth in _ALWAYS_VERIFY_DEPTHS,
            rng=self._rng,
        )
        return [
            {
                "claim_type": "glucose_fact",
                "chunk_text": chunk.text,
                "evidence_span": fact.evidence_span,
                "entity_name": entity.canonical_name,
                "statement": fact.statement,
                "dimension": fact.dimension,
                "time_aspect": fact.time_aspect,
                "inference_depth": fact.inference_depth,
                "stratum": _stratum(fact.dimension, fact.inference_depth),
            }
            for fact, chunk, entity in sample
        ]

    async def _count_edges(self, session: AsyncSession, book_id: int) -> int:
        from sqlalchemy import func

        stmt = select(func.count(orm.Edge.id)).where(orm.Edge.book_id == book_id)
        return int((await session.execute(stmt)).scalar() or 0)

    async def _count_glucose(self, session: AsyncSession, book_id: int) -> int:
        from sqlalchemy import func

        stmt = select(func.count(orm.GlucoseFact.id)).where(orm.GlucoseFact.book_id == book_id)
        return int((await session.execute(stmt)).scalar() or 0)

    # ---- LLM judging ----

    async def _judge_edge(self, row: dict[str, Any]) -> bool:
        return await self._judge(
            row,
            extra={
                "src_name": row["src_name"],
                "dst_name": row["dst_name"],
                "relation": row["relation"],
            },
        )

    async def _judge_glucose(self, row: dict[str, Any]) -> bool:
        return await self._judge(
            row,
            extra={
                "entity_name": row["entity_name"],
                "statement": row["statement"],
                "dimension": row["dimension"],
                "time_aspect": row["time_aspect"],
                "inference_depth": row["inference_depth"],
            },
        )

    async def _judge(self, row: dict[str, Any], *, extra: dict[str, Any]) -> bool:
        user_prompt = self._user_template.render(
            chunk_text=row["chunk_text"],
            claim_type=row["claim_type"],
            evidence_span=row["evidence_span"],
            **extra,
        )
        msg = await self.llm.complete(system=self._system_prompt, user=user_prompt)
        self.usage.merge(msg)
        text = self.llm.extract_text(msg)
        try:
            response = parse_into(_CoVeResponse, text)
        except LLMOutputError:
            log.warning("Pass-7: malformed CoVe response, treating as unsupported")
            return False
        return response.supported and response.confidence >= self.confidence_floor
