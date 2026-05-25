"""Evidence-span literal matching.

Pass-7 enforces a >=95 % match rate over all extracted claims; this module
holds the matcher used by both Pass-7 and earlier passes that want to
self-verify before persistence.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SpanMatch:
    """Result of locating a span inside source text."""

    start: int
    end: int
    matched_text: str

    @property
    def length(self) -> int:
        return self.end - self.start


def find_literal_span(source: str, span: str) -> SpanMatch | None:
    """Return the first literal occurrence of `span` in `source`, or None.

    No whitespace, case, or unicode normalisation is applied — fidelity is
    a hard requirement of the evidence-span policy. Callers that want
    fuzzy matching should layer it on top.
    """
    if not span:
        return None
    idx = source.find(span)
    if idx < 0:
        return None
    return SpanMatch(start=idx, end=idx + len(span), matched_text=span)


def is_literal_match(source: str, span: str) -> bool:
    """True iff `span` appears verbatim in `source`."""
    return find_literal_span(source, span) is not None


def match_rate(pairs: list[tuple[str, str]]) -> float:
    """Compute literal-match rate for an iterable of (source, span) pairs.

    Returns 0.0 if the iterable is empty.
    """
    if not pairs:
        return 0.0
    hits = sum(1 for source, span in pairs if is_literal_match(source, span))
    return hits / len(pairs)
