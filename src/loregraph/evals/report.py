"""A shared result shape, so every eval reports what it could not run.

An eval that silently scores the subset it managed to reach is worse than no
eval: the number looks like coverage. `skipped` is a first-class field and the
renderer always prints it.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any


@dataclass
class EvalResult:
    name: str
    book_id: str
    headline: str
    """One sentence a reader can act on — not a number on its own."""

    metrics: dict[str, Any] = field(default_factory=dict)
    findings: list[dict[str, Any]] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    """Everything the eval did not cover, and why. Never empty by omission."""

    def to_dict(self) -> dict[str, Any]:
        return {
            "eval": self.name,
            "book": self.book_id,
            "headline": self.headline,
            "metrics": self.metrics,
            "findings": self.findings,
            "skipped": self.skipped,
        }


def render(results: list[EvalResult], *, as_json: bool = False, examples: int = 3) -> str:
    if as_json:
        return json.dumps([r.to_dict() for r in results], ensure_ascii=False, indent=2)

    out: list[str] = []
    for result in results:
        out.append(f"\n{result.name}  ·  {result.book_id}")
        out.append("=" * (len(result.name) + len(result.book_id) + 5))
        out.append(result.headline)
        if result.metrics:
            out.append("")
            width = max(len(k) for k in result.metrics)
            for key, value in result.metrics.items():
                if isinstance(value, float):
                    value = f"{value:.4f}".rstrip("0").rstrip(".")
                out.append(f"  {key.ljust(width)}  {value}")
        if result.findings:
            out.append("")
            out.append(
                f"  examples ({min(examples, len(result.findings))} of {len(result.findings)}):"
            )
            for finding in result.findings[:examples]:
                first = True
                for key, value in finding.items():
                    text = str(value).replace("\n", " ")
                    if len(text) > 150:
                        text = text[:147] + "..."
                    out.append(f"    {'-' if first else ' '} {key}: {text}")
                    first = False
        if result.skipped:
            out.append("")
            out.append("  not covered:")
            for note in result.skipped:
                out.append(f"    - {note}")
    return "\n".join(out) + "\n"
