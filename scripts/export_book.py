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

import argparse
import asyncio
import json
from collections import defaultdict
from pathlib import Path

from sqlalchemy import select

from loregraph.db import schema as orm
from loregraph.db.engine import init_engine, session_scope

ROOT = Path(__file__).resolve().parent.parent


def _v(x: object) -> object:
    """Normalize an enum-or-string column to its string value.

    The ORM declares these columns as native Postgres ENUMs built from string
    values (not bound to the Python enum class), so SQLAlchemy returns plain
    strings on load. Tolerate both so the export is robust either way.
    """
    return x.value if hasattr(x, "value") else x


async def export_book(
    book_id: int, frontend_id: str, license_: str, out_path: Path, max_entities: int = 0
) -> dict:
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

        payload = {
            "metadata": {
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
            },
            "chapters": chapters,
            "chunks": chunk_list,
            "entities": entity_list,
            "edges": edge_list,
            "glucose": glucose_list,
        }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload["metadata"]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--book-id", type=int, required=True)
    ap.add_argument("--frontend-id", required=True)
    ap.add_argument("--license", default="public-domain")
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-entities", type=int, default=0, help="cap to top-N by degree (0 = all)")
    args = ap.parse_args(argv)
    meta = asyncio.run(
        export_book(args.book_id, args.frontend_id, args.license, ROOT / args.out, args.max_entities)
    )
    print(f"exported {args.frontend_id}: {json.dumps(meta['counts'])} -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
