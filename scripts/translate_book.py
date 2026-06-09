"""Thin shim — the logic lives in `loregraph.exporters.translate`.

    uv run python scripts/translate_book.py --frontend-id alice
    (equivalent: `uv run loregraph i18n --frontend-id alice`)

Run from the repo root — it reads/writes `data/exports/`.
"""

from __future__ import annotations

import argparse
import asyncio

from loregraph.exporters.translate import run


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--frontend-id", required=True)
    a = ap.parse_args()
    asyncio.run(run(a.frontend_id))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
