"""CLI wiring tests for the export / i18n / factions commands (no DB or LLM)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from typer.testing import CliRunner

from loregraph.cli.main import app

runner = CliRunner()


@pytest.mark.unit
def test_export_i18n_factions_registered() -> None:
    names = {c.name or c.callback.__name__ for c in app.registered_commands}
    assert {"export", "i18n", "factions"} <= names


@pytest.mark.unit
def test_export_command_delegates_to_exporter(tmp_path: object) -> None:
    out = tmp_path / "alice.json"  # type: ignore[operator]
    fake = AsyncMock(return_value={"counts": {"entities": 3, "edges": 2}})
    with patch("loregraph.exporters.book_export.export_book", new=fake):
        result = runner.invoke(
            app,
            ["export", "--book-id", "7", "--frontend-id", "alice", "--out", str(out)],
        )
    assert result.exit_code == 0, result.output
    fake.assert_awaited_once()
    args = fake.await_args.args
    assert args[0] == 7  # book_id
    assert args[1] == "alice"  # frontend_id
    assert args[2] == "public-domain"  # default license
    assert args[3] == out.resolve()  # type: ignore[attr-defined]  # out path resolved


@pytest.mark.unit
def test_factions_only_requires_frontend_id() -> None:
    result = runner.invoke(app, ["factions", "--book-id", "1", "--factions-only"])
    assert result.exit_code != 0
    assert "frontend-id" in result.output.lower()
