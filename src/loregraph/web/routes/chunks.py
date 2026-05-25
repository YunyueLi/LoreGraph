"""/api/chunks/{id} — chunk text + everything extracted from it."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import schema as orm
from loregraph.models.atoms import Chunk
from loregraph.models.edges import Edge
from loregraph.models.entities import Mention
from loregraph.models.glucose import GlucoseFact
from loregraph.web.dependencies import get_session
from loregraph.web.schemas import ChunkDetail

router = APIRouter(prefix="/api/chunks", tags=["chunks"])


@router.get("/{chunk_id}", response_model=ChunkDetail)
async def get_chunk_detail(
    chunk_id: int, session: AsyncSession = Depends(get_session)
) -> ChunkDetail:
    chunk_row = await session.get(orm.Chunk, chunk_id)
    if chunk_row is None:
        raise HTTPException(status_code=404, detail=f"chunk_id={chunk_id} not found")

    mentions = (
        (
            await session.execute(
                select(orm.Mention).where(orm.Mention.chunk_id == chunk_id).order_by(orm.Mention.id)
            )
        )
        .scalars()
        .all()
    )
    edges = (
        (
            await session.execute(
                select(orm.Edge).where(orm.Edge.chunk_id == chunk_id).order_by(orm.Edge.id)
            )
        )
        .scalars()
        .all()
    )
    glucose = (
        (
            await session.execute(
                select(orm.GlucoseFact)
                .where(orm.GlucoseFact.chunk_id == chunk_id)
                .order_by(orm.GlucoseFact.id)
            )
        )
        .scalars()
        .all()
    )

    return ChunkDetail(
        chunk=Chunk.model_validate(chunk_row),
        mentions=[Mention.model_validate(m) for m in mentions],
        edges_in_chunk=[Edge.model_validate(e) for e in edges],
        glucose_facts_in_chunk=[GlucoseFact.model_validate(g) for g in glucose],
    )
