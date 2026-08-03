"""Unit tests for the evaluation harness.

The harness exists to keep the project honest about its own quality, so its
own failure modes matter: an eval that scores a subset silently, or reports
100% because its threshold is too weak, is worse than no eval at all.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from loregraph.evals import gaps, graph_usability, perturbation
from loregraph.evals.corpus import BookUnderTest, load_book, note_sections
from loregraph.evals.report import EvalResult, render


def _export(**overrides: object) -> dict:
    chunks = [
        {
            "atom_id": "ch01_p000",
            "chapter": 1,
            "text": "Ada held the brass key. Bram watched her from the door.",
        },
        {
            "atom_id": "ch02_p000",
            "chapter": 2,
            "text": "Ada struck Bram. The dream ended and she woke in the garden.",
        },
    ]
    entities = [
        {
            "canonical_id": "e1",
            "canonical_name": "Ada",
            "type": "Agent",
            "aliases": ["Ada Merrow"],
            "mention_count": 6,
            "chapters": [1, 2],
            "note_md": (
                "[CONTEXT]\nThe protagonist.\n\n"
                "[FACTS]\n- Ada held the brass key.\n\n"
                "[GAPS]\n- Whether the dream ends is never stated.\n"
                "- Ada's parentage is never given.\n\n"
                "[EVIDENCE]\n- ch01_p000\n"
            ),
            "tier": "T1",
        },
        {
            "canonical_id": "e2",
            "canonical_name": "Bram",
            "type": "Agent",
            "aliases": [],
            "mention_count": 4,
            "chapters": [1, 2],
            "note_md": "",
            "tier": "T1",
        },
        {
            "canonical_id": "e3",
            "canonical_name": "the brass key",
            "type": "Object",
            "aliases": [],
            "mention_count": 2,
            "chapters": [1],
            "note_md": "",
            "tier": None,
        },
    ]
    edges = [
        {
            "src": "e1",
            "dst": "e3",
            "relation": "STRUCTURAL",
            "predicate": "HOLDS",
            "predicate_class": "POSSESSION",
            "evidence_span": "Ada held the brass key",
            "confidence": 0.95,
            "inference_depth": "explicit",
            "atom_id": "ch01_p000",
        },
        {
            "src": "e1",
            "dst": "e2",
            "relation": "INTERACTS",
            "predicate": "STRIKES",
            "predicate_class": "CONFLICT",
            "evidence_span": "Ada struck Bram",
            "confidence": 0.9,
            "inference_depth": "explicit",
            "atom_id": "ch02_p000",
        },
        {
            "src": "e3",
            "dst": "e2",
            "relation": "INTERACTS",
            "predicate": "DECLINES",
            "predicate_class": "CONFLICT",
            "evidence_span": "Bram watched her",
            "confidence": 0.7,
            "inference_depth": "one_step",
            "atom_id": "ch01_p000",
        },
    ]
    payload = {
        "metadata": {"frontend_id": "toy", "title": "Toy", "author": "Nobody", "language": "en"},
        "chapters": [1, 2],
        "chunks": chunks,
        "entities": entities,
        "edges": edges,
        "glucose": [
            {
                "entity": "e1",
                "dimension": "emotion",
                "time_aspect": "after",
                "statement": "Ada is frightened.",
                "evidence_span": "she woke in the garden",
                "confidence": 0.8,
                "inference_depth": "one_step",
                "atom_id": "ch02_p000",
            }
        ],
    }
    payload.update(overrides)  # type: ignore[arg-type]
    return payload


@pytest.fixture
def toy(tmp_path: Path) -> BookUnderTest:
    (tmp_path / "toy.json").write_text(json.dumps(_export()), encoding="utf-8")
    return load_book("toy", tmp_path)


# ---------------------------------------------------------------- corpus


@pytest.mark.unit
def test_load_book_reads_every_section(toy: BookUnderTest) -> None:
    assert toy.title == "Toy"
    assert len(toy.chunks) == 2
    assert len(toy.entities) == 3
    assert len(toy.edges) == 3
    assert len(toy.facts) == 1
    assert toy.name("e1") == "Ada"
    assert [e.name for e in toy.agents] == ["Ada", "Bram"]


@pytest.mark.unit
def test_missing_book_names_what_is_available(tmp_path: Path) -> None:
    (tmp_path / "toy.json").write_text(json.dumps(_export()), encoding="utf-8")
    with pytest.raises(FileNotFoundError, match="toy"):
        load_book("nope", tmp_path)


@pytest.mark.unit
def test_sidecar_exports_are_not_books(tmp_path: Path) -> None:
    from loregraph.evals.corpus import available_books

    (tmp_path / "toy.json").write_text("{}", encoding="utf-8")
    (tmp_path / "toy.i18n.json").write_text("{}", encoding="utf-8")
    assert available_books(tmp_path) == ["toy"]


@pytest.mark.unit
def test_note_sections_splits_and_strips_bullets() -> None:
    parsed = note_sections("[CONTEXT]\nProse.\n\n[GAPS]\n- one\n- two\n")
    assert parsed["CONTEXT"] == ["Prose."]
    assert parsed["GAPS"] == ["one", "two"]


@pytest.mark.unit
def test_has_text_is_false_when_chunk_bodies_are_withheld(tmp_path: Path) -> None:
    payload = _export()
    for chunk in payload["chunks"]:  # type: ignore[union-attr]
        chunk.pop("text")
    (tmp_path / "c.json").write_text(json.dumps(payload), encoding="utf-8")
    assert load_book("c", tmp_path).has_text is False


# ---------------------------------------------------------------- graph


@pytest.mark.unit
def test_graph_eval_reports_both_scores(toy: BookUnderTest) -> None:
    result = graph_usability.run(toy)
    assert result.metrics["answerable_rate"] > 0
    assert "type_valid_rate" in result.metrics


@pytest.mark.unit
def test_graph_eval_counts_a_wrong_typed_endpoint_against_the_score(toy: BookUnderTest) -> None:
    """ "Which characters fight" returns an Object as the aggressor — the exact
    failure the first version of this eval scored as a pass."""
    result = graph_usability.run(toy)
    conflict = next(f for f in result.findings if "conflict" in str(f["query"]).lower())
    assert conflict["type_valid"] == "1/2"
    assert "brass key" in str(conflict["wrong_type"])
    assert result.metrics["type_valid_rate"] < 1.0


@pytest.mark.unit
def test_graph_eval_marks_class_queries_unsupported_without_classes(tmp_path: Path) -> None:
    payload = _export()
    for edge in payload["edges"]:  # type: ignore[union-attr]
        edge["predicate_class"] = None
    (tmp_path / "n.json").write_text(json.dumps(payload), encoding="utf-8")
    result = graph_usability.run(load_book("n", tmp_path))
    assert result.metrics["unsupported"] >= 10
    assert any("no graph axis" in s for s in result.skipped)


@pytest.mark.unit
def test_graph_eval_separates_empty_from_unsupported(toy: BookUnderTest) -> None:
    result = graph_usability.run(toy)
    assert (
        result.metrics["empty"] + result.metrics["unsupported"] + result.metrics["answered"]
        == result.metrics["queries"]
    )


# ---------------------------------------------------------------- gaps


@pytest.mark.unit
def test_gaps_eval_flags_a_gap_the_source_answers(toy: BookUnderTest) -> None:
    """Ada's note cites only chapter 1 and claims the dream's end is never
    stated — chapter 2 says she woke. That is the Pass-8 defect in miniature."""
    result = gaps.run(toy)
    assert result.metrics["gaps_claimed"] == 2
    assert result.metrics["entities_with_blind_chapters"] == 1
    assert result.metrics["suspect_gaps"] == 1
    assert "dream" in result.findings[0]["matched_terms"]
    assert result.findings[0]["found_in_chapter"] == 2


@pytest.mark.unit
def test_gaps_eval_always_says_what_it_could_not_confirm(toy: BookUnderTest) -> None:
    result = gaps.run(toy)
    assert any("lexical screen" in s for s in result.skipped)


@pytest.mark.unit
def test_gaps_eval_refuses_to_score_a_text_free_export(tmp_path: Path) -> None:
    payload = _export()
    for chunk in payload["chunks"]:  # type: ignore[union-attr]
        chunk.pop("text")
    (tmp_path / "c.json").write_text(json.dumps(payload), encoding="utf-8")
    result = gaps.run(load_book("c", tmp_path))
    assert result.metrics == {}
    assert result.skipped


# ---------------------------------------------------------------- perturbation


@pytest.mark.unit
def test_rename_removes_every_trace_of_the_original_name(toy: BookUnderTest) -> None:
    plan = perturbation.rename_characters(toy, count=1)
    assert plan
    altered = plan[0].apply(toy.full_text)
    assert "Ada" not in altered
    assert plan[0].residue(altered) == 0


@pytest.mark.unit
def test_rename_covers_possessives(toy: BookUnderTest) -> None:
    plan = perturbation.rename_characters(toy, count=1)
    # Straight and curly: Gutenberg texts use the curly one.
    altered = plan[0].apply("Ada's hand held Ada\u2019s key, said Ada.")
    assert "Ada" not in altered


@pytest.mark.unit
def test_possession_swap_edits_one_passage_not_the_whole_book(toy: BookUnderTest) -> None:
    """The first version renamed the holder globally — 464 occurrences of
    "Alice" became "the Queen" — leaving a text about nobody."""
    plan = perturbation.swap_possessions(toy, count=1)
    assert plan
    altered = plan[0].apply(toy.full_text)
    assert altered.count("Ada") >= 1, "only the one clause should change"
    assert "Bram held the brass key" in altered


@pytest.mark.unit
def test_negation_flips_exactly_one_clause(toy: BookUnderTest) -> None:
    plan = perturbation.invert_outcomes(toy, count=2)
    for item in plan:
        altered = item.apply(toy.full_text)
        assert altered != toy.full_text
        assert " not " in altered


@pytest.mark.unit
def test_perturbations_are_deterministic(toy: BookUnderTest) -> None:
    a = [p.description for p in perturbation.build(toy)]
    b = [p.description for p in perturbation.build(toy)]
    assert a == b


@pytest.mark.unit
def test_dry_run_reports_leaks_rather_than_hiding_them(toy: BookUnderTest) -> None:
    result = perturbation.dry_run(toy)
    assert result.metrics["text_changed"] is True
    assert result.metrics["leak_free"] <= result.metrics["perturbations"]
    assert any("needs a configured LLM provider" in s for s in result.skipped)


@pytest.mark.unit
def test_dry_run_refuses_a_text_free_export(tmp_path: Path) -> None:
    payload = _export()
    for chunk in payload["chunks"]:  # type: ignore[union-attr]
        chunk.pop("text")
    (tmp_path / "c.json").write_text(json.dumps(payload), encoding="utf-8")
    result = perturbation.dry_run(load_book("c", tmp_path))
    assert "Cannot run" in result.headline


# ---------------------------------------------------------------- report


@pytest.mark.unit
def test_render_always_prints_what_was_not_covered() -> None:
    text = render(
        [
            EvalResult(
                name="x",
                book_id="b",
                headline="h",
                metrics={"a": 1},
                skipped=["the important caveat"],
            )
        ]
    )
    assert "not covered" in text
    assert "the important caveat" in text


@pytest.mark.unit
def test_render_json_round_trips() -> None:
    result = EvalResult(name="x", book_id="b", headline="h", metrics={"a": 1})
    assert json.loads(render([result], as_json=True))[0]["metrics"]["a"] == 1
