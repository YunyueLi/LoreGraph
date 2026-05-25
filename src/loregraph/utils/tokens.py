"""Token counting via tiktoken.

The cl100k_base encoder is OpenAI's; Anthropic does not publish a public
tokenizer. cl100k is a reasonable approximation for sizing Claude
prompts — typically within ~10 % of Anthropic's actual count. Good
enough for chunk-budget enforcement; not good enough for billing.
"""

from __future__ import annotations

from functools import lru_cache

import tiktoken


@lru_cache(maxsize=1)
def _encoder() -> tiktoken.Encoding:
    return tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    """Return the cl100k token count of `text`."""
    return len(_encoder().encode(text))


def estimate_claude_tokens(text: str) -> int:
    """Conservative upper bound on Claude token count (cl100k + 10 % padding)."""
    return int(count_tokens(text) * 1.10)
