"""The decisive test: did the system read the text, or recite the book?

Every work in this corpus is canonical. A frontier model has seen thousands of
essays on each one, so asking it about Alice measures its memory, not its
reading — and on that ground it beats an eight-pass pipeline on quality, cost
and latency, because it is answering from a compressed encyclopaedia rather
than extracting from 42 chunks.

Perturbation separates the two. Alter the source — rename a character to a
name that has never appeared in print, invert an outcome, move an object —
and ask a question that turns on the change. A system reading the supplied
text follows the edit. A system reciting its memory reverts to the published
version, confidently, in the same tone it uses when it is right.

The edit *is* the ground truth, so this needs no annotation and no expert. It
is the only experiment here that can show the pipeline earning its cost on a
famous book, and equally the only one that can show it cannot.

The generator is deterministic and runs with no credentials — you can inspect
exactly what was changed before spending anything. Only the answering and
scoring arms need a provider.
"""

from __future__ import annotations

import asyncio
import hashlib
import re
from dataclasses import dataclass, field

from loregraph.evals.corpus import BookUnderTest
from loregraph.evals.model_arm import (
    CLOSED_BOOK_SYSTEM,
    OPEN_BOOK_SYSTEM,
    Answer,
    Arm,
    Judge,
    available,
)
from loregraph.evals.report import EvalResult

# Names chosen to be pronounceable, era-neutral, and absent from any published
# text the model could have memorised — the point is that a correct answer can
# only have come from the supplied excerpt.
_INVENTED_NAMES = (
    "Marrowbry",
    "Quillingham",
    "Vesperlow",
    "Thackray",
    "Ondriss",
    "Pellwyn",
    "Corvassen",
    "Halbrith",
    "Ferrimond",
    "Astoleth",
    "Brenwick",
    "Dulmarey",
    "Ghyllan",
    "Sarrowfin",
    "Teviot",
)


@dataclass(slots=True)
class Perturbation:
    kind: str
    description: str
    question: str
    ground_truth: str
    original_answer: str
    """What a system answering from memory of the published work would say.
    Scoring a reply as this exact answer is the reversion signal."""

    replacements: list[tuple[str, str]] = field(default_factory=list)
    """Global renames, applied at every word-boundary occurrence."""

    span_edits: list[tuple[str, str]] = field(default_factory=list)
    """One-shot literal rewrites of a single passage. A possession swap has to
    be one of these: renaming the holder globally turns every other sentence
    about them into nonsense and leaves nothing coherent to ask about."""

    chapters_touched: list[int] = field(default_factory=list)

    def apply(self, text: str) -> str:
        out = text
        for old, new in self.span_edits:
            out = out.replace(old, new, 1)
        for old, new in self.replacements:
            out = re.sub(rf"(?<!\w){re.escape(old)}(?!\w)", new, out)
        return out

    def residue(self, text: str) -> int:
        """Occurrences of the original wording still present after `apply`.

        A rename that leaves the old name standing anywhere is a leaky probe:
        the model can answer correctly from the leftovers instead of reading.
        """
        left = sum(
            len(re.findall(rf"(?<!\w){re.escape(old)}(?!\w)", text)) for old, _ in self.replacements
        )
        return left + sum(text.count(old) for old, _ in self.span_edits)


def _stable_pick(seed: str, options: tuple[str, ...]) -> str:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    return options[digest[0] % len(options)]


def _surface_forms(book: BookUnderTest, canonical_id: str) -> list[str]:
    entity = book.entity(canonical_id)
    if not entity:
        return []
    forms = {entity.name, *entity.aliases}
    for form in list(forms):
        # "the Cheshire Cat" also appears as "Cheshire Cat".
        bare = re.sub(r"^(the|a|an)\s+", "", form, flags=re.I).strip()
        if bare and bare != form:
            forms.add(bare)
        # A rename that misses "Alice's" leaves the old name standing in the
        # text, and the model can answer from the leftovers without reading.
        # Both apostrophes: Gutenberg texts use the curly one.
        for possessive in (f"{form}'s", f"{form}\u2019s"):
            forms.add(possessive)
        if bare:
            forms.add(f"{bare}'s")
            forms.add(f"{bare}\u2019s")
    # Longest first so "Cheshire Cat" is replaced before "Cat", and "Alice's"
    # before "Alice" — otherwise the shorter match strands the suffix.
    return sorted((f for f in forms if len(f) >= 3), key=len, reverse=True)


