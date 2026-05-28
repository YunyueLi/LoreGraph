"""LoreGraph runtime configuration.

Loaded from environment variables (and an optional .env file at the repo
root). Per-book overrides live in `loregraph.yaml` and are layered on at
pipeline invocation time, not here.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
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

    # ── LLM provider selection ───────────────────────────────────────
    llm_provider: str = Field(
        default="anthropic",
        alias="LOREGRAPH_LLM_PROVIDER",
        description=(
            "Which LLM backend to use. One of: anthropic, openai, deepseek, "
            "kimi/moonshot, zhipu/glm, qwen/dashscope, groq, grok/xai, "
            "gemini/google, together, fireworks, mistral, openrouter, "
            "ollama, vllm, openai_compatible. The non-anthropic options "
            "all dispatch through the OpenAI-compatible SDK."
        ),
    )
    llm_api_key: str | None = Field(
        default=None,
        alias="LOREGRAPH_LLM_API_KEY",
        description=(
            "Generic LLM API key. If set, it takes precedence over the "
            "provider-specific *_API_KEY env vars below. Useful when you "
            "want to swap providers without renaming env vars."
        ),
    )
    llm_base_url: str | None = Field(
        default=None,
        alias="LOREGRAPH_LLM_BASE_URL",
        description=(
            "Override for the provider's base URL (OpenAI-compatible only). "
            "Set this when using `openai_compatible` with a custom endpoint."
        ),
    )
    llm_model: str | None = Field(
        default=None,
        alias="LOREGRAPH_LLM_MODEL",
        description="Override the provider's default model name.",
    )

    # ── Provider-specific keys ──────────────────────────────────────
    # All optional; the right one is chosen by `llm_provider`.
    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")

    # ── Storage ─────────────────────────────────────────────────────
    database_url: str = Field(
        default="postgresql+asyncpg://loregraph:loregraph@localhost:5432/loregraph",
        alias="DATABASE_URL",
        description="SQLAlchemy async URL.",
    )

    # ── Legacy / behaviour ───────────────────────────────────────────
    model: str = Field("claude-sonnet-4-6", alias="LOREGRAPH_MODEL")
    log_level: str = Field("INFO", alias="LOREGRAPH_LOG_LEVEL")
    cost_ceiling_usd: float = Field(20.0, alias="LOREGRAPH_COST_CEILING_USD")

    # ── Provider lookup helpers ─────────────────────────────────────
    def resolved_api_key(self, provider: str) -> str | None:
        """Pick the API key for `provider`, with this precedence:

        1. `LOREGRAPH_LLM_API_KEY` (generic, set explicitly)
        2. The provider's canonical env var (`OPENAI_API_KEY`, etc.)
        3. None
        """
        if self.llm_api_key:
            return self.llm_api_key

        from loregraph.llm.client import _API_KEY_ENV_ALIASES  # local to avoid cycle

        for env_name in _API_KEY_ENV_ALIASES.get(provider, ()):
            v = os.getenv(env_name)
            if v:
                return v
        # last-chance fallback for the two providers with a Pydantic field
        if provider == "anthropic":
            return self.anthropic_api_key
        if provider == "openai":
            return self.openai_api_key
        return None

    def resolved_base_url(self, provider: str) -> str | None:
        """Pick the base URL for `provider` (preset table or explicit override)."""
        if self.llm_base_url:
            return self.llm_base_url

        from loregraph.llm.client import PROVIDER_PRESETS

        preset = PROVIDER_PRESETS.get(provider, (None, None))
        return preset[0]

    def resolved_model(self, provider: str) -> str | None:
        """Pick the model name for `provider`."""
        if self.llm_model:
            return self.llm_model
        # legacy LOREGRAPH_MODEL only applies to anthropic
        if provider == "anthropic" and self.model:
            return self.model

        from loregraph.llm.client import PROVIDER_PRESETS

        preset = PROVIDER_PRESETS.get(provider, (None, None))
        return preset[1]


_settings: Settings | None = None


def get_settings() -> Settings:
    """Return the process-wide Settings, instantiated lazily."""
    global _settings
    if _settings is None:
        # pydantic-settings reads .env only into declared fields; the
        # provider-specific *_API_KEY vars are looked up via os.getenv
        # in resolved_api_key(), so we also push .env into os.environ.
        load_dotenv(override=False)
        _settings = Settings()  # type: ignore[call-arg]  # pydantic-settings reads env
    return _settings
