"""Smoke tests verifying the package is importable and the CLI registers."""

from __future__ import annotations

import pytest


@pytest.mark.unit
def test_package_imports() -> None:
    import loregraph

    assert loregraph.__version__.startswith("0.")


@pytest.mark.unit
def test_cli_app_exists() -> None:
    from loregraph.cli.main import app

    # Typer apps expose registered commands via .registered_commands
    cmd_names = {c.name or c.callback.__name__ for c in app.registered_commands}
    assert {"init", "ingest", "extract", "view", "status"} <= cmd_names
