"""The model arm of a comparison, and the judge that scores both arms.

Every call goes through `LLMClient`, so token accounting and prompt caching
apply to evaluation runs the same way they apply to extraction — an eval that
bypasses the client is an eval whose cost is invisible.

`available()` is the gate. Without a configured provider the evals that need a
model return a result that says so rather than scoring a subset, and the CLI
prints the exact command to run once a key is set.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from pydantic import BaseModel, Field

from loregraph.config import get_settings
from loregraph.llm.client import LLMClient, LLMUsage, make_llm_client
from loregraph.llm.parser import LLMOutputError, parse_into

log = logging.getLogger(__name__)

_CONCURRENCY = 8

# Every Arm and Judge merges into this, so a run's cost is one number at the
# end rather than something you reconstruct from provider dashboards later.
SPEND = LLMUsage()


def spend_report() -> dict[str, float | int]:
    """Tokens used so far this process, and what they cost.

    Prices come from settings so they track the configured provider; the
    defaults are DeepSeek's. `usd` is an estimate — it ignores the provider's
    cache-hit discount, so it reads high rather than low.
    """
    settings = get_settings()
    usd = (
        SPEND.input_tokens / 1_000_000 * settings.price_per_mtok_input
        + SPEND.output_tokens / 1_000_000 * settings.price_per_mtok_output
    )
    return {
        "requests": SPEND.requests,
        "input_tokens": SPEND.input_tokens,
        "output_tokens": SPEND.output_tokens,
        "usd": round(usd, 4),
        "cny": round(usd * 7.15, 3),
    }


def available() -> tuple[bool, str]:
    """(usable, why-not). Never raises — callers report, they do not crash."""
    try:
        settings = get_settings()
    except Exception as exc:  # malformed .env should read as "not configured"
        return False, f"settings could not be loaded: {exc}"
    provider = settings.llm_provider
    if not settings.resolved_api_key(provider):
        return False, (
            f"no API key for provider {provider!r}. Set LOREGRAPH_LLM_API_KEY "
            "(or the provider's own variable) and re-run."
        )
    return True, ""


class Judgement(BaseModel):
    """One scored answer. `follows_source` is what the perturbation test turns on."""

    correct: bool
    follows_source: bool = True
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    reason: str = ""


@dataclass(slots=True)
class Answer:
    question: str
    text: str
    arm: str


class Arm:
    """One side of a comparison: a prompt style plus the client to run it."""

    def __init__(self, name: str, system: str, llm: LLMClient | None = None) -> None:
        self.name = name
        self.system = system
        self.llm = llm or make_llm_client()
        self.usage = LLMUsage()

    async def answer(self, question: str, context: str = "") -> Answer:
        user = f"{context}\n\n{question}".strip() if context else question
        message = await self.llm.complete(system=self.system, user=user)
        self.usage.merge(message)
        SPEND.merge(message)
        return Answer(question=question, text=self.llm.extract_text(message).strip(), arm=self.name)

    async def answer_all(self, questions: list[str], context: str = "") -> list[Answer]:
        gate = asyncio.Semaphore(_CONCURRENCY)

        async def one(q: str) -> Answer:
            async with gate:
                return await self.answer(q, context)

        return list(await asyncio.gather(*(one(q) for q in questions)))


CLOSED_BOOK_SYSTEM = (
    "You are answering questions about a work of fiction from memory. You have "
    "NOT been given the text. Answer as precisely as you can from what you "
    "know about the work. If you do not know, say so plainly — a wrong "
    "confident answer is worse than an admission."
)

OPEN_BOOK_SYSTEM = (
    "You are answering questions about a work of fiction using ONLY the "
    "excerpt provided. Ignore anything you may know about this work from "
    "elsewhere; the excerpt may differ from the version you remember, and "
    "where it does, the excerpt is authoritative. If the excerpt does not "
    "answer the question, say so."
)

JUDGE_SYSTEM = (
    "You score answers about a work of fiction against a stated ground truth. "
    "Return JSON only: "
    '{"correct": bool, "follows_source": bool, "confidence": 0.0-1.0, "reason": "..."}. '
    "`correct` — does the answer match the ground truth? "
    "`follows_source` — does the answer reflect the source text as given, rather "
    "than a remembered version of the work that differs from it? An answer that "
    "is right about the published book but wrong about the text supplied is "
    "correct=false, follows_source=false. An honest 'the text does not say' when "
    "the text genuinely does not say is correct=true."
)


ENTAILMENT_SYSTEM = (
    "You decide whether a quoted span of a passage supports a claim extracted "
    "from it. Return JSON only: "
    '{"correct": bool, "follows_source": true, "confidence": 0.0-1.0, "reason": "..."}. '
    "`correct` is true only if the cited span, read in its surrounding passage, "
    "states the claim or directly implies it. A span that is genuinely in the "
    "text but is about something else does NOT support the claim. Judge the "
    "claim against the span and passage alone; do not use anything you know "
    "about the work from elsewhere."
)


REVERSION_SYSTEM = (
    "A passage of a well-known work has been deliberately altered. You are "
    "given the alteration, what the published work says, and an answer. Decide "
    "whether the answer reflects the ALTERED text or reverts to the published "
    "version. Return JSON only: "
    '{"correct": bool, "follows_source": bool, "confidence": 0.0-1.0, "reason": "..."}. '
    "Set both true when the answer matches the altered text. Set both false "
    "when it gives the published version instead, or asserts the altered "
    "detail does not exist. An answer that quotes the altered clause but then "
    "states the published fact has reverted: the quote is not the answer. "
    "Ignore style, length and hedging; judge only the substance."
)


class Judge:
    def __init__(self, llm: LLMClient | None = None) -> None:
        self.llm = llm or make_llm_client()
        self.usage = LLMUsage()

    async def score(self, *, question: str, answer: str, ground_truth: str) -> Judgement:
        user = f"Question: {question}\n\nGround truth: {ground_truth}\n\nAnswer to score: {answer}"
        message = await self.llm.complete(system=JUDGE_SYSTEM, user=user)
        self.usage.merge(message)
        SPEND.merge(message)
        try:
            return parse_into(Judgement, self.llm.extract_text(message))
        except LLMOutputError:
            log.warning("judge returned malformed JSON; scoring as incorrect")
            return Judgement(
                correct=False, follows_source=False, confidence=0.0, reason="unparsable judgement"
            )

    async def entails(self, *, claim: str, span: str, passage: str) -> Judgement:
        """Does `span`, read inside `passage`, support `claim`?"""
        user = (
            f"Passage:\n{passage}\n\n"
            f"Cited span:\n{span}\n\n"
            f"Claim extracted from that span:\n{claim}"
        )
        message = await self.llm.complete(system=ENTAILMENT_SYSTEM, user=user)
        self.usage.merge(message)
        SPEND.merge(message)
        try:
            return parse_into(Judgement, self.llm.extract_text(message))
        except LLMOutputError:
            log.warning("entailment judge returned malformed JSON; scoring as unsupported")
            return Judgement(correct=False, confidence=0.0, reason="unparsable judgement")

    async def entails_all(self, items: list[tuple[str, str, str]]) -> list[Judgement]:
        gate = asyncio.Semaphore(_CONCURRENCY)

        async def one(triple: tuple[str, str, str]) -> Judgement:
            claim, span, passage = triple
            async with gate:
                return await self.entails(claim=claim, span=span, passage=passage)

        return list(await asyncio.gather(*(one(t) for t in items)))

    async def reverted(self, *, alteration: str, published: str, answer: str) -> Judgement:
        message = await self.llm.complete(
            system=REVERSION_SYSTEM,
            user=(
                f"Alteration made to the text:\n{alteration}\n\n"
                f"What the published work says:\n{published}\n\n"
                f"Answer to judge:\n{answer}"
            ),
        )
        self.usage.merge(message)
        SPEND.merge(message)
        try:
            return parse_into(Judgement, self.llm.extract_text(message))
        except LLMOutputError:
            log.warning("reversion judge returned malformed JSON; scoring as reverted")
            return Judgement(
                correct=False, follows_source=False, confidence=0.0, reason="unparsable"
            )

    async def reverted_all(self, items: list[tuple[str, str, str]]) -> list[Judgement]:
        gate = asyncio.Semaphore(_CONCURRENCY)

        async def one(triple: tuple[str, str, str]) -> Judgement:
            alteration, published, answer = triple
            async with gate:
                return await self.reverted(
                    alteration=alteration, published=published, answer=answer
                )

        return list(await asyncio.gather(*(one(t) for t in items)))

    async def score_all(self, items: list[tuple[str, str, str]]) -> list[Judgement]:
        gate = asyncio.Semaphore(_CONCURRENCY)

        async def one(triple: tuple[str, str, str]) -> Judgement:
            question, answer, truth = triple
            async with gate:
                return await self.score(question=question, answer=answer, ground_truth=truth)

        return list(await asyncio.gather(*(one(t) for t in items)))
