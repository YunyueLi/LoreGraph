"""Unit tests for the multi-provider LLM client factory + config resolution.

No network. We instantiate clients to verify:
* `make_llm_client()` dispatches to the right concrete backend;
* `Settings.resolved_*()` picks the right value across env-var precedence;
* `PROVIDER_PRESETS` contains a stable set of canonical names.

These tests never call `.complete()` — that would hit the network. The
client constructors themselves are pure (just build SDK objects), so
verifying type + provider + base_url is enough to lock in the wiring.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest

from loregraph.config import Settings
from loregraph.llm.client import (
    PROVIDER_PRESETS,
    AnthropicLLMClient,
    LLMResponse,
    LLMUsage,
    OpenAICompatibleLLMClient,
    make_llm_client,
)


@pytest.fixture(autouse=True)
def _clear_llm_env(monkeypatch: pytest.MonkeyPatch, tmp_path) -> Iterator[None]:  # type: ignore[no-untyped-def]
    """Wipe every LLM-related env var so each test starts from a clean slate.

    pydantic-settings reads from `os.environ` at instance construction;
    leaving stale vars across tests would silently couple them. We also
    chdir to a tmp path so a project-root `.env` (if a dev created one
    for live testing) cannot leak provider/model overrides into tests.
    """
    monkeypatch.chdir(tmp_path)
    for var in [
        "LOREGRAPH_LLM_PROVIDER",
        "LOREGRAPH_LLM_API_KEY",
        "LOREGRAPH_LLM_BASE_URL",
        "LOREGRAPH_LLM_MODEL",
        "LOREGRAPH_MODEL",
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
        "DEEPSEEK_API_KEY",
        "MOONSHOT_API_KEY",
        "KIMI_API_KEY",
        "ZHIPU_API_KEY",
        "ZHIPUAI_API_KEY",
        "DASHSCOPE_API_KEY",
        "QWEN_API_KEY",
        "GROQ_API_KEY",
        "XAI_API_KEY",
        "GROK_API_KEY",
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
        "TOGETHER_API_KEY",
        "FIREWORKS_API_KEY",
        "MISTRAL_API_KEY",
        "OPENROUTER_API_KEY",
    ]:
        monkeypatch.delenv(var, raising=False)
    yield


# ════════════════════════════════════════════════════════════════════
# PROVIDER_PRESETS sanity
# ════════════════════════════════════════════════════════════════════


@pytest.mark.unit
def test_provider_presets_cover_documented_set() -> None:
    """If a provider listed in README disappears from the table, fail loudly."""
    expected = {
        "anthropic",
        "openai",
        "deepseek",
        "kimi",
        "moonshot",
        "zhipu",
        "glm",
        "qwen",
        "dashscope",
        "groq",
        "grok",
        "xai",
        "gemini",
        "google",
        "together",
        "fireworks",
        "mistral",
        "openrouter",
        "ollama",
        "vllm",
        "openai_compatible",
    }
    assert expected <= set(PROVIDER_PRESETS)


@pytest.mark.unit
def test_anthropic_preset_has_no_base_url_but_has_model() -> None:
    base_url, model = PROVIDER_PRESETS["anthropic"]
    assert base_url is None  # native SDK doesn't use base_url
    assert model and "claude" in model.lower()


@pytest.mark.unit
@pytest.mark.parametrize(
    "provider",
    ["openai", "deepseek", "kimi", "zhipu", "qwen", "groq", "grok", "gemini", "openrouter"],
)
def test_openai_compat_presets_have_https_base_url(provider: str) -> None:
    base_url, _ = PROVIDER_PRESETS[provider]
    assert base_url is not None
    assert base_url.startswith("https://")


@pytest.mark.unit
def test_openrouter_preset_uses_namespaced_model() -> None:
    """OpenRouter models are always `<vendor>/<model>` — fail loud if the default drifts."""
    base_url, model = PROVIDER_PRESETS["openrouter"]
    assert base_url == "https://openrouter.ai/api/v1"
    assert model and "/" in model


@pytest.mark.unit
def test_factory_routes_openrouter_through_openai_compatible(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LOREGRAPH_LLM_PROVIDER", "openrouter")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-test")
    s = Settings()  # type: ignore[call-arg]
    client = make_llm_client(s)
    assert isinstance(client, OpenAICompatibleLLMClient)
    assert client.provider == "openrouter"
    assert "/" in client.model


@pytest.mark.unit
def test_openai_compatible_preset_is_unconfigured() -> None:
    """The escape-hatch provider deliberately ships zero defaults."""
    assert PROVIDER_PRESETS["openai_compatible"] == (None, None)


# ════════════════════════════════════════════════════════════════════
# Settings · resolved_api_key precedence
# ════════════════════════════════════════════════════════════════════


@pytest.mark.unit
def test_resolved_api_key_prefers_generic_over_provider_specific(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LOREGRAPH_LLM_API_KEY", "generic-key")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "provider-specific-key")
    s = Settings()  # type: ignore[call-arg]
    assert s.resolved_api_key("deepseek") == "generic-key"


@pytest.mark.unit
def test_resolved_api_key_falls_back_to_provider_specific(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # LOREGRAPH_LLM_API_KEY unset; provider-specific env present.
    monkeypatch.setenv("DEEPSEEK_API_KEY", "deepseek-only-key")
    s = Settings()  # type: ignore[call-arg]
    assert s.resolved_api_key("deepseek") == "deepseek-only-key"


@pytest.mark.unit
def test_resolved_api_key_returns_none_when_nothing_set() -> None:
    s = Settings()  # type: ignore[call-arg]
    assert s.resolved_api_key("deepseek") is None


@pytest.mark.unit
def test_kimi_accepts_either_moonshot_or_kimi_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("KIMI_API_KEY", "kimi-key")
    s = Settings()  # type: ignore[call-arg]
    assert s.resolved_api_key("kimi") == "kimi-key"


# ════════════════════════════════════════════════════════════════════
# Settings · resolved_base_url + resolved_model
# ════════════════════════════════════════════════════════════════════


@pytest.mark.unit
def test_resolved_base_url_from_preset() -> None:
    s = Settings()  # type: ignore[call-arg]
    assert s.resolved_base_url("deepseek") == "https://api.deepseek.com/v1"


@pytest.mark.unit
def test_resolved_base_url_explicit_override_wins(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LOREGRAPH_LLM_BASE_URL", "http://my.gateway/v1")
    s = Settings()  # type: ignore[call-arg]
    # Override applies to every provider — that's the point of the env.
    assert s.resolved_base_url("openai") == "http://my.gateway/v1"
    assert s.resolved_base_url("ollama") == "http://my.gateway/v1"


@pytest.mark.unit
def test_resolved_model_explicit_override_wins(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LOREGRAPH_LLM_MODEL", "my-custom-model")
    s = Settings()  # type: ignore[call-arg]
    assert s.resolved_model("anthropic") == "my-custom-model"
    assert s.resolved_model("deepseek") == "my-custom-model"


@pytest.mark.unit
def test_resolved_model_falls_back_to_preset_default() -> None:
    s = Settings()  # type: ignore[call-arg]
    assert s.resolved_model("deepseek") == "deepseek-chat"
    assert s.resolved_model("gemini") == "gemini-2.0-flash"


# ════════════════════════════════════════════════════════════════════
# Factory dispatch
# ════════════════════════════════════════════════════════════════════


@pytest.mark.unit
def test_factory_returns_anthropic_client_by_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    s = Settings()  # type: ignore[call-arg]
    client = make_llm_client(s)
    assert isinstance(client, AnthropicLLMClient)
    assert client.provider == "anthropic"
    assert "claude" in client.model.lower()


@pytest.mark.unit
def test_factory_routes_deepseek_through_openai_compatible(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LOREGRAPH_LLM_PROVIDER", "deepseek")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-ds-test")
    s = Settings()  # type: ignore[call-arg]
    client = make_llm_client(s)
    assert isinstance(client, OpenAICompatibleLLMClient)
    assert client.provider == "deepseek"
    assert client.model == "deepseek-chat"


@pytest.mark.unit
def test_factory_supports_ollama_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Local providers (ollama/vllm) must not require an API key."""
    monkeypatch.setenv("LOREGRAPH_LLM_PROVIDER", "ollama")
    s = Settings()  # type: ignore[call-arg]
    client = make_llm_client(s)
    assert isinstance(client, OpenAICompatibleLLMClient)
    assert client.provider == "ollama"


