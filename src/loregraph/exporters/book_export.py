"""scripts/export_book.py — dump one extracted book to a frontend-ready JSON.

Emits `data/exports/<frontend_id>.json` containing the derived knowledge graph
(entities, edges, glucose facts, per-entity notes) plus chapter/chunk structure.

License-aware text policy
-------------------------
- Derived metadata (entities, edges, glucose, notes) + SHORT evidence spans are
  exported for EVERY book — these are fair-use derivations and the product's core.
- FULL reading text (chunk bodies) is embedded ONLY for public-domain books. For
  copyrighted works we set `full_text_available=false` and omit chunk bodies, so
  the committed JSON never carries a copyrighted work's full text.

CLI:
    uv run python scripts/export_book.py --book-id 2 --frontend-id alice \
        --license public-domain --out data/exports/alice.json
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from sqlalchemy import select

from loregraph.db import schema as orm
from loregraph.db.engine import init_engine, session_scope
from loregraph.models.predicates import classify, coverage


async def _quality(session: object, book_id: int) -> dict[str, Any]:
    """Pass-7's audit result, so the graph's quality number ships with the graph.

    Without this the only number a reader ever sees is a count of edges, which
    says how much was extracted and nothing about whether it is right. Pass-7
    computes `supported_rate` — the fraction of sampled claims whose evidence
    span actually entails them — and used to leave it in `pass_runs.stats`,
    where no consumer could reach it.
    """
    row = (
        await session.execute(  # type: ignore[attr-defined]
            select(orm.PassRun).where(orm.PassRun.book_id == book_id, orm.PassRun.pass_num == 7)
        )
    ).scalar_one_or_none()
    if row is None:
        return {"audited": False, "reason": "pass-7 has not run for this book"}
    stats = dict(row.stats or {})
    return {
        "audited": _v(row.status) == "done",
        "status": _v(row.status),
        "ran_at": row.finished_at.isoformat() if row.finished_at else None,
        # The number that measures quality.
        "supported_rate": stats.get("supported_rate"),
        # The invariant tripwire. 1.0 by construction on a healthy pipeline —
        # kept for completeness, but it is not a quality signal.
        "literal_match_rate": stats.get("literal_match_rate"),
        "sampled": (stats.get("edges_sampled") or 0) + (stats.get("glucose_sampled") or 0),
        "claims": (stats.get("edges_total") or 0) + (stats.get("glucose_total") or 0),
        "weakest_strata": stats.get("weakest_strata") or [],
    }


def _v(x: object) -> object:
    """Normalize an enum-or-string column to its string value.

    The ORM declares these columns as native Postgres ENUMs built from string
    values (not bound to the Python enum class), so SQLAlchemy returns plain
    strings on load. Tolerate both so the export is robust either way.
    """
    return x.value if hasattr(x, "value") else x


async def export_book(
    book_id: int, frontend_id: str, license_: str, out_path: Path, max_entities: int = 0
) -> dict[str, Any]:
    include_text = license_ == "public-domain"
    init_engine()
    async with session_scope() as session:
        book = await session.get(orm.Book, book_id)
        if book is None:
            raise SystemExit(f"book_id {book_id} not found")

        # ---- chunks (reading order) ----
        chunks = (
            (
                await session.execute(
                    select(orm.Chunk)
                    .where(orm.Chunk.book_id == book_id)
                    .order_by(orm.Chunk.chapter, orm.Chunk.seq)
                )
            )
            .scalars()
            .all()
        )
        id_to_atom = {c.id: c.atom_id for c in chunks}
        id_to_chapter = {c.id: c.chapter for c in chunks}
        chapters = sorted({c.chapter for c in chunks})

        # ---- load entities / edges / glucose / mentions ----
        entities = (
            (
                await session.execute(
                    select(orm.Entity).where(orm.Entity.book_id == book_id).order_by(orm.Entity.id)
                )
            )
            .scalars()
            .all()
        )
        id_to_canon = {e.id: e.canonical_id for e in entities}

        edges = (
            (
                await session.execute(
                    select(orm.Edge).where(orm.Edge.book_id == book_id).order_by(orm.Edge.id)
                )
            )
            .scalars()
            .all()
        )
        glucose = (
            (
                await session.execute(
                    select(orm.GlucoseFact)
                    .where(orm.GlucoseFact.book_id == book_id)
                    .order_by(orm.GlucoseFact.id)
                )
            )
            .scalars()
            .all()
        )
        mention_rows = (
            await session.execute(
                select(orm.Mention.entity_id, orm.Mention.chunk_id).where(
                    orm.Mention.book_id == book_id
                )
            )
        ).all()

        # ---- aggregates (per-entity mentions/chapters, per-chunk density) ----
        ent_mentions: dict[int, int] = defaultdict(int)
        ent_chapters: dict[int, set[int]] = defaultdict(set)
        chunk_mentions: dict[int, int] = defaultdict(int)
        for entity_id, chunk_id in mention_rows:
            chunk_mentions[chunk_id] += 1
            if entity_id is not None:
                ent_mentions[entity_id] += 1
                ch = id_to_chapter.get(chunk_id)
                if ch is not None:
                    ent_chapters[entity_id].add(ch)
        chunk_edges: dict[int, int] = defaultdict(int)
        for e in edges:
            chunk_edges[e.chunk_id] += 1

        # ---- cap to the most-connected entities ----
        # A 100-chapter book yields 15k+ entities (mostly one-off objects/events);
        # shipping them all is a 17MB payload. Keep the top-N by edge degree (then
        # mentions) — the graph/index focus on what matters; full data stays in DB.
        if max_entities and len(entities) > max_entities:
            deg: dict[int, int] = defaultdict(int)
            for e in edges:
                deg[e.src_entity_id] += 1
                deg[e.dst_entity_id] += 1
            ranked = sorted(entities, key=lambda e: (-deg.get(e.id, 0), -ent_mentions.get(e.id, 0)))
            kept = {e.id for e in ranked[:max_entities]}
            entities = [e for e in entities if e.id in kept]
            edges = [e for e in edges if e.src_entity_id in kept and e.dst_entity_id in kept]
            glucose = [g for g in glucose if g.entity_id in kept]

        # ---- build records ----
        chunk_list = [
            {
                "atom_id": c.atom_id,
                "chapter": c.chapter,
                "seq": c.seq,
                "char_start": c.char_offset_start,
                "char_end": c.char_offset_end,
                "token_count": c.token_count,
                "mention_count": chunk_mentions.get(c.id, 0),
                "edge_count": chunk_edges.get(c.id, 0),
                **({"text": c.text} if include_text else {}),
            }
            for c in chunks
        ]
        entity_list = [
            {
                "canonical_id": e.canonical_id,
                "type": _v(e.type),
                "subtype": (e.attributes or {}).get("subtype"),
                "tier": (e.attributes or {}).get("tier"),
                # Prefer the LLM-canonicalized well-known name (孙悟空) over the raw
                # most-frequent surface form (行者) when canonicalize_book.py has run.
                "canonical_name": (e.attributes or {}).get("canon") or e.canonical_name,
                "aliases": list(e.aliases or []),
                "mention_count": ent_mentions.get(e.id, 0),
                "chapters": sorted(ent_chapters.get(e.id, set())),
                "attributes": e.attributes or {},
                "note_md": e.note_md or "",
            }
            for e in entities
        ]
        edge_list = []
        for e in edges:
            attrs = e.attributes or {}
            edge_list.append(
                {
                    "src": id_to_canon.get(e.src_entity_id),
                    "dst": id_to_canon.get(e.dst_entity_id),
                    "relation": _v(e.relation),
                    "predicate": attrs.get("predicate"),
                    # Closed class beside the open verb — the axis you query on.
                    # Recomputed rather than read from attrs so a vocabulary
                    # update reaches already-extracted books on re-export.
                    "predicate_class": classify(
                        attrs.get("predicate"), str(_v(e.relation) or "")
                    ).value,
                    "weight": attrs.get("weight"),
                    "sentiment": attrs.get("sentiment"),
                    "evidence_span": e.evidence_span,
                    "confidence": e.confidence,
                    "inference_depth": _v(e.inference_depth),
                    "atom_id": id_to_atom.get(e.chunk_id),
                }
            )
        glucose_list = [
            {
                "entity": id_to_canon.get(g.entity_id),
                "dimension": _v(g.dimension),
                "time_aspect": _v(g.time_aspect),
                "statement": g.statement,
                "evidence_span": g.evidence_span,
                "confidence": g.confidence,
                "inference_depth": _v(g.inference_depth),
                "atom_id": id_to_atom.get(g.chunk_id),
            }
            for g in glucose
        ]

        metadata: dict[str, Any] = {
            "frontend_id": frontend_id,
            "book_id": book_id,
            "title": book.title,
            "author": book.author,
            "language": book.language,
            "license": license_,
            "full_text_available": include_text,
            "counts": {
                "entities": len(entity_list),
                "edges": len(edge_list),
                "glucose": len(glucose_list),
                "chapters": len(chapters),
                "chunks": len(chunk_list),
            },
            "quality": await _quality(session, book_id),
            # How much of the graph landed in a queryable predicate class —
            # the counterpart to `quality`, for structure rather than truth.
            "predicate_coverage": coverage(
                [(str(e["predicate"] or ""), str(e["relation"] or "")) for e in edge_list]
            ),
        }
        payload = {
            "metadata": metadata,
            "chapters": chapters,
            "chunks": chunk_list,
            "entities": entity_list,
            "edges": edge_list,
            "glucose": glucose_list,
        }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return metadata
