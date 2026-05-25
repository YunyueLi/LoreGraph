"""Unit tests for the clustering primitives used by Pass-3."""

from __future__ import annotations

import pytest

from loregraph.utils.clustering import (
    UnionFind,
    generate_candidate_pairs,
    is_candidate_pair,
)

# ---- candidate gating ----


@pytest.mark.unit
@pytest.mark.parametrize(
    "a,b",
    [
        ("Alice", "Alice Liddell"),  # substring relationship
        ("Mrs. Brown", "Brown"),  # word overlap
        ("the King", "King"),  # article variant
        ("Dr. John", "John"),  # title + name
        ("Alice", "alice"),  # case-only difference
        ("White Rabbit", "the White Rabbit"),  # article addition
    ],
)
def test_pair_passes_gate(a: str, b: str) -> None:
    assert is_candidate_pair(a, b) is True


@pytest.mark.unit
@pytest.mark.parametrize(
    "a,b",
    [
        ("Alice", "Bob"),
        ("the rose", "the knife"),
        ("Wonderland", "Vienna"),
        ("", "Alice"),
    ],
)
def test_pair_blocked_by_gate(a: str, b: str) -> None:
    assert is_candidate_pair(a, b) is False


@pytest.mark.unit
def test_generate_candidate_pairs_emits_unique_ordered_pairs() -> None:
    surfaces = ["Alice", "Alice Liddell", "Bob", "Mrs. Brown", "Brown"]
    pairs = list(generate_candidate_pairs(surfaces))
    # Every pair must be (a, b) with a < b alphabetically.
    for a, b in pairs:
        assert a < b
    # Expected merges:
    assert ("Alice", "Alice Liddell") in pairs
    assert ("Brown", "Mrs. Brown") in pairs
    # Anti-expectation:
    assert ("Alice", "Bob") not in pairs


# ---- UnionFind ----


@pytest.mark.unit
def test_unionfind_basic_merge() -> None:
    uf = UnionFind(["a", "b", "c", "d"])
    uf.union("a", "b")
    uf.union("c", "d")
    uf.union("b", "c")
    components = uf.components()
    assert len(components) == 1
    assert components[0] == {"a", "b", "c", "d"}


@pytest.mark.unit
def test_unionfind_preserves_disjoint_groups() -> None:
    uf = UnionFind(["alice", "alice liddell", "bob", "robert"])
    uf.union("alice", "alice liddell")
    uf.union("bob", "robert")
    comps = sorted([sorted(c) for c in uf.components()])
    assert comps == [["alice", "alice liddell"], ["bob", "robert"]]


@pytest.mark.unit
def test_unionfind_add_after_construct() -> None:
    uf = UnionFind(["a"])
    uf.add("b")
    uf.union("a", "b")
    assert uf.components() == [{"a", "b"}]
