"""Loading a book export as the thing under test.

Evaluations read the shipped export rather than the database, so they run on
exactly the artefact the product serves — including its caps and omissions. An
eval that scores the database and a product that serves the export are grading
two different systems.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from functools import cached_property
from pathlib import Path
from typing import Any

_DEFAULT_EXPORTS = Path(__file__).resolve().parents[3] / "data" / "exports"


@dataclass(slots=True)
class Chunk:
    atom_id: str
    chapter: int
    text: str


@dataclass(slots=True)
class Entity:
    canonical_id: str
    name: str
    type: str
    aliases: list[str]
    mention_count: int
    chapters: list[int]
    note_md: str
    tier: str | None


@dataclass(slots=True)
class Edge:
    src: str
    dst: str
    relation: str
    predicate: str | None
    predicate_class: str | None
    evidence_span: str
    confidence: float
    inference_depth: str
    atom_id: str


@dataclass(slots=True)
class Fact:
    entity: str
    dimension: str
    time_aspect: str
    statement: str
    evidence_span: str
    confidence: float
    inference_depth: str
    atom_id: str


@dataclass
class BookUnderTest:
    book_id: str
    title: str
    author: str
    language: str
    metadata: dict[str, Any]
    chunks: list[Chunk]
    entities: list[Entity]
    edges: list[Edge]
    facts: list[Fact]
    _by_id: dict[str, Entity] = field(default_factory=dict, repr=False)

    def __post_init__(self) -> None:
        self._by_id = {e.canonical_id: e for e in self.entities}

    def entity(self, canonical_id: str) -> Entity | None:
        return self._by_id.get(canonical_id)

    def name(self, canonical_id: str) -> str:
        found = self._by_id.get(canonical_id)
        return found.name if found else canonical_id

    @cached_property
    def full_text(self) -> str:
        return "\n".join(c.text for c in self.chunks)

    @cached_property
    def has_text(self) -> bool:
        """False for copyrighted works, whose chunk bodies are not exported."""
        return any(c.text for c in self.chunks)

    @cached_property
    def chunk_text(self) -> dict[str, str]:
        return {c.atom_id: c.text for c in self.chunks}

    @cached_property
    def agents(self) -> list[Entity]:
        """Characters, most-mentioned first — who a reader asks about."""
        return sorted(
            (e for e in self.entities if e.type == "Agent"),
            key=lambda e: -e.mention_count,
        )

    def degree(self) -> dict[str, int]:
        out: dict[str, int] = {}
        for edge in self.edges:
            out[edge.src] = out.get(edge.src, 0) + 1
            out[edge.dst] = out.get(edge.dst, 0) + 1
        return out


def _int_list(raw: object) -> list[int]:
    if not isinstance(raw, list):
        return []
    return [
        int(x) for x in raw if isinstance(x, int | float | str) and str(x).lstrip("-").isdigit()
    ]


def load_book(book_id: str, exports_dir: Path | None = None) -> BookUnderTest:
    path = (exports_dir or _DEFAULT_EXPORTS) / f"{book_id}.json"
    if not path.exists():
        raise FileNotFoundError(
            f"no export for {book_id!r} at {path}. "
            f"Available: {', '.join(available_books(exports_dir)) or '(none)'}"
        )
    payload = json.loads(path.read_text(encoding="utf-8"))
    meta = payload.get("metadata", {})
    return BookUnderTest(
        book_id=meta.get("frontend_id", book_id),
        title=meta.get("title", book_id),
        author=meta.get("author", ""),
        language=meta.get("language", "en"),
        metadata=meta,
        chunks=[
            Chunk(
                atom_id=c.get("atom_id", ""),
                chapter=int(c.get("chapter") or 0),
                text=c.get("text", ""),
            )
            for c in payload.get("chunks", [])
        ],
        entities=[
            Entity(
                canonical_id=e.get("canonical_id", ""),
                name=e.get("canonical_name", ""),
                type=e.get("type", ""),
                aliases=[a for a in (e.get("aliases") or []) if isinstance(a, str)],
                mention_count=int(e.get("mention_count") or 0),
                chapters=_int_list(e.get("chapters")),
                note_md=e.get("note_md") or "",
                tier=e.get("tier"),
            )
            for e in payload.get("entities", [])
        ],
        edges=[
            Edge(
                src=e.get("src", ""),
                dst=e.get("dst", ""),
                relation=e.get("relation", ""),
                predicate=e.get("predicate"),
                predicate_class=e.get("predicate_class"),
                evidence_span=e.get("evidence_span", ""),
                confidence=float(e.get("confidence") or 0.0),
                inference_depth=e.get("inference_depth", ""),
                atom_id=e.get("atom_id", ""),
            )
            for e in payload.get("edges", [])
        ],
        facts=[
            Fact(
                entity=g.get("entity", ""),
                dimension=g.get("dimension", ""),
                time_aspect=g.get("time_aspect", ""),
                statement=g.get("statement", ""),
                evidence_span=g.get("evidence_span", ""),
                confidence=float(g.get("confidence") or 0.0),
                inference_depth=g.get("inference_depth", ""),
                atom_id=g.get("atom_id", ""),
            )
            for g in payload.get("glucose", [])
        ],
    )


def available_books(exports_dir: Path | None = None) -> list[str]:
    directory = exports_dir or _DEFAULT_EXPORTS
    if not directory.exists():
        return []
    # `alice.i18n.json` / `xyj.factions.json` are sidecars, not books.
    return sorted(p.stem for p in directory.glob("*.json") if "." not in p.stem)


_SECTION_RE = re.compile(r"^\[([A-Z_]+)\]\s*$", re.M)


def note_sections(note_md: str) -> dict[str, list[str]]:
    """Split a Pass-8 hybrid note into its bracketed sections.

    Bullets come back stripped of their leading dash; prose sections come back
    as a single-item list.
    """
    out: dict[str, list[str]] = {}
    marks = list(_SECTION_RE.finditer(note_md or ""))
    for i, mark in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(note_md)
        body = note_md[mark.end() : end].strip()
        lines = [
            line.strip().lstrip("-").strip()
            for line in body.splitlines()
            if line.strip() and line.strip() != "-"
        ]
        out[mark.group(1)] = lines
    return out
