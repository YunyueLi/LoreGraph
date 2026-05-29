"""Multi-provider LLM client — the *only* place LLM calls live.

All passes route through `LLMClient`. Reasons:

1. **Prompt caching** is wired here once, not per-pass.
2. **Token + cost accounting** is recorded in `pass_runs.stats` from
   exactly one call site.
3. **Retry / backoff** policy is uniform.
4. **Testability**: respx-mocked HTTPX transport (in tests/) can target
   this single client.

Backends
--------

* `AnthropicLLMClient` — native Anthropic SDK; uses
  `cache_control: ephemeral` so identical system prompts across chunks
  hit the 5-minute prompt cache (≈ 90 % input-cost reduction on hits).
* `OpenAICompatibleLLMClient` — `openai` SDK with a configurable
  `base_url`. Covers OpenAI, DeepSeek, Moonshot (Kimi), Zhipu (GLM),
  Alibaba Qwen (DashScope), Groq, xAI (Grok), Google Gemini's
  OpenAI-compatible endpoint, Together, Fireworks, Ollama, vLLM, and
  anything else exposing the OpenAI chat-completions shape. Some of
  those providers do their own automatic prompt caching server-side
  (OpenAI ≥ Aug 2024, DeepSeek) — when they expose
  `usage.prompt_tokens_details.cached_tokens` we surface it.

Provider selection
------------------

`LOREGRAPH_LLM_PROVIDER` (env / .env) picks the backend. See
`PROVIDER_PRESETS` below for the built-in shortcuts; for an unlisted
OpenAI-compatible endpoint use `openai_compatible` + `LOREGRAPH_LLM_BASE_URL`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from anthropic import (
    APIConnectionError as _AnthropicConn,
)
from anthropic import (
    APITimeoutError as _AnthropicTimeout,
)
from anthropic import (
    AsyncAnthropic,
)
from anthropic import (
    InternalServerError as _AnthropicInternal,
)
from anthropic import (
    RateLimitError as _AnthropicRate,
)
from openai import (
    APIConnectionError as _OpenAIConn,
)
from openai import (
    APITimeoutError as _OpenAITimeout,
)
from openai import (
    AsyncOpenAI,
)
from openai import (
    InternalServerError as _OpenAIInternal,
)
from openai import (
    RateLimitError as _OpenAIRate,
)
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_random_exponential,
)

from loregraph.config import Settings, get_settings

# Transient LLM API errors worth retrying during a long unattended run.
# Deliberately excludes 4xx (400/401/404) — those are bugs, not blips.
_RETRYABLE_ERRORS = (
    _OpenAIRate,
    _OpenAITimeout,
    _OpenAIConn,
    _OpenAIInternal,
    _AnthropicRate,
    _AnthropicTimeout,
    _AnthropicConn,
    _AnthropicInternal,
)


async def _acreate_with_retry(make_call: Any) -> Any:
    """Run an async LLM API call with exponential backoff + jitter on transient
    errors. This is the SINGLE retry layer (SDK auto-retry is disabled) so the
    policy is explicit + bounded: ≤6 attempts, backoff capped ~120s, jittered to
    avoid a thundering herd when many concurrent calls hit a 429 together.
    `make_call` is a zero-arg callable returning a fresh awaitable each attempt.
    """
    async for attempt in AsyncRetrying(
        retry=retry_if_exception_type(_RETRYABLE_ERRORS),
        wait=wait_random_exponential(multiplier=2, max=120),
        stop=stop_after_attempt(6),
        reraise=True,
    ):
        with attempt:
            return await make_call()
    raise AssertionError("unreachable")


# ────────────────────────────────────────────────────────────────────
# Provider preset table — (default_base_url, default_model)
# Set `LOREGRAPH_LLM_BASE_URL` and/or `LOREGRAPH_LLM_MODEL` to override.
# ────────────────────────────────────────────────────────────────────

PROVIDER_PRESETS: dict[str, tuple[str | None, str | None]] = {
    "anthropic": (None, "claude-sonnet-4-6"),
    "openai": ("https://api.openai.com/v1", "gpt-4o"),
    "deepseek": ("https://api.deepseek.com/v1", "deepseek-chat"),
    "kimi": ("https://api.moonshot.cn/v1", "moonshot-v1-32k"),
    "moonshot": ("https://api.moonshot.cn/v1", "moonshot-v1-32k"),
    "zhipu": ("https://open.bigmodel.cn/api/paas/v4", "glm-4-plus"),
    "glm": ("https://open.bigmodel.cn/api/paas/v4", "glm-4-plus"),
    "qwen": ("https://dashscope.aliyuncs.com/compatible-mode/v1", "qwen-max"),
    "dashscope": ("https://dashscope.aliyuncs.com/compatible-mode/v1", "qwen-max"),
    "groq": ("https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"),
    "grok": ("https://api.x.ai/v1", "grok-3"),
    "xai": ("https://api.x.ai/v1", "grok-3"),
    "gemini": ("https://generativelanguage.googleapis.com/v1beta/openai/", "gemini-2.0-flash"),
    "google": ("https://generativelanguage.googleapis.com/v1beta/openai/", "gemini-2.0-flash"),
    "together": ("https://api.together.xyz/v1", "meta-llama/Llama-3.3-70B-Instruct-Turbo"),
    "fireworks": (
        "https://api.fireworks.ai/inference/v1",
        "accounts/fireworks/models/llama-v3p3-70b-instruct",
    ),
    "mistral": ("https://api.mistral.ai/v1", "mistral-large-latest"),
    # OpenRouter aggregates ~200 models behind one OpenAI-compatible
    # endpoint. Default is Opus 4.8 — best reasoning available, used for
    # the whole 85-book extraction (uniform model, no per-pass routing —
    # quality over cost, per project owner). Override via LOREGRAPH_LLM_MODEL
    # for cheaper runs (anthropic/claude-sonnet-4.5, openai/gpt-4o, etc.).
    "openrouter": ("https://openrouter.ai/api/v1", "anthropic/claude-opus-4.8"),
    "ollama": ("http://localhost:11434/v1", "llama3.2"),
    "vllm": ("http://localhost:8000/v1", ""),
    "openai_compatible": (None, None),
}

# Per-provider fallback env-var names for the API key, in case the user
# already has the provider's canonical key exported.
_API_KEY_ENV_ALIASES: dict[str, tuple[str, ...]] = {
    "anthropic": ("ANTHROPIC_API_KEY",),
    "openai": ("OPENAI_API_KEY",),
    "deepseek": ("DEEPSEEK_API_KEY",),
    "kimi": ("MOONSHOT_API_KEY", "KIMI_API_KEY"),
    "moonshot": ("MOONSHOT_API_KEY", "KIMI_API_KEY"),
    "zhipu": ("ZHIPU_API_KEY", "ZHIPUAI_API_KEY"),
    "glm": ("ZHIPU_API_KEY", "ZHIPUAI_API_KEY"),
    "qwen": ("DASHSCOPE_API_KEY", "QWEN_API_KEY"),
    "dashscope": ("DASHSCOPE_API_KEY", "QWEN_API_KEY"),
    "groq": ("GROQ_API_KEY",),
    "grok": ("XAI_API_KEY", "GROK_API_KEY"),
    "xai": ("XAI_API_KEY", "GROK_API_KEY"),
    "gemini": ("GEMINI_API_KEY", "GOOGLE_API_KEY"),
    "google": ("GEMINI_API_KEY", "GOOGLE_API_KEY"),
    "together": ("TOGETHER_API_KEY",),
    "fireworks": ("FIREWORKS_API_KEY",),
    "mistral": ("MISTRAL_API_KEY",),
    "openrouter": ("OPENROUTER_API_KEY",),
    "ollama": (),
    "vllm": (),
    "openai_compatible": (),
}


# ────────────────────────────────────────────────────────────────────
# Unified response + usage shape
# ────────────────────────────────────────────────────────────────────


@dataclass(slots=True)
class LLMResponse:
    """Provider-agnostic single-turn completion result."""

    text: str
    input_tokens: int = 0
    output_tokens: int = 0
    # Anthropic-specific (write-through cache fields). 0 elsewhere.
    cache_creation_input_tokens: int = 0
    # Reused on OpenAI-style providers that expose `cached_tokens`
    # (OpenAI auto-cache, DeepSeek context cache).
    cache_read_input_tokens: int = 0
    # Provider-native payload — debug only, don't rely on its shape.
    raw: Any = None


@dataclass(slots=True)
class LLMUsage:
    """Token + request counters that accumulate across one pass run."""

    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    requests: int = 0
    raw: list[dict[str, Any]] = field(default_factory=list)

    def merge(self, response: LLMResponse) -> None:
        self.input_tokens += response.input_tokens
        self.output_tokens += response.output_tokens
        self.cache_creation_input_tokens += response.cache_creation_input_tokens
        self.cache_read_input_tokens += response.cache_read_input_tokens
        self.requests += 1
        self.raw.append(
            {
                "input_tokens": response.input_tokens,
                "output_tokens": response.output_tokens,
                "cache_creation_input_tokens": response.cache_creation_input_tokens,
                "cache_read_input_tokens": response.cache_read_input_tokens,
            }
        )

    def merge_from(self, other: LLMUsage) -> None:
        self.input_tokens += other.input_tokens
        self.output_tokens += other.output_tokens
        self.cache_creation_input_tokens += other.cache_creation_input_tokens
        self.cache_read_input_tokens += other.cache_read_input_tokens
        self.requests += other.requests
        self.raw.extend(other.raw)

    def to_dict(self) -> dict[str, Any]:
        return {
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cache_creation_input_tokens": self.cache_creation_input_tokens,
            "cache_read_input_tokens": self.cache_read_input_tokens,
            "requests": self.requests,
        }


# ────────────────────────────────────────────────────────────────────
# Public client protocol + concrete backends
# ────────────────────────────────────────────────────────────────────


class LLMClient(Protocol):
    """Interface every backend implements."""

    model: str
    provider: str

    async def complete(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int = 4096,
        temperature: float = 0.0,
        cache_system: bool = True,
        stop_sequences: list[str] | None = None,
    ) -> LLMResponse: ...

    @staticmethod
    def extract_text(response: LLMResponse) -> str:
        """Backward-compat for callers that still call extract_text(msg)."""
        return response.text


class AnthropicLLMClient:
    """Native Anthropic SDK — keeps `cache_control: ephemeral` prompt caching."""

    provider = "anthropic"

    def __init__(self, settings: Settings | None = None, *, model: str | None = None) -> None:
        self._settings = settings or get_settings()
        api_key = self._settings.resolved_api_key("anthropic")
        if not api_key:
            raise RuntimeError(
                "Anthropic API key missing. Set ANTHROPIC_API_KEY (or "
                "LOREGRAPH_LLM_API_KEY) in your environment or .env file."
            )
        self.model: str = model or self._settings.resolved_model("anthropic") or "claude-sonnet-4-6"
        self._client = AsyncAnthropic(api_key=api_key, max_retries=0)

    async def complete(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int = 4096,
        temperature: float = 0.0,
        cache_system: bool = True,
        stop_sequences: list[str] | None = None,
    ) -> LLMResponse:
        system_block: list[dict[str, Any]] = [{"type": "text", "text": system}]
        if cache_system:
            system_block[0]["cache_control"] = {"type": "ephemeral"}

        params: dict[str, Any] = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system_block,
            "messages": [{"role": "user", "content": user}],
        }
        if stop_sequences:
            params["stop_sequences"] = stop_sequences

        msg = await _acreate_with_retry(lambda: self._client.messages.create(**params))

        parts: list[str] = []
        for block in msg.content:
            t = getattr(block, "text", None)
            if t is not None:
                parts.append(t)

        usage = msg.usage
        return LLMResponse(
            text="".join(parts),
            input_tokens=getattr(usage, "input_tokens", 0) or 0,
            output_tokens=getattr(usage, "output_tokens", 0) or 0,
            cache_creation_input_tokens=getattr(usage, "cache_creation_input_tokens", 0) or 0,
            cache_read_input_tokens=getattr(usage, "cache_read_input_tokens", 0) or 0,
            raw=msg,
        )

    @staticmethod
    def extract_text(response: LLMResponse) -> str:
        return response.text


class OpenAICompatibleLLMClient:
    """`openai` SDK with a swappable `base_url` — covers every OpenAI-compatible endpoint."""

    def __init__(self, settings: Settings | None = None, *, model: str | None = None) -> None:
        self._settings = settings or get_settings()
        provider = (self._settings.llm_provider or "openai").lower()
        if provider not in PROVIDER_PRESETS or provider == "anthropic":
            raise ValueError(
                f"Unknown OpenAI-compatible provider {provider!r}. "
                f"Pick one of: {sorted(k for k in PROVIDER_PRESETS if k != 'anthropic')}."
            )
        self.provider = provider

        base_url = self._settings.resolved_base_url(provider)
        if not base_url:
            raise RuntimeError(
                f"Provider {provider!r} has no base_url. Set LOREGRAPH_LLM_BASE_URL explicitly."
            )

        api_key = self._settings.resolved_api_key(provider) or "dummy"
        # Ollama / vLLM accept any string as key but the SDK requires a non-empty value.

        self.model = model or self._settings.resolved_model(provider) or ""
        if not self.model:
            raise RuntimeError(
                f"Provider {provider!r} has no model set. "
                "Set LOREGRAPH_LLM_MODEL or pick a preset that includes a default model."
            )

        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url, max_retries=0)

    async def complete(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int = 4096,
        temperature: float = 0.0,
        cache_system: bool = True,  # ignored — OpenAI-side providers handle caching server-side
        stop_sequences: list[str] | None = None,
    ) -> LLMResponse:
        # Prompt caching: for an Anthropic model behind OpenRouter, the cache
        # only fires if we attach an explicit `cache_control` breakpoint to a
        # structured content block — a plain-string system message does NOT
        # cache. OpenRouter forwards the breakpoint to Anthropic. Other
        # OpenAI-compatible providers auto-cache server-side, so a plain string
        # is correct there. (See OpenRouter prompt-caching docs.)
        cacheable = cache_system and self.model.startswith("anthropic/")
        system_content: Any = (
            [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}]
            if cacheable
            else system
        )
        params: dict[str, Any] = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user},
            ],
        }
        if stop_sequences:
            params["stop"] = stop_sequences

        resp = await _acreate_with_retry(lambda: self._client.chat.completions.create(**params))

        choice = resp.choices[0] if resp.choices else None
        text = (choice.message.content if choice and choice.message else "") or ""

        usage = getattr(resp, "usage", None)
        input_tokens = getattr(usage, "prompt_tokens", 0) or 0
        output_tokens = getattr(usage, "completion_tokens", 0) or 0
        # OpenAI auto-cache + DeepSeek context-cache surface this field.
        details = getattr(usage, "prompt_tokens_details", None)
        cache_read = getattr(details, "cached_tokens", 0) or 0 if details else 0

        return LLMResponse(
            text=text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cache_creation_input_tokens=0,
            cache_read_input_tokens=cache_read,
            raw=resp,
        )

    @staticmethod
    def extract_text(response: LLMResponse) -> str:
        return response.text


# ────────────────────────────────────────────────────────────────────
# Factory
# ────────────────────────────────────────────────────────────────────


def make_llm_client(settings: Settings | None = None) -> LLMClient:
    """Return the right backend based on `LOREGRAPH_LLM_PROVIDER`."""
    s = settings or get_settings()
    provider = (s.llm_provider or "anthropic").lower()
    if provider == "anthropic":
        return AnthropicLLMClient(s)
    return OpenAICompatibleLLMClient(s)
