"""Unit tests for Pass-8 evidence selection.

The bug these cover: capping an entity's evidence with `items[:N]` takes the
first N rows, which arrive in book order — so the entity with the *most*
evidence (the protagonist) got a note synthesised from the opening chapters,
and Pass-8's [GAPS] section then reported the unseen chapters as things the
work never says.
"""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from loregraph.pipeline.pass8_note import (
    _atom_chapter,
    _chapters_of,
    _coverage_note,
    _spread,
)


@dataclass(slots=True)
class _Item:
    atom_id: str


def _book(chapters: int, per_chapter: int) -> list[_Item]:
    return [
        _Item(f"ch{c:02d}_p{p:03d}") for c in range(1, chapters + 1) for p in range(per_chapter)
    ]


@pytest.mark.unit
@pytest.mark.parametrize(
    ("atom_id", "expected"),
    [
        ("ch01_p000", 1),
        ("ch12_p002", 12),
        ("CH07_p1", 7),
        ("prologue_p0", -1),
        ("", -1),
    ],
)
def test_atom_chapter_parses_pass1_ids(atom_id: str, expected: int) -> None:
    assert _atom_chapter(atom_id) == expected


@pytest.mark.unit
def test_spread_keeps_everything_when_under_the_cap() -> None:
    items = _book(chapters=3, per_chapter=2)
    assert _spread(items, 30) is items


@pytest.mark.unit
def test_spread_reaches_the_last_chapter_where_truncation_did_not() -> None:
    """The regression itself, on Alice's shape: 12 chapters, cap of 30."""
    items = _book(chapters=12, per_chapter=8)  # 96 mentions
    truncated = items[:30]
    spread = _spread(items, 30)

    assert {_atom_chapter(i.atom_id) for i in truncated} == set(range(1, 5))
    assert {_atom_chapter(i.atom_id) for i in spread} == set(range(1, 13))
    assert len(spread) == 30


@pytest.mark.unit
def test_spread_covers_every_chapter_when_the_cap_allows() -> None:
    items = _book(chapters=20, per_chapter=5)
    spread = _spread(items, 25)
    # 25 slots over 20 chapters — every chapter must get at least one.
    assert {_atom_chapter(i.atom_id) for i in spread} == set(range(1, 21))


@pytest.mark.unit
def test_spread_takes_a_prefix_of_the_chapters_when_the_cap_is_tighter() -> None:
    """Fewer slots than chapters: still spread, never all from chapter 1."""
    items = _book(chapters=20, per_chapter=5)
    spread = _spread(items, 4)
    assert len(spread) == 4
    assert len({_atom_chapter(i.atom_id) for i in spread}) == 4


@pytest.mark.unit
def test_spread_preserves_book_order() -> None:
    items = _book(chapters=12, per_chapter=8)
    spread = _spread(items, 30)
    positions = [items.index(i) for i in spread]
    assert positions == sorted(positions)


@pytest.mark.unit
def test_spread_is_deterministic() -> None:
    items = _book(chapters=9, per_chapter=7)
    assert [i.atom_id for i in _spread(items, 20)] == [i.atom_id for i in _spread(items, 20)]


@pytest.mark.unit
def test_spread_handles_unparsable_atom_ids() -> None:
    items = [_Item("frontmatter"), *_book(chapters=4, per_chapter=4)]
    spread = _spread(items, 5)
    assert len(spread) == 5


@pytest.mark.unit
def test_chapters_of_unions_groups_and_drops_unparsable() -> None:
    assert _chapters_of([_Item("ch01_p000"), _Item("nope")], [_Item("ch05_p001")]) == {1, 5}


@pytest.mark.unit
def test_coverage_note_is_absent_when_nothing_was_dropped() -> None:
    assert _coverage_note(shown=12, total=12, chapters_shown={1, 2}, chapters_total={1, 2}) is None


@pytest.mark.unit
def test_coverage_note_names_the_sample_and_the_unshown_chapters() -> None:
    note = _coverage_note(
        shown=30, total=96, chapters_shown={1, 2, 3}, chapters_total={1, 2, 3, 4, 9}
    )
    assert note is not None
    assert "30 of 96" in note
    assert "4, 9" in note
    assert "sample of the source" in note
