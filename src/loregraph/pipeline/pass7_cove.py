"""Pass-7: Chain-of-Verification audit gate.

For each claim produced by Pass-5 (edges) and Pass-6 (glucose_facts) we
sample some fraction and ask the LLM whether the evidence_span actually
supports the claim. We compute:

  literal_match_rate  — fraction of evidence_spans that are literal
                        substrings of their chunk (this is a hard
                        invariant maintained by Pass-2/5/6; Pass-7
                        re-verifies as a sanity check).
  supported_rate      — fraction of CoVe-judged "supported: true".

Whole-pass policy: if `literal_match_rate < 0.95`, Pass-7 marks itself
as FAILED (Pass-7 is the v0.1 hallucination gate).

For v0.1 we don't *delete* unsupported claims — we just record the
stats so the operator can inspect them. Auto-purge based on confidence
threshold is out of scope until v0.2.
"""

from __future__ import annotations

import logging
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import schema as orm
from loregraph.llm.client import LLMClient, LLMUsage
from loregraph.llm.parser import LLMOutputError, parse_into
from loregraph.utils.spans import is_literal_match

log = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "llm" / "prompts"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_PROMPTS_DIR)),
    autoescape=select_autoescape(default=False),
    keep_trailing_newline=True,
)

LITERAL_MATCH_FLOOR = 0.95
DEFAULT_SAMPLE_SIZE = 50
DEFAULT_CONFIDENCE_FLOOR = 0.6


class _CoVeResponse(BaseModel):
    supported: bool
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str = ""


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
        }


class CoVeGateError(RuntimeError):
    """Raised when literal_match_rate drops below LITERAL_MATCH_FLOOR."""


class Pass7CoVeVerifier:
    """Chain-of-Verification audit pass."""

    SYSTEM_TEMPLATE = "pass7_cove_system.j2"
    USER_TEMPLATE = "pass7_cove_user.j2"

    def __init__(
        self,
        llm: LLMClient,
        *,
        sample_size: int = DEFAULT_SAMPLE_SIZE,
        confidence_floor: float = DEFAULT_CONFIDENCE_FLOOR,
        rng_seed: int | None = None,
    ) -> None:
        self.llm = llm
        self.sample_size = sample_size
        self.confidence_floor = confidence_floor
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

        if stats.literal_match_rate() < LITERAL_MATCH_FLOOR:
            raise CoVeGateError(
                f"literal_match_rate {stats.literal_match_rate():.3f} < "
                f"{LITERAL_MATCH_FLOOR:.2f}; Pass-7 gate fails"
            )

        return stats

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

        sample = self._rng.sample(all_rows, min(self.sample_size, len(all_rows)))
        return [
            {
                "claim_type": "edge",
                "chunk_text": chunk.text,
                "evidence_span": edge.evidence_span,
                "src_name": src.canonical_name,
                "dst_name": dst_rows[edge.dst_entity_id].canonical_name,
                "relation": edge.relation,
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
        sample = self._rng.sample(all_rows, min(self.sample_size, len(all_rows)))
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
