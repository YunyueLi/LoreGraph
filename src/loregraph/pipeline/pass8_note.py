"""Pass-8: Hybrid Note synthesis.

For every entity that survived Pass-7 verification, gather all the
evidence the earlier passes produced (mentions + outgoing/incoming
edges + glucose facts) and ask the LLM to synthesise a structured
markdown profile with five sections:

    [CONTEXT][FACTS][INFERENCES][GAPS][EVIDENCE]

Written to `entities.note_md`. Pass-8 makes no schema change; the
column was reserved at Pass-2 time.
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
from loregraph.db import schema as orm
from loregraph.llm.client import LLMClient, LLMUsage
from loregraph.models.entities import Entity
from loregraph.models.enums import EntityType

log = logging.getLogger(__name__)

# Closed enum of subtypes per category (v1.1 schema). Anything else from the
# LLM falls back to "Other".
_SUBTYPE_ENUM: dict[EntityType, set[str]] = {
    EntityType.AGENT:   {"Person", "Clan", "Community", "Organization", "Mythic"},
    EntityType.OBJECT:  {"Document", "Post", "Asset", "Product", "Place", "Artifact"},
    EntityType.EVENT:   {"Statement", "Action", "Incident", "Transaction", "Meeting"},
    EntityType.CONCEPT: {"Topic", "Stance", "Theory", "Mechanism", "Prediction", "Symbol"},
}

_META_RE = re.compile(r"^\s*\[META\]\s*\n(.*?)(?=^\s*\[[A-Z_]+\]\s*$|\Z)", re.M | re.S)
_SUBTYPE_LINE_RE = re.compile(r"^\s*subtype\s*:\s*([A-Za-z_][\w\-]*)\s*$", re.M)


def _parse_meta_and_strip(raw: str, entity_type: EntityType) -> tuple[str | None, str]:
    """Return (subtype, note_md_without_meta). subtype validated against enum."""
    m = _META_RE.search(raw)
    if not m:
        return None, raw.strip()
    meta_block = m.group(1)
    body = (raw[: m.start()] + raw[m.end():]).strip()
    sub_match = _SUBTYPE_LINE_RE.search(meta_block)
    if not sub_match:
        return None, body
    candidate = sub_match.group(1)
    allowed = _SUBTYPE_ENUM.get(entity_type, set())
    if candidate in allowed:
        return candidate, body
    if candidate == "Other":
        return "Other", body
    log.warning(
        "Pass-8: dropped out-of-enum subtype %r for type %s",
        candidate,
        entity_type.value,
    )
    return None, body

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "llm" / "prompts"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_PROMPTS_DIR)),
    autoescape=select_autoescape(default=False),
    keep_trailing_newline=True,
)

# How many characters around a mention to show as snippet context.
_SNIPPET_PAD = 40
# Hard cap on per-entity LLM context — keeps cost predictable on huge entities
# like "Elizabeth" in a 60-chapter book.
_MAX_MENTIONS = 30
_MAX_EDGES = 25
_MAX_GLUCOSE = 15
# Per-entity note synthesis is one LLM call each — parallelize it (sequential
# was an end-of-pipeline bottleneck on entity-rich books).
_NOTE_CONCURRENCY = 10

_STUB_NOTE = (
    "[CONTEXT]\n(insufficient evidence in source text)\n\n"
    "[FACTS]\n- (none recorded)\n\n"
    "[INFERENCES]\n- (none recorded)\n\n"
    "[GAPS]\n- (none recorded)\n\n"
    "[EVIDENCE]\n- (none recorded)\n"
)


@dataclass(slots=True)
class _MentionCtx:
    atom_id: str
    surface_form: str
    snippet: str


@dataclass(slots=True)
class _EdgeCtx:
    atom_id: str
    relation: object  # RelationType enum
    evidence_span: str
    src_name: str
    dst_name: str


@dataclass(slots=True)
class _GlucoseCtx:
    atom_id: str
    dimension: object  # GlucoseDim enum
    time_aspect: object  # GlucoseTime enum
    statement: str


class Pass8NoteSynth:
    """Per-entity Hybrid Note synthesiser."""

    SYSTEM_TEMPLATE = "pass8_note_system.j2"
    USER_TEMPLATE = "pass8_note_user.j2"

    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm
        self.usage = LLMUsage()
        self._system_prompt = _jinja_env.get_template(self.SYSTEM_TEMPLATE).render()
        self._user_template = _jinja_env.get_template(self.USER_TEMPLATE)

    async def _build_user_prompt(self, session: AsyncSession, entity: Entity) -> str | None:
        """Gather an entity's evidence (DB reads — must run serially on the
        shared session) and render the user prompt. None ⇒ no evidence."""
        mentions = await self._collect_mentions(session, entity.id)
        outgoing, incoming = await self._collect_edges(session, entity.id)
        glucose = await self._collect_glucose(session, entity.id)
        if not mentions and not outgoing and not incoming and not glucose:
            return None
        return self._user_template.render(
            entity=entity,
            mentions=mentions[:_MAX_MENTIONS],
            outgoing=outgoing[:_MAX_EDGES],
            incoming=incoming[:_MAX_EDGES],
            glucose=glucose[:_MAX_GLUCOSE],
        )

    async def synthesise(self, session: AsyncSession, entity: Entity) -> str:
        prompt = await self._build_user_prompt(session, entity)
        if prompt is None:
            # No supporting evidence — a stub so the front-end has something.
            return _STUB_NOTE
        msg = await self.llm.complete(system=self._system_prompt, user=prompt)
        self.usage.merge(msg)
        return self.llm.extract_text(msg).strip()

    # ------- context gathering -------

    async def _collect_mentions(
        self, session: AsyncSession, entity_id: int
    ) -> list[_MentionCtx]:
        stmt = (
            select(orm.Mention, orm.Chunk)
            .join(orm.Chunk, orm.Chunk.id == orm.Mention.chunk_id)
            .where(orm.Mention.entity_id == entity_id)
            .order_by(orm.Mention.id)
        )
        rows = (await session.execute(stmt)).all()
        out: list[_MentionCtx] = []
        for mention, chunk in rows:
            lo = max(0, mention.char_start - _SNIPPET_PAD)
            hi = min(len(chunk.text), mention.char_end + _SNIPPET_PAD)
            snippet = chunk.text[lo:hi].replace("\n", " ").strip()
            if lo > 0:
                snippet = "…" + snippet
            if hi < len(chunk.text):
                snippet = snippet + "…"
            out.append(
                _MentionCtx(
                    atom_id=chunk.atom_id,
                    surface_form=mention.surface_form,
                    snippet=snippet,
                )
            )
        return out

    async def _collect_edges(
        self, session: AsyncSession, entity_id: int
    ) -> tuple[list[_EdgeCtx], list[_EdgeCtx]]:
        outgoing_stmt = (
            select(orm.Edge, orm.Chunk, orm.Entity)
            .join(orm.Chunk, orm.Chunk.id == orm.Edge.chunk_id)
            .join(orm.Entity, orm.Entity.id == orm.Edge.dst_entity_id)
            .where(orm.Edge.src_entity_id == entity_id)
            .order_by(orm.Edge.id)
        )
        outgoing = [
            _EdgeCtx(
                atom_id=chunk.atom_id,
                relation=edge.relation,
                evidence_span=edge.evidence_span,
                src_name="",
                dst_name=other.canonical_name,
            )
            for edge, chunk, other in (await session.execute(outgoing_stmt)).all()
        ]

        incoming_stmt = (
            select(orm.Edge, orm.Chunk, orm.Entity)
            .join(orm.Chunk, orm.Chunk.id == orm.Edge.chunk_id)
            .join(orm.Entity, orm.Entity.id == orm.Edge.src_entity_id)
            .where(orm.Edge.dst_entity_id == entity_id)
            .order_by(orm.Edge.id)
        )
        incoming = [
            _EdgeCtx(
                atom_id=chunk.atom_id,
                relation=edge.relation,
                evidence_span=edge.evidence_span,
                src_name=other.canonical_name,
                dst_name="",
            )
            for edge, chunk, other in (await session.execute(incoming_stmt)).all()
        ]
        return outgoing, incoming

    async def _collect_glucose(
        self, session: AsyncSession, entity_id: int
    ) -> list[_GlucoseCtx]:
        stmt = (
            select(orm.GlucoseFact, orm.Chunk)
            .join(orm.Chunk, orm.Chunk.id == orm.GlucoseFact.chunk_id)
            .where(orm.GlucoseFact.entity_id == entity_id)
            .order_by(orm.GlucoseFact.id)
        )
        rows = (await session.execute(stmt)).all()
        return [
            _GlucoseCtx(
                atom_id=chunk.atom_id,
                dimension=fact.dimension,
                time_aspect=fact.time_aspect,
                statement=fact.statement,
            )
            for fact, chunk in rows
        ]

    # ------- pass driver -------

    async def synthesise_all(self, session: AsyncSession, book_id: int) -> dict[str, int]:
        entities = await repo.list_entities(session, book_id)
        # Compute tier ranking once up-front; heuristic-only, no LLM.
        tier_map = await self._compute_tiers(session, entities)

        # Phase A — gather evidence + render prompts SERIALLY (shared session).
        prompts = [await self._build_user_prompt(session, e) for e in entities]

        # Phase B — synthesise notes CONCURRENTLY (the per-entity LLM call was
        # the bottleneck). DB writes stay out of here.
        sem = asyncio.Semaphore(_NOTE_CONCURRENCY)

        async def _one(prompt: str | None) -> str:
            if prompt is None:
                return _STUB_NOTE
            async with sem:
                msg = await self.llm.complete(system=self._system_prompt, user=prompt)
            self.usage.merge(msg)
            return self.llm.extract_text(msg).strip()

        raws = await asyncio.gather(*(_one(p) for p in prompts), return_exceptions=True)

        # Phase C — persist SERIALLY.
        notes_written = 0
        subtypes_assigned = 0
        tiers_assigned = 0
        for entity, raw in zip(entities, raws, strict=True):
            if isinstance(raw, Exception):
                log.warning(
                    "Pass-8: skipping entity %s (%s) — %s",
                    entity.canonical_id,
                    entity.canonical_name,
                    raw,
                )
                continue
            subtype, note_md = _parse_meta_and_strip(raw, entity.type)
            await repo.update_entity_note(session, entity.id, note_md)

            attrs = dict(entity.attributes or {})
            if subtype:
                attrs["subtype"] = subtype
                subtypes_assigned += 1
            if entity.id in tier_map:
                attrs["tier"] = tier_map[entity.id]
                tiers_assigned += 1
            if attrs != (entity.attributes or {}):
                await session.execute(
                    update(orm.Entity).where(orm.Entity.id == entity.id).values(attributes=attrs)
                )
            notes_written += 1
        return {
            "entities_total": len(entities),
            "notes_written": notes_written,
            "subtypes_assigned": subtypes_assigned,
            "tiers_assigned": tiers_assigned,
        }

    async def _compute_tiers(
        self, session: AsyncSession, entities: list[Entity]
    ) -> dict[int, str]:
        """Heuristic tier ranking for Agent entities.

        Sort agents by mention count desc, then bucket:
          - top 20%  → T1 (main characters)
          - next 50% → T2 (supporting / named minor)
          - rest     → T3 (background / single-scene)

        Non-agent entities (Object/Event/Concept) get no tier — they have
        a different ranking story.
        """
        agent_ids = [e.id for e in entities if e.type == EntityType.AGENT]
        if not agent_ids:
            return {}

        stmt = (
            select(orm.Mention.entity_id, func.count(orm.Mention.id))
            .where(orm.Mention.entity_id.in_(agent_ids))
            .group_by(orm.Mention.entity_id)
        )
        rows = (await session.execute(stmt)).all()
        mention_count: dict[int, int] = {eid: cnt for eid, cnt in rows}

        agents = [e for e in entities if e.type == EntityType.AGENT]
        # Sort by mentions desc; stable secondary key on canonical_name.
        agents_ranked = sorted(
            agents,
            key=lambda e: (-mention_count.get(e.id, 0), e.canonical_name),
        )
        n = len(agents_ranked)
        t1_cutoff = max(1, round(n * 0.20))
        t2_cutoff = max(t1_cutoff + 1, round(n * 0.70))
        tier_map: dict[int, str] = {}
        for i, agent in enumerate(agents_ranked):
            if i < t1_cutoff:
                tier_map[agent.id] = "T1"
            elif i < t2_cutoff:
                tier_map[agent.id] = "T2"
            else:
                tier_map[agent.id] = "T3"
        return tier_map
