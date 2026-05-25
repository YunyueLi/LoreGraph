// TypeScript mirror of the server-side Pydantic schemas in
// src/loregraph/web/schemas.py. Keep in sync.

export type EntityType = "Agent" | "Object" | "Event" | "Concept";
export type RelationType =
  | "STRUCTURAL"
  | "INTERACTS"
  | "ASSERTS"
  | "INFLUENCES"
  | "PREDICTS";
export type InferenceDepth = "explicit" | "one_step" | "multi_step";
export type GlucoseDim =
  | "cause"
  | "emotion"
  | "location"
  | "possession"
  | "attribute";
export type GlucoseTime = "before" | "after";

export interface BookSummary {
  id: number;
  title: string;
  author: string;
  language: string;
}

export interface GraphNode {
  id: string;
  db_id: number;
  label: string;
  type: EntityType;
  aliases: string[];
  mention_count: number;
}

export interface GraphEdge {
  id: string;
  db_id: number;
  source: string;
  target: string;
  relation: RelationType;
  evidence_span: string;
  confidence: number;
  inference_depth: InferenceDepth;
  chunk_id: number;
}

export interface GraphResponse {
  book: BookSummary;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Entity {
  id: number;
  book_id: number;
  canonical_id: string;
  type: EntityType;
  canonical_name: string;
  aliases: string[];
  note_md: string;
  attributes: Record<string, unknown>;
  embedding: number[] | null;
}

export interface Edge {
  id: number;
  book_id: number;
  src_entity_id: number;
  dst_entity_id: number;
  relation: RelationType;
  chunk_id: number;
  evidence_span: string;
  confidence: number;
  inference_depth: InferenceDepth;
  attributes: Record<string, unknown>;
  created_at: string;
}

export interface Mention {
  id: number;
  book_id: number;
  chunk_id: number;
  entity_id: number | null;
  surface_form: string;
  type: EntityType;
  char_start: number;
  char_end: number;
  evidence_span: string;
}

export interface GlucoseFact {
  id: number;
  book_id: number;
  entity_id: number;
  chunk_id: number;
  dimension: GlucoseDim;
  time_aspect: GlucoseTime;
  statement: string;
  evidence_span: string;
  inference_depth: InferenceDepth;
  confidence: number;
}

export interface Chunk {
  id: number;
  book_id: number;
  atom_id: string;
  chapter: number;
  seq: number;
  text: string;
  token_count: number;
  char_offset_start: number;
  char_offset_end: number;
  embedding: number[] | null;
}

export interface EntityDetail {
  entity: Entity;
  mention_count: number;
  outgoing_edges: Edge[];
  incoming_edges: Edge[];
  glucose_facts: GlucoseFact[];
}

export interface ChunkDetail {
  chunk: Chunk;
  mentions: Mention[];
  edges_in_chunk: Edge[];
  glucose_facts_in_chunk: GlucoseFact[];
}
