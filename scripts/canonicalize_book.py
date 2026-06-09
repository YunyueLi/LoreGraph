"""Thin shim — the logic lives in `loregraph.exporters.canonicalize_cli`.

    uv run python scripts/canonicalize_book.py --book-id 3 --dry-run --limit 30
    uv run python scripts/canonicalize_book.py --book-id 3
    uv run python scripts/canonicalize_book.py --book-id 3 --factions-only --frontend-id xyj
    (equivalent: `uv run loregraph factions --book-id 3 ...`)

Run from the repo root — it reads/writes `data/exports/`.
"""

from __future__ import annotations

import argparse
import asyncio

from loregraph.exporters.canonicalize_cli import run, run_factions


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--book-id", type=int, required=True)
    ap.add_argument("--limit", type=int, default=0, help="only the top-N by degree (0 = all)")
    ap.add_argument("--dry-run", action="store_true", help="print results, write nothing")
    ap.add_argument(
        "--factions-only",
        action="store_true",
        help="skip per-entity work; just translate existing DB factions → <id>.factions.json",
    )
    ap.add_argument(
        "--frontend-id", help="output id for the factions sidecar (required with --factions-only)"
    )
    a = ap.parse_args()
    if a.factions_only:
        if not a.frontend_id:
            raise SystemExit("--factions-only requires --frontend-id")
        asyncio.run(run_factions(a.book_id, a.frontend_id))
    else:
        asyncio.run(run(a.book_id, a.limit, a.dry_run))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
