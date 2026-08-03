"""Does the source actually answer what Pass-8 says it leaves unanswered?

Pass-8's `[GAPS]` section lists "significant things the source does not tell
us". A gap the text in fact answers is the worst output the system can
produce: a confident falsehood delivered in the voice of evidence, by the one
component whose selling point is that it only says what it can cite.

Two measures, one structural and one lexical, both offline.

**Blindness.** Pass-8 caps an entity's evidence. Before the cap became a
chapter-stratified spread it was `items[:N]` over rows in book order, so the
most-evidenced entity — the protagonist — was profiled from the opening
chapters and reported the rest as gaps in the *work*. `blind_chapters`
recovers, per entity, which chapters the note never cited despite the entity
appearing in them. It needs no judgement and no model: a note that cites
chapters 1-8 of a 12-chapter arc had no standing to say what the work omits.

**Lexical reach.** For each gap sentence, look for its content words in the
chapters the note did not cite. A hit is not proof the gap is wrong — "her
surname is never given" can co-occur with the word "surname" — so this is
reported as `suspect`, a screen for the judge, never as a verdict.

An optional LLM pass turns suspects into verdicts. Without credentials the
structural number still stands on its own, and the eval says so.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from loregraph.evals.corpus import BookUnderTest, note_sections
from loregraph.evals.report import EvalResult

# Words too common to carry a gap's meaning. Deliberately short — a longer
# list starts encoding what we expect gaps to be about.
_STOP = frozenset(
    [
        "a",
        "an",
        "the",
        "this",
        "that",
        "these",
        "those",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "do",
        "does",
        "did",
        "not",
        "no",
        "never",
        "nor",
        "none",
        "nothing",
        "of",
        "in",
        "on",
        "at",
        "to",
        "for",
        "from",
        "with",
        "without",
        "by",
        "about",
        "as",
        "into",
        "over",
        "under",
        "after",
        "before",
        "during",
        "than",
        "then",
        "so",
        "such",
        "it",
        "its",
        "it's",
        "their",
        "them",
        "they",
        "he",
        "she",
        "his",
        "her",
        "him",
        "we",
        "us",
        "our",
        "you",
        "your",
        "i",
        "me",
        "my",
        "and",
        "or",
        "but",
        "if",
        "while",
        "which",
        "who",
        "whom",
        "whose",
        "what",
        "when",
        "where",
        "why",
        "how",
        "any",
        "some",
        "all",
        "both",
        "each",
        "other",
        "another",
        "more",
        "most",
        "much",
        "many",
        "few",
        "little",
        "less",
        "least",
        "own",
        "same",
        "too",
        "very",
        "can",
        "will",
        "just",
        "should",
        "now",
        "here",
        "there",
        "does",
        "doesn't",
        "don't",
        "isn't",
        "aren't",
        "wasn't",
        "weren't",
        "text",
        "source",
        "given",
        "stated",
        "told",
        "say",
        "says",
        "said",
        "tell",
        "tells",
        "unclear",
        "unknown",
        "unexplained",
        "unspecified",
        "never",
        "explicit",
        "explicitly",
        "detail",
        "details",
        "provide",
        "provided",
        "information",
        "evidence",
    ]
)
_WORD = re.compile(r"[A-Za-z']{3,}|[一-鿿]{2,}")


def _content_words(sentence: str) -> set[str]:
    return {w.lower() for w in _WORD.findall(sentence)} - _STOP


def _stem(word: str) -> str:
    """Enough of a stem that "ends" reaches "ended".

    A literal match misses the commonest case there is — the gap paraphrases
    the source rather than quoting it — so the screen would report a gap as
    genuine because of a suffix. Kept crude on purpose: this feeds a judge,
    and over-flagging costs one judgement while under-flagging hides the
    defect entirely.
    """
    for suffix in ("ing", "ed", "es", "s"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)]
    return word


def _mentions(body: str, word: str) -> bool:
    return re.search(rf"(?<![a-z]){re.escape(_stem(word))}", body) is not None


def _cited_chapters(note_md: str) -> set[int]:
    return {int(m.group(1)) for m in re.finditer(r"\bch(\d+)(?:_p\d+)?\b", note_md or "", re.I)}


@dataclass(slots=True)
class GapFinding:
    entity: str
    gap: str
    blind_chapters: list[int]
    matched_words: list[str]
    matched_chapter: int | None

    @property
    def suspect(self) -> bool:
        return self.matched_chapter is not None


def run(book: BookUnderTest, *, min_overlap: int = 2) -> EvalResult:
    if not book.has_text:
        return EvalResult(
            name="gaps",
            book_id=book.book_id,
            headline="Cannot run: this export carries no chunk text (copyrighted work).",
            skipped=["every gap: the source text is not in the export, so nothing can be checked"],
        )

    chapter_text: dict[int, list[str]] = {}
    for chunk in book.chunks:
        chapter_text.setdefault(chunk.chapter, []).append(chunk.text.lower())
    chapters = {k: " ".join(v) for k, v in chapter_text.items()}

    findings: list[GapFinding] = []
    profiled = 0
    total_blind = 0
    entities_with_blind_spots = 0

    for entity in book.entities:
        sections = note_sections(entity.note_md)
        gaps = [g for g in sections.get("GAPS", []) if g and not g.startswith("(")]
        if not gaps:
            continue
        profiled += 1
        cited = _cited_chapters(entity.note_md)
        appears = set(entity.chapters)
        blind = sorted(appears - cited)
        total_blind += len(blind)
        if blind:
            entities_with_blind_spots += 1

        for gap in gaps:
            words = _content_words(gap)
            hit_chapter, hit_words = None, []
            for chapter in blind:
                body = chapters.get(chapter, "")
                found = sorted(w for w in words if _mentions(body, w))
                if len(found) >= min_overlap:
                    hit_chapter, hit_words = chapter, found
                    break
            findings.append(GapFinding(entity.name, gap, blind, hit_words, hit_chapter))

    suspects = [f for f in findings if f.suspect]
    rate = len(suspects) / len(findings) if findings else 0.0
    blind_share = entities_with_blind_spots / profiled if profiled else 0.0

    headline = (
        f"{len(findings)} gaps claimed across {profiled} profiled entities. "
        f"{entities_with_blind_spots} of those entities ({blind_share:.0%}) were "
        f"profiled without citing every chapter they appear in; {len(suspects)} gaps "
        f"({rate:.0%}) name terms that do occur in a chapter the note never read."
    )
    return EvalResult(
        name="gaps",
        book_id=book.book_id,
        headline=headline,
        metrics={
            "entities_profiled": profiled,
            "gaps_claimed": len(findings),
            "entities_with_blind_chapters": entities_with_blind_spots,
            "blind_entity_rate": round(blind_share, 4),
            "blind_chapter_total": total_blind,
            "suspect_gaps": len(suspects),
            "suspect_rate": round(rate, 4),
        },
        findings=[
            {
                "entity": f.entity,
                "gap": f.gap,
                "found_in_chapter": f.matched_chapter,
                "matched_terms": ", ".join(f.matched_words[:6]),
                "chapters_never_read": ", ".join(str(c) for c in f.blind_chapters),
            }
            for f in sorted(suspects, key=lambda f: -len(f.matched_words))
        ],
        skipped=[
            "suspect gaps are a lexical screen, not a verdict — a term can appear "
            "in a chapter without the chapter answering the gap. Confirming them "
            "needs the LLM judge (`--judge`, requires a configured provider).",
            f"{len(findings) - len(suspects)} gaps had no lexical hit; that is weak "
            "evidence they are genuine, not proof.",
        ],
    )