@pytest.mark.unit
def test_anthropic_raises_when_no_key() -> None:
    s = Settings()  # type: ignore[call-arg]  # no ANTHROPIC_API_KEY in env
    with pytest.raises(RuntimeError, match="Anthropic API key missing"):
        AnthropicLLMClient(s)


@pytest.mark.unit
def test_unknown_provider_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LOREGRAPH_LLM_PROVIDER", "totally-fake-provider")
    s = Settings()  # type: ignore[call-arg]
    with pytest.raises(ValueError, match="Unknown OpenAI-compatible provider"):
        OpenAICompatibleLLMClient(s)


@pytest.mark.unit
def test_openai_compatible_requires_base_url_override(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The `openai_compatible` escape hatch must demand an explicit base_url."""
    monkeypatch.setenv("LOREGRAPH_LLM_PROVIDER", "openai_compatible")
    monkeypatch.setenv("LOREGRAPH_LLM_API_KEY", "sk-test")
    monkeypatch.setenv("LOREGRAPH_LLM_MODEL", "some-model")
    # No LOREGRAPH_LLM_BASE_URL → preset (None, None) → should fail.
    s = Settings()  # type: ignore[call-arg]
    with pytest.raises(RuntimeError, match="has no base_url"):
        OpenAICompatibleLLMClient(s)


# ════════════════════════════════════════════════════════════════════
# LLMUsage / LLMResponse accounting
# ════════════════════════════════════════════════════════════════════


@pytest.mark.unit
def test_llmusage_merge_accumulates_token_counters() -> None:
    usage = LLMUsage()
    usage.merge(
        LLMResponse(
            text="hi",
            input_tokens=100,
            output_tokens=20,
            cache_creation_input_tokens=50,
            cache_read_input_tokens=10,
        )
    )
    usage.merge(
        LLMResponse(
            text="bye",
            input_tokens=80,
            output_tokens=15,
            cache_read_input_tokens=70,
        )
    )
    assert usage.requests == 2
    assert usage.input_tokens == 180
    assert usage.output_tokens == 35
    assert usage.cache_creation_input_tokens == 50
    assert usage.cache_read_input_tokens == 80


@pytest.mark.unit
def test_llmclient_extract_text_static_helper_returns_text() -> None:
    """Backward-compat: pass modules still call `client.extract_text(resp)`."""
    resp = LLMResponse(text="some output")
    assert AnthropicLLMClient.extract_text(resp) == "some output"
    assert OpenAICompatibleLLMClient.extract_text(resp) == "some output"
