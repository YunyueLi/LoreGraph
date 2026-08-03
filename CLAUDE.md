# LoreGraph — Repo Conventions

## What this repo is

LoreGraph extracts knowledge graphs from **closed-world fictional texts** (novels, scripts, screenplays) via an 8-Pass LLM pipeline. v0.1 covers Phase 0 (config) + Phase 1 (the 8-Pass extraction). See [`docs/architecture.md`](docs/architecture.md) for the full design.

## Code conventions

- Python 3.11+ only. `from __future__ import annotations` at the top of every module.
- All async by default. Synchronous wrappers only at CLI entry points.
- **All LLM calls go through `src/loregraph/llm/client.py`.** Never instantiate a provider SDK (`anthropic.Anthropic()`, `openai.OpenAI()`) directly elsewhere.
- **Every extracted claim must carry an `evidence_span`** — a literal substring of the source chunk. Pass-7 enforces two gates: `supported_rate` (does the span entail the claim?) against `LOREGRAPH_COVE_SUPPORTED_FLOOR`, and a ≥ 95% literal-match tripwire that only fires on a span-handling bug.
- **Edges carry both a free-form `predicate` and a closed `predicate_class`** (`models/predicates.py`). The verb is for reading, the class is for querying. Never query on the verb.
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

Every LLM call records token usage to `pass_runs.stats`. A per-book budget ceiling (`LOREGRAPH_COST_CEILING_USD`, default $20; `0` disables) is **enforced** between passes by `pipeline/orchestrator.py`: it estimates spend from token counts × configurable prices (`LOREGRAPH_PRICE_INPUT_PER_MTOK` / `…_OUTPUT_PER_MTOK`, default DeepSeek V4 Pro) and aborts (resumable with `--from`) when exceeded. Always design prompts so the system prompt + shared ontology block stays **stable across chunks** — this lets prompt caching (Anthropic, or `anthropic/*` via OpenRouter) kick in and saves 80%+ on input tokens.

## Evaluating a change

Counts are not quality. Before claiming an extraction change helped, run
`uv run loregraph eval all --book <id>` and quote the numbers that moved.

- `graph` and `gaps` need no model or credentials — they always run.
- `entailment`, `contamination` and `perturbation` need a provider; without
  one they print a dry preview of exactly what would be sent.
- Every result carries a `skipped` list. Read it: an eval that scored the
  subset it could reach is not coverage.

Two figures are routinely confused and must not be:
`literal_match_rate` is an invariant tripwire (Pass-2/5/6 drop non-literal
spans, so it is 1.0 by construction and cannot measure anything);
`supported_rate` is the quality number. Quote the second.

New evals go in `src/loregraph/evals/`, one module per eval, returning an
`EvalResult`, registered in `cli/main.py`'s `eval` command.

## Testing tiers

| Tier | Marker | Speed | Deps |
|---|---|---|---|
| Unit | `@pytest.mark.unit` | < 5 s | None |
| Integration | `@pytest.mark.integration` | < 60 s | Postgres testcontainer + mocked LLM (`patch.object` on `LLMClient`) |
| E2E | `@pytest.mark.e2e` | minutes | Full pipeline on a small public-domain text; live LLM gated behind `LOREGRAPH_E2E_LIVE=1` |

`pytest` defaults to `-m unit`. CI runs unit + integration on every PR; e2e is manual.
