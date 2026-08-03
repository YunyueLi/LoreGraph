"""Evaluations that answer the question the counts cannot.

A graph with 8,833 edges and a 100% literal-match rate tells you how much was
extracted and that the quotes are real. Neither says whether the extraction is
any good, and — the sharper question for a corpus of canonical works — neither
says whether it beats simply asking a frontier model, which has read a thousand
essays on every book here.

Five evaluations, ordered by how much they discriminate:

`perturbation`   The decisive one. Alter the source — rename a character,
                 invert an outcome, swap a prop — and re-run. A system reading
                 the text follows the change; a system reciting its memory of
                 the book reverts. Needs no ground-truth annotation, because
                 the edit *is* the ground truth. If the pipeline cannot win
                 here, the rest of the engineering does not matter and the
                 corpus should move to texts no model has read.

`contamination`  Ask the same questions closed-book. Where a model answers as
                 well from memory as the pipeline does from the text, the
                 pipeline added nothing for that book. Scored per book, so the
                 answer is a list of which works justify the pipeline, not an
                 average that hides them.

`entailment`     Does the evidence span actually support the claim it is
                 attached to? Pass-7 computes this and never gated on it; this
                 runs it standalone so a floor can be set on measurement
                 instead of on a guess.

`gaps`           Pass-8 lists what the source "does not tell us". Check each
                 claimed gap against the source. A gap the text in fact
                 answers is the worst output the system can produce: a
                 confident falsehood in the voice of evidence.

`graph`          Can an analyst's question be answered by traversal at all?
                 Counts of nodes and edges say nothing about this, and a graph
                 whose relation vocabulary is a third singletons cannot answer
                 most of them.

`gaps` and `graph` run with no model and no credentials. The other three need
a provider configured; every one of them reports what it could not run rather
than quietly scoring a subset.
"""

from __future__ import annotations

from loregraph.evals.corpus import BookUnderTest, available_books, load_book
from loregraph.evals.report import EvalResult, render

__all__ = [
    "BookUnderTest",
    "EvalResult",
    "available_books",
    "load_book",
    "render",
]
