"""/api/books — list and detail."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
from loregraph.db import schema as orm
from loregraph.web.dependencies import get_session
from loregraph.web.schemas import BookSummary

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("", response_model=list[BookSummary])
async def list_books(session: AsyncSession = Depends(get_session)) -> list[BookSummary]:
    """List every ingested book."""
    stmt = select(orm.Book).order_by(orm.Book.id)
    rows = (await session.execute(stmt)).scalars().all()
    return [BookSummary.model_validate(r) for r in rows]


@router.get("/{book_id}", response_model=BookSummary)
async def get_book(book_id: int, session: AsyncSession = Depends(get_session)) -> BookSummary:
    book = await repo.get_book(session, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail=f"book_id={book_id} not found")
    return BookSummary.model_validate(book)
