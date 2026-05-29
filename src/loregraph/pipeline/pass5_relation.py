"""Pass-5: typed relation + event-participation extraction.

For each chunk we look at the entities that appeared inside it (via the
`mentions.entity_id` links Pass-4 created) and ask the LLM which typed
relations among those entities are supported by the chunk's text.

Hard post-validation:
1. Both endpoints must be in the chunk's entity list (otherwise the
   relation involves an unknown / hallucinated entity).
2. `evidence_span` must be a literal substring of the chunk text.
3. `confidence` must be in [0, 1] (Pydantic enforces).
"""

from __future__ import annotations

import logging
import re
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, Field

from loregraph.llm.client import LLMClient, LLMUsage
from loregraph.llm.parser import LLMOutputError, parse_into
from loregraph.models.atoms import Chunk
from loregraph.models.edges import EdgeCreate
from loregraph.models.entities import Entity
from loregraph.models.enums import InferenceDepth, RelationType
from loregraph.utils.spans import is_literal_match

log = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "llm" / "prompts"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_PROMPTS_DIR)),
    autoescape=select_autoescape(default=False),
    keep_trailing_newline=True,
)


_VALID_SENTIMENTS = {"positive", "neutral", "negative"}


class _ExtractedEdge(BaseModel):
    src_canonical_id: str
    dst_canonical_id: str
    relation: RelationType
    evidence_span: str
    confidence: float = Field(ge=0.0, le=1.0)
    inference_depth: InferenceDepth = InferenceDepth.EXPLICIT
    # v1.1 enrichment — all optional, stored in edges.attributes JSONB.
    predicate: str | None = None        # specific verb, e.g. PROPOSES_TO / INHERITS_FROM
    weight: float | None = Field(default=None, ge=0.0, le=1.0)
    sentiment: str | None = None        # positive / neutral / negative


class _Pass5Response(BaseModel):
    edges: list[_ExtractedEdge]


class Pass5RelationExtractor:
    """Extract 5-class relations between known entities in a chunk."""

    SYSTEM_TEMPLATE = "pass5_relation_system.j2"
    USER_TEMPLATE = "pass5_relation_user.j2"

    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm
        self.usage = LLMUsage()
        self._system_prompt = _jinja_env.get_template(self.SYSTEM_TEMPLATE).render()
        self._user_template = _jinja_env.get_template(self.USER_TEMPLATE)

    async def extract_chunk(
        self,
        chunk: Chunk,
        chunk_entities: list[Entity],
    ) -> list[EdgeCreate]:
        """Return typed edges for entities present in this chunk."""
        if len(chunk_entities) < 2:
            # Need at least 2 entities for any binary relation.
            return []

        user_prompt = self._user_template.render(
            chunk_text=chunk.text,
            entities=chunk_entities,
        )
        # Entity-dense chunks yield many edges; give the JSON room so it isn't
        # truncated mid-array into invalid JSON (was zeroing out edges).
        msg = await self.llm.complete(
            system=self._system_prompt, user=user_prompt, max_tokens=8192
        )
        self.usage.merge(msg)
        text = self.llm.extract_text(msg)

        try:
            response = parse_into(_Pass5Response, text)
        except LLMOutputError:
            log.warning("Pass-5: malformed JSON for chunk %s", chunk.atom_id)
            return []

        canonical_to_id = {e.canonical_id: e.id for e in chunk_entities}

        edges: list[EdgeCreate] = []
        for raw in response.edges:
            src_id = canonical_to_id.get(raw.src_canonical_id)
            dst_id = canonical_to_id.get(raw.dst_canonical_id)
            if src_id is None or dst_id is None:
                log.warning(
                    "Pass-5 drop unknown endpoint: chunk=%s src=%s dst=%s",
                    chunk.atom_id,
                    raw.src_canonical_id,
                    raw.dst_canonical_id,
                )
                continue
            if src_id == dst_id:
                # Self-loops aren't a useful relation type in v0.1.
                continue
            if not is_literal_match(chunk.text, raw.evidence_span):
                log.warning(
                    "Pass-5 drop non-literal evidence_span: chunk=%s span=%r",
                    chunk.atom_id,
                    raw.evidence_span[:60],
                )
                continue

            attrs: dict[str, object] = {}
            if raw.predicate:
                # normalise to UPPER_SNAKE so downstream queries are clean
                attrs["predicate"] = re.sub(r"[\s\-]+", "_", raw.predicate.strip()).upper()
            if raw.weight is not None:
                attrs["weight"] = raw.weight
            if raw.sentiment and raw.sentiment.lower() in _VALID_SENTIMENTS:
                attrs["sentiment"] = raw.sentiment.lower()

            edges.append(
                EdgeCreate(
                    book_id=chunk.book_id,
                    src_entity_id=src_id,
                    dst_entity_id=dst_id,
                    relation=raw.relation,
                    chunk_id=chunk.id,
                    evidence_span=raw.evidence_span,
                    confidence=raw.confidence,
                    inference_depth=raw.inference_depth,
                    attributes=attrs,
                )
            )
        return edges
