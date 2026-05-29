"""Pass-2: LLM-driven entity extraction (Agent / Object / Event / Concept).

For each chunk, the LLM emits a list of mentions with a literal
evidence_span. We post-process to:
  1. discard mentions whose evidence_span is not a literal substring of
     the chunk text (Pass-7 would catch them anyway; we're stricter
     here to keep the DB clean);
  2. compute (char_start, char_end) of the surface_form within the
     chunk so downstream Pass-3/4 can pull the actual sub-string.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel

from loregraph.llm.client import LLMClient, LLMUsage
from loregraph.llm.gleaning import GleaningConfig, glean
from loregraph.llm.parser import LLMOutputError, parse_into
from loregraph.models.atoms import Chunk
from loregraph.models.entities import MentionCreate
from loregraph.models.enums import EntityType
from loregraph.utils.spans import find_literal_span

log = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "llm" / "prompts"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_PROMPTS_DIR)),
    autoescape=select_autoescape(default=False),
    keep_trailing_newline=True,
)


class _ExtractedEntity(BaseModel):
    surface_form: str
    type: EntityType
    evidence_span: str


class _Pass2Response(BaseModel):
    entities: list[_ExtractedEntity]


class Pass2EntityExtractor:
    """Extract typed mentions from a single chunk; orchestrator drives N chunks."""

    SYSTEM_TEMPLATE = "pass2_entity_system.j2"
    USER_TEMPLATE = "pass2_entity_user.j2"

    def __init__(
        self,
        llm: LLMClient,
        gleaning_config: GleaningConfig | None = None,
    ) -> None:
        self.llm = llm
        self.gleaning_config = gleaning_config or GleaningConfig()
        self.usage = LLMUsage()
        self._system_prompt = _jinja_env.get_template(self.SYSTEM_TEMPLATE).render()
        self._user_template = _jinja_env.get_template(self.USER_TEMPLATE)

    async def extract_chunk(self, chunk: Chunk) -> list[MentionCreate]:
        async def _call_with_context(found: list[_ExtractedEntity]) -> list[_ExtractedEntity]:
            user_prompt = self._user_template.render(
                chunk_text=chunk.text,
                already_extracted=found,
            )
            # Dense chunks (esp. CJK) can emit many entities; give the JSON room
            # so it isn't truncated mid-array into invalid JSON.
            msg = await self.llm.complete(
                system=self._system_prompt, user=user_prompt, max_tokens=8192
            )
            self.usage.merge(msg)
            text = self.llm.extract_text(msg)
            try:
                return parse_into(_Pass2Response, text).entities
            except LLMOutputError:
                # One malformed/truncated chunk must not kill the pass — skip it.
                log.warning("Pass-2: malformed JSON for chunk %s — skipping", chunk.atom_id)
                return []

        async def initial() -> list[_ExtractedEntity]:
            return await _call_with_context([])

        async def retry(found: list[Any]) -> list[_ExtractedEntity]:
            return await _call_with_context(list(found))

        def dedupe_key(item: object) -> tuple[str, str]:
            assert isinstance(item, _ExtractedEntity)
            return (item.type.value, item.surface_form.strip().lower())

        extracted = await glean(
            initial=initial,
            retry=retry,
            dedupe_key=dedupe_key,
            config=self.gleaning_config,
        )

        mentions: list[MentionCreate] = []
        for ent in extracted:
            span_match = find_literal_span(chunk.text, ent.evidence_span)
            if span_match is None:
                log.warning(
                    "drop non-literal evidence_span: chunk=%s surface=%r span=%r",
                    chunk.atom_id,
                    ent.surface_form,
                    ent.evidence_span[:60],
                )
                continue

            # Find surface_form within the evidence span; fall back to span coords.
            local_offset = chunk.text.find(ent.surface_form, span_match.start, span_match.end)
            if local_offset < 0:
                local_offset = chunk.text.find(ent.surface_form)
            if local_offset < 0:
                char_start, char_end = span_match.start, span_match.end
            else:
                char_start = local_offset
                char_end = local_offset + len(ent.surface_form)

            mentions.append(
                MentionCreate(
                    book_id=chunk.book_id,
                    chunk_id=chunk.id,
                    surface_form=ent.surface_form,
                    type=ent.type,
                    char_start=char_start,
                    char_end=char_end,
                    evidence_span=ent.evidence_span,
                )
            )
        return mentions
