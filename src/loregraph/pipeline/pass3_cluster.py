"""Pass-3: book-wide canonical clustering (production entity resolution).

Architecture (per the ER literature — Splink/Zingg blocking→scoring→clustering,
ComEM batched LLM matching, sClust black-hole guard):

    blocking → batched LLM scoring → connected components → transitivity guard

1. **Blocking** (recall-first, candidate-bounded): lexical gate (substring /
   word-overlap / edit-ratio) + embedding k-NN (rank-based top-k). The k-NN arm
   catches no-overlap aliases ("the Dark Lord"↔"Voldemort", "颦儿"↔"林黛玉") the
   lexical gate structurally cannot. Together they turn the O(n²) pair space into
   a bounded candidate graph — the single biggest speed fix.
2. **Batched scoring** ("select" strategy, ComEM): for each anchor we send its
   whole candidate set in ONE LLM call and get a per-candidate verdict — O(anchors)
   calls instead of O(pairs). Candidates are shuffled to blunt position bias.
3. **Clustering**: union-find → connected components (à la Splink).
4. **Transitivity guard**: connected components can "black-hole" distinct entities
   via a chain of weak links (A~B, B~C ⇒ A~C). For every multi-alias cluster we run
   one LLM sanity pass that splits off forms that don't belong.

`mentions.entity_id` is NOT touched here — Pass-4 does that.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import random
from collections import Counter, defaultdict
from collections.abc import Iterator, Sequence
from pathlib import Path
from typing import Any, TypeVar

from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, Field

from loregraph.llm.client import LLMClient, LLMUsage
from loregraph.llm.embeddings import get_embedder
from loregraph.llm.parser import LLMOutputError, parse_into
from loregraph.models.entities import EntityCreate, Mention
from loregraph.models.enums import EntityType
from loregraph.utils.clustering import (
    UnionFind,
    embedding_knn_pairs,
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
_DEFAULT_KNN_K = 8
_DEFAULT_BATCH_SIZE = 10  # ComEM: accuracy degrades past ~12 candidates/call
_DEFAULT_SANITY_MIN_CLUSTER = 3
_DEFAULT_CONCURRENCY = 10  # parallel judge/sanity LLM calls (was the bottleneck)

_T = TypeVar("_T")


class _BatchMatch(BaseModel):
    id: int
    same: bool
    confidence: float = Field(ge=0.0, le=1.0)


class _BatchJudgeResponse(BaseModel):
    matches: list[_BatchMatch] = []


class _SanityResponse(BaseModel):
    outliers: list[str] = []


def _canonical_id_for(canonical_name: str, entity_type: EntityType) -> str:
    """Stable per-book canonical id based on (type, canonical_name)."""
    payload = f"{entity_type.value}:{canonical_name.strip().lower()}"
    digest = hashlib.sha1(payload.encode("utf-8")).hexdigest()[:12]
    return f"ent_{digest}"


def _pick_canonical_name(cluster: set[str], frequencies: dict[str, int]) -> str:
    """The most-mentioned surface form wins; ties broken by longest then lex."""
    return max(cluster, key=lambda s: (frequencies.get(s, 0), len(s), s))


def _chunks(seq: Sequence[_T], size: int) -> Iterator[Sequence[_T]]:
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


class Pass3Clusterer:
    """Cluster all of a book's mentions into canonical entities."""

    BATCH_SYSTEM_TEMPLATE = "pass3_cluster_batch_system.j2"
    BATCH_USER_TEMPLATE = "pass3_cluster_batch_user.j2"
    SANITY_SYSTEM_TEMPLATE = "pass3_cluster_sanity_system.j2"
    SANITY_USER_TEMPLATE = "pass3_cluster_sanity_user.j2"

    def __init__(
        self,
        llm: LLMClient,
        *,
        confidence_floor: float = _DEFAULT_CONFIDENCE_FLOOR,
        max_contexts_per_side: int = _MAX_CONTEXTS_PER_SIDE,
        knn_k: int = _DEFAULT_KNN_K,
        batch_size: int = _DEFAULT_BATCH_SIZE,
        sanity_min_cluster: int = _DEFAULT_SANITY_MIN_CLUSTER,
        concurrency: int = _DEFAULT_CONCURRENCY,
    ) -> None:
        self.llm = llm
        self.confidence_floor = confidence_floor
        self.max_contexts_per_side = max_contexts_per_side
        self.knn_k = knn_k
        self.batch_size = batch_size
        self.sanity_min_cluster = sanity_min_cluster
        self.concurrency = concurrency
        self.usage = LLMUsage()
        self._batch_system = _jinja_env.get_template(self.BATCH_SYSTEM_TEMPLATE).render()
        self._batch_user = _jinja_env.get_template(self.BATCH_USER_TEMPLATE)
        self._sanity_system = _jinja_env.get_template(self.SANITY_SYSTEM_TEMPLATE).render()
        self._sanity_user = _jinja_env.get_template(self.SANITY_USER_TEMPLATE)

    async def _bounded_gather(self, coros: list[Any]) -> list[Any]:
        """Run independent LLM coroutines with bounded concurrency. A failed
        task becomes None (caller coalesces) so one bad call never kills the pass."""
        if not coros:
            return []
        sem = asyncio.Semaphore(self.concurrency)

        async def _run(c: Any) -> Any:
            async with sem:
                return await c

        res = await asyncio.gather(*(_run(c) for c in coros), return_exceptions=True)
        return [None if isinstance(r, Exception) else r for r in res]

    async def cluster_book(self, book_id: int, mentions: list[Mention]) -> list[EntityCreate]:
        """Return one EntityCreate per detected cluster, all 4 types interleaved."""
        if not mentions:
            return []
        by_type: dict[EntityType, list[Mention]] = defaultdict(list)
        for m in mentions:
            by_type[m.type].append(m)

        all_entities: list[EntityCreate] = []
        for ent_type, group in by_type.items():
            all_entities.extend(
                await self._cluster_within_type(
                    book_id=book_id, entity_type=ent_type, mentions_of_type=group
                )
            )
        return all_entities

    # ------- per-type clustering -------

    def _tally(
        self, mentions_of_type: list[Mention]
    ) -> tuple[Counter[str], dict[str, list[str]], dict[str, str]]:
        """surface_form (lowercased key) → freq, sample contexts, display casing."""
        freq: Counter[str] = Counter()
        contexts: dict[str, list[str]] = defaultdict(list)
        cased: dict[str, Counter[str]] = defaultdict(Counter)
        for m in mentions_of_type:
            key = m.surface_form.strip()
            if not key:
                continue
            low = key.lower()
            freq[low] += 1
            cased[low][key] += 1
            if len(contexts[low]) < self.max_contexts_per_side:
                contexts[low].append(m.evidence_span)
        display_for = {low: c.most_common(1)[0][0] for low, c in cased.items()}
        return freq, contexts, display_for

    def _build_entity(
        self,
        book_id: int,
        entity_type: EntityType,
        cluster_keys: set[str],
        display_for: dict[str, str],
        freq: Counter[str],
    ) -> EntityCreate:
        canonical_display = _pick_canonical_name(
            {display_for[k] for k in cluster_keys},
            {display_for[k]: freq[k] for k in cluster_keys},
        )
        aliases = sorted(
            {display_for[k] for k in cluster_keys if display_for[k] != canonical_display}
        )
        return EntityCreate(
            book_id=book_id,
            canonical_id=_canonical_id_for(canonical_display, entity_type),
            type=entity_type,
            canonical_name=canonical_display,
            aliases=aliases,
            note_md="",
            attributes={},
        )

    async def _cluster_within_type(
        self, *, book_id: int, entity_type: EntityType, mentions_of_type: list[Mention]
    ) -> list[EntityCreate]:
        freq, contexts, display_for = self._tally(mentions_of_type)
        unique_keys = sorted(freq)
        n = len(unique_keys)
        log.info(
            "Pass-3: %d unique %s surface forms (from %d mentions)",
            n,
            entity_type.value,
            len(mentions_of_type),
        )
        if n == 0:
            return []
        if n == 1:
            return [self._build_entity(book_id, entity_type, set(unique_keys), display_for, freq)]

        # ---- Blocking: lexical gate + embedding k-NN ----
        candidate_pairs = set(generate_candidate_pairs(unique_keys))
        try:
            candidate_pairs |= embedding_knn_pairs(unique_keys, get_embedder(), top_k=self.knn_k)
        except Exception as exc:  # embedding is optional; lexical gate still works
            log.warning("Pass-3 embedding blocking skipped (%s)", exc)

        adj: dict[str, set[str]] = defaultdict(set)
        for a, b in candidate_pairs:
            adj[a].add(b)
            adj[b].add(a)

        # ---- Batched anchor judging — run CONCURRENTLY (each undirected pair
        # judged once, from its lexicographically-smaller endpoint). Sequential
        # judging was the Pass-3 bottleneck (~55 min on a 50-chunk book). ----
        uf = UnionFind(unique_keys)
        jobs: list[tuple[str, Any]] = []
        for anchor in unique_keys:
            partners = sorted(p for p in adj[anchor] if p > anchor)
            for batch in _chunks(partners, self.batch_size):
                jobs.append(
                    (
                        anchor,
                        self._judge_anchor_batch(
                            entity_type, anchor, list(batch), display_for, contexts
                        ),
                    )
                )
        results = await self._bounded_gather([c for _, c in jobs])
        merges = 0
        for (anchor, _), confirmed in zip(jobs, results, strict=True):
            for key in confirmed or []:
                uf.union(anchor, key)
                merges += 1
        log.info(
            "Pass-3: %s: %d candidate pairs → %d judge calls, %d merges",
            entity_type.value,
            len(candidate_pairs),
            len(jobs),
            merges,
        )

        # ---- Connected components + transitivity (black-hole) guard (parallel) ----
        components = uf.components()
        big = [c for c in components if len(c) >= self.sanity_min_cluster]
        final: list[set[str]] = [c for c in components if len(c) < self.sanity_min_cluster]
        sanity = await self._bounded_gather(
            [self._cluster_outliers(entity_type, c, display_for, contexts) for c in big]
        )
        for cluster, outliers in zip(big, sanity, strict=True):
            outliers = outliers or set()
            keep = cluster - outliers
            if keep:
                final.append(keep)
            final.extend({o} for o in outliers)

        return [self._build_entity(book_id, entity_type, c, display_for, freq) for c in final if c]

    # ------- LLM steps -------

    async def _judge_anchor_batch(
        self,
        entity_type: EntityType,
        anchor_key: str,
        candidate_keys: list[str],
        display_for: dict[str, str],
        contexts: dict[str, list[str]],
    ) -> list[str]:
        """One LLM call: which candidates corefer with the anchor? Returns the
        subset of candidate_keys confirmed SAME at/above the confidence floor."""
        if not candidate_keys:
            return []
        shuffled = candidate_keys[:]
        random.shuffle(shuffled)  # blunt position bias
        user_prompt = self._batch_user.render(
            entity_type=entity_type.value,
            anchor_surface=display_for[anchor_key],
            anchor_contexts=contexts[anchor_key][: self.max_contexts_per_side],
            candidates=[
                {"id": i, "surface": display_for[k], "contexts": contexts[k][:2]}
                for i, k in enumerate(shuffled)
            ],
        )
        msg = await self.llm.complete(system=self._batch_system, user=user_prompt)
        self.usage.merge(msg)
        try:
            resp = parse_into(_BatchJudgeResponse, self.llm.extract_text(msg))
        except LLMOutputError:
            log.warning("Pass-3 batch judge: malformed response for anchor %r", anchor_key)
            return []
        confirmed: list[str] = []
        for m in resp.matches:
            if m.same and m.confidence >= self.confidence_floor and 0 <= m.id < len(shuffled):
                confirmed.append(shuffled[m.id])
        return confirmed

    async def _cluster_outliers(
        self,
        entity_type: EntityType,
        cluster_keys: set[str],
        display_for: dict[str, str],
        contexts: dict[str, list[str]],
    ) -> set[str]:
        """Black-hole guard: ask whether every form in a multi-alias cluster
        really names one entity; return the keys that don't belong."""
        ordered = sorted(cluster_keys)
        user_prompt = self._sanity_user.render(
            entity_type=entity_type.value,
            forms=[
                {"surface": display_for[k], "context": (contexts[k][0] if contexts[k] else "")}
                for k in ordered
            ],
        )
        msg = await self.llm.complete(system=self._sanity_system, user=user_prompt)
        self.usage.merge(msg)
        try:
            resp = parse_into(_SanityResponse, self.llm.extract_text(msg))
        except LLMOutputError:
            return set()
        surf_to_key = {display_for[k]: k for k in cluster_keys}
        return {surf_to_key[s] for s in resp.outliers if s in surf_to_key}
