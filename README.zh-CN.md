# LoreGraph

> 从封闭世界文学作品中抽取知识图谱，每一条边都有原文出处。

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue.svg)](pyproject.toml)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)](#路线图)

\[ [English](README.md) · 简体中文 \]

**LoreGraph** 把一部封闭世界的虚构文本（小说、剧本、电影分镜本）自动抽取成可查询的知识图谱——4 类节点、5 类关系、10 维隐式信息——**每一条主张都能定位到原文里的字面片段**。

## 为什么需要 LoreGraph

主流的 GraphRAG 流水线面向开放网络，矛盾可以通过加更多来源来解决。文学作品是**封闭世界**：

- "这个角色相信什么"的答案只能来自文本本身
- 任何推断都必须引用原文出处
- 图谱要支持多角色视角、伏笔回收、反事实续写

LoreGraph 实现了一条 **7-Pass 抽取流水线**，吸收 BookNLP、GLUCOSE、Microsoft GraphRAG、HippoRAG 2、Zep 的关键设计，并以严格的"证据片段字面匹配率 ≥ 95%"作为防幻觉硬门控。

## 7-Pass 流水线

```mermaid
graph LR
  A[Pass-1<br/>切片] --> B[Pass-2<br/>实体]
  B --> C[Pass-3<br/>聚合]
  C --> D[Pass-4<br/>共指]
  D --> E[Pass-5<br/>关系+事件]
  E --> F[Pass-6<br/>GLUCOSE]
  F --> G[Pass-7<br/>CoVe 验证]
```

| Pass | 目标 | 关键技术 |
|---|---|---|
| 1 · 切片 | 章节感知的文本切分 | 600–1200 token，20% 重叠，`atom_id = ch{N}_p{seq}` |
| 2 · 实体 | 4 类提及抽取（Agent/Object/Event/Concept） | LLM + Pydantic schema，**gleaning ≤ 2 轮** |
| 3 · 聚合 | 全书角色归一 | BookNLP 风格别名合并：embedding + 编辑距离 gating + LLM 判定 |
| 4 · 共指 | 局部共指消解 | LingMess / LLM coref，所有提及指向 canonical_id |
| 5 · 关系+事件 | 5 大关系边 + 事件 | STRUCTURAL/INTERACTS/ASSERTS/INFLUENCES/PREDICTS；事件按 LitBank **realis-trigger** 严格定义 |
| 6 · GLUCOSE | 隐式信息抽取 | 10 维（cause/emotion/location/possession/attribute × before/after）+ `inference_depth` 推理深度标签 |
| 7 · CoVe | 验证门控 | Chain-of-Verification；**evidence_span 字面匹配率 ≥ 95%** 才能过关 |

## 快速开始

> **前置条件**：Python 3.11+、Docker、Anthropic API key

```bash
git clone https://github.com/YunyueLi/LoreGraph.git
cd loregraph
cp .env.example .env                                # 填入 ANTHROPIC_API_KEY
docker compose up -d                                # 起 postgres + pgvector
pip install -e ".[dev]"
alembic upgrade head                                # 建库
loregraph ingest examples/yellow_wallpaper/input.txt --title "The Yellow Wallpaper"
loregraph extract --book-id 1                        # 跑完 7-Pass
loregraph view --book-id 1                           # 浏览器打开图谱
```

一本短篇小说（如 Yellow Wallpaper，约 6000 词）跑完 7-Pass 大约 $0.20–1.00 的 Anthropic 调用费用。

## 4 类本体 · 5 大关系

**节点 / 本体**（来自 WMG 设计 + LitBank 综合）：

| 本体 | 含义 | 例子 |
|---|---|---|
| Agent · 主体 | 有意图能行动的对象 | 林黛玉、贾府、白兔先生 |
| Object · 客体 | 非行动方的物 / 地 / 文档 | 通灵宝玉、怡红院、金陵判词 |
| Event · 事件 | 已发生（realis）的故事内事件 | 元妃省亲、宝玉挨打 |
| Concept · 概念 | 抽象指涉（主题、关系命名、预言） | 金玉良缘、儒家正统、黛玉病逝 |

**关系类**：

- `STRUCTURAL` — 慢变稳定的归属/位置/部分关系
- `INTERACTS` — Agent 间或与 Event 的动作性连接，事件参与归此
- `ASSERTS` — 对其他实体的声明/信念/陈述
- `INFLUENCES` — 因果影响
- `PREDICTS` — 前瞻陈述、预言、伏笔

## 架构

完整设计说明见 [`docs/architecture.md`](docs/architecture.md)。

分层：

```
┌──────────────────────────────────────────┐
│  Web UI   FastAPI + React + Cytoscape    │  浏览器交互
├──────────────────────────────────────────┤
│  CLI      Typer                          │  命令行入口
├──────────────────────────────────────────┤
│  Pipeline 7-Pass orchestrator            │  抽取协调器
├──────────────────────────────────────────┤
│  LLM      Anthropic SDK + prompt cache   │  唯一 LLM 出口（缓存）
├──────────────────────────────────────────┤
│  Storage  SQLAlchemy 2.0 + PG + pgvector │  存储 + 向量
└──────────────────────────────────────────┘
```

## 部署你自己的 demo

三个免费层服务 + 你的 Anthropic key，~15 分钟就能上线一个可分享的图谱 demo：

```
Cloudflare Pages (React 单页应用)
       │
       ▼  通过 VITE_API_BASE 环境变量
Render Web 服务 (FastAPI + LoreGraph)
       │
       ▼
Neon Serverless Postgres + pgvector
```

逐步指南：[`docs/deployment.md`](docs/deployment.md)。

> **国内访问提示**：Cloudflare Pages 在国内访问稳定性一般，必要时可换成 Vercel / Netlify；Render 的免费实例 15 分钟空闲后会休眠，首次访问需等 ~30s 唤醒。

## 路线图

| 版本 | 阶段 | 范围 |
|---|---|---|
| **v0.1** _(已发布)_ | Phase 0 + 1 | 7-Pass 抽取流水线、CLI、Web UI、部署配置 |
| v0.2 | Phase 2 | Leiden 社区检测 · HippoRAG 2 PPR 检索 · LightRAG 双层关键词索引 |
| v0.3 | Phase 3 | 内省精炼 · 伏笔检测 · 跨章矛盾扫描 |
| v0.4 | Phase 4 | Generative Agents · SymbolicToM 信念图 · MCTS 反事实续写 |

## 学术参考

LoreGraph 综合了一批工作的设计决策。BibTeX 完整列表在 [`docs/references.bib`](docs/references.bib)。

**叙事 NLP 与文学事件抽取**

- Bamman, Lewke, Mansoor.《英文文学共指标注数据集》(LitBank)，LREC 2020
- Sims, Park, Bamman.《文学事件检测》(Literary Event Detection)，ACL 2019
- Mostafazadeh 等.《GLUCOSE：泛化与情境化的故事解释》，EMNLP 2020 (Best Paper)

**工业级 KG-RAG 系统**

- Edge 等.《GraphRAG：面向查询的局部到全局摘要》，arXiv:2404.16130，2024
- Gutiérrez 等.《HippoRAG 2：从 RAG 到记忆》，arXiv:2502.14802，2025
- Rasmussen 等.《Zep：用于 Agent 记忆的时序知识图谱架构》，arXiv:2501.13956，2025

**LLM 抽取与验证**

- Dhuliawala 等.《Chain-of-Verification 降低大模型幻觉》，arXiv:2309.11495，2023

**Agent 模拟（v0.4 方向）**

- Park 等.《Generative Agents：人类行为的交互式仿真》，UIST 2023
- Sclar 等.《审视语言模型的心智理论（之缺失）》(SymbolicToM)，arXiv:2306.00924，2023

## 贡献

欢迎 Issue 与 PR。仓库约定见 [`CLAUDE.md`](CLAUDE.md)，设计原由见 [`docs/architecture.md`](docs/architecture.md)。所有 bug 报告请用**公版文本**的最小可复现片段，**不要粘贴版权文本**。

## 许可证

Apache 2.0，详见 [`LICENSE`](LICENSE)。
