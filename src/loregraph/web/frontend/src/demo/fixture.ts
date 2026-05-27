// Demo fixture — a hand-built extraction of Jane Austen's "Pride and
// Prejudice" (1813, public domain). Powers the no-backend GitHub Pages
// landing page: when VITE_DEMO_MODE=1, api/client.ts serves these
// objects instead of fetching /api.
//
// Every evidence_span below is a literal quotation from the public-domain
// text — the same invariant the real Pass-7 gate enforces. Only the five
// real RelationType values are used (STRUCTURAL / INTERACTS / ASSERTS /
// INFLUENCES / PREDICTS).

import type {
  BookSummary,
  ChunkDetail,
  Edge,
  EntityDetail,
  EntityType,
  GlucoseFact,
  GraphResponse,
} from "../types";

const BOOK: BookSummary = {
  id: 1,
  title: "Pride and Prejudice",
  author: "Jane Austen",
  language: "en",
};

// ── canonical entity ids (cytoscape node ids) ──
const E = "ent_elizabeth";
const D = "ent_darcy";
const JA = "ent_jane";
const B = "ent_bingley";
const WK = "ent_wickham";
const PEM = "ent_pemberley";
const PROP = "ent_proposal";
const PREJ = "ent_prejudice";

const DB: Record<string, number> = {
  [E]: 1,
  [D]: 2,
  [JA]: 3,
  [B]: 4,
  [WK]: 5,
  [PEM]: 6,
  [PROP]: 7,
  [PREJ]: 8,
};

// ── edges (shared between graph + detail views) ──
function edge(
  id: number,
  src: number,
  dst: number,
  relation: Edge["relation"],
  evidence_span: string,
  confidence: number,
  inference_depth: Edge["inference_depth"],
  chunk_id: number,
): Edge {
  return {
    id,
    book_id: 1,
    src_entity_id: src,
    dst_entity_id: dst,
    relation,
    chunk_id,
    evidence_span,
    confidence,
    inference_depth,
    attributes: {},
    created_at: "2026-05-26T00:00:00Z",
  };
}

const EDGES: Edge[] = [
  edge(1, DB[D], DB[E], "INTERACTS",
    "You must allow me to tell you how ardently I admire and love you.",
    0.96, "explicit", 4),
  edge(2, DB[E], DB[D], "ASSERTS",
    "you were the last man in the world whom I could ever be prevailed on to marry.",
    0.95, "explicit", 4),
  edge(3, DB[B], DB[JA], "INTERACTS",
    "Mr. Bingley had danced with her twice.",
    0.9, "explicit", 2),
  edge(4, DB[B], DB[JA], "PREDICTS",
    "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
    0.72, "one_step", 1),
  edge(5, DB[WK], DB[E], "INFLUENCES",
    "The world is blinded by his fortune and consequence, or frightened by his high and imposing manners.",
    0.85, "one_step", 3),
  edge(6, DB[D], DB[PEM], "STRUCTURAL",
    "He is the best landlord, and the best master, that ever lived.",
    0.88, "explicit", 6),
  edge(7, DB[PROP], DB[E], "INFLUENCES",
    "She grew absolutely ashamed of herself.",
    0.83, "one_step", 5),
  edge(8, DB[E], DB[PREJ], "ASSERTS",
    "Till this moment I never knew myself.",
    0.8, "one_step", 5),
];

// ── glucose facts ──
function fact(
  id: number,
  entity_id: number,
  chunk_id: number,
  dimension: GlucoseFact["dimension"],
  time_aspect: GlucoseFact["time_aspect"],
  statement: string,
  evidence_span: string,
  inference_depth: GlucoseFact["inference_depth"],
  confidence: number,
): GlucoseFact {
  return {
    id,
    book_id: 1,
    entity_id,
    chunk_id,
    dimension,
    time_aspect,
    statement,
    evidence_span,
    inference_depth,
    confidence,
  };
}

const FACTS: GlucoseFact[] = [
  fact(1, DB[E], 5, "emotion", "after",
    "Elizabeth is mortified by her own misjudgment",
    "She grew absolutely ashamed of herself.",
    "one_step", 0.86),
  fact(2, DB[D], 2, "attribute", "before",
    "Darcy is perceived as proud and aloof",
    "he was discovered to be proud, to be above his company, and above being pleased",
    "explicit", 0.9),
  fact(3, DB[E], 5, "attribute", "before",
    "Elizabeth had prided herself on reading character",
    "I, who have prided myself on my discernment!",
    "explicit", 0.88),
  fact(4, DB[D], 4, "emotion", "after",
    "Darcy's love overrides his sense of propriety",
    "In vain I have struggled. It will not do. My feelings will not be repressed.",
    "one_step", 0.84),
];