def rename_characters(book: BookUnderTest, count: int = 3) -> list[Perturbation]:
    """Give named characters names no published text contains.

    The cleanest reversion probe there is: an answer naming the real character
    can only have come from memory, because the supplied text does not contain
    that string anywhere.
    """
    out: list[Perturbation] = []
    for entity in book.agents:
        if len(out) >= count:
            break
        forms = _surface_forms(book, entity.canonical_id)
        if not forms or entity.mention_count < 3:
            continue
        invented = _stable_pick(f"{book.book_id}:{entity.canonical_id}", _INVENTED_NAMES)
        if invented in {n for p in out for _, n in p.replacements}:
            continue
        out.append(
            Perturbation(
                kind="rename",
                description=f"{entity.name} renamed to {invented} throughout",
                question=(
                    f"In the text provided, who or what is {invented}? "
                    "Describe their role in one sentence."
                ),
                ground_truth=(
                    f"{invented} occupies the role the published work gives to "
                    f"{entity.name}. Any answer that names {entity.name} instead of "
                    f"{invented}, or that says {invented} does not appear, has "
                    "reverted to the remembered work."
                ),
                original_answer=entity.name,
                replacements=[(f, invented) for f in forms],
                chapters_touched=sorted(entity.chapters),
            )
        )
    return out


def swap_possessions(book: BookUnderTest, count: int = 2) -> list[Perturbation]:
    """Move an object from the character who holds it to another.

    Harder than a rename: both names exist in the text, so the model cannot
    fall back on "this name is unfamiliar" — it has to actually read who holds
    what.
    """
    holdings = [
        e
        for e in book.edges
        if e.predicate_class == "POSSESSION"
        and (src := book.entity(e.src))
        and src.type == "Agent"
        and (dst := book.entity(e.dst))
        and dst.type == "Object"
    ]
    seen: set[str] = set()
    out: list[Perturbation] = []
    for edge in holdings:
        if len(out) >= count:
            break
        holder, item = book.entity(edge.src), book.entity(edge.dst)
        if not holder or not item or item.canonical_id in seen:
            continue
        others = [
            a
            for a in book.agents
            if a.canonical_id != holder.canonical_id and a.name not in edge.evidence_span
        ]
        if not others:
            continue
        thief = others[len(out) % len(others)]
        # Rewrite the one passage, not the character. A global rename would
        # replace the holder everywhere — 464 occurrences of "Alice" became
        # "the Queen" on the first version of this — leaving a text about
        # nobody and a question with no coherent answer.
        rewritten = _swap_holder_in(edge.evidence_span, holder, thief)
        if rewritten is None:
            continue
        seen.add(item.canonical_id)
        out.append(
            Perturbation(
                kind="possession",
                description=(
                    f"{edge.evidence_span.strip()!r} rewritten so {thief.name} "
                    f"holds {item.name} instead of {holder.name}"
                ),
                question=(
                    f"In the text provided, who has {item.name}? Quote the clause you relied on."
                ),
                ground_truth=(
                    f"{thief.name}. The published work gives it to {holder.name}; "
                    "naming them is a reversion to memory."
                ),
                original_answer=holder.name,
                span_edits=[(edge.evidence_span, rewritten)],
                chapters_touched=sorted(holder.chapters),
            )
        )
    return out


_PRONOUN_HOLDER = re.compile(r"(?<!\w)(she|he|they|her|his|him|their|them)(?!\w)", re.I)


def _swap_holder_in(span: str, holder: object, thief: object) -> str | None:
    """Put `thief` where `holder` stands inside one evidence span.

    Returns None when the span names the holder only by pronoun and there is
    nothing unambiguous to swap — a perturbation nobody could answer is worse
    than one fewer perturbation.
    """
    holder_name = getattr(holder, "name", "")
    thief_name = getattr(thief, "name", "")
    if not holder_name or not thief_name:
        return None
    if re.search(rf"(?<!\w){re.escape(holder_name)}(?!\w)", span):
        return re.sub(rf"(?<!\w){re.escape(holder_name)}(?!\w)", thief_name, span, count=1)
    bare = re.sub(r"^(the|a|an)\s+", "", holder_name, flags=re.I).strip()
    if bare and re.search(rf"(?<!\w){re.escape(bare)}(?!\w)", span):
        return re.sub(rf"(?<!\w){re.escape(bare)}(?!\w)", thief_name, span, count=1)
    if _PRONOUN_HOLDER.search(span):
        return _PRONOUN_HOLDER.sub(thief_name, span, count=1)
    return None


