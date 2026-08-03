"""Unit tests for Pass-7's stratified audit sample.

Why stratified: a uniform sample of a real book's edges is dominated by
`INTERACTS`/`explicit`, the easiest claims to get right, so the pooled rate
it reports says almost nothing about the strata that actually fail.
"""

from __future__ import annotations

import random
from collections import Counter
from dataclasses import dataclass

import pytest

from loregraph.models.enums import GlucoseDim, InferenceDepth, RelationType
from loregraph.pipeline.pass7_cove import CoVeStats, _stratum, stratified_sample


@dataclass(frozen=True, slots=True)
class _Claim:
    relation: str
    depth: str
    seq: int  # keeps rows distinct so `.index()` means what it looks like


def _rng() -> random.Random:
    return random.Random(1234)


# Roughly Alice's real shape: 63% INTERACTS, 80% explicit, 2 multi_step.
def _alice_shaped() -> list[_Claim]:
    rows = []
    for rel, n in (
        ("INTERACTS", 640),
        ("ASSERTS", 163),
        ("STRUCTURAL", 132),
        ("INFLUENCES", 62),
        ("PREDICTS", 13),
    ):
        for i in range(n):
            rows.append(_Claim(rel, "explicit" if i % 5 else "one_step", len(rows)))
    rows.append(_Claim("PREDICTS", "multi_step", len(rows)))
    rows.append(_Claim("INFLUENCES", "multi_step", len(rows)))
    return rows


@pytest.mark.unit
def test_sample_respects_the_budget() -> None:
    rows = _alice_shaped()
    picked = stratified_sample(rows, key=lambda r: (r.relation, r.depth), budget=150, rng=_rng())
    assert len(picked) == 150


@pytest.mark.unit
def test_sample_returns_rows_in_input_order() -> None:
    rows = _alice_shaped()
    picked = stratified_sample(rows, key=lambda r: (r.relation, r.depth), budget=80, rng=_rng())
    positions = [rows.index(r) for r in picked]
    assert positions == sorted(positions)


@pytest.mark.unit
def test_every_stratum_is_represented_where_uniform_would_miss_some() -> None:
    rows = _alice_shaped()
    strata = {(r.relation, r.depth) for r in rows}
    picked = stratified_sample(rows, key=lambda r: (r.relation, r.depth), budget=150, rng=_rng())
    assert {(r.relation, r.depth) for r in picked} == strata


@pytest.mark.unit
def test_rare_strata_are_not_swamped_by_the_bulk() -> None:
    rows = _alice_shaped()
    picked = stratified_sample(rows, key=lambda r: (r.relation, r.depth), budget=150, rng=_rng())
    share = Counter(r.relation for r in picked)
    # PREDICTS is 1.3% of the corpus; a uniform 150-draw expects ~2 and can
    # easily draw 0. Stratification guarantees it is audited.
    assert share["PREDICTS"] >= 2
    assert share["INTERACTS"] < len(picked)  # bulk does not take everything


@pytest.mark.unit
def test_exhaustive_rows_are_always_taken() -> None:
    rows = _alice_shaped()
    picked = stratified_sample(
        rows,
        key=lambda r: (r.relation, r.depth),
        budget=150,
        exhaustive=lambda r: r.depth == "multi_step",
        rng=_rng(),
    )
    assert sum(1 for r in picked if r.depth == "multi_step") == 2


@pytest.mark.unit
def test_exhaustive_rows_survive_a_budget_smaller_than_their_count() -> None:
    rows = [_Claim("X", "multi_step", i) for i in range(9)] + [
        _Claim("Y", "explicit", 9 + i) for i in range(50)
    ]
    picked = stratified_sample(
        rows,
        key=lambda r: (r.relation, r.depth),
        budget=4,
        exhaustive=lambda r: r.depth == "multi_step",
        rng=_rng(),
    )
    assert sum(1 for r in picked if r.depth == "multi_step") == 9


@pytest.mark.unit
def test_budget_at_or_above_corpus_size_takes_everything() -> None:
    rows = _alice_shaped()
    picked = stratified_sample(
        rows, key=lambda r: (r.relation, r.depth), budget=len(rows) * 2, rng=_rng()
    )
    assert len(picked) == len(rows)


@pytest.mark.unit
@pytest.mark.parametrize("budget", [0, -1])
def test_non_positive_budget_samples_nothing(budget: int) -> None:
    assert (
        stratified_sample(_alice_shaped(), key=lambda r: r.relation, budget=budget, rng=_rng())
        == []
    )


@pytest.mark.unit
def test_empty_corpus_is_safe() -> None:
    assert stratified_sample([], key=lambda r: r, budget=50, rng=_rng()) == []


@pytest.mark.unit
def test_sample_is_deterministic_for_a_given_seed() -> None:
    rows = _alice_shaped()
    a = stratified_sample(rows, key=lambda r: (r.relation, r.depth), budget=60, rng=_rng())
    b = stratified_sample(rows, key=lambda r: (r.relation, r.depth), budget=60, rng=_rng())
    assert a == b


@pytest.mark.unit
def test_stratum_label_uses_enum_values() -> None:
    assert _stratum(RelationType.INTERACTS, InferenceDepth.ONE_STEP) == "INTERACTS/one_step"
    assert _stratum(GlucoseDim.EMOTION, InferenceDepth.EXPLICIT) == "emotion/explicit"
    assert _stratum("RAW", "explicit") == "RAW/explicit"


@pytest.mark.unit
def test_weakest_strata_puts_the_worst_first() -> None:
    stats = CoVeStats()
    for _ in range(10):
        stats.record("INTERACTS/explicit", supported=True)
    for i in range(10):
        stats.record("PREDICTS/one_step", supported=i < 4)
    for i in range(4):
        stats.record("INFLUENCES/multi_step", supported=i < 3)

    worst = stats.weakest_strata()
    assert [s["stratum"] for s in worst] == [
        "PREDICTS/one_step",
        "INFLUENCES/multi_step",
        "INTERACTS/explicit",
    ]
    assert worst[0]["rate"] == 0.4
    assert worst[0]["sampled"] == 10


@pytest.mark.unit
def test_pooled_rate_hides_what_the_strata_show() -> None:
    """The point of the breakdown: 90% overall, but one stratum is at 40%."""
    stats = CoVeStats()
    stats.edges_sampled = 20
    for _ in range(10):
        stats.record("INTERACTS/explicit", supported=True)
        stats.edges_supported += 1
    for i in range(10):
        supported = i < 8
        stats.record("PREDICTS/one_step", supported=supported)
        stats.edges_supported += int(supported)

    assert stats.supported_rate() == 0.9
    assert stats.weakest_strata()[0]["rate"] == 0.8


@pytest.mark.unit
def test_stats_dict_carries_the_breakdown() -> None:
    stats = CoVeStats()
    stats.record("INTERACTS/explicit", supported=False)
    payload = stats.to_dict()
    assert payload["by_stratum"] == {"INTERACTS/explicit": {"supported": 0, "sampled": 1}}
    assert payload["weakest_strata"][0]["stratum"] == "INTERACTS/explicit"
