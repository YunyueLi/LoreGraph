<div align="center">

# LoreGraph

### *knowledge graphs that quote the page they came from*

LoreGraph turns a novel, play, screenplay, or libretto into a **queryable knowledge graph** —
characters, objects, events and concepts, the typed relations between them, and the facts each
implies — where **every single claim is anchored to a literal span of the source text.**

No hallucinated edges. No "trust me." Click any relationship and you land on the exact sentence it came from.

`Apache-2.0`  ·  `Python 3.11+`  ·  `8-pass pipeline`  ·  `Claude Opus 4.8`  ·  `multilingual`  ·  `Alpha`

**English**  ·  [简体中文](README.zh-CN.md)

[Why](#why-loregraph) · [What you get](#what-you-get) · [Pipeline](#the-pipeline) · [Quick start](#quick-start) · [Architecture](#architecture) · [Corpus](#the-corpus) · [Roadmap](#status--roadmap)

</div>

---

```mermaid
flowchart LR
    SRC([book.txt]):::io
    subgraph EXTRACT["EXTRACTION · every claim is anchored to a literal source span"]
        direction LR
        P1["1 · Chunk"]:::det
        P2["2 · Entity"]:::llm
        P3["3 · Resolve"]:::llm
        P4["4 · Coref"]:::llm
        P5["5 · Relations"]:::llm
        P6["6 · GLUCOSE"]:::llm
        P7["7 · Verify"]:::gate
        P8["8 · Note"]:::llm
        P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7 --> P8
    end
    GRAPH[("knowledge graph<br/>Postgres · pgvector")]:::store
    SRC --> P1
    P8 --> GRAPH

    classDef io fill:#f3ecdd,stroke:#8a6d3b,color:#3a2d18
    classDef det fill:#e3d3ad,stroke:#8a6d3b,color:#3a2d18
    classDef llm fill:#c9a253,stroke:#6b5126,color:#2a2008
    classDef gate fill:#b34a2f,stroke:#6e2616,color:#ffffff
    classDef store fill:#33414f,stroke:#1a232c,color:#eef2ff
```

> **1** is deterministic · **2–6, 8** are LLM passes · **7** is the ≥95% literal-match verification gate.

---

## Why LoreGraph

Most "knowledge graph from text" tools extract triples and ask you to trust them. For **fiction** that's
fatal: a graph that quietly invents a relationship is worse than no graph. LoreGraph is built on one
non-negotiable rule:

> **Every extracted claim carries an `evidence_span` — a literal substring of the source — and a
> chain-of-verification pass rejects any claim whose span isn't a ≥95% literal match.**

It is also **closed-world**: the model may only use the text in front of it. It is told, explicitly, to
forget what it knows about the real "Elizabeth Bennet" or "孫悟空" and report only what *this* book says.

And it is **multilingual end-to-end**: the 85-work reference corpus spans English, 中文, Русский, Deutsch,
Français, Italiano, 日本語, Ελληνικά, and more. Source text stays in its original script; entity
resolution runs on a multilingual embedding model so that **"林黛玉" / "颦儿"** or **"the Dark Lord" /
"Voldemort"** merge into one node even with zero string overlap.

---

## What you get

For every book, a web reading-room with five linked views — all driven by the same evidence-anchored graph:

| View | What it shows |
|---|---|
| 📖 **Reader** | The original text, with every entity mention highlighted and clickable. |
| 🕸 **Graph** | A force-directed character/object/event/concept network. Hover any edge → the source line. |
| ⏳ **Timeline** | The story's events in reading order (the graph carries story-time on every fact). |
| 📇 **Index** | Searchable entity catalogue with per-entity profile cards. |
| 💬 **Ask** | Question-answering grounded in the graph — every answer cites its evidence. |

Each entity gets a structured **Hybrid Note**: `[CONTEXT] [FACTS] [INFERENCES] [BEHAVIOR_PATTERN] [GAPS]
[EVIDENCE]` — facts kept strictly separate from inferences, every inference tagged with a confidence level.

---

## The pipeline

A book flows through eight passes (diagram above). Chunking is deterministic; the rest are LLM calls that
all route through one hardened client.

| # | Pass | What it does |
|---|---|---|
| 1 | **Chunk** | Deterministic, chapter-aware splitter (English *and* CJK "第N回" headers). Stamps each chunk with a global story-time position. |
| 2 | **Entity** | Extracts typed mentions (Agent / Object / Event / Concept) with a literal evidence span. Uses *gleaning* (a "what did you miss?" retry) for recall. |
| 3 | **Resolve** | Production entity resolution: lexical **+ embedding-kNN blocking** → batched LLM matching → connected components → a black-hole-prevention sanity pass. Merges aliases across scripts. |
| 4 | **Coref** | Links every mention to its canonical entity. |
| 5 | **Relations** | Five typed relations (STRUCTURAL / INTERACTS / ASSERTS / INFLUENCES / PREDICTS) + a predicate, weight and sentiment, each with evidence. |
| 6 | **GLUCOSE** | Implicit commonsense facts (cause / emotion / location / possession / attribute) about each entity. |
| 7 | **Verify** | Chain-of-verification: drops any claim whose evidence span isn't a literal match. Hard ≥95% gate. |
| 8 | **Note** | Synthesises the per-entity Hybrid Note, assigns a subtype and an importance tier. |

**Production engineering** (researched against Splink / ComEM / GraphRAG and the Anthropic + OpenRouter docs):

- **Prompt caching** on the stable system prompt — measured **99.9% cache hit** on repeat calls (≈10× cheaper input).
- **Bounded-parallel** per-chunk LLM calls (≈10× faster than sequential) with retry + backoff + jitter.
- **Per-pass commits + idempotent re-runs** — a failed pass resumes with `--from N`; nothing double-writes.
- **Provider-agnostic** client: Claude Opus 4.8 via OpenRouter by default, swappable to 15+ backends.

---

## Quick start

```bash
# 1. Install (uv)
uv sync

# 2. Postgres 16+ with pgvector
createdb loregraph && psql loregraph -c "CREATE EXTENSION IF NOT EXISTS vector;"
uv run alembic upgrade head

# 3. Configure (.env)
cp .env.example .env        # set LOREGRAPH_LLM_PROVIDER + your API key
                            # default: openrouter + anthropic/claude-opus-4.8

# 4. Ingest a public-domain text and extract its graph
uv run loregraph ingest path/to/book.txt --title "Pride and Prejudice" --author "Jane Austen" --language en
uv run loregraph extract --book-id 1        # runs passes 1–8
uv run loregraph status --book-id 1         # pass-by-pass progress, tokens, cost

# 5. See it
uv run loregraph view                        # FastAPI + the web reading-room
```

> **Cost & speed.** Every call's tokens and cost land in `pass_runs.stats`. A mid-size novel runs in minutes,
> not hours, thanks to concurrency + caching. The per-book budget ceiling is configurable.

---

## Architecture

```mermaid
flowchart TB
    SRC([book.txt]):::io

    subgraph PIPE["loregraph.pipeline · 8 passes wired by orchestrator.py"]
        EX["chunk · entity · resolve · coref<br/>relations · GLUCOSE · verify · note"]:::llm
    end

    subgraph SVC["loregraph.llm · the only path to a model"]
        direction LR
        CLIENT["hardened client<br/>prompt-cache · retries · 15+ providers"]:::accent
        EMBED["multilingual embedder<br/>e5-large · 1024-dim · local"]:::accent
    end

    DB[("loregraph.db · Postgres + pgvector<br/>entities · edges · facts · notes · chunks")]:::store
    EXP["scripts/export_book.py"]:::det
    JSON[/"data/exports/&lt;book&gt;.json"/]:::io
    WEB["loregraph.web · reading-room<br/>Reader · Graph · Timeline · Index · Ask"]:::web

    SRC --> PIPE
    PIPE <--> SVC
    PIPE --> DB
    DB --> EXP --> JSON --> WEB

    classDef io fill:#f3ecdd,stroke:#8a6d3b,color:#3a2d18
    classDef det fill:#e3d3ad,stroke:#8a6d3b,color:#3a2d18
    classDef llm fill:#c9a253,stroke:#6b5126,color:#2a2008
    classDef accent fill:#d9b978,stroke:#6b5126,color:#2a2008
    classDef store fill:#33414f,stroke:#1a232c,color:#eef2ff
    classDef web fill:#7a5230,stroke:#3a2614,color:#ffffff
```

- **`src/loregraph/pipeline/`** — the passes, one module each, wired by `orchestrator.py`.
- **`src/loregraph/llm/`** — the single LLM client (caching, retries, multi-provider) + the local multilingual embedder.
- **`src/loregraph/db/`** — SQLAlchemy 2.0 schema + async repository. Migrations under `migrations/`.
- **`src/loregraph/web/`** — FastAPI API + the landing / reading-room front-end.
- Full design in [`docs/architecture.md`](docs/architecture.md).

---

## The corpus

LoreGraph ships with a reference set of **85 canonical works** — novels, plays, operas and early films
across 11 languages (Pride and Prejudice · 西游记 · Crime and Punishment · Faust · Les Misérables · …).

**Copyright is respected, strictly.** Source texts are **never committed** — `data/books/` is git-ignored.
Only *derived* metadata (the graph, short fair-use evidence spans, profile notes) is published, and full
reading text is embedded only for public-domain works. In-copyright works are processed locally and
surfaced as graph + analysis only.

---

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `LOREGRAPH_LLM_PROVIDER` | `openrouter` | `anthropic`, `openai`, `deepseek`, `ollama`, … (15+) |
| `LOREGRAPH_LLM_MODEL` | preset per provider | OpenRouter preset = `anthropic/claude-opus-4.8` |
| `LOREGRAPH_EMBED_MODEL` | `intfloat/multilingual-e5-large` | local, 1024-dim, multilingual |
| `DATABASE_URL` | local Postgres | must use the async `asyncpg` driver |
| `LOREGRAPH_COST_CEILING_USD` | `100` | per-book hard stop |

---

## Status & roadmap

**Alpha.** The extraction engine is production-hardened and the reference corpus is being processed.

- [x] 8-pass evidence-anchored extraction pipeline
- [x] Production entity resolution (embedding blocking + batched matching + transitivity guard)
- [x] Multilingual (source text + embeddings + UI), prompt caching, concurrency, resumable runs
- [x] Web reading-room: Reader · Graph · Timeline · Index · Ask
- [ ] **Narrative-time graph** — watch relationships *evolve* across the story (a slider for "as of chapter N")
- [ ] **Community / faction layer** — auto-detected families, factions, subplots
- [ ] **Cross-book meta-graph** — archetypes & influence linking all 85 works
- [ ] **Grounded character chat** — "talk to" a character; answers cited + spoiler-aware
- [ ] **Quality scoring** — per-book confidence / coverage metrics beyond the literal-match gate

---

## Development

```bash
uv run ruff format && uv run ruff check     # lint + format
uv run mypy src                             # types
uv run pytest -m unit                       # fast unit tests
uv run pytest -m integration                # Postgres testcontainer + mocked LLM
```

Conventions live in [`CLAUDE.md`](CLAUDE.md); the per-pass spec is in [`docs/7-pass-pipeline.md`](docs/7-pass-pipeline.md).

## License

[Apache 2.0](LICENSE). Source texts are not part of this repository; the reference corpus is assembled
locally from public sources (Project Gutenberg, Wikisource, …) at ingest time.
