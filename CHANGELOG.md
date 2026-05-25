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
