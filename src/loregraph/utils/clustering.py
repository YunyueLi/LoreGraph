"""Candidate pair gating + union-find for Pass-3 character clustering.

We avoid the O(n^2) LLM judge by pre-filtering surface-form pairs with
cheap string heuristics. Pairs that survive the gate are sent to the
LLM for a binary same/different decision; the LLM's "yes" edges feed a
union-find that yields the final canonical clusters.
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator
from difflib import SequenceMatcher

# ---------- Candidate gating ----------


def _word_overlap(a: str, b: str) -> float:
    a_words = {w for w in a.lower().split() if w}
    b_words = {w for w in b.lower().split() if w}
    if not a_words or not b_words:
        return 0.0
    common = len(a_words & b_words)
    return common / max(len(a_words), len(b_words))


def is_candidate_pair(
    a: str,
    b: str,
    *,
    word_overlap_threshold: float = 0.5,
    edit_ratio_threshold: float = 0.7,
) -> bool:
    """Return True if (a, b) is worth sending to the LLM judge.

    A pair survives the gate if any of these is true:
    * exact match (same surface form mentioned more than once);
    * one is a substring of the other (Alice / Alice Liddell);
    * normalised word overlap >= `word_overlap_threshold` (Mrs Brown / Brown);
    * SequenceMatcher ratio >= `edit_ratio_threshold` (catches spelling
      variants and minor punctuation drift).
    """
    a_norm = a.strip().lower()
    b_norm = b.strip().lower()
    if not a_norm or not b_norm:
        return False
    if a_norm == b_norm:
        return True
    if a_norm in b_norm or b_norm in a_norm:
        return True
    if _word_overlap(a, b) >= word_overlap_threshold:
        return True
    return SequenceMatcher(None, a_norm, b_norm).ratio() >= edit_ratio_threshold


def generate_candidate_pairs(surface_forms: Iterable[str]) -> Iterator[tuple[str, str]]:
    """Yield every (a, b) pair with a < b that survives the gate."""
    surfaces = sorted(set(surface_forms))
    for i, a in enumerate(surfaces):
        for b in surfaces[i + 1 :]:
            if is_candidate_pair(a, b):
                yield (a, b)


# ---------- Union-Find ----------


class UnionFind:
    """Disjoint-set over hashable items.

    Path compression + union by rank. Used to merge LLM-confirmed same-entity
    pairs into clusters.
    """

    def __init__(self, items: Iterable) -> None:
        self._parent: dict = {item: item for item in items}
        self._rank: dict = dict.fromkeys(self._parent, 0)

    def add(self, item) -> None:
        if item not in self._parent:
            self._parent[item] = item
            self._rank[item] = 0

    def find(self, item):
        root = item
        while self._parent[root] != root:
            root = self._parent[root]
        # path compression
        while self._parent[item] != root:
            nxt = self._parent[item]
            self._parent[item] = root
            item = nxt
        return root

    def union(self, a, b) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return
        if self._rank[ra] < self._rank[rb]:
            ra, rb = rb, ra
        self._parent[rb] = ra
        if self._rank[ra] == self._rank[rb]:
            self._rank[ra] += 1

    def components(self) -> list[set]:
        clusters: dict = {}
        for item in self._parent:
            root = self.find(item)
            clusters.setdefault(root, set()).add(item)
        return list(clusters.values())
