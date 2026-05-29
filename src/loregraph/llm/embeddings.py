"""Local multilingual text embeddings.

The schema reserves a `Vector(1024)` column on `chunks` and `entities`; this
module fills it. We embed LOCALLY (via fastembed / ONNX) with a multilingual
1024-dim model because:

* the corpus spans zh / ru / de / ja / el / fr / it / sv / no — an English-only
  embedder would wreck alias-matching and retrieval on the non-English books;
* 1024 dims matches the reserved column exactly (BGE-M3, multilingual-e5-large);
* it is free + offline, so it scales to all 85 books with zero per-call cost.

Powers:
* Pass-3  — embedding-NN candidate pairs, so aliases with NO surface overlap
            ("the Dark Lord" ↔ "Voldemort", "颦儿" ↔ "黛玉") can still merge.
* Pass-9  — community embeddings.
* Serve   — vector recall for the query / "ask the book" layer.

Model is overridable with LOREGRAPH_EMBED_MODEL. Default BGE-M3.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache

log = logging.getLogger(__name__)

EMBED_DIM = 1024
# multilingual-e5-large: 1024-dim, strong multilingual, available in fastembed.
# (BGE-M3 isn't packaged by fastembed; e5-large is the best 1024-dim option there.)
DEFAULT_EMBED_MODEL = os.getenv("LOREGRAPH_EMBED_MODEL", "intfloat/multilingual-e5-large")

# 1024-dim multilingual options, in preference order, if the default isn't
# offered by the installed fastembed build.
_PREFERRED_1024D = (
    "intfloat/multilingual-e5-large",
    "jinaai/jina-embeddings-v3",
    "BAAI/bge-m3",
)


class Embedder:
    """Thin wrapper over fastembed's TextEmbedding. Lazy-loads the model
    (first use downloads weights to the fastembed cache)."""

    def __init__(self, model_name: str | None = None) -> None:
        from fastembed import TextEmbedding  # heavy import, keep local

        supported = {m["model"] for m in TextEmbedding.list_supported_models()}
        chosen = model_name or DEFAULT_EMBED_MODEL
        if chosen not in supported:
            fallback = next((m for m in _PREFERRED_1024D if m in supported), None)
            if fallback is None:
                raise RuntimeError(
                    f"No 1024-dim multilingual embed model available. "
                    f"Wanted {chosen!r}; fastembed offers: {sorted(supported)}"
                )
            log.warning("Embed model %r unavailable; falling back to %r", chosen, fallback)
            chosen = fallback

        self.model_name = chosen
        self._is_e5 = "e5" in chosen.lower()  # e5 needs "query:"/"passage:" prefixes
        self._model = TextEmbedding(model_name=chosen)
        log.info("Embedder ready: %s", chosen)

    def embed(
        self, texts: list[str], *, kind: str = "query", batch_size: int = 32
    ) -> list[list[float]]:
        """Embed a batch of texts → list of 1024-float vectors (plain lists,
        ready for pgvector).

        `kind` ("query" | "passage") only matters for e5 models, which require a
        prefix for good results. Use "query" for short symmetric matches (entity
        names in Pass-3) and "passage" for documents (chunk bodies in retrieval).
        """
        if not texts:
            return []
        prepared = [f"{kind}: {t}" for t in texts] if self._is_e5 else list(texts)
        out: list[list[float]] = []
        for vec in self._model.embed(prepared, batch_size=batch_size):
            out.append([float(x) for x in vec])
        return out

    def embed_one(self, text: str, *, kind: str = "query") -> list[float]:
        return self.embed([text], kind=kind)[0]


@lru_cache(maxsize=2)
def get_embedder(model_name: str | None = None) -> Embedder:
    """Process-wide cached Embedder (model load is expensive)."""
    return Embedder(model_name)
