"""Shared context passed to every pass — wraps DB session, LLM client, settings."""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.config import Settings, get_settings
from loregraph.llm.client import LLMClient, LLMUsage


@dataclass(slots=True)
class PipelineContext:
    """Per-run state threaded through all passes."""

    book_id: int
    session: AsyncSession
    llm: LLMClient
    settings: Settings = field(default_factory=get_settings)
    usage: LLMUsage = field(default_factory=LLMUsage)
