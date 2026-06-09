# 8-Pass Extraction Pipeline — Spec

The pipeline takes a closed-world text in and emits a graph of typed entities, relations, and implicit facts, with literal evidence spans on every claim. The orchestrator (`pipeline/orchestrator.py`) wires passes 1–8; Pass-3 additionally runs LLM canonicalization (`pipeline/canonicalize.py`).

## Pipeline table

| Pass | Name | Input | Output | Key constraints |
|---|---|---|---|---|
| 1 | Chunk | Raw text | `chunks` rows | 600–1200 tok, 20% overlap, `atom_id = ch{N}_p{seq}`. Chapter-aware (English headings + CJK 第N回/章/卷). No LLM. |
| 2 | Entity | `chunks` | `mentions` rows | LLM, Pydantic-validated JSON, **gleaning ≤ 2 rounds**. `evidence_span` required; non-literal spans are dropped. |
| 3 | Cluster | `mentions` (book-wide) | `entities` rows | Alias merge: candidates gated by embedding cosine + edit distance, then **batched** LLM pairwise judge → union-find → LLM "black-hole" sanity split. Followed by **canonicalization** (well-known names, factions). |
| 4 | Coref | `mentions`, `entities` | `mentions.entity_id` filled | Deterministic surface-form binder (canonical names + aliases). Pronoun coreference is deferred to a later version. |
| 5 | Relation + Event | `mentions`, `entities`, `chunks` | `edges` rows | 5 relation types: STRUCTURAL / INTERACTS / ASSERTS / INFLUENCES / PREDICTS. Both endpoints must be entities present in-chunk; literal `evidence_span` required. |
| 6 | GLUCOSE | `chunks`, `entities` | `glucose_facts` rows | 5 dimensions (cause / emotion / location / possession / attribute) × 2 time aspects (before / after). `inference_depth ∈ {explicit, one_step, multi_step}`. Literal `evidence_span` required. |
| 7 | CoVe | `edges`, `glucose_facts` | `pass_runs.stats.match_rate` | Chain-of-Verification: samples edges + facts, re-checks literal match + an LLM "supported?" judgement. **Hard gate** — literal evidence-span match rate ≥ 95% required, else the run aborts. |
| 8 | Note | entities + their evidence | `entities.note_md`, `entities.attributes` | Per-entity Hybrid Note (`[CONTEXT]` / `[FACTS]` / `[INFERENCES]` / `[GAPS]` / `[EVIDENCE]`). Parses `[META] subtype:` and assigns a tier (T1/T2/T3). Capped to the top-N most-connected entities for frontend scale. |

## Cross-cutting rules

- **Evidence policy.** Every `mentions.evidence_span`, `edges.evidence_span`, and `glucose_facts.evidence_span` must be a literal substring of `chunks.text` for the recorded `chunk_id`. Pass-7 enforces this; the run aborts below the threshold.
- **Confidence.** All extracted claims carry `confidence ∈ [0, 1]`. Pass-6 and Pass-7 weight by it.
- **Canonical id.** From Pass-3 onward, all references to entities use `entities.canonical_id`, never raw surface forms.
- **Idempotency.** Each pass writes to its own table(s); re-running a pass is a `DELETE WHERE pass_run_id = …` + re-insert.

## Prompt caching strategy

System prompt + ontology block + book-wide canonical entity list form a **stable prefix** that is reused across chunks; per-chunk content is the only variable input. With an Anthropic model (direct, or `anthropic/*` via OpenRouter) that prefix is sent as a cache-eligible segment (`cache_control`), cutting input tokens to ~10% of nominal on cached requests. Other providers rely on their own server-side prompt caching.
