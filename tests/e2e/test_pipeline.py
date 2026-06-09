"""End-to-end pipeline test on a small public-domain text.

Gated behind LOREGRAPH_E2E_LIVE=1 — it makes real LLM calls (costs money) and
needs a real Postgres (DATABASE_URL) migrated to HEAD. Run manually:

    LOREGRAPH_E2E_LIVE=1 uv run --extra dev python -m pytest -m e2e
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from loregraph.models.enums import PassStatus

pytestmark = [
    pytest.mark.e2e,
    pytest.mark.skipif(
        os.environ.get("LOREGRAPH_E2E_LIVE") != "1",
        reason="set LOREGRAPH_E2E_LIVE=1 to run the live end-to-end pipeline",
    ),
]

_BOOK = Path(__file__).resolve().parents[2] / "examples" / "yellow_wallpaper" / "input.txt"


async def test_full_pipeline_yellow_wallpaper() -> None:
    from loregraph.cli._runner import run_extract, run_ingest, run_status

    assert _BOOK.exists(), f"missing public-domain demo text: {_BOOK}"

    book_id = await run_ingest(
        path=_BOOK,
        title="The Yellow Wallpaper",
        author="Charlotte Perkins Gilman",
        language="en",
    )
    # Reaching the end means Pass-7's ≥95% literal-match gate did not abort.
    await run_extract(book_id=book_id, from_pass=1, to_pass=8)

    runs = await run_status(book_id=book_id)
    done = {r.pass_num for r in runs if r.status == PassStatus.DONE}
    assert done >= set(range(1, 9)), f"not all passes completed: {sorted(done)}"

    by_pass = {r.pass_num: r for r in runs}
    assert by_pass[1].stats.get("chunks", 0) > 0
    assert by_pass[2].stats.get("mentions", 0) > 0
    assert by_pass[7].stats.get("literal_match_rate", 0.0) >= 0.95
