"""Gleaning: a tight retry loop for "find what you missed" LLM passes.

Microsoft GraphRAG (arXiv:2404.16130) reports that a second pass asking
"what else?" recovers 15-25 % more entities/relations on a single chunk.
Marginal yield collapses past round 2, so we cap at 2.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class GleaningConfig:
    """Settings for one gleaning loop."""

    max_rounds: int = 2
    """Inclusive of the first attempt. So 2 == one retry."""

    convergence_min_new: int = 1
    """Stop early when a round yields fewer than this many new items."""


async def glean(
    *,
    initial: Callable[[], Awaitable[list[Any]]],
    retry: Callable[[list[Any]], Awaitable[list[Any]]],
    dedupe_key: Callable[[object], object],
    config: GleaningConfig | None = None,
) -> list[Any]:
    """Run an initial extraction + up to N follow-up rounds.

    Parameters
    ----------
    initial :
        Coroutine returning the first batch of items.
    retry :
        Coroutine returning additional items, given the items found so
        far (so the prompt can list them in "you already extracted X").
    dedupe_key :
        Callable that returns a hashable identity per item. Used to drop
        items the model re-reports across rounds.
    config :
        Loop parameters.
    """
    cfg = config or GleaningConfig()
    if cfg.max_rounds < 1:
        raise ValueError("max_rounds must be >= 1")

    found: list[Any] = list(await initial())
    seen: set[Any] = {dedupe_key(item) for item in found}

    for _round in range(cfg.max_rounds - 1):
        new_items = await retry(found)
        fresh = [item for item in new_items if dedupe_key(item) not in seen]
        if len(fresh) < cfg.convergence_min_new:
            break
        for item in fresh:
            seen.add(dedupe_key(item))
            found.append(item)

    return found
