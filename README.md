<div align="center">

<br>

# 🕸️ LoreGraph

### Knowledge graphs from closed-world fiction.<br>Every node and every edge — traceable to a literal span in the source text.

<br>

<p>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-blue.svg?style=flat-square" alt="License" /></a>
  <a href="pyproject.toml"><img src="https://img.shields.io/badge/python-3.11+-3776AB.svg?style=flat-square&logo=python&logoColor=white" alt="Python" /></a>
  <a href="https://github.com/YunyueLi/LoreGraph/actions"><img src="https://img.shields.io/github/actions/workflow/status/YunyueLi/LoreGraph/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
  <a href="https://github.com/YunyueLi/LoreGraph/stargazers"><img src="https://img.shields.io/github/stars/YunyueLi/LoreGraph?style=flat-square" alt="Stars" /></a>
  <img src="https://img.shields.io/badge/status-alpha-orange.svg?style=flat-square" alt="Status" />
</p>

\[ **English** · [简体中文](README.zh-CN.md) \]

[Quick start](#-quick-start) · [What you get](#-what-you-get) · [How it works](#-the-7-pass-pipeline) · [Deploy](#-deploy-your-own-demo) · [Roadmap](#-roadmap) · [Cite](#-academic-foundations)

</div>

---

## Why this exists

Mainstream **GraphRAG** pipelines work on the open web — when sources contradict, you add more sources. **Fiction is different.**

When you ask *"what does this character believe?"* the answer must come **from the text alone**. Every inference must **cite a span**. The graph must reason about **multi-character viewpoints**, **foreshadowing**, and **counterfactual continuations**.

**LoreGraph** turns a single novel, screenplay, or script into a queryable knowledge graph with **every claim grounded in a literal substring of the source text** — exposed through a CLI and an interactive web UI.

It synthesizes the strongest ideas from four lines of work:

|  |  |
|---|---|
| 📚 **Narrative NLP** | BookNLP · LitBank · GLUCOSE · Literary Event Detection |
| 🏛️ **Industrial KG-RAG** | Microsoft GraphRAG · HippoRAG 2 · LightRAG · Zep |
| ⚗️ **LLM extraction** | GPT-NER · Chain-of-Verification · BOOKCOREF |
| 🎭 **Agent simulation** *(v0.4)* | Generative Agents · SymbolicToM · MCTS narrative |

— behind a strict **≥ 95% evidence-span literal match** policy as the hallucination gate.

---

## 🚀 Quick start

```bash
git clone https://github.com/YunyueLi/LoreGraph.git
cd LoreGraph
cp .env.example .env                                  # add ANTHROPIC_API_KEY
docker compose up -d                                  # postgres + pgvector
pip install -e ".[dev]" && alembic upgrade head

loregraph ingest examples/yellow_wallpaper/input.txt --title "Yellow Wallpaper"
loregraph extract --book-id 1
loregraph view --book-id 1                            # opens http://localhost:8000
```

> **Cost**: a short novel (~6 000 words) runs all 7 passes for roughly **$0.20 – 1.00** in Anthropic spend, with prompt-cache discounts factored in.

---

## ✨ What you get

After `loregraph extract` finishes, the database holds typed entities, typed relations, and 10-dimensional implicit facts — every one of them anchored to a literal span:

<div align="center">
  <img src="assets/demo-graph.svg" alt="A fragment of an extracted knowledge graph showing typed entities (Agent / Object / Event / Concept), typed relations (STRUCTURAL / INTERACTS / SYMBOLIZES / PREDICTS / INFLUENCES / CAUSES), and a callout proving every edge cites a literal evidence_span from a specific chunk." width="100%" />
</div>

Click any node or edge in the web UI and you see its full provenance:

<div align="center">
  <img src="assets/evidence-panel.svg" alt="LoreGraph web UI mockup: a browser window showing the graph view on the left and a detail panel on the right. The panel displays the selected entity's canonical name, type chip, mention count, aliases, outgoing edges with evidence quotes, and GLUCOSE implicit facts — each marked verified by Pass-7." width="100%" />
</div>

---

## 🔬 The 7-Pass pipeline

<div align="center">
  <img src="assets/7-pass-pipeline.svg" alt="Seven sequential passes: Chunk → Entity → Cluster → Coref → Relation → GLUCOSE → CoVe. Pass-7 is highlighted as the verification gate that requires ≥ 95% evidence-span literal match to pass." width="100%" />
</div>

| Pass | Job | Key technique |
|---|---|---|
| **1** Chunk | Chapter-aware slicing | 600–1200 token chunks, 20% overlap, `atom_id = ch{N}_p{seq}` |
| **2** Entity | 4 ontological types | LLM + Pydantic schema, **gleaning ≤ 2 rounds** |
| **3** Cluster | Book-wide canonical IDs | BookNLP-style alias merge: cheap string gating + LLM pairwise judge |
| **4** Coref | Mention → canonical binding | LingMess / LLM coref; pronoun resolution lands in v0.2 |
| **5** Relation + Event | 5 typed relations | Realis-trigger event definition (LitBank); strict endpoint set |
| **6** GLUCOSE | 10-dim implicit info | `cause / emotion / location / possession / attribute` × `before / after` |
| **7** CoVe | Verification gate | Chain-of-Verification; **≥ 95% literal evidence_span match** to pass |

---

## 🧬 What's in the graph

<div align="center">
  <img src="assets/ontology.svg" alt="LoreGraph ontology overview: four entity-type cards (Agent / Object / Event / Concept) with example referents, five relation-class cards with use cases, and the GLUCOSE 10-dim implicit-fact schema (5 dimensions × 2 time aspects + inference_depth tag)." width="100%" />
</div>

---

## 🏗️ Architecture

<div align="center">
  <img src="assets/architecture.svg" alt="Five-layer architecture: Web UI (FastAPI + React + Cytoscape), CLI (Typer), Pipeline (7-Pass orchestrator), LLM (Anthropic SDK + prompt cache), Storage (SQLAlchemy 2.0 + Postgres + pgvector). One LLM gateway, one storage backend, evidence-grounded edges throughout." width="100%" />
</div>

Full design rationale, paper-by-paper mapping, and the WMG → LoreGraph ancestry are in [**`docs/architecture.md`**](docs/architecture.md).

---

## 🛠️ Built with

<p>
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Anthropic-Sonnet_4.6-d97757?style=flat-square&logo=anthropic&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLAlchemy-2.0_async-d71f00?style=flat-square&logo=sqlalchemy&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-17 + pgvector-336791?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Alembic-1.13-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Typer-12-ff69b4?style=flat-square" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Cytoscape.js-3.30-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Ruff-0.15-FCC21B?style=flat-square&logo=ruff&logoColor=black" />
</p>

---

## 🚢 Deploy your own demo

<div align="center">
  <img src="assets/deploy-flow.svg" alt="Deployment topology: Cloudflare Pages serves the React SPA, calling a Render web service running FastAPI + LoreGraph, which connects to a Neon serverless Postgres + pgvector. Final step: `gh repo edit --homepage` pins the live URL on the GitHub About card." width="100%" />
</div>

Three free-tier services + your Anthropic key get a shareable public demo in **~15 minutes**. Step-by-step walkthrough, including how to seed the demo with public-domain books: [**`docs/deployment.md`**](docs/deployment.md).

---

## 🗺️ Roadmap

| Version | Focus | Status |
|---|---|---|
| **v0.1** | 7-Pass extraction · CLI · Web UI · deployment | ✅ Shipped |
| **v0.2** | Leiden community detection · HippoRAG 2 PPR retrieval · LightRAG dual-level keyword index | 🚧 Planned |
| **v0.3** | Internal reflection · foreshadowing detection · cross-chapter contradiction sweep | 📋 Backlog |
| **v0.4** | Generative Agents + SymbolicToM belief graphs + MCTS counterfactual continuation | 📋 Backlog |

---

## 📜 Academic foundations

LoreGraph stands on four lines of prior work. Full BibTeX in [**`docs/references.bib`**](docs/references.bib).

<details>
<summary><strong>📚 Narrative NLP</strong> — BookNLP, LitBank, GLUCOSE, Literary Event Detection</summary>

<br>

- Bamman, Lewke, Mansoor. *An Annotated Dataset of Coreference in English Literature*. LREC 2020. (**LitBank**)
- Sims, Park, Bamman. *Literary Event Detection*. ACL 2019.
- Mostafazadeh et al. *GLUCOSE: GeneraLized and COntextualized Story Explanations*. EMNLP 2020 (**Best Paper**).
- Elson, Dames, McKeown. *Extracting Social Networks from Literary Fiction*. ACL 2010.
- Sims & Bamman. *Measuring Information Propagation in Literary Social Networks*. EMNLP 2020.

</details>

<details>
<summary><strong>🏛️ Industrial KG-RAG</strong> — GraphRAG, HippoRAG 2, LightRAG, Zep</summary>

<br>

- Edge et al. *From Local to Global: A GraphRAG Approach*. arXiv:2404.16130, 2024. (**Microsoft GraphRAG**)
- Gutiérrez et al. *HippoRAG 2: From RAG to Memory*. arXiv:2502.14802, 2025.
- Guo et al. *LightRAG: Simple and Fast Retrieval-Augmented Generation*. arXiv:2410.05779, 2024.
- Rasmussen et al. *Zep: A Temporal Knowledge Graph Architecture*. arXiv:2501.13956, 2025.

</details>

<details>
<summary><strong>⚗️ LLM extraction & verification</strong> — GPT-NER, CoVe, BOOKCOREF</summary>

<br>

- Wang et al. *GPT-NER: Named Entity Recognition via LLMs*. arXiv:2304.10428, 2023.
- Dhuliawala et al. *Chain-of-Verification Reduces Hallucination*. arXiv:2309.11495, 2023.
- Cabot & Navigli. *REBEL: Relation Extraction by End-to-end Language Generation*. Findings of EMNLP 2021.
- Liu et al. *Lost in the Middle*. arXiv:2307.03172, 2023.

</details>

<details>
<summary><strong>🎭 Agent simulation</strong> — Generative Agents, SymbolicToM, FANToM, MCTS narrative (v0.4 roadmap)</summary>

<br>

- Park et al. *Generative Agents*. UIST 2023.
- Sclar et al. *SymbolicToM: Minding LMs' (Lack of) Theory of Mind*. arXiv:2306.00924, 2023.
- Kim et al. *FANToM: Stress-testing Machine Theory of Mind*. EMNLP 2023.
- Gandhi et al. *BigToM*. arXiv:2306.15448, 2023.
- *Narrative Studio*: MCTS for story-tree planning. arXiv:2504.02426, 2025.

</details>

If LoreGraph is useful in your work, please cite the underlying papers as well as this project:

```bibtex
@software{li2026loregraph,
  author = {Li, Yunyue},
  title  = {LoreGraph: Knowledge graphs from closed-world fiction},
  year   = {2026},
  url    = {https://github.com/YunyueLi/LoreGraph}
}
```

---

## 🤝 Contributing

Issues and PRs welcome. A few starting points:

- Repo conventions: [`CLAUDE.md`](CLAUDE.md)
- Design rationale: [`docs/architecture.md`](docs/architecture.md)
- 7-Pass spec: [`docs/7-pass-pipeline.md`](docs/7-pass-pipeline.md)

> **Important** — every bug report should include a minimal reproducible passage from a **public-domain text** (Project Gutenberg / Library of Congress / equivalent). Never paste copyrighted material into issues or test fixtures.

---

## 📄 License

Apache 2.0 — see [`LICENSE`](LICENSE).

<br>

<div align="center">

<sub>Built by <a href="https://github.com/YunyueLi">@YunyueLi</a> · <i>make the graph cite its work.</i></sub>

</div>
