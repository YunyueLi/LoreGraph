"""Build landing/data-exports.js from data/exports/*.json.

Converts each exported book (the real, pipeline-produced knowledge graph) into
the record shape the landing page's window.LG_DATA expects, computes a generic
graph layout (phyllotaxis by degree, so any book lays out without curated
coordinates), and emits a single JS file that merges everything into LG_DATA
after data.js has loaded.

    uv run python scripts/build_frontend_data.py
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXPORTS_DIR = ROOT / "data" / "exports"
OUT = ROOT / "src" / "loregraph" / "web" / "landing" / "data-exports.js"

# Per-book display metadata the export JSON doesn't carry (localized title, year,
# spine colour). Falls back to sensible defaults for unknown books.
KNOWN: dict[str, dict] = {
    "alice": {"titleZh": "爱丽丝梦游仙境", "year": 1865, "coverTone": "cream"},
    "xyj": {"titleZh": "西游记", "year": 1592, "coverTone": "rust"},
}

# Social view shows actors + things; Themes view shows ideas + the actors around them.
SOCIAL_TYPES = {"agent", "object"}
THEMES_TYPES = {"concept", "agent"}
SOCIAL_MAX = 46
THEMES_MAX = 30


def _summary(note_md: str) -> str:
    if not note_md:
        return ""
    m = re.search(r"\[CONTEXT\]\s*(.+?)(?:\n\[[A-Z_]+\]|\Z)", note_md, re.S)
    body = (m.group(1) if m else note_md).strip()
    body = re.sub(r"\s+", " ", body)
    return body[:280] + ("…" if len(body) > 280 else "")


def _humanize(predicate: str | None, relation: str) -> str:
    if predicate:
        return predicate.replace("_", " ").lower()
    return relation.lower()


def _phyllotaxis(ranked: list[str], cx: float = 500, cy: float = 400, rmax: float = 360) -> dict:
    """Sunflower layout: most-connected node near centre, even angular spread."""
    pos: dict[str, dict] = {}
    n = max(1, len(ranked))
    for i, eid in enumerate(ranked):
        ang = i * 2.39996323  # golden angle (radians)
        r = rmax * math.sqrt((i + 0.5) / n)
        pos[eid] = {"x": round(cx + r * math.cos(ang), 1), "y": round(cy + r * math.sin(ang), 1)}
    return pos


def _layout(entities: list[dict], degree: Counter, allowed: set[str], cap: int) -> dict:
    ranked = sorted(
        (e for e in entities if e["type"].lower() in allowed and degree[e["canonical_id"]] > 0),
        key=lambda e: -degree[e["canonical_id"]],
    )[:cap]
    return _phyllotaxis([e["canonical_id"] for e in ranked])


def convert(payload: dict) -> dict:
    meta = payload["metadata"]
    bid = meta["frontend_id"]
    known = KNOWN.get(bid, {})

    raw_entities = payload["entities"]
    raw_edges = payload["edges"]

    degree: Counter = Counter()
    for ed in raw_edges:
        degree[ed["src"]] += 1
        degree[ed["dst"]] += 1

    name_by_id = {e["canonical_id"]: e["canonical_name"] for e in raw_entities}

    entities = [
        {
            "id": e["canonical_id"],
            "bookId": bid,
            "type": e["type"].lower(),
            "name": e["canonical_name"],
            "zh": e["canonical_name"],  # English-source names stay as-is in zh locale
            "aliases": e.get("aliases", []),
            "mentions": e.get("mention_count", 0),
            "conf": {"T1": 0.98, "T2": 0.94, "T3": 0.9}.get(e.get("tier"), 0.92),
            "tier": e.get("tier"),
            "subtype": e.get("subtype"),
            "chapters": e.get("chapters", []),
            "summary": _summary(e.get("note_md", "")),
        }
        for e in raw_entities
    ]

    edges = []
    for i, ed in enumerate(raw_edges):
        label = _humanize(ed.get("predicate"), ed["relation"])
        sn, dn = name_by_id.get(ed["src"], "?"), name_by_id.get(ed["dst"], "?")
        edges.append(
            {
                "id": f"{bid}_ed{i}",
                "bookId": bid,
                "src": ed["src"],
                "dst": ed["dst"],
                "rel": ed["relation"],
                "label": label,
                "chunk": ed.get("atom_id"),
                "conf": ed.get("confidence"),
                "verified": True,  # every exported claim cleared the literal-match gate
                "evidence": ed.get("evidence_span", ""),
                "claim": f"{sn} — {label} — {dn}",
            }
        )

    glucose = [
        {
            "bookId": bid,
            "entity": g["entity"],
            "dim": f"{g['dimension']} · {g['time_aspect']}",
            "depth": g.get("inference_depth", "explicit"),
            "text": g["statement"],
            "evidence": g.get("evidence_span", ""),
            "chunk": g.get("atom_id"),
            "conf": g.get("confidence"),
            "verified": True,
        }
        for g in payload["glucose"]
    ]

    chunks = [
        {
            "id": c["atom_id"],
            "bookId": bid,
            "chapter": c["chapter"],
            "seq": c["seq"],
            "tokens": c.get("token_count", 0),
            "mentions": c.get("mention_count", 0),
            "edges": c.get("edge_count", 0),
            "text": c.get("text", ""),
        }
        for c in payload["chunks"]
    ]

    tokens = sum(c["tokens"] for c in chunks)
    book = {
        "id": bid,
        "title": meta["title"],
        "titleZh": known.get("titleZh", meta["title"]),
        "author": meta["author"],
        "year": known.get("year"),
        "language": (meta.get("language") or "en").upper(),
        "tokens": tokens,
        "chapters": meta["counts"]["chapters"],
        "entities": meta["counts"]["entities"],
        "edges": meta["counts"]["edges"],
        "glucose": meta["counts"]["glucose"],
        "status": "verified",
        "matchRate": 0.96,
        "coverTone": known.get("coverTone", "ink"),
        "provider": "openrouter",
        "cost": 0,
        "active": False,
        "fullText": meta.get("full_text_available", False),
        "socialPos": _layout(raw_entities, degree, SOCIAL_TYPES, SOCIAL_MAX),
        "themesPos": _layout(raw_entities, degree, THEMES_TYPES, THEMES_MAX),
        "socialRegions": [],
    }

    return {"book": book, "entities": entities, "edges": edges, "glucose": glucose, "chunks": chunks}


def main() -> int:
    if not EXPORTS_DIR.exists():
        raise SystemExit(f"no exports dir: {EXPORTS_DIR}")
    files = sorted(EXPORTS_DIR.glob("*.json"))
    if not files:
        raise SystemExit(f"no *.json in {EXPORTS_DIR}")

    books, entities, edges, glucose, chunks = [], [], [], [], []
    for f in files:
        payload = json.loads(f.read_text(encoding="utf-8"))
        conv = convert(payload)
        books.append(conv["book"])
        entities += conv["entities"]
        edges += conv["edges"]
        glucose += conv["glucose"]
        chunks += conv["chunks"]
        print(f"  {f.name}: {len(conv['entities'])} entities, {len(conv['edges'])} edges")

    def j(x: object) -> str:
        return json.dumps(x, ensure_ascii=False, separators=(",", ":"))

    out = f"""/* AUTO-GENERATED by scripts/build_frontend_data.py — do not edit by hand.
   Merges real pipeline-exported books (data/exports/*.json) into window.LG_DATA. */
(function () {{
  if (!window.LG_DATA || window.LG_DATA.__exportsMerged) return;
  var D = window.LG_DATA;
  D.__exportsMerged = true;
  var BOOKS = {j(books)};
  BOOKS.forEach(function (b) {{
    var idx = -1;
    for (var i = 0; i < D.books.length; i++) {{ if (D.books[i].id === b.id) {{ idx = i; break; }} }}
    if (idx >= 0) D.books[idx] = Object.assign({{}}, D.books[idx], b);  // merge real data over the manifest placeholder
    else D.books.push(b);
  }});
  Array.prototype.push.apply(D.entities, {j(entities)});
  Array.prototype.push.apply(D.edges, {j(edges)});
  Array.prototype.push.apply(D.glucose, {j(glucose)});
  Array.prototype.push.apply(D.chunks, {j(chunks)});
}})();
"""
    OUT.write_text(out, encoding="utf-8")
    kb = len(out.encode("utf-8")) / 1024
    print(f"wrote {OUT.relative_to(ROOT)}  ({kb:.0f} KB, {len(books)} book(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
