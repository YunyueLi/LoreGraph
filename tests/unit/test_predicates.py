"""Unit tests for the controlled predicate vocabulary.

The graph shipped 2627 distinct predicates over 9843 edges, 1554 of them
singletons — so "who betrayed whom" was unanswerable, not because the data was
missing but because the relation names were. `classify` adds a closed axis
beside the open verb.
"""

from __future__ import annotations

import pytest

from loregraph.models.predicates import PredicateClass, classify, coverage


@pytest.mark.unit
@pytest.mark.parametrize(
    ("predicate", "expected"),
    [
        # Plain heads.
        ("ATTACKS", PredicateClass.CONFLICT),
        ("OWNS", PredicateClass.POSSESSION),
        ("COMMANDS", PredicateClass.AUTHORITY),
        ("DESCRIBES", PredicateClass.SPEECH_NEUTRAL),
        ("FORETELLS", PredicateClass.FORESIGHT),
        ("PART_OF", PredicateClass.COMPOSITION),
        ("REPORTS_TO", PredicateClass.AUTHORITY),
        # The model's habit of gluing the object onto the verb — this is what
        # produced the singleton tail in the first place.
        ("CAUSES_SNEEZING", PredicateClass.CAUSATION),
        ("THREATENS_EXECUTION", PredicateClass.CONFLICT),
        ("THREATENS_TO_BURN", PredicateClass.CONFLICT),
        ("ACCUSES_OF_BEING_SERPENT", PredicateClass.SPEECH_CRITICAL),
        ("PREDICTS_RESURRECTION", PredicateClass.FORESIGHT),
        ("INSTRUCTS_TO_DRINK", PredicateClass.AUTHORITY),
        ("CLAIMS_SUPERIORITY_OVER", PredicateClass.SPEECH_NEUTRAL),
        # Tense and modal noise.
        ("WILL_EXECUTE", PredicateClass.CONFLICT),  # beheading, not administration
        ("WOULD_FETCH", PredicateClass.MOTION),
        ("IS_LOCATED_IN", PredicateClass.LOCATION),
        ("HAS_TAKEN", PredicateClass.EXCHANGE),
        # Inflection.
        ("MARRIED_TO", PredicateClass.KINSHIP),
        ("GOES_TO", PredicateClass.MOTION),
        ("PROPHESIES", PredicateClass.FORESIGHT),
        ("ACCUSED", PredicateClass.SPEECH_CRITICAL),
        # Adverb-led: no leading run resolves, so the fallback scans segments.
        ("PRIVATELY_CRITICIZES", PredicateClass.SPEECH_CRITICAL),
        ("PHYSICALLY_RESTRAINS", PredicateClass.CONFLICT),
        # Lowercase / spaced / hyphenated input.
        ("proposes to", PredicateClass.SPEECH_NEUTRAL),
        ("hands-over", PredicateClass.EXCHANGE),
    ],
)
def test_classify_places_real_predicates(predicate: str, expected: PredicateClass) -> None:
    assert classify(predicate, "INTERACTS") is expected


@pytest.mark.unit
def test_longer_stems_win_over_shorter_prefixes() -> None:
    """`LEAD_TO` is motion; a bare `LEADS` is authority."""
    assert classify("LEAD_TO", "STRUCTURAL") is PredicateClass.MOTION
    assert classify("LEADS", "INTERACTS") is PredicateClass.AUTHORITY


@pytest.mark.unit
@pytest.mark.parametrize(
    ("relation", "expected"),
    [
        ("STRUCTURAL", PredicateClass.STRUCTURAL_OTHER),
        ("INTERACTS", PredicateClass.INTERACTS_OTHER),
        ("ASSERTS", PredicateClass.ASSERTS_OTHER),
        ("INFLUENCES", PredicateClass.INFLUENCES_OTHER),
        ("PREDICTS", PredicateClass.PREDICTS_OTHER),
    ],
)
def test_unplaceable_predicates_fall_back_per_relation(
    relation: str, expected: PredicateClass
) -> None:
    """An honest `_OTHER` beats a plausible mis-file."""
    assert classify("ZZQPLX_FROBNICATES", relation) is expected


@pytest.mark.unit
@pytest.mark.parametrize("predicate", [None, "", "   ", "___", "!!!"])
def test_empty_and_junk_predicates_are_safe(predicate: str | None) -> None:
    assert classify(predicate, "INTERACTS") is PredicateClass.INTERACTS_OTHER


@pytest.mark.unit
def test_missing_relation_gives_unclassified_not_a_crash() -> None:
    assert classify(None, None) is PredicateClass.UNCLASSIFIED
    assert classify("ZZQPLX", None) is PredicateClass.UNCLASSIFIED


@pytest.mark.unit
def test_classify_is_total_over_the_enum() -> None:
    """Every result is a member of the closed set — that is the whole point."""
    for probe in ["ATTACKS", "ZZZ", "", "WILL_ZZZ", "PART_OF"]:
        assert classify(probe, "INTERACTS") in set(PredicateClass)


@pytest.mark.unit
def test_coverage_scores_a_corpus() -> None:
    pairs = [
        ("ATTACKS", "INTERACTS"),
        ("OWNS", "STRUCTURAL"),
        ("ZZQPLX", "INTERACTS"),
        (None, "ASSERTS"),
    ]
    result = coverage(pairs)
    assert result["total"] == 4
    assert result["classified"] == 2
    assert result["classified_rate"] == 0.5
    assert result["by_class"]["INTERACTS_OTHER"] == 1
    assert result["by_class"]["ASSERTS_OTHER"] == 1


@pytest.mark.unit
def test_coverage_of_an_empty_corpus_is_zero_not_a_zero_division() -> None:
    assert coverage([])["classified_rate"] == 0.0


@pytest.mark.unit
def test_the_singleton_tail_collapses() -> None:
    """The regression in one assertion: 12 one-off verbs, 3 queryable classes."""
    singletons = [
        "BETRAYS",
        "DECEIVES",
        "TRICKS",
        "DOUBLE_CROSSES",
        "THREATENS_TO_BURN",
        "AMBUSHES",
        "PRAISES_LOUDLY",
        "COMMENDS",
        "APPLAUDS",
        "TRAVELS_TOWARD",
        "SETS_OUT_FOR",
        "RETURNS_HOME",
    ]
    classes = {classify(p, "INTERACTS") for p in singletons}
    assert classes == {
        PredicateClass.CONFLICT,
        PredicateClass.SPEECH_APPROVING,
        PredicateClass.MOTION,
    }
