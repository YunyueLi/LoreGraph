"""Unit tests for the per-book cost-ceiling brake."""

from __future__ import annotations

import pytest

from loregraph.config import Settings
from loregraph.llm.client import LLMUsage
from loregraph.pipeline.context import PipelineContext
from loregraph.pipeline.orchestrator import CostCeilingError, Orchestrator


@pytest.mark.unit
def test_est_cost_usd_input_and_output() -> None:
    u = LLMUsage(input_tokens=1_000_000, output_tokens=1_000_000)
    # DeepSeek V4 Pro defaults: $0.435 in, $0.87 out per 1M tokens.
    assert u.est_cost_usd(0.435, 0.87) == pytest.approx(1.305)


@pytest.mark.unit
def test_est_cost_usd_counts_cache_writes_at_input_price() -> None:
    u = LLMUsage(input_tokens=500_000, cache_creation_input_tokens=500_000)
    assert u.est_cost_usd(1.0, 2.0) == pytest.approx(1.0)


@pytest.mark.unit
def test_est_cost_usd_zero_without_tokens() -> None:
    assert LLMUsage().est_cost_usd(0.435, 0.87) == 0.0


def _ctx(usage: LLMUsage, ceiling: str, monkeypatch: pytest.MonkeyPatch) -> PipelineContext:
    monkeypatch.setenv("LOREGRAPH_COST_CEILING_USD", ceiling)
    return PipelineContext(
        book_id=1,
        session=None,  # type: ignore[arg-type]  # _check_cost_ceiling never touches it
        llm=None,  # type: ignore[arg-type]
        settings=Settings(),  # type: ignore[call-arg]  # pydantic-settings reads env
        usage=usage,
    )


@pytest.mark.unit
def test_orchestrator_aborts_over_ceiling(monkeypatch: pytest.MonkeyPatch) -> None:
    ctx = _ctx(LLMUsage(input_tokens=1_000_000, output_tokens=1_000_000), "0.01", monkeypatch)
    with pytest.raises(CostCeilingError, match="exceeded"):
        Orchestrator(ctx)._check_cost_ceiling()


@pytest.mark.unit
def test_orchestrator_ok_under_ceiling(monkeypatch: pytest.MonkeyPatch) -> None:
    ctx = _ctx(LLMUsage(input_tokens=1_000, output_tokens=1_000), "20", monkeypatch)
    Orchestrator(ctx)._check_cost_ceiling()  # must not raise


@pytest.mark.unit
def test_orchestrator_ceiling_zero_disables(monkeypatch: pytest.MonkeyPatch) -> None:
    ctx = _ctx(LLMUsage(input_tokens=10**9, output_tokens=10**9), "0", monkeypatch)
    Orchestrator(ctx)._check_cost_ceiling()  # 0 disables the brake
