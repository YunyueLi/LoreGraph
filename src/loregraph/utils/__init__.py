"""Cross-cutting helpers: token counting, span matching, clustering."""

from __future__ import annotations

from loregraph.utils.clustering import (
    UnionFind,
    generate_candidate_pairs,
    is_candidate_pair,
)
from loregraph.utils.spans import (
    SpanMatch,
    find_literal_span,
    is_literal_match,
    match_rate,
)
from loregraph.utils.tokens import count_tokens, estimate_claude_tokens

__all__ = [
    "SpanMatch",
    "UnionFind",
    "count_tokens",
    "estimate_claude_tokens",
    "find_literal_span",
    "generate_candidate_pairs",
    "is_candidate_pair",
    "is_literal_match",
    "match_rate",
]
