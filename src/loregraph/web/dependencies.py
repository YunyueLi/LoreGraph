"""FastAPI dependency injectors — DB session per request."""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db.engine import get_session_factory, init_engine


async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield an async DB session for the request. Rolls back on exception."""
    init_engine()  # idempotent
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
