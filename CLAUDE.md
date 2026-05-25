# LoreGraph — Repo Conventions

## What this repo is

LoreGraph extracts knowledge graphs from **closed-world fictional texts** (novels, scripts, screenplays) via a 7-Pass LLM pipeline. v0.1 covers Phase 0 (config) + Phase 1 (the 7-Pass extraction). See [`docs/architecture.md`](docs/architecture.md) for the full design.

## Code conventions

- Python 3.11+ only. `from __future__ import annotations` at the top of every module.
- All async by default. Synchronous wrappers only at CLI entry points.
- **All LLM calls go through `src/loregraph/llm/client.py`.** Never instantiate `anthropic.Anthropic()` directly elsewhere.
- **Every extracted claim must carry an `evidence_span`** — a literal substring of the source chunk. Pass-7 enforces ≥ 95% literal match rate as a hard gate.
- Pydantic models live in `src/loregraph/models/`. Database schema in `src/loregraph/db/schema.py`. Keep them in lockstep via integration tests (`tests/integration/test_db.py`).
- Lint: `uv run ruff check && uv run ruff format`. Type check: `uv run mypy src`.

## Adding a new pass

Touch points (in order):

1. `migrations/000X_*.sql` and a new Alembic revision — any new tables/columns
2. `src/loregraph/models/<schema>.py` — new Pydantic models
3. `src/loregraph/db/schema.py` — matching SQLAlchemy ORM
4. `src/loregraph/llm/prompts/pass{N}_<name>.j2` — Jinja2 prompt template
5. `src/loregraph/pipeline/pass{N}_<name>.py` — pass class with `async def run(ctx)`
6. `src/loregraph/pipeline/orchestrator.py` — wire it into the pipeline DAG
7. `tests/integration/test_pass{N}.py` — fixture + expected JSON (use recorded LLM responses via `respx`)
8. `docs/7-pass-pipeline.md` — update the spec table

## Git workflow

- **Conventional commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`).
- One PR per pass or per significant subsystem.
- **Never commit copyrighted text fixtures.** `tests/fixtures/` and `examples/` are public-domain only (Project Gutenberg, LOC, etc.).
- Run `uv run ruff format && uv run ruff check && uv run pytest -m unit` before opening a PR.

## Cost discipline

Every LLM call records token usage to `pass_runs.stats`. Per-book budget enforced in `pipeline/orchestrator.py` (default $20, configurable in `loregraph.yaml`). Always design prompts so that the system prompt + shared ontology block stays **stable across chunks** — this lets Anthropic prompt caching kick in and saves 80%+ on input tokens.

## Testing tiers

| Tier | Marker | Speed | Deps |
|---|---|---|---|
| Unit | `@pytest.mark.unit` | < 5 s | None |
| Integration | `@pytest.mark.integration` | < 60 s | Postgres testcontainer + mocked LLM (respx) |
| E2E | `@pytest.mark.e2e` | minutes | Full pipeline on a small public-domain text; live LLM gated behind `LOREGRAPH_E2E_LIVE=1` |

`pytest` defaults to `-m unit`. CI runs unit + integration on every PR; e2e is manual.
