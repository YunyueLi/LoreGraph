"""Does the evidence span actually support the claim attached to it?

The literal-match rate — 19,868 of 19,868 spans on alice and xyj — proves the
quote is real. It cannot prove the quote supports the claim, and it cannot
fail: Pass-2/5/6 drop non-literal spans before persisting, so the "hard gate"
was checking an invariant the pipeline already guarantees.

This runs the check that was missing, standalone and against the shipped
export, so a floor for `LOREGRAPH_COVE_SUPPORTED_FLOOR` can be set on a
measured distribution instead of a guess. The sample is stratified the same
way Pass-7's now is, and every `multi_step` claim is checked rather than
sampled.

The stratification itself is deterministic and runs with no credentials —
`preview` shows exactly which claims would be sent and what they cost.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from loregraph.evals.corpus import BookUnderTest
from loregraph.evals.model_arm import Judge, available
from loregraph.evals.report import EvalResult
from loregraph.pipeline.pass7_cove import stratified_sample


@dataclass(slots=True)
class Claim:
    kind: str
    stratum: str
    statement: str
    evidence_span: str
    chunk_text: str
    atom_id: str


def _claims(book: BookUnderTest) -> list[Claim]:
    text = book.chunk_text
    out = [
        Claim(
            kind="edge",
            stratum=f"{e.relation}/{e.inference_depth}",
            statement=f"{book.name(e.src)} {e.predicate or e.relation} {book.name(e.dst)}",
            evidence_span=e.evidence_span,
            chunk_text=text.get(e.atom_id, ""),
            atom_id=e.atom_id,
        )
        for e in book.edges
    ]
    out += [
        Claim(
            kind="fact",
            stratum=f"{f.dimension}/{f.inference_depth}",
            statement=f.statement,
            evidence_span=f.evidence_span,
            chunk_text=text.get(f.atom_id, ""),
            atom_id=f.atom_id,
        )
        for f in book.facts
    ]
    return out


def sample(book: BookUnderTest, *, budget: int = 150, seed: int = 7) -> list[Claim]:
    return stratified_sample(
        _claims(book),
        key=lambda c: c.stratum,
        budget=budget,
        exhaustive=lambda c: c.stratum.endswith("/multi_step"),
        rng=random.Random(seed),
    )


def preview(book: BookUnderTest, *, budget: int = 150) -> EvalResult:
    picked = sample(book, budget=budget)
    strata: dict[str, int] = {}
    for claim in picked:
        strata[claim.stratum] = strata.get(claim.stratum, 0) + 1
    usable, why = available()
    total = len(_claims(book))
    return EvalResult(
        name="entailment",
        book_id=book.book_id,
        headline=(
            f"{len(picked)} of {total} claims sampled across {len(strata)} strata. "
            + ("Ready to judge." if usable else f"Cannot judge: {why}")
        ),
        metrics={
            "claims_total": total,
            "sampled": len(picked),
            "strata": len(strata),
            "multi_step_in_sample": sum(1 for c in picked if c.stratum.endswith("/multi_step")),
            "provider_configured": usable,
        },
        findings=[
            {"stratum": k, "sampled": v} for k, v in sorted(strata.items(), key=lambda kv: -kv[1])
        ],
        skipped=[] if usable else [f"the judge: {why}"],
    )


async def run(book: BookUnderTest, *, budget: int = 150) -> EvalResult:
    usable, _ = available()
    if not usable:
        return preview(book, budget=budget)

    picked = [c for c in sample(book, budget=budget) if c.chunk_text]
    if not picked:
        return EvalResult(
            name="entailment",
            book_id=book.book_id,
            headline="No claims with retrievable chunk text — this export omits chunk bodies.",
            skipped=["every claim: the source text is not in the export"],
        )

    judge = Judge()
    verdicts = await judge.score_all(
        [
            (
                f"Does this passage support the claim?\n\nPassage: {c.chunk_text[:1500]}",
                f"Claim: {c.statement}\nCited span: {c.evidence_span}",
                (
                    "The claim is supported only if the cited span, read in the "
                    "passage, states or directly implies it. A span that is real "
                    "but about something else is NOT support."
                ),
            )
            for c in picked
        ]
    )

    by_stratum: dict[str, list[int]] = {}
    for claim, verdict in zip(picked, verdicts, strict=True):
        bucket = by_stratum.setdefault(claim.stratum, [0, 0])
        bucket[1] += 1
        bucket[0] += int(verdict.correct)

    supported = sum(v[0] for v in by_stratum.values())
    rate = supported / len(picked)
    ranked = sorted(
        ((hits / n, name, hits, n) for name, (hits, n) in by_stratum.items() if n),
    )
    return EvalResult(
        name="entailment",
        book_id=book.book_id,
        headline=(
            f"{supported}/{len(picked)} sampled claims are entailed by their evidence "
            f"({rate:.1%}). Weakest stratum: {ranked[0][1]} at {ranked[0][0]:.0%}."
            if ranked
            else f"{supported}/{len(picked)} entailed."
        ),
        metrics={
            "sampled": len(picked),
            "supported": supported,
            "supported_rate": round(rate, 4),
            "strata": len(by_stratum),
            "suggested_floor": round(max(0.0, rate - 0.05), 2),
        },
        findings=[
            {"stratum": name, "supported": f"{hits}/{n}", "rate": round(r, 3)}
            for r, name, hits, n in ranked
        ],
        skipped=[
            f"{len(sample(book, budget=budget)) - len(picked)} sampled claims had no "
            "chunk text in the export and were not judged.",
            "`suggested_floor` is this book's rate less a 5-point margin. Measure "
            "several books before setting LOREGRAPH_COVE_SUPPORTED_FLOOR from it.",
        ],
    )
