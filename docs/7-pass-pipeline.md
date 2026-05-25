# 7-Pass Extraction Pipeline — Spec

The pipeline takes a closed-world text in and emits a graph of typed entities, relations, and implicit facts, with literal evidence spans on every claim.

## Pipeline table

| Pass | Name | Input | Output | Key constraints |
|---|---|---|---|---|
| 1 | Chunk | Raw text | `chunks` rows | 600–1200 tok, 20% overlap, `atom_id = ch{N}_p{seq}`. No LLM. |
| 2 | Entity | `chunks` | `mentions` rows | LLM, Pydantic-validated JSON, **gleaning ≤ 2 rounds**. `evidence_span` required. |
| 3 | Cluster | `mentions` (book-wide) | `entities` rows + `mentions.entity_id` | BookNLP-style alias merge. Candidates gated by embedding cosine + edit distance, then LLM pairwise judge. |
| 4 | Coref | `mentions`, `entities` | `mentions.entity_id` filled (incl. pronouns) | Local coreference; everything resolved to canonical id. |
| 5 | Relation + Event | `mentions`, `entities`, `chunks` | `edges` rows | 5 relation types: STRUCTURAL / INTERACTS / ASSERTS / INFLUENCES / PREDICTS. Events are **realis triggers** (LitBank): no hypothetical / generic / negated / believed events. |
| 6 | GLUCOSE | `chunks`, `entities` | `glucose_facts` rows | 10-dim per entity: 5 dimensions (cause / emotion / location / possession / attribute) × 2 time aspects (before / after). `inference_depth ∈ {explicit, one_step, multi_step}`. |
| 7 | CoVe | `edges`, `glucose_facts` | `pass_runs.stats.match_rate` | Chain-of-Verification: literal evidence-span match rate ≥ 95% required to pass. |

## Cross-cutting rules

- **Evidence policy.** Every `mentions.evidence_span`, `edges.evidence_span`, and `glucose_facts.evidence_span` must be a literal substring of `chunks.text` for the recorded `chunk_id`. Pass-7 enforces this; the run aborts below the threshold.
- **Confidence.** All extracted claims carry `confidence ∈ [0, 1]`. Pass-6 and Pass-7 weight by it.
- **Canonical id.** From Pass-3 onward, all references to entities use `entities.canonical_id`, never raw surface forms.
- **Idempotency.** Each pass writes to its own table(s); re-running a pass is a `DELETE WHERE pass_run_id = …` + re-insert.

## Prompt caching strategy

System prompt + ontology block + book-wide canonical entity list are passed as Anthropic **cache-eligible** segments. Per-chunk content is the only variable input. At Pass-5/6 this cuts input tokens to ~10% of their nominal cost on cached requests.
