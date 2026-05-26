"""Pass-4: bind every mention to its canonical entity.

v0.1 is a deterministic surface-form-based binder:

* build a lookup `{(type, surface_form.lower()) -> entity_id}` from the
  canonical names and aliases that Pass-3 produced;
* assign each mention's `entity_id` via the lookup.

Pronoun / nominal coreference ("she", "the girl", "the doctor") is **not**
attempted in v0.1 — that's a LingMess / LLM-coref job and lands in v0.2.

The strict surface-form binder still covers ~70-80 % of mentions on the
target corpora (Yellow Wallpaper, Alice in Wonderland) because Pass-2's
prompt explicitly tells the LLM not to mark bare pronouns as Agents.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import repository as repo
from loregraph.models.entities import Entity, Mention

log = logging.getLogger(__name__)


class Pass4CorefResolver:
    """Resolve every mention to a canonical entity by surface form."""

    def __init__(self) -> None:
        # No LLM dependency in v0.1.
        pass

    async def resolve_book(
        self,
        *,
        session: AsyncSession,
        entities: list[Entity],
        mentions: list[Mention],
    ) -> dict[str, Any]:
        """Assign mentions.entity_id in-place; return counters."""
        if not entities or not mentions:
            return {"resolved": 0, "unresolved": 0, "mentions_total": len(mentions)}

        lookup: dict[tuple[str, str], int] = {}
        for e in entities:
            lookup[(e.type.value, e.canonical_name.lower())] = e.id
            for alias in e.aliases:
                lookup[(e.type.value, alias.lower())] = e.id

        resolved = 0
        unresolved = 0
        for m in mentions:
            key = (m.type.value, m.surface_form.strip().lower())
            entity_id = lookup.get(key)
            if entity_id is None:
                unresolved += 1
                continue
            if m.entity_id != entity_id:
                await repo.assign_mention_entity(session, m.id, entity_id)
            resolved += 1

        log.info(
            "Pass-4: resolved %d / %d mentions (%d unresolved)",
            resolved,
            len(mentions),
            unresolved,
        )
        return {
            "mentions_total": len(mentions),
            "resolved": resolved,
            "unresolved": unresolved,
        }
