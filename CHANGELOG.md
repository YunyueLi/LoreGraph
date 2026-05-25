# Changelog

All notable changes to LoreGraph will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial repository scaffolding: `pyproject.toml`, ruff/pytest config, docker-compose
  (Postgres 17 + pgvector), CI workflow, Apache 2.0 license.
- Empty `loregraph` Python package with Typer CLI stubs (`init`, `ingest`, `extract`,
  `view`, `status`).
- `docs/`: architecture, 7-pass-pipeline spec, BibTeX references.
- `CLAUDE.md` repo conventions for AI-assisted development.
- **PR #2 — Data models, DB schema, migrations**:
  - Pydantic models: `Book`, `Chunk`, `Mention`, `Entity`, `Edge`,
    `GlucoseFact`, `PassRun` (+ `*Create` input variants).
  - Enums: `EntityType`, `RelationType`, `InferenceDepth`, `GlucoseDim`,
    `GlucoseTime`, `PassStatus`.
  - SQLAlchemy 2.0 async ORM schema in lockstep with the Pydantic models.
  - Async session factory + `session_scope()` context manager.
  - Repository CRUD with Pydantic-in / Pydantic-out signatures (no ORM leakage
    into pipeline modules).
  - `pydantic-settings` `Settings` loader (`ANTHROPIC_API_KEY`, `DATABASE_URL`,
    `LOREGRAPH_MODEL`, `LOREGRAPH_LOG_LEVEL`, `LOREGRAPH_COST_CEILING_USD`).
  - Alembic configuration (`alembic.ini`, async `env.py`) + initial migration
    `0001_initial_schema` covering all 6 tables, 6 Postgres ENUM types, and the
    `vector` extension.
  - Unit tests covering Pydantic model validation (10 cases).
  - Integration tests via `testcontainers[postgresql]` covering Pydantic ↔ ORM
    round-trip for every model.
- **PR #3 — LLM client, Pass-1 chunker, Pass-2 entity extractor**:
  - `utils/tokens.py` (tiktoken cl100k counter) and `utils/spans.py` (literal
    evidence-span matcher used by Pass-7).
  - `llm/client.py` — async Anthropic wrapper with prompt-caching baked in
    (`cache_control: ephemeral` on the system block) and a `LLMUsage`
    accumulator for cost / token telemetry.
  - `llm/parser.py` — fenced-JSON extractor + Pydantic schema validation.
  - `llm/gleaning.py` — bounded retry loop ("what did you miss?"), capped
    at 2 rounds.
  - `llm/prompts/pass2_entity_*.j2` — Jinja2 templates for the entity
    extraction prompt (system + user split for cache efficiency).
  - `pipeline/pass1_chunk.py` — deterministic chapter-aware chunker:
    600–1200 token chunks, 20% overlap, `atom_id = chNN_pPPP`.
  - `pipeline/pass2_entity.py` — LLM entity extractor for the 4 ontological
    types; drops mentions whose `evidence_span` is not literal in the chunk.
  - `pipeline/orchestrator.py` — pass dispatcher writing to `pass_runs` with
    duration / token / count stats.
  - `pipeline/context.py` — per-run context (book_id, session, LLM, usage).
  - CLI: real implementations of `ingest`, `extract`, `status` (Typer +
    Rich table for status). `view` still stubbed (PR #6).
  - `examples/yellow_wallpaper/input.txt` — Project Gutenberg #1952 text
    (Charlotte Perkins Gilman, 1892, public domain) as the v0.1 demo book.
  - Tests: unit (chunking, spans, parser); integration (Pass-1 persists
    chunks, Pass-2 extracts mentions and rejects non-literal evidence_spans
    via an `unittest.mock`-patched LLM).
  - Config tightening: `ANTHROPIC_API_KEY` and `DATABASE_URL` are now
    optional at Settings load time so `loregraph status` / `init` work
    without secrets; `LLMClient.__init__` raises if the key is missing
    when a LLM-driven pass actually runs.
  - Lint config: ignore B008 globally — Typer/FastAPI/Click all rely on
    `arg: T = framework.Option(...)` defaults.
