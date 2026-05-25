"""/api/entities/{id} — entity detail panel data."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import schema as orm
from loregraph.models.edges import Edge
from loregraph.models.entities import Entity
from loregraph.models.glucose import GlucoseFact
from loregraph.web.dependencies import get_session
from loregraph.web.schemas import EntityDetail

router = APIRouter(prefix="/api/entities", tags=["entities"])


@router.get("/{entity_id}", response_model=EntityDetail)
async def get_entity_detail(
    entity_id: int, session: AsyncSession = Depends(get_session)
) -> EntityDetail:
    entity_row = await session.get(orm.Entity, entity_id)
    if entity_row is None:
        raise HTTPException(status_code=404, detail=f"entity_id={entity_id} not found")

    mention_count = int(
        (
            await session.execute(
                select(func.count(orm.Mention.id)).where(orm.Mention.entity_id == entity_id)
            )
        ).scalar()
        or 0
    )
    outgoing = (
        (
            await session.execute(
                select(orm.Edge).where(orm.Edge.src_entity_id == entity_id).order_by(orm.Edge.id)
            )
        )
        .scalars()
        .all()
    )
    incoming = (
        (
            await session.execute(
                select(orm.Edge).where(orm.Edge.dst_entity_id == entity_id).order_by(orm.Edge.id)
            )
        )
        .scalars()
        .all()
    )
    glucose = (
        (
            await session.execute(
                select(orm.GlucoseFact)
                .where(orm.GlucoseFact.entity_id == entity_id)
                .order_by(orm.GlucoseFact.id)
            )
        )
        .scalars()
        .all()
    )

    return EntityDetail(
        entity=Entity.model_validate(entity_row),
        mention_count=mention_count,
        outgoing_edges=[Edge.model_validate(e) for e in outgoing],
        incoming_edges=[Edge.model_validate(e) for e in incoming],
        glucose_facts=[GlucoseFact.model_validate(g) for g in glucose],
    )