// ── chunks (real Pride and Prejudice passages) ──
const CHUNK_TEXT: Record<number, { atom_id: string; chapter: number; seq: number; text: string }> = {
  1: {
    atom_id: "ch01_p000",
    chapter: 1,
    seq: 0,
    text:
      "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.",
  },
  2: {
    atom_id: "ch03_p004",
    chapter: 3,
    seq: 4,
    text:
      "Mr. Bingley was good-looking and gentlemanlike; he had a pleasant countenance, and easy, unaffected manners. Mr. Darcy soon drew the attention of the room by his fine, tall person, handsome features, noble mien; but his manners gave a disgust which turned the tide of his popularity; for he was discovered to be proud, to be above his company, and above being pleased; and not all his large estate in Derbyshire could then save him from having a most forbidding, disagreeable countenance. Mr. Bingley had danced with her twice, and she had been distinguished by his sisters.",
  },
  3: {
    atom_id: "ch16_p022",
    chapter: 16,
    seq: 22,
    text:
      "“I have no right to give my opinion,” said Wickham, “as to his being agreeable or otherwise. I am not qualified to form one. I have known him too long and too well to be a fair judge. The world is blinded by his fortune and consequence, or frightened by his high and imposing manners, and sees him only as he chooses to be seen.” Elizabeth listened, and was persuaded that he was wholly to be believed.",
  },
  4: {
    atom_id: "ch34_p001",
    chapter: 34,
    seq: 1,
    text:
      "In vain I have struggled. It will not do. My feelings will not be repressed. You must allow me to tell you how ardently I admire and love you. … “From the very beginning, your manners impressing me with the fullest belief of your arrogance, your conceit, and your selfish disdain of the feelings of others … I had not known you a month before I felt that you were the last man in the world whom I could ever be prevailed on to marry.”",
  },
  5: {
    atom_id: "ch36_p003",
    chapter: 36,
    seq: 3,
    text:
      "“How despicably I have acted!” she cried; “I, who have prided myself on my discernment! … Had I been in love, I could not have been more wretchedly blind! But vanity, not love, has been my folly. … Till this moment I never knew myself.” She grew absolutely ashamed of herself.",
  },
  6: {
    atom_id: "ch43_p008",
    chapter: 43,
    seq: 8,
    text:
      "“He is the best landlord, and the best master,” said Mrs. Reynolds, “that ever lived. Not like the wild young men nowadays, who think of nothing but themselves.” Elizabeth almost stared at her. “Can this be Mr. Darcy?” thought she, looking on the picture of Pemberley’s master with new wonder.",
  },
};

function mentions(chunkId: number) {
  const byChunk: Record<number, Array<[string, EntityType, number]>> = {
    1: [["single man", "Agent", DB[B]], ["a wife", "Concept", DB[PREJ]]],
    2: [["Mr. Bingley", "Agent", DB[B]], ["Mr. Darcy", "Agent", DB[D]], ["her", "Agent", DB[JA]]],
    3: [["Wickham", "Agent", DB[WK]], ["Elizabeth", "Agent", DB[E]], ["his", "Agent", DB[D]]],
    4: [["I", "Agent", DB[D]], ["you", "Agent", DB[E]]],
    5: [["she", "Agent", DB[E]], ["my discernment", "Concept", DB[PREJ]]],
    6: [["master", "Agent", DB[D]], ["Pemberley", "Object", DB[PEM]], ["Elizabeth", "Agent", DB[E]]],
  };
  return (byChunk[chunkId] ?? []).map(([surface, type], i) => ({
    id: chunkId * 100 + i,
    book_id: 1,
    chunk_id: chunkId,
    entity_id: null,
    surface_form: surface,
    type,
    char_start: 0,
    char_end: surface.length,
    evidence_span: surface,
  }));
}

// ════════════════════════════════════════════════════════════════════
// Public fixtures consumed by api/client.ts in demo mode
// ════════════════════════════════════════════════════════════════════

export const DEMO_BOOKS: BookSummary[] = [BOOK];

const idToNode = Object.fromEntries(Object.entries(DB).map(([k, v]) => [v, k]));

