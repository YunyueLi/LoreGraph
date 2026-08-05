"""Where does the pipeline add anything a model does not already know?

Every work in the corpus is canonical, so the honest question is not "is the
graph good" but "is the graph better than remembering". This asks the same
questions two ways: closed-book, where the model answers from what it knows of
the published work and never sees the text, and from the graph, where the
answer is assembled from extracted claims and their evidence spans.

Scored **per book**, never averaged across the corpus. An average would hide
the only actionable result there is: a list of which works justify running the
pipeline and which are redundant with the model's memory. On a corpus of
Hamlet, Don Quixote and Journey to the West, expect most of the list to fall
on the redundant side — that is the finding, not a failure of the eval.

Question generation is deterministic and needs no credentials, so the battery
can be inspected before anything is spent. `preview` does exactly that.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import TypeVar

from loregraph.evals.corpus import BookUnderTest, Edge, Fact
from loregraph.evals.model_arm import (
    CLOSED_BOOK_SYSTEM,
    Arm,
    Judge,
    available,
)
from loregraph.evals.report import EvalResult

_C = TypeVar("_C", Edge, Fact)


@dataclass(slots=True)
class Probe:
    question: str
    ground_truth: str
    """The **source passage**, not a restatement of the graph's claim.

    The first version of this eval set ground_truth to a paraphrase of
    graph_answer, so the judge was asked whether an answer matched itself and
    the graph scored 12/12 by construction — the same tautology this project's
    literal-match gate had. Grade both arms against the text, and the graph can
    lose.
    """

    graph_answer: str
    """What the graph alone says — the pipeline's arm, assembled without a model."""
    source: str


def _confident(items: Sequence[_C], minimum: float = 0.85) -> list[_C]:
    return [i for i in items if i.confidence >= minimum and i.inference_depth == "explicit"]


def build(book: BookUnderTest, *, limit: int = 24) -> list[Probe]:
    """Questions whose answers the graph claims to know, spread over the book.

    Drawn from high-confidence explicit claims only: a question the pipeline
    itself is unsure about tests nothing about whether it beats memory.
    """
    probes: list[Probe] = []

    passage = book.chunk_text

    edges = _confident(book.edges)
    # Spread across chapters so the battery is not all opening-scene trivia,
    # which is the part of a famous book a model remembers best.
    edges.sort(key=lambda e: (e.atom_id, e.src))
    step = max(1, len(edges) // max(1, limit // 2))
    for edge in edges[::step][: limit // 2]:
        src, dst = book.name(edge.src), book.name(edge.dst)
        probes.append(
            Probe(
                question=f"In this work, what is the relationship between {src} and {dst}?",
                ground_truth=passage.get(edge.atom_id, edge.evidence_span)[:1800],
                graph_answer=(
                    f"{src} —{edge.predicate or edge.relation}→ {dst} "
                    f"({edge.evidence_span.strip()!r}, {edge.atom_id})"
                ),
                source=edge.atom_id,
            )
        )

    facts = _confident(book.facts)
    facts.sort(key=lambda f: (f.atom_id, f.entity))
    step = max(1, len(facts) // max(1, limit - len(probes)))
    for fact in facts[::step][: limit - len(probes)]:
        who = book.name(fact.entity)
        probes.append(
            Probe(
                question=(
                    f"In this work, what does the text establish about {who} "
                    f"regarding {fact.dimension}?"
                ),
                ground_truth=passage.get(fact.atom_id, fact.evidence_span)[:1800],
                graph_answer=f"{fact.statement} ({fact.evidence_span.strip()!r}, {fact.atom_id})",
                source=fact.atom_id,
            )
        )
    return probes


def preview(book: BookUnderTest, *, limit: int = 24) -> EvalResult:
    probes = build(book, limit=limit)
    usable, why = available()
    return EvalResult(
        name="contamination",
        book_id=book.book_id,
        headline=(
            f"{len(probes)} probes generated for {book.title}. "
            + ("Ready to run." if usable else f"Cannot score: {why}")
        ),
        metrics={
            "probes": len(probes),
            "chapters_covered": len({p.source.split("_")[0] for p in probes}),
            "provider_configured": usable,
        },
        findings=[{"question": p.question, "graph_answer": p.graph_answer} for p in probes[:6]],
        skipped=[] if usable else [f"closed-book arm and judge: {why}"],
    )


async def run(book: BookUnderTest, *, limit: int = 24) -> EvalResult:
    usable, _ = available()
    if not usable:
        return preview(book, limit=limit)

    probes = build(book, limit=limit)
    if not probes:
        return EvalResult(
            name="contamination",
            book_id=book.book_id,
            headline="No high-confidence explicit claims to probe.",
            skipped=["the whole battery: the graph has no confident explicit claims"],
        )

    closed = Arm("closed-book", CLOSED_BOOK_SYSTEM)
    judge = Judge()

    question_with_work = [f"Work: {book.title} by {book.author}.\n\n{p.question}" for p in probes]
    closed_answers = await closed.answer_all(question_with_work)

    def graded(answer_of: Callable[[int, Probe], str]) -> list[tuple[str, str, str]]:
        return [
            (
                p.question,
                answer_of(i, p),
                "The source passage below is the only authority. An answer is "
                "correct if the passage states or directly implies it, and "
                "incorrect if the passage contradicts it or is silent on it.\n\n"
                f"Passage:\n{p.ground_truth}",
            )
            for i, p in enumerate(probes)
        ]

    closed_scores, graph_scores = await asyncio.gather(
        judge.score_all(graded(lambda i, p: closed_answers[i].text)),
        judge.score_all(graded(lambda i, p: p.graph_answer)),
    )

    closed_right = sum(1 for s in closed_scores if s.correct)
    graph_right = sum(1 for s in graph_scores if s.correct)
    only_graph = [
        p
        for p, c, g in zip(probes, closed_scores, graph_scores, strict=True)
        if g.correct and not c.correct
    ]
    increment = (graph_right - closed_right) / len(probes)

    verdict = (
        "the graph adds nothing a reader could not get by asking the model"
        if increment <= 0
        else f"the graph answers {len(only_graph)} question(s) memory alone got wrong"
    )
    return EvalResult(
        name="contamination",
        book_id=book.book_id,
        headline=(
            f"closed-book {closed_right}/{len(probes)} vs graph {graph_right}/{len(probes)} "
            f"— {verdict}."
        ),
        metrics={
            "probes": len(probes),
            "closed_book_correct": closed_right,
            "graph_correct": graph_right,
            "increment": round(increment, 4),
            "answered_only_by_graph": len(only_graph),
            "tokens_in": closed.usage.to_dict().get("tokens_in", 0)
            + judge.usage.to_dict().get("tokens_in", 0),
        },
        findings=[{"question": p.question, "graph_answer": p.graph_answer} for p in only_graph[:6]],
        skipped=[
            "the graph arm is scored on the claims the graph already holds, so it "
            "measures precision, not recall — a question the pipeline never "
            "extracted an answer to is not in the battery at all.",
        ],
    )
