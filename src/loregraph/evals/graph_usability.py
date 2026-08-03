"""Can an analyst's question be answered by traversal, and is the answer usable?

Reporting "8,833 edges" answers "how much did we extract". It does not answer
"is this a graph you can query", and those come apart badly when the relation
vocabulary is a long tail: a third of the edges shipped with a predicate that
appears nowhere else, so a question about betrayal had to match BETRAYS,
DECEIVES and TRICKS at one occurrence each and found none of them.

Two scores, because the first one on its own lies.

`answerable_rate` — the share of the battery that returns anything. On a graph
with a few thousand edges this is 100% and stays 100%, which is exactly why it
must not be reported alone: the first run of this eval scored 20/20 on both
books while returning "her brother's Latin Grammar -> the Mouse" for "which
characters come into conflict".

`type_valid_rate` — the share of returned results whose endpoints are the kind
of thing the question asked about. "Which characters fight" wants two Agents;
a Latin grammar book is a miss, and the miss is the signal. This is checkable
offline against the entity types the graph already carries, and it is the
number that moves when extraction or classification improves.

No model, no text search, no credentials. Zero results is separated from
"the graph cannot express this question" — Alice genuinely has almost no
kinship structure, and that is the work's property, not the graph's fault.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass, field
from functools import partial

from loregraph.evals.corpus import BookUnderTest
from loregraph.evals.report import EvalResult

# Entity types an endpoint may take. `*` means the question does not care.
ANY = ("*",)
AGENT = ("Agent",)
THING = ("Object", "Concept")
PLACE = ("Object",)
HAPPENING = ("Event", "Concept")


@dataclass(frozen=True, slots=True)
class Hit:
    label: str
    src: str | None = None
    dst: str | None = None


@dataclass(frozen=True, slots=True)
class Query:
    key: str
    question: str
    run: Callable[[BookUnderTest], list[Hit]]
    expect_src: tuple[str, ...] = ANY
    expect_dst: tuple[str, ...] = ANY
    needs: str = ""
    """Field the query depends on; without it the query is `unsupported`
    rather than merely `empty`."""


def _chapter_of(atom_id: str) -> int:
    head = atom_id.split("_")[0]
    return int(head[2:]) if head[:2].lower() == "ch" and head[2:].isdigit() else -1


def _by_class(book: BookUnderTest, *, wanted: str) -> list[Hit]:
    return [
        Hit(f"{book.name(e.src)} -{e.predicate}-> {book.name(e.dst)}", e.src, e.dst)
        for e in book.edges
        if e.predicate_class == wanted
    ]


def _by_relation(book: BookUnderTest, wanted: str) -> list[Hit]:
    return [
        Hit(f"{book.name(e.src)} -{e.predicate}-> {book.name(e.dst)}", e.src, e.dst)
        for e in book.edges
        if e.relation == wanted
    ]


def _who_turns_on_whom(book: BookUnderTest) -> list[Hit]:
    """Pairs warm early and hostile later — the query a graph is supposed to
    make cheap and a bag of quotes makes impossible."""
    warm = {"AID", "SOCIAL", "SPEECH_APPROVING", "KINSHIP"}
    cold = {"CONFLICT", "SPEECH_CRITICAL"}
    timeline: dict[tuple[str, str], list[tuple[int, str]]] = defaultdict(list)
    for edge in book.edges:
        if edge.predicate_class in warm | cold:
            timeline[(edge.src, edge.dst)].append(
                (_chapter_of(edge.atom_id), edge.predicate_class or "")
            )
    out = []
    for (src, dst), events in timeline.items():
        events.sort()
        first_warm = next((c for c, k in events if k in warm), None)
        last_cold = next((c for c, k in reversed(events) if k in cold), None)
        if first_warm is not None and last_cold is not None and last_cold > first_warm:
            out.append(
                Hit(
                    f"{book.name(src)} -> {book.name(dst)} "
                    f"(warm ch{first_warm}, hostile ch{last_cold})",
                    src,
                    dst,
                )
            )
    return out


def _frequent_cast(book: BookUnderTest, minimum: int) -> list[Hit]:
    scenes: dict[str, set[str]] = defaultdict(set)
    for edge in book.edges:
        for end in (edge.src, edge.dst):
            scenes[edge.atom_id].add(end)
    appearances: dict[str, int] = defaultdict(int)
    for cast in scenes.values():
        for member in cast:
            appearances[member] += 1
    return [
        Hit(f"{book.name(k)} ({v} scenes)", k)
        for k, v in sorted(appearances.items(), key=lambda kv: -kv[1])
        if v >= minimum
    ]


def _asymmetric_regard(book: BookUnderTest) -> list[Hit]:
    """A is warm to B while B is hostile to A — needs direction, which is what
    a graph has and a list of quotes does not."""
    warm: set[tuple[str, str]] = set()
    cold: set[tuple[str, str]] = set()
    for edge in book.edges:
        if edge.predicate_class in {"SPEECH_APPROVING", "AID"}:
            warm.add((edge.src, edge.dst))
        if edge.predicate_class in {"SPEECH_CRITICAL", "CONFLICT"}:
            cold.add((edge.src, edge.dst))
    return [
        Hit(f"{book.name(a)} warm to {book.name(b)}; {book.name(b)} hostile back", a, b)
        for a, b in sorted(warm)
        if (b, a) in cold
    ]


def _bridges(book: BookUnderTest) -> list[Hit]:
    neighbours: dict[str, set[str]] = defaultdict(set)
    for edge in book.edges:
        neighbours[edge.src].add(edge.dst)
        neighbours[edge.dst].add(edge.src)
    out = []
    for node, linked in neighbours.items():
        if len(linked) < 4:
            continue
        pairs = [(a, b) for a in linked for b in linked if a < b]
        strangers = sum(1 for a, b in pairs if b not in neighbours.get(a, set()))
        if pairs and strangers / len(pairs) > 0.85:
            out.append(Hit(f"{book.name(node)} ({len(linked)} neighbours)", node))
    return out


def _final_chapter_cast(book: BookUnderTest) -> list[Hit]:
    last = max((_chapter_of(e.atom_id) for e in book.edges), default=-1)
    seen = {x for e in book.edges if _chapter_of(e.atom_id) == last for x in (e.src, e.dst)}
    return [Hit(book.name(x), x) for x in sorted(seen)]


def _full_arc(book: BookUnderTest) -> list[Hit]:
    last = max((max(e.chapters) for e in book.entities if e.chapters), default=0)
    return [
        Hit(f"{e.name} (ch{min(e.chapters)}-{max(e.chapters)})", e.canonical_id)
        for e in book.entities
        if e.chapters and min(e.chapters) == 1 and max(e.chapters) == last
    ]


def _facts(book: BookUnderTest, dimension: str) -> list[Hit]:
    return [
        Hit(f"{book.name(f.entity)} — {f.statement}", f.entity)
        for f in book.facts
        if f.dimension == dimension
    ]


def _deep_inferences(book: BookUnderTest) -> list[Hit]:
    return [
        Hit(f"{book.name(e.src)} -{e.predicate}-> {book.name(e.dst)}", e.src, e.dst)
        for e in book.edges
        if e.inference_depth == "multi_step"
    ] + [
        Hit(f"{book.name(f.entity)} — {f.statement}", f.entity)
        for f in book.facts
        if f.inference_depth == "multi_step"
    ]


CLASS_QUERIES = (
    ("who-fights-whom", "Which characters come into conflict?", "CONFLICT", AGENT, AGENT),
    ("who-helps-whom", "Who aids or rescues whom?", "AID", AGENT, AGENT),
    ("who-commands-whom", "What is the chain of authority?", "AUTHORITY", AGENT, AGENT),
    ("family-ties", "What are the family relationships?", "KINSHIP", AGENT, AGENT),
    ("who-owns-what", "Who holds or owns which objects?", "POSSESSION", AGENT, THING),
    ("who-goes-where", "Who travels where?", "MOTION", AGENT, PLACE),
    ("who-speaks-ill", "Who criticises or accuses whom?", "SPEECH_CRITICAL", AGENT, ANY),
    ("who-praises-whom", "Who praises or endorses whom?", "SPEECH_APPROVING", AGENT, ANY),
    ("what-transforms", "What changes into something else?", "TRANSFORMATION", ANY, ANY),
    ("who-gives-what", "What changes hands, and between whom?", "EXCHANGE", AGENT, ANY),
)

_CLASS_BATTERY: tuple[Query, ...] = tuple(
    Query(
        key,
        question,
        partial(_by_class, wanted=cls),
        src,
        dst,
        needs="predicate_class",
    )
    for key, question, cls, src, dst in CLASS_QUERIES
)

_EXTRA_BATTERY: tuple[Query, ...] = (
    Query(
        "who-betrays-whom",
        "Who turns on someone they were close to?",
        _who_turns_on_whom,
        AGENT,
        AGENT,
        needs="predicate_class",
    ),
    Query(
        "asymmetric-regard",
        "Who is warm to someone hostile back?",
        _asymmetric_regard,
        AGENT,
        AGENT,
        needs="predicate_class",
    ),
    Query(
        "what-is-foretold",
        "What is predicted, promised or prophesied?",
        lambda b: _by_relation(b, "PREDICTS"),
        ANY,
        ANY,
    ),
    Query(
        "causal-chain",
        "What causes what?",
        lambda b: _by_relation(b, "INFLUENCES"),
        ANY,
        ANY,
    ),
    Query("bridge-characters", "Who connects otherwise-separate groups?", _bridges, AGENT),
    Query(
        "frequent-cast",
        "Who appears in three or more scenes?",
        lambda b: _frequent_cast(b, 3),
        AGENT,
    ),
    Query("chapter-cast", "Who appears in the final chapter?", _final_chapter_cast, AGENT),
    Query("arc-span", "Who is present from the first chapter to the last?", _full_arc, AGENT),
    Query(
        "emotional-state",
        "Whose emotional state is recorded?",
        lambda b: _facts(b, "emotion"),
        AGENT,
    ),
    Query(
        "possession-changes",
        "What does someone come to hold?",
        lambda b: _facts(b, "possession"),
        ANY,
    ),
    Query("deep-inferences", "Which claims rest on multi-step inference?", _deep_inferences),
)

BATTERY: tuple[Query, ...] = (*_CLASS_BATTERY, *_EXTRA_BATTERY)


@dataclass
class _Score:
    answered: list[str] = field(default_factory=list)
    empty: list[str] = field(default_factory=list)
    unsupported: list[str] = field(default_factory=list)
    hits: int = 0
    type_valid: int = 0


def _endpoint_ok(book: BookUnderTest, node: str | None, expect: tuple[str, ...]) -> bool:
    if expect == ANY or node is None:
        return True
    entity = book.entity(node)
    return entity is not None and entity.type in expect


def run(book: BookUnderTest) -> EvalResult:
    has_classes = any(e.predicate_class for e in book.edges)
    score = _Score()
    findings: list[dict[str, object]] = []

    for query in BATTERY:
        if query.needs == "predicate_class" and not has_classes:
            score.unsupported.append(query.key)
            continue
        try:
            hits = query.run(book)
        except Exception as exc:  # a query that crashes is unsupported, loudly
            score.unsupported.append(f"{query.key} ({type(exc).__name__}: {exc})")
            continue
        if not hits:
            score.empty.append(query.key)
            continue

        score.answered.append(query.key)
        valid = [
            h
            for h in hits
            if _endpoint_ok(book, h.src, query.expect_src)
            and _endpoint_ok(book, h.dst, query.expect_dst)
        ]
        score.hits += len(hits)
        score.type_valid += len(valid)
        wrong = next((h for h in hits if h not in valid), None)
        findings.append(
            {
                "query": query.question,
                "results": len(hits),
                "type_valid": f"{len(valid)}/{len(hits)}",
                "example": (valid[0] if valid else hits[0]).label,
                **({"wrong_type": wrong.label} if wrong else {}),
            }
        )

    total = len(BATTERY)
    answerable = len(score.answered) / total
    validity = score.type_valid / score.hits if score.hits else 0.0
    headline = (
        f"{len(score.answered)}/{total} queries return something ({answerable:.0%}), "
        f"but only {validity:.0%} of the {score.hits} results have endpoints of the "
        "kind the question asked for."
    )
    return EvalResult(
        name="graph",
        book_id=book.book_id,
        headline=headline,
        metrics={
            "queries": total,
            "answered": len(score.answered),
            "answerable_rate": round(answerable, 4),
            "results": score.hits,
            "type_valid": score.type_valid,
            "type_valid_rate": round(validity, 4),
            "empty": len(score.empty),
            "unsupported": len(score.unsupported),
            "edges": len(book.edges),
            "distinct_predicates": len({e.predicate for e in book.edges if e.predicate}),
            "predicate_classes_present": len(
                {e.predicate_class for e in book.edges if e.predicate_class}
            ),
        },
        findings=sorted(
            findings,
            key=lambda f: (
                int(str(f["type_valid"]).split("/")[0])
                / max(1, int(str(f["type_valid"]).split("/")[1]))
            ),
        ),
        skipped=(
            [f"{k}: traversal returned nothing (may be true of this work)" for k in score.empty]
            + [f"{k}: no graph axis expresses this question" for k in score.unsupported]
        ),
    )