export const DEMO_GRAPH: GraphResponse = {
  book: BOOK,
  nodes: [
    { id: E, db_id: DB[E], label: "Elizabeth Bennet", type: "Agent", aliases: ["Elizabeth", "Lizzy", "Eliza"], mention_count: 142 },
    { id: D, db_id: DB[D], label: "Mr. Darcy", type: "Agent", aliases: ["Darcy", "Fitzwilliam Darcy"], mention_count: 118 },
    { id: JA, db_id: DB[JA], label: "Jane Bennet", type: "Agent", aliases: ["Jane", "Miss Bennet"], mention_count: 64 },
    { id: B, db_id: DB[B], label: "Mr. Bingley", type: "Agent", aliases: ["Bingley", "Charles Bingley"], mention_count: 57 },
    { id: WK, db_id: DB[WK], label: "Mr. Wickham", type: "Agent", aliases: ["Wickham", "George Wickham"], mention_count: 39 },
    { id: PEM, db_id: DB[PEM], label: "Pemberley", type: "Object", aliases: ["Pemberley House"], mention_count: 18 },
    { id: PROP, db_id: DB[PROP], label: "The Hunsford Proposal", type: "Event", aliases: ["his proposal"], mention_count: 6 },
    { id: PREJ, db_id: DB[PREJ], label: "Prejudice", type: "Concept", aliases: ["first impressions"], mention_count: 11 },
  ],
  edges: EDGES.map((e) => ({
    id: `edge_${e.id}`,
    db_id: e.id,
    source: idToNode[e.src_entity_id],
    target: idToNode[e.dst_entity_id],
    relation: e.relation,
    evidence_span: e.evidence_span,
    confidence: e.confidence,
    inference_depth: e.inference_depth,
    chunk_id: e.chunk_id,
  })),
};

const ENTITY_META: Record<
  number,
  { canonical_id: string; type: EntityType; name: string; aliases: string[]; mentions: number }
> = {
  [DB[E]]: { canonical_id: E, type: "Agent", name: "Elizabeth Bennet", aliases: ["Elizabeth", "Lizzy", "Eliza"], mentions: 142 },
  [DB[D]]: { canonical_id: D, type: "Agent", name: "Mr. Darcy", aliases: ["Darcy", "Fitzwilliam Darcy"], mentions: 118 },
  [DB[JA]]: { canonical_id: JA, type: "Agent", name: "Jane Bennet", aliases: ["Jane", "Miss Bennet"], mentions: 64 },
  [DB[B]]: { canonical_id: B, type: "Agent", name: "Mr. Bingley", aliases: ["Bingley", "Charles Bingley"], mentions: 57 },
  [DB[WK]]: { canonical_id: WK, type: "Agent", name: "Mr. Wickham", aliases: ["Wickham", "George Wickham"], mentions: 39 },
  [DB[PEM]]: { canonical_id: PEM, type: "Object", name: "Pemberley", aliases: ["Pemberley House"], mentions: 18 },
  [DB[PROP]]: { canonical_id: PROP, type: "Event", name: "The Hunsford Proposal", aliases: ["his proposal"], mentions: 6 },
  [DB[PREJ]]: { canonical_id: PREJ, type: "Concept", name: "Prejudice", aliases: ["first impressions"], mentions: 11 },
};

export function demoEntityDetail(dbId: number): EntityDetail {
  const meta = ENTITY_META[dbId] ?? ENTITY_META[DB[E]];
  return {
    entity: {
      id: dbId,
      book_id: 1,
      canonical_id: meta.canonical_id,
      type: meta.type,
      canonical_name: meta.name,
      aliases: meta.aliases,
      note_md: "",
      attributes: {},
      embedding: null,
    },
    mention_count: meta.mentions,
    outgoing_edges: EDGES.filter((e) => e.src_entity_id === dbId),
    incoming_edges: EDGES.filter((e) => e.dst_entity_id === dbId),
    glucose_facts: FACTS.filter((f) => f.entity_id === dbId),
  };
}

export function demoChunkDetail(chunkId: number): ChunkDetail {
  const c = CHUNK_TEXT[chunkId] ?? CHUNK_TEXT[1];
  return {
    chunk: {
      id: chunkId,
      book_id: 1,
      atom_id: c.atom_id,
      chapter: c.chapter,
      seq: c.seq,
      text: c.text,
      token_count: Math.round(c.text.length / 4),
      char_offset_start: 0,
      char_offset_end: c.text.length,
      embedding: null,
    },
    mentions: mentions(chunkId),
    edges_in_chunk: EDGES.filter((e) => e.chunk_id === chunkId),
    glucose_facts_in_chunk: FACTS.filter((f) => f.chunk_id === chunkId),
  };
}
