# LoreGraph Architecture

## Overview

LoreGraph builds a queryable knowledge graph from a single closed-world fictional text (novel, screenplay, script) via a 7-Pass LLM extraction pipeline. Every node and edge is traceable to a literal span in the original text.

## Design ancestry

LoreGraph is a re-architecture of an internal design called **WMG (World Memory Graph)**, originally targeted at open-world prediction. It is adapted here for **closed-world** texts, where:

- No external data sources are available.
- Every claim must cite a literal span from the source.
- Multi-character viewpoints and counterfactual continuations are first-class.

The design synthesizes choices from four lines of prior work:

- **Narrative NLP** — BookNLP & LitBank (Bamman et al.), Literary Event Detection (Sims, Park, Bamman ACL 2019), GLUCOSE (Mostafazadeh et al. EMNLP 2020)
- **Industrial KG-RAG** — Microsoft GraphRAG (Edge et al. 2024), HippoRAG 2 (Gutiérrez et al. NeurIPS 2024), LightRAG, Zep / Graphiti, KAG
- **LLM extraction** — GPT-NER (Wang et al. 2023), ChatIE, REBEL, Chain-of-Verification (Dhuliawala et al. 2023), BOOKCOREF (ACL 2025)
- **Agent simulation** — Generative Agents (Park et al. UIST 2023), SymbolicToM (Sclar 2023), BigToM, FANToM, Narrative Studio (MCTS for narrative)

See [`references.bib`](references.bib) for the full bibliography.

## Layer cake

```
┌──────────────────────────────────────────┐
│  Web UI   FastAPI + React + Cytoscape    │  v0.1
├──────────────────────────────────────────┤
│  CLI      Typer                          │  v0.1
├──────────────────────────────────────────┤
│  Pipeline 7-Pass orchestrator            │  v0.1
├──────────────────────────────────────────┤
│  LLM      Anthropic SDK + prompt cache   │  v0.1
├──────────────────────────────────────────┤
│  Storage  SQLAlchemy 2.0 + PG + pgvector │  v0.1
└──────────────────────────────────────────┘
```

## Module map

| Path | Responsibility |
|---|---|
| `src/loregraph/models/` | Pydantic data models (Chunk, Mention, Entity, Edge, GlucoseFact) |
| `src/loregraph/db/` | SQLAlchemy schema + async repository |
| `src/loregraph/llm/` | Anthropic client wrapper + prompt templates + gleaning |
| `src/loregraph/pipeline/` | One file per pass + `orchestrator.py` |
| `src/loregraph/cli/` | Typer commands |
| `src/loregraph/web/` | FastAPI routes + React frontend |
| `src/loregraph/utils/` | Token counting, span matching, logging |
| `migrations/` | Alembic SQL migrations |
| `tests/{unit,integration,e2e}/` | Three test tiers |

## v0.1 scope

- **Phase 0**: configuration, schema bootstrap.
- **Phase 1**: 7-Pass extraction (Pass-1 Chunk → Pass-7 CoVe).

Phase 2 (community detection, PPR retrieval), Phase 3 (reflection, foreshadowing), and Phase 4 (Generative Agent + SymbolicToM + MCTS counterfactual continuation) are deferred to v0.2 +.

## Key invariants

1. **Evidence on every edge.** Pass-7 fails the run if literal evidence-span match rate < 95%.
2. **Canonical entity IDs across chapters.** Pass-3 establishes them; Passes 4–6 must use them.
3. **Pydantic ↔ SQLAlchemy lockstep.** Any model change must come with a matching Alembic migration and a round-trip integration test.
4. **All LLM calls go through `llm/client.py`.** Token + cost accounting and prompt caching depend on this.
