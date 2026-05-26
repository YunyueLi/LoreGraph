"""Anthropic Claude client — the *only* place LLM calls live.

All passes route through this class. Reasons:

1. **Prompt caching** is wired here once, not per-pass.
2. **Token + cost accounting** is recorded in `pass_runs.stats` from
   exactly one call site.
3. **Retry / backoff** policy is uniform.
4. **Testability**: respx-mocked HTTPX transport (in tests/) can target
   this single client.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, cast

from anthropic import AsyncAnthropic
from anthropic.types import Message

from loregraph.config import Settings, get_settings


@dataclass(slots=True)
class LLMUsage:
    """Token + cost counters that accumulate across one pass run."""

    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    requests: int = 0
    raw: list[dict[str, Any]] = field(default_factory=list)

    def merge(self, msg: Message) -> None:
        usage = msg.usage
        self.input_tokens += getattr(usage, "input_tokens", 0) or 0
        self.output_tokens += getattr(usage, "output_tokens", 0) or 0
        self.cache_creation_input_tokens += getattr(usage, "cache_creation_input_tokens", 0) or 0
        self.cache_read_input_tokens += getattr(usage, "cache_read_input_tokens", 0) or 0
        self.requests += 1
        self.raw.append(
            {
                "input_tokens": getattr(usage, "input_tokens", 0),
                "output_tokens": getattr(usage, "output_tokens", 0),
                "cache_creation_input_tokens": getattr(usage, "cache_creation_input_tokens", 0),
                "cache_read_input_tokens": getattr(usage, "cache_read_input_tokens", 0),
            }
        )

    def merge_from(self, other: LLMUsage) -> None:
        """Accumulate another usage record into this one."""
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


class LLMClient:
    """Async wrapper over `anthropic.AsyncAnthropic` with prompt caching baked in."""

    def __init__(self, settings: Settings | None = None, *, model: str | None = None) -> None:
        self._settings = settings or get_settings()
        if not self._settings.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Add it to your .env or shell "
                "environment before running LLM-driven passes (Pass-2 onward)."
            )
        self.model = model or self._settings.model
        self._client = AsyncAnthropic(api_key=self._settings.anthropic_api_key)

    async def complete(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int = 4096,
        temperature: float = 0.0,
        cache_system: bool = True,
        stop_sequences: list[str] | None = None,
    ) -> Message:
        """Single-turn completion.

        If `cache_system` is True, the system block is annotated with
        Anthropic's `cache_control: ephemeral`, so identical system
        prompts across chunks hit the 5-minute prompt cache (90 % input
        cost reduction on hits).
        """
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

        return cast(Message, await self._client.messages.create(**params))

    @staticmethod
    def extract_text(msg: Message) -> str:
        """Concatenate all text blocks from a message into a single string."""
        parts: list[str] = []
        for block in msg.content:
            text = getattr(block, "text", None)
            if text is not None:
                parts.append(text)
        return "".join(parts)
