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
from pathlib import Path

from sqlalchemy import select

from loregraph.db import schema as orm
from loregraph.db.engine import init_engine, session_scope

ROOT = Path(__file__).resolve().parent.parent


async def export_book(book_id: int, frontend_id: str, license_: str, out_path: Path) -> dict:
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
        chunk_list = [
            {
                "atom_id": c.atom_id,
                "chapter": c.chapter,
                "seq": c.seq,
                "char_start": c.char_offset_start,
                "char_end": c.char_offset_end,
                "token_count": c.token_count,
                **({"text": c.text} if include_text else {}),
            }
            for c in chunks
        ]
        chapters = sorted({c.chapter for c in chunks})

        # ---- entities ----
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
        entity_list = [
            {
                "canonical_id": e.canonical_id,
                "type": e.type.value,
                "subtype": (e.attributes or {}).get("subtype"),
                "tier": (e.attributes or {}).get("tier"),
                "canonical_name": e.canonical_name,
                "aliases": list(e.aliases or []),
                "attributes": e.attributes or {},
                "note_md": e.note_md or "",
            }
            for e in entities
        ]

        # ---- edges ----
        edges = (
            (
                await session.execute(
                    select(orm.Edge).where(orm.Edge.book_id == book_id).order_by(orm.Edge.id)
                )
            )
            .scalars()
            .all()
        )
        edge_list = []
        for e in edges:
            attrs = e.attributes or {}
            edge_list.append(
                {
                    "src": id_to_canon.get(e.src_entity_id),
                    "dst": id_to_canon.get(e.dst_entity_id),
                    "relation": e.relation.value,
                    "predicate": attrs.get("predicate"),
                    "weight": attrs.get("weight"),
                    "sentiment": attrs.get("sentiment"),
                    "evidence_span": e.evidence_span,
                    "confidence": e.confidence,
                    "inference_depth": e.inference_depth.value,
                    "atom_id": id_to_atom.get(e.chunk_id),
                }
            )

        # ---- glucose facts ----
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
        glucose_list = [
            {
                "entity": id_to_canon.get(g.entity_id),
                "dimension": g.dimension.value,
                "time_aspect": g.time_aspect.value,
                "statement": g.statement,
                "evidence_span": g.evidence_span,
                "confidence": g.confidence,
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
    args = ap.parse_args(argv)
    meta = asyncio.run(export_book(args.book_id, args.frontend_id, args.license, ROOT / args.out))
    print(f"exported {args.frontend_id}: {json.dumps(meta['counts'])} -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
