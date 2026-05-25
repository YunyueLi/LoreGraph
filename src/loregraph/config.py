"""LoreGraph runtime configuration.

Loaded from environment variables (and an optional .env file at the repo
root). Per-book overrides live in `loregraph.yaml` and are layered on at
pipeline invocation time, not here.
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Process-wide settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    anthropic_api_key: str = Field(..., alias="ANTHROPIC_API_KEY")
    database_url: str = Field(
        ...,
        alias="DATABASE_URL",
        description="SQLAlchemy async URL, e.g. postgresql+asyncpg://user:pw@host:5432/db",
    )
    model: str = Field("claude-sonnet-4-6", alias="LOREGRAPH_MODEL")
    log_level: str = Field("INFO", alias="LOREGRAPH_LOG_LEVEL")
    cost_ceiling_usd: float = Field(20.0, alias="LOREGRAPH_COST_CEILING_USD")


_settings: Settings | None = None


def get_settings() -> Settings:
    """Return the process-wide Settings, instantiated lazily."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
