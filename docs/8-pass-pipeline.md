# 8-Pass Extraction Pipeline — Spec

The pipeline takes a closed-world text in and emits a graph of typed entities, relations, and implicit facts, with literal evidence spans on every claim. The orchestrator (`pipeline/orchestrator.py`) wires passes 1–8; Pass-3 additionally runs LLM canonicalization (`pipeline/canonicalize.py`).

## Pipeline table

| Pass | Name | Input | Output | Key constraints |
|---|---|---|---|---|
| 1 | Chunk | Raw text | `chunks` rows | 600–1200 tok, 20% overlap, `atom_id = ch{N}_p{seq}`. Chapter-aware (English headings + CJK 第N回/章/卷). No LLM. |
| 2 | Entity | `chunks` | `mentions` rows | LLM, Pydantic-validated JSON, **gleaning ≤ 2 rounds**. `evidence_span` required; non-literal spans are dropped. |
| 3 | Cluster | `mentions` (book-wide) | `entities` rows | Alias merge: candidates gated by embedding cosine + edit distance, then **batched** LLM pairwise judge → union-find → LLM "black-hole" sanity split. Followed by **canonicalization** (well-known names, factions). |
| 4 | Coref | `mentions`, `entities` | `mentions.entity_id` filled | Deterministic surface-form binder (canonical names + aliases). Pronoun coreference is deferred to a later version. |
| 5 | Relation + Event | `mentions`, `entities`, `chunks` | `edges` rows | 5 relation types: STRUCTURAL / INTERACTS / ASSERTS / INFLUENCES / PREDICTS, plus a free-form `predicate` verb and a closed `predicate_class` (25 families, `models/predicates.py`). The verb is readable, the class is queryable — a graph with 2,627 distinct predicates over 9,843 edges cannot be traversed by relation name. Both endpoints must be entities present in-chunk; literal `evidence_span` required. |
| 6 | GLUCOSE | `chunks`, `entities` | `glucose_facts` rows | 5 dimensions (cause / emotion / location / possession / attribute) × 2 time aspects (before / after). `inference_depth ∈ {explicit, one_step, multi_step}`. Literal `evidence_span` required. |
| 7 | CoVe | `edges`, `glucose_facts` | `pass_runs.stats` | Chain-of-Verification over a sample **stratified** by (relation \| dimension) × `inference_depth`; every `multi_step` claim is checked, not sampled. **Two gates.** `supported_rate` (does the span entail the claim?) must clear `LOREGRAPH_COVE_SUPPORTED_FLOOR`, default 0.85, `0` disables — this is the quality gate. `literal_match_rate ≥ 0.95` remains as an invariant tripwire only: Pass-2/5/6 already drop non-literal spans, so it is 1.0 by construction and failing it means a span-handling bug, not poor extraction. |
| 8 | Note | entities + their evidence | `entities.note_md`, `entities.attributes` | Per-entity Hybrid Note (`[CONTEXT]` / `[FACTS]` / `[INFERENCES]` / `[GAPS]` / `[EVIDENCE]`). Parses `[META] subtype:` and assigns a tier (T1/T2/T3). Per-entity evidence is capped (30 mentions / 25 edges / 15 facts) but **spread across chapters, never taken as a prefix** — a prefix cap profiles the protagonist from the opening chapters and then reports the unread ones as gaps in the work. The prompt is told when its evidence is a sample and which chapters are missing, and `[GAPS]` must be phrased about the evidence shown. Capped to the top-N most-connected entities for frontend scale. |

## Cross-cutting rules

- **Two different numbers.** `literal_match_rate` says the quote is real; `supported_rate` says the quote supports the claim. Only the second measures quality, and only the second should ever be quoted as one. Both ship in the export under `metadata.quality`.
- **Evidence policy.** Every `mentions.evidence_span`, `edges.evidence_span`, and `glucose_facts.evidence_span` must be a literal substring of `chunks.text` for the recorded `chunk_id`. Pass-7 enforces this; the run aborts below the threshold.
- **Confidence.** All extracted claims carry `confidence ∈ [0, 1]`. Pass-6 and Pass-7 weight by it.
- **Canonical id.** From Pass-3 onward, all references to entities use `entities.canonical_id`, never raw surface forms.
- **Idempotency.** Each pass writes to its own table(s); re-running a pass is a `DELETE WHERE pass_run_id = …` + re-insert.

## Prompt caching strategy

System prompt + ontology block + book-wide canonical entity list form a **stable prefix** that is reused across chunks; per-chunk content is the only variable input. With an Anthropic model (direct, or `anthropic/*` via OpenRouter) that prefix is sent as a cache-eligible segment (`cache_control`), cutting input tokens to ~10% of nominal on cached requests. Other providers rely on their own server-side prompt caching.

## Measuring it

Counts are not quality. `loregraph eval` scores the extraction against the
shipped export:

| Eval | Needs a model | Asks |
|---|---|---|
| `graph` | no | Can an analyst's question be answered by traversal, and are the endpoints the kind of thing the question asked for? |
| `gaps` | no | Does the source in fact answer what a `[GAPS]` bullet says it leaves unanswered? |
| `entailment` | yes | Does each evidence span entail its claim? Emits a suggested floor for `LOREGRAPH_COVE_SUPPORTED_FLOOR`. |
| `contamination` | yes | Does the graph answer anything a model could not answer closed-book? Scored per book. |
| `perturbation` | yes | Alter the source and ask a question that turns on the change: did the system read the text or recite the book? |

The three model-backed evals run a dry preview without credentials, printing
exactly what would be sent. Every result carries a `skipped` list naming what
it did not cover — a score over the subset an eval happened to reach reads as
coverage when it is not.

`perturbation` is the one that decides whether this pipeline is worth running
on canonical works at all. Every text in the reference corpus is one a
frontier model has read a great deal *about*; on those, a single closed-book
call is cheaper, faster and often better written than eight passes. What it
cannot be is checkable, or faithful to a text that differs from the published
one. Perturbation is where that difference becomes a number.
