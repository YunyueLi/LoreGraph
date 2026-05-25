"""Pass-3: book-wide canonical clustering.

Inputs : every `Mention` for the book (Pass-2 output).
Outputs: one `Entity` row per cluster, with canonical_name + aliases
         filled in. `mentions.entity_id` is NOT touched here — Pass-4
         does that, so that a Pass-3 re-run doesn't have to re-resolve
         every mention.

Algorithm:
1. Group mentions by `EntityType`.
2. Within each type, dedupe by surface_form (case-insensitive).
3. Generate candidate pairs via `is_candidate_pair`.
4. LLM-judge each candidate pair (same / different).
5. Union-Find on the "same" edges → clusters.
6. For each cluster pick the most-mentioned surface form as
   `canonical_name`; the rest become aliases.
"""

from __future__ import annotations

import hashlib
import logging
from collections import Counter, defaultdict
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, Field

from loregraph.llm.client import LLMClient, LLMUsage
from loregraph.llm.parser import LLMOutputError, parse_into
from loregraph.models.entities import EntityCreate, Mention
from loregraph.models.enums import EntityType
from loregraph.utils.clustering import (
    UnionFind,
    generate_candidate_pairs,
)

log = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "llm" / "prompts"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_PROMPTS_DIR)),
    autoescape=select_autoescape(default=False),
    keep_trailing_newline=True,
)

_MAX_CONTEXTS_PER_SIDE = 3
_DEFAULT_CONFIDENCE_FLOOR = 0.6


class _JudgeResponse(BaseModel):
    """Schema the LLM is asked to return."""

    same: bool
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str = ""


def _canonical_id_for(canonical_name: str, entity_type: EntityType) -> str:
    """Stable per-book canonical id based on (type, canonical_name)."""
    payload = f"{entity_type.value}:{canonical_name.strip().lower()}"
    digest = hashlib.sha1(payload.encode("utf-8")).hexdigest()[:12]
    return f"ent_{digest}"


def _pick_canonical_name(cluster: set[str], frequencies: dict[str, int]) -> str:
    """The most-mentioned surface form wins; ties broken by longest then lex."""
    return max(
        cluster,
        key=lambda s: (frequencies.get(s, 0), len(s), s),
    )


class Pass3Clusterer:
    """Cluster all of a book's mentions into canonical entities."""

    SYSTEM_TEMPLATE = "pass3_cluster_system.j2"
    USER_TEMPLATE = "pass3_cluster_user.j2"

    def __init__(
        self,
        llm: LLMClient,
        *,
        confidence_floor: float = _DEFAULT_CONFIDENCE_FLOOR,
        max_contexts_per_side: int = _MAX_CONTEXTS_PER_SIDE,
    ) -> None:
        self.llm = llm
        self.confidence_floor = confidence_floor
        self.max_contexts_per_side = max_contexts_per_side
        self.usage = LLMUsage()
        self._system_prompt = _jinja_env.get_template(self.SYSTEM_TEMPLATE).render()
        self._user_template = _jinja_env.get_template(self.USER_TEMPLATE)

    async def cluster_book(
        self,
        book_id: int,
        mentions: list[Mention],
    ) -> list[EntityCreate]:
        """Return one EntityCreate per detected cluster, all 4 types interleaved."""
        if not mentions:
            return []

        by_type: dict[EntityType, list[Mention]] = defaultdict(list)
        for m in mentions:
            by_type[m.type].append(m)

        all_entities: list[EntityCreate] = []
        for ent_type, group in by_type.items():
            cluster_entities = await self._cluster_within_type(
                book_id=book_id,
                entity_type=ent_type,
                mentions_of_type=group,
            )
            all_entities.extend(cluster_entities)
        return all_entities

    async def _cluster_within_type(
        self,
        *,
        book_id: int,
        entity_type: EntityType,
        mentions_of_type: list[Mention],
    ) -> list[EntityCreate]:
        # Frequency map: surface_form (case-insensitive key) -> count, plus
        # a preferred-display map mapping the lowercase key back to the most
        # common original casing.
        freq: Counter[str] = Counter()
        contexts: dict[str, list[str]] = defaultdict(list)
        display_for: dict[str, str] = {}
        cased_counter: dict[str, Counter[str]] = defaultdict(Counter)

        for m in mentions_of_type:
            key = m.surface_form.strip()
            if not key:
                continue
            lowered = key.lower()
            freq[lowered] += 1
            cased_counter[lowered][key] += 1
            if len(contexts[lowered]) < self.max_contexts_per_side:
                contexts[lowered].append(m.evidence_span)

        # Resolve display name per lowered key.
        for lowered, c in cased_counter.items():
            display_for[lowered] = c.most_common(1)[0][0]

        unique_keys = sorted(freq)
        log.info(
            "Pass-3: %d unique %s surface forms (from %d mentions)",
            len(unique_keys),
            entity_type.value,
            len(mentions_of_type),
        )

        # Candidate pairs and LLM judging.
        uf = UnionFind(unique_keys)
        judged = 0
        merged = 0
        for a_low, b_low in generate_candidate_pairs(unique_keys):
            same = await self._judge_pair(
                entity_type=entity_type,
                a_surface=display_for[a_low],
                b_surface=display_for[b_low],
                a_contexts=contexts[a_low],
                b_contexts=contexts[b_low],
            )
            judged += 1
            if same:
                uf.union(a_low, b_low)
                merged += 1
        log.info("Pass-3: %s: %d pairs judged, %d merges", entity_type.value, judged, merged)

        # Build EntityCreate per cluster.
        entities: list[EntityCreate] = []
        for cluster in uf.components():
            # Use casing display, pick canonical by display-key frequency
            canonical_display = _pick_canonical_name(
                {display_for[k] for k in cluster},
                {display_for[k]: freq[k] for k in cluster},
            )
            aliases = sorted(
                {display_for[k] for k in cluster if display_for[k] != canonical_display}
            )
            entities.append(
                EntityCreate(
                    book_id=book_id,
                    canonical_id=_canonical_id_for(canonical_display, entity_type),
                    type=entity_type,
                    canonical_name=canonical_display,
                    aliases=aliases,
                    note_md="",
                    attributes={},
                )
            )
        return entities

    async def _judge_pair(
        self,
        *,
        entity_type: EntityType,
        a_surface: str,
        b_surface: str,
        a_contexts: list[str],
        b_contexts: list[str],
    ) -> bool:
        """Ask the LLM whether (a, b) are the same entity. Returns bool."""
        user_prompt = self._user_template.render(
            entity_type=entity_type.value,
            a_surface=a_surface,
            b_surface=b_surface,
            a_contexts=a_contexts[: self.max_contexts_per_side],
            b_contexts=b_contexts[: self.max_contexts_per_side],
        )
        msg = await self.llm.complete(system=self._system_prompt, user=user_prompt)
        self.usage.merge(msg)
        text = self.llm.extract_text(msg)
        try:
            response = parse_into(_JudgeResponse, text)
        except LLMOutputError:
            log.warning(
                "Pass-3 judge: malformed response, treating as DIFFERENT (a=%r b=%r)",
                a_surface,
                b_surface,
            )
            return False
        return response.same and response.confidence >= self.confidence_floor
