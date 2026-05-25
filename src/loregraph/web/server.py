"""FastAPI application factory for the LoreGraph web layer.

The app exposes:
- /api/books/                  — list books
- /api/books/{id}              — book detail
- /api/books/{id}/graph        — Cytoscape-ready nodes + edges
- /api/entities/{id}           — entity detail panel
- /api/chunks/{id}             — chunk detail panel
- /healthz                     — liveness check
- /                            — single-page React frontend (when built)
"""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from loregraph import __version__
from loregraph.web.routes import books, chunks, entities, graph

log = logging.getLogger(__name__)

_STATIC_DIR = Path(__file__).parent / "static"


def create_app(*, enable_cors: bool = True) -> FastAPI:
    """Build the FastAPI app. Pure factory — call from CLI or tests."""
    app = FastAPI(
        title="LoreGraph API",
        version=__version__,
        description="Knowledge graphs from closed-world fiction, with evidence on every edge.",
    )

    if enable_cors:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # tighten in production
            allow_methods=["GET"],
            allow_headers=["*"],
        )

    @app.get("/healthz", tags=["meta"])
    async def healthz() -> JSONResponse:
        return JSONResponse({"status": "ok", "version": __version__})

    app.include_router(books.router)
    app.include_router(graph.router)
    app.include_router(entities.router)
    app.include_router(chunks.router)

    # Serve the built React frontend if it exists. In dev the frontend
    # is served by Vite on a separate port and CORS handles cross-origin.
    if _STATIC_DIR.exists() and any(_STATIC_DIR.iterdir()):
        app.mount("/", StaticFiles(directory=str(_STATIC_DIR), html=True), name="frontend")
        log.info("Mounted built frontend from %s", _STATIC_DIR)
    else:
        log.info(
            "No frontend build found at %s — API-only mode. "
            "Build the React app under src/loregraph/web/frontend to enable.",
            _STATIC_DIR,
        )

    return app


app = create_app()
