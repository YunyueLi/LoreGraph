"""Pass-6: GLUCOSE implicit-information extraction.

For each chunk, ask the LLM to surface facts the text *implies* but does
not state outright — emotion, motivation-style cause, before/after state
along 5 dimensions x 2 time aspects (= the 10-dim GLUCOSE schema).

Post-validation drops:
* facts whose entity_canonical_id isn't in the chunk's entity list;
* facts whose evidence_span isn't a literal substring of the chunk text.

inference_depth ∈ {explicit, one_step, multi_step} flows downstream so
Pass-7 can apply a stricter literal-match policy to deeper inferences.
"""

from __future__ import annotations

import logging
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, Field

from loregraph.llm.client import LLMClient, LLMUsage
from loregraph.llm.parser import LLMOutputError, parse_into
from loregraph.models.atoms import Chunk
from loregraph.models.entities import Entity
from loregraph.models.enums import GlucoseDim, GlucoseTime, InferenceDepth
from loregraph.models.glucose import GlucoseFactCreate
from loregraph.utils.spans import is_literal_match

log = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "llm" / "prompts"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_PROMPTS_DIR)),
    autoescape=select_autoescape(default=False),
    keep_trailing_newline=True,
)


class _ExtractedFact(BaseModel):
    entity_canonical_id: str
    dimension: GlucoseDim
    time_aspect: GlucoseTime
    statement: str
    evidence_span: str
    inference_depth: InferenceDepth
    confidence: float = Field(ge=0.0, le=1.0)


class _Pass6Response(BaseModel):
    facts: list[_ExtractedFact]


class Pass6GlucoseExtractor:
    """LLM-driven GLUCOSE implicit-info extractor."""

    SYSTEM_TEMPLATE = "pass6_glucose_system.j2"
    USER_TEMPLATE = "pass6_glucose_user.j2"

    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm
        self.usage = LLMUsage()
        self._system_prompt = _jinja_env.get_template(self.SYSTEM_TEMPLATE).render()
        self._user_template = _jinja_env.get_template(self.USER_TEMPLATE)

    async def extract_chunk(
        self,
        chunk: Chunk,
        chunk_entities: list[Entity],
    ) -> list[GlucoseFactCreate]:
        if not chunk_entities:
            return []

        user_prompt = self._user_template.render(
            chunk_text=chunk.text,
            entities=chunk_entities,
        )
        msg = await self.llm.complete(system=self._system_prompt, user=user_prompt)
        self.usage.merge(msg)
        text = self.llm.extract_text(msg)

        try:
            response = parse_into(_Pass6Response, text)
        except LLMOutputError:
            log.warning("Pass-6: malformed JSON for chunk %s", chunk.atom_id)
            return []

        canonical_to_id = {e.canonical_id: e.id for e in chunk_entities}

        facts: list[GlucoseFactCreate] = []
        for raw in response.facts:
            entity_id = canonical_to_id.get(raw.entity_canonical_id)
            if entity_id is None:
                log.warning(
                    "Pass-6 drop unknown entity: chunk=%s canonical=%s",
                    chunk.atom_id,
                    raw.entity_canonical_id,
                )
                continue
            if not is_literal_match(chunk.text, raw.evidence_span):
                log.warning(
                    "Pass-6 drop non-literal evidence_span: chunk=%s span=%r",
                    chunk.atom_id,
                    raw.evidence_span[:60],
                )
                continue

            facts.append(
                GlucoseFactCreate(
                    book_id=chunk.book_id,
                    entity_id=entity_id,
                    chunk_id=chunk.id,
                    dimension=raw.dimension,
                    time_aspect=raw.time_aspect,
                    statement=raw.statement,
                    evidence_span=raw.evidence_span,
                    inference_depth=raw.inference_depth,
                    confidence=raw.confidence,
                )
            )
        return facts
