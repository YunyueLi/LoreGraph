"""Unit-test fixtures.

Unit tests assert on the code's built-in DEFAULTS (provider presets, model
fallbacks, factory dispatch). They must therefore be insulated from whatever
sits in the developer's real `.env` — which `loregraph.config` loads into
`os.environ` at import time, and which pydantic-settings also reads via
`env_file=".env"`. Without this isolation, a local `.env` that sets e.g.
`LOREGRAPH_LLM_PROVIDER=openrouter` would leak into `Settings()` and break the
default-asserting tests.
"""

from __future__ import annotations

import pytest

from loregraph.config import Settings

# Every env var Settings reads (directly or via resolved_* helpers).
_LOREGRAPH_ENV_VARS = (
    "LOREGRAPH_LLM_PROVIDER",
    "LOREGRAPH_LLM_MODEL",
    "LOREGRAPH_LLM_API_KEY",
    "LOREGRAPH_LLM_BASE_URL",
    "LOREGRAPH_MODEL",
    "LOREGRAPH_COST_CEILING_USD",
    "LOREGRAPH_LOG_LEVEL",
    "DATABASE_URL",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY",
    "DEEPSEEK_API_KEY",
    "MOONSHOT_API_KEY",
    "ZHIPU_API_KEY",
    "DASHSCOPE_API_KEY",
    "GROQ_API_KEY",
    "XAI_API_KEY",
    "GEMINI_API_KEY",
    "TOGETHER_API_KEY",
    "FIREWORKS_API_KEY",
    "MISTRAL_API_KEY",
)


@pytest.fixture(autouse=True)
def _isolate_settings_from_dotenv(monkeypatch: pytest.MonkeyPatch) -> None:
    """Give every unit test a clean settings environment.

    1. Delete LoreGraph env vars (clears anything `config.load_dotenv()` pushed
       into os.environ from a real .env).
    2. Disable pydantic-settings' on-disk `.env` reading for the duration.

    Individual tests can still `monkeypatch.setenv(...)` the vars they need.
    """
    for var in _LOREGRAPH_ENV_VARS:
        monkeypatch.delenv(var, raising=False)
    cfg = dict(Settings.model_config)
    cfg["env_file"] = None
    monkeypatch.setattr(Settings, "model_config", cfg)
