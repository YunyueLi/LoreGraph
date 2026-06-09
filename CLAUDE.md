# LoreGraph — Repo Conventions

## What this repo is

LoreGraph extracts knowledge graphs from **closed-world fictional texts** (novels, scripts, screenplays) via an 8-Pass LLM pipeline. v0.1 covers Phase 0 (config) + Phase 1 (the 8-Pass extraction). See [`docs/architecture.md`](docs/architecture.md) for the full design.

## Code conventions

- Python 3.11+ only. `from __future__ import annotations` at the top of every module.
- All async by default. Synchronous wrappers only at CLI entry points.
- **All LLM calls go through `src/loregraph/llm/client.py`.** Never instantiate a provider SDK (`anthropic.Anthropic()`, `openai.OpenAI()`) directly elsewhere.
- **Every extracted claim must carry an `evidence_span`** — a literal substring of the source chunk. Pass-7 enforces ≥ 95% literal match rate as a hard gate.
- Pydantic models live in `src/loregraph/models/`. Database schema in `src/loregraph/db/schema.py`. Keep them in lockstep via integration tests (`tests/integration/test_db.py`).
- Lint: `uv run --extra dev ruff check && uv run --extra dev ruff format`. Type check: `uv run --extra dev python -m mypy src`.

## Adding a new pass

Touch points (in order):

1. `migrations/versions/*.py` — a new Alembic revision for any new tables/columns
2. `src/loregraph/models/<schema>.py` — new Pydantic models
3. `src/loregraph/db/schema.py` — matching SQLAlchemy ORM
4. `src/loregraph/llm/prompts/pass{N}_<name>.j2` — Jinja2 prompt template
5. `src/loregraph/pipeline/pass{N}_<name>.py` — pass class with `async def run(ctx)`
6. `src/loregraph/pipeline/orchestrator.py` — wire it into the pipeline DAG
7. `tests/integration/test_pass{N}.py` — fixture + mocked LLM via `patch.object(LLMClient, "complete", AsyncMock(...))`
8. `docs/8-pass-pipeline.md` — update the spec table

## Git workflow

- **Conventional commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`).
- One PR per pass or per significant subsystem.
- **Never commit copyrighted text fixtures.** `tests/fixtures/` and `examples/` are public-domain only (Project Gutenberg, LOC, etc.).
- Run `uv run --extra dev ruff format && uv run --extra dev ruff check && uv run --extra dev python -m pytest -m unit` before opening a PR.

## Cost discipline

Every LLM call records token usage to `pass_runs.stats`. A per-book budget ceiling is **configured** (`LOREGRAPH_COST_CEILING_USD`, default $20) but **not yet enforced** in `pipeline/orchestrator.py` — enforcement is planned. Always design prompts so the system prompt + shared ontology block stays **stable across chunks** — this lets prompt caching (Anthropic, or `anthropic/*` via OpenRouter) kick in and saves 80%+ on input tokens.

## Testing tiers

| Tier | Marker | Speed | Deps |
|---|---|---|---|
| Unit | `@pytest.mark.unit` | < 5 s | None |
| Integration | `@pytest.mark.integration` | < 60 s | Postgres testcontainer + mocked LLM (`patch.object` on `LLMClient`) |
| E2E | `@pytest.mark.e2e` | minutes | Full pipeline on a small public-domain text; live LLM gated behind `LOREGRAPH_E2E_LIVE=1` |

`pytest` defaults to `-m unit`. CI runs unit + integration on every PR; e2e is manual.
