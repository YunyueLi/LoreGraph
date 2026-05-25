"""/api/books/{id}/graph — Cytoscape-ready nodes + edges payload."""

from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
from loregraph.db import schema as orm
from loregraph.web.dependencies import get_session
from loregraph.web.schemas import (
    BookSummary,
    GraphEdge,
    GraphNode,
    GraphResponse,
)

router = APIRouter(prefix="/api/books", tags=["graph"])


@router.get("/{book_id}/graph", response_model=GraphResponse)
async def get_book_graph(
    book_id: int,
    session: AsyncSession = Depends(get_session),
) -> GraphResponse:
    book = await repo.get_book(session, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail=f"book_id={book_id} not found")

    entities = await repo.list_entities(session, book_id)

    # Mention count per entity (one query).
    count_stmt = (
        select(orm.Mention.entity_id, func.count(orm.Mention.id))
        .where(orm.Mention.book_id == book_id, orm.Mention.entity_id.isnot(None))
        .group_by(orm.Mention.entity_id)
    )
    mention_counts: dict[int, int] = defaultdict(int)
    for entity_id, n in (await session.execute(count_stmt)).all():
        mention_counts[entity_id] = n

    # Edges — return all, frontend filters.
    edges_stmt = (
        select(orm.Edge, orm.Entity.canonical_id.label("src_cid"))
        .join(orm.Entity, orm.Entity.id == orm.Edge.src_entity_id)
        .where(orm.Edge.book_id == book_id)
    )
    edge_rows = (await session.execute(edges_stmt)).all()
    # Need dst canonical_id too — fetch in a single second pass.
    dst_ids = {e.dst_entity_id for e, _ in edge_rows}
    dst_stmt = select(orm.Entity.id, orm.Entity.canonical_id).where(orm.Entity.id.in_(dst_ids))
    dst_cid: dict[int, str] = {
        row.id: row.canonical_id for row in (await session.execute(dst_stmt)).all()
    }

    nodes = [
        GraphNode(
            id=e.canonical_id,
            db_id=e.id,
            label=e.canonical_name,
            type=e.type,
            aliases=list(e.aliases),
            mention_count=mention_counts.get(e.id, 0),
        )
        for e in entities
    ]
    edges = [
        GraphEdge(
            id=f"edge-{edge.id}",
            db_id=edge.id,
            source=src_cid,
            target=dst_cid.get(edge.dst_entity_id, ""),
            relation=edge.relation,
            evidence_span=edge.evidence_span,
            confidence=edge.confidence,
            inference_depth=edge.inference_depth,
            chunk_id=edge.chunk_id,
        )
        for edge, src_cid in edge_rows
    ]

    return GraphResponse(
        book=BookSummary.model_validate(book),
        nodes=nodes,
        edges=edges,
    )
