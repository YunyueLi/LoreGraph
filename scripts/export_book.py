"""Thin shim — the logic lives in `loregraph.exporters.book_export`.

    uv run python scripts/export_book.py --book-id 2 --frontend-id alice \
        --license public-domain --out data/exports/alice.json

Equivalent: `uv run loregraph export --book-id 2 --frontend-id alice --out ...`.
"""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

from loregraph.exporters.book_export import export_book

ROOT = Path(__file__).resolve().parent.parent


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--book-id", type=int, required=True)
    ap.add_argument("--frontend-id", required=True)
    ap.add_argument("--license", default="public-domain")
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-entities", type=int, default=0, help="cap to top-N by degree (0 = all)")
    args = ap.parse_args(argv)
    meta = asyncio.run(
        export_book(
            args.book_id, args.frontend_id, args.license, ROOT / args.out, args.max_entities
        )
    )
    print(f"exported {args.frontend_id}: {json.dumps(meta['counts'])} -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