def invert_outcomes(book: BookUnderTest, count: int = 2) -> list[Perturbation]:
    """Negate a stated outcome by rewriting its evidence span.

    The subtlest of the three: nothing is renamed, only a verb flipped, so the
    text still reads like the book everywhere except the one clause that
    matters.
    """
    flips = (
        (" was ", " was not "),
        (" is ", " is not "),
        (" had ", " had not "),
        (" could ", " could not "),
        (" did ", " did not "),
        (" would ", " would not "),
    )
    out: list[Perturbation] = []
    for edge in book.edges:
        if len(out) >= count:
            break
        span = edge.evidence_span
        if edge.inference_depth != "explicit" or not (12 <= len(span) <= 90):
            continue
        flip = next(((a, b) for a, b in flips if a in span), None)
        if not flip:
            continue
        flipped = span.replace(*flip, 1)
        out.append(
            Perturbation(
                kind="negation",
                description=f"{span!r} negated to {flipped!r}",
                question=(
                    f"According to the text provided, is it the case that: {span.strip()}? "
                    "Answer yes or no and quote the clause you relied on."
                ),
                ground_truth=(
                    f"No. The supplied text reads {flipped.strip()!r}. "
                    "Answering yes reverts to the published wording."
                ),
                original_answer="yes",
                replacements=[(span, flipped)],
                chapters_touched=[],
            )
        )
    return out


GENERATORS = {
    "rename": rename_characters,
    "possession": swap_possessions,
    "negation": invert_outcomes,
}


def build(book: BookUnderTest, *, per_kind: int = 2) -> list[Perturbation]:
    out: list[Perturbation] = []
    for make in GENERATORS.values():
        out.extend(make(book, per_kind))
    return out


def perturbed_text(book: BookUnderTest, plan: list[Perturbation]) -> str:
    text = book.full_text
    for item in plan:
        text = item.apply(text)
    return text


def dry_run(book: BookUnderTest, *, per_kind: int = 2) -> EvalResult:
    """Everything but the model calls: what would be changed, and does it stick."""
    if not book.has_text:
        return EvalResult(
            name="perturbation",
            book_id=book.book_id,
            headline="Cannot run: this export carries no chunk text (copyrighted work).",
            skipped=["the whole test: perturbation needs the source text, which is not exported"],
        )

    plan = build(book, per_kind=per_kind)
    original = book.full_text
    altered = perturbed_text(book, plan)

    findings = []
    ineffective = []
    leaky = []
    for item in plan:
        applied = original.count(item.span_edits[0][0]) if item.span_edits else 0
        applied += sum(
            len(re.findall(rf"(?<!\w){re.escape(old)}(?!\w)", original))
            for old, _ in item.replacements
        )
        residue = item.residue(altered)
        if applied == 0:
            ineffective.append(f"{item.kind}: {item.description} — nothing to replace")
            continue
        if residue:
            leaky.append(
                f"{item.kind}: {residue} occurrence(s) of the original wording survive, "
                "so this probe can be answered from the leftovers instead of by reading"
            )
        findings.append(
            {
                "kind": item.kind,
                "edit": item.description,
                "occurrences_changed": applied,
                "occurrences_left": residue,
                "question": item.question,
            }
        )

    changed = original != altered
    clean = [f for f in findings if f["occurrences_left"] == 0]
    headline = (
        f"{len(findings)} perturbations generated, {len(clean)} of them leaving no trace "
        f"of the original wording ({len(ineffective)} ineffective, {len(leaky)} leaky). "
        f"Source text {'differs' if changed else 'IS UNCHANGED — the test would be vacuous'}. "
        "Answering and scoring need a configured provider."
    )
    return EvalResult(
        name="perturbation",
        book_id=book.book_id,
        headline=headline,
        metrics={
            "perturbations": len(findings),
            "leak_free": len(clean),
            "leaky": len(leaky),
            "ineffective": len(ineffective),
            "source_chars": len(original),
            "altered_chars": len(altered),
            "text_changed": changed,
        },
        findings=findings,
        skipped=[
            "answering and scoring: needs a configured LLM provider. This dry run "
            "shows exactly what would be altered so the edits can be inspected "
            "before spending anything.",
            *(
                [
                    "negation probes: the auxiliary-flip table is English "
                    "(' was ' -> ' was not '), so it generates nothing on a CJK "
                    "source. This book's battery is thinner than an English "
                    "book's and the two are not comparable."
                ]
                if not any(f["kind"] == "negation" for f in findings)
                else []
            ),
            *leaky,
            *ineffective,
        ],
    )


