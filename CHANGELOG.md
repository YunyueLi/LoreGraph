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