# How much text the open-book arm is shown. The whole novel would be the
# purest test and costs ~45k tokens a question; a window around the edit is
# both affordable and a fairer analogue of what a retrieval system would
# actually put in front of a model.
_WINDOW_CHUNKS = 3


def _window(book: BookUnderTest, item: Perturbation, altered: str) -> str:
    """The altered passage plus a few chunks either side, in reading order."""
    needles = [new for _, new in item.span_edits] + [new for _, new in item.replacements]
    chunks = [c.text for c in book.chunks]
    # Re-cut the altered full text along the original chunk boundaries by
    # length, which is close enough: edits change length by a few characters.
    hit = -1
    for i, chunk in enumerate(chunks):
        probe = item.apply(chunk)
        if any(n in probe for n in needles):
            hit = i
            break
    if hit < 0:
        return altered[:12_000]
    lo = max(0, hit - _WINDOW_CHUNKS // 2)
    hi = min(len(chunks), lo + _WINDOW_CHUNKS)
    return "\n\n".join(item.apply(c) for c in chunks[lo:hi])


async def run(book: BookUnderTest, *, per_kind: int = 2) -> EvalResult:
    """Ask the same question of memory and of the altered text.

    Two arms, and neither is the pipeline: without a database the extraction
    cannot be re-run on the altered source, so what this measures is the
    *ceiling* the pipeline aims at — whether having the text in hand changes
    the answer at all on a book the model knows by heart. If the open-book arm
    also reverts to the published version, evidence-grounding is a genuinely
    hard problem and the pipeline has a real target. If it follows the text
    trivially, the argument for the pipeline has to rest on cost, latency and
    auditability instead, not on accuracy.
    """
    usable, _ = available()
    if not usable or not book.has_text:
        return dry_run(book, per_kind=per_kind)

    plan = [p for p in build(book, per_kind=per_kind) if p.replacements or p.span_edits]
    if not plan:
        return dry_run(book, per_kind=per_kind)
    altered = perturbed_text(book, plan)

    closed = Arm("memory", CLOSED_BOOK_SYSTEM)
    open_book = Arm("altered-text", OPEN_BOOK_SYSTEM)
    judge = Judge()

    closed_answers = await closed.answer_all(
        [f"Work: {book.title} by {book.author}.\n\n{p.question}" for p in plan]
    )
    open_answers = await asyncio.gather(
        *(open_book.answer(p.question, f"Excerpt:\n\n{_window(book, p, altered)}") for p in plan)
    )

    # A dedicated reversion judge, not the answer-scoring one. Feeding an
    # instruction into that judge's "ground truth" slot scored two plainly
    # correct answers as reverted — the same slot-abuse that made the first
    # entailment run report 35.8% when the real figure was 85%.
    def cases(answers: list[Answer]) -> list[tuple[str, str, str]]:
        return [
            (p.description, f"{p.original_answer}", a.text)
            for p, a in zip(plan, answers, strict=True)
        ]

    closed_scores, open_scores = await asyncio.gather(
        judge.reverted_all(cases(closed_answers)),
        judge.reverted_all(cases(open_answers)),
    )

    findings = []
    for item, mem, txt, ms, ts in zip(
        plan, closed_answers, open_answers, closed_scores, open_scores, strict=True
    ):
        findings.append(
            {
                "kind": item.kind,
                "edit": item.description,
                "question": item.question,
                "from_memory": mem.text[:200],
                "memory_followed_source": ms.correct,
                "from_altered_text": txt.text[:200],
                "text_followed_source": ts.correct,
            }
        )

    mem_right = sum(1 for f in findings if f["memory_followed_source"])
    txt_right = sum(1 for f in findings if f["text_followed_source"])
    n = len(findings)
    return EvalResult(
        name="perturbation",
        book_id=book.book_id,
        headline=(
            f"On {n} altered passages: answering from memory follows the altered "
            f"source {mem_right}/{n} times, answering from the altered text does "
            f"{txt_right}/{n}. Gap = {(txt_right - mem_right) / n:+.0%}."
        ),
        metrics={
            "perturbations": n,
            "memory_follows_source": mem_right,
            "text_follows_source": txt_right,
            "reading_advantage": round((txt_right - mem_right) / n, 4),
        },
        findings=findings,
        skipped=[
            "neither arm is the LoreGraph pipeline: re-extracting from the altered "
            "source needs the database, which is not available here. This measures "
            "the ceiling the pipeline aims at, not the pipeline.",
            f"the open-book arm sees a {_WINDOW_CHUNKS}-chunk window around each "
            "edit, not the whole book — cheaper, and closer to what a retrieval "
            "system would actually supply.",
        ],
    )
