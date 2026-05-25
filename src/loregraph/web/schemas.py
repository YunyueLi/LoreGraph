"""Response schemas for the LoreGraph web API.

These are the JSON shapes the React frontend consumes. They wrap the
underlying Pydantic data models with view-specific aggregations
(mention counts, edge groupings, etc.).
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from loregraph.models.atoms import Chunk
from loregraph.models.edges import Edge
from loregraph.models.entities import Entity, Mention
from loregraph.models.enums import EntityType, InferenceDepth, RelationType
from loregraph.models.glucose import GlucoseFact


class BookSummary(BaseModel):
    """Minimal book view for list endpoints."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    author: str
    language: str


class GraphNode(BaseModel):
    """One canonical entity, ready for Cytoscape."""

    id: str  # canonical_id — used as Cytoscape node id
    db_id: int  # the SQL primary key, useful for detail fetches
    label: str  # canonical_name
    type: EntityType
    aliases: list[str]
    mention_count: int


class GraphEdge(BaseModel):
    """One typed relation, ready for Cytoscape."""

    id: str  # synthetic edge id ("edge-{db_id}")
    db_id: int
    source: str  # source entity canonical_id
    target: str  # target entity canonical_id
    relation: RelationType
    evidence_span: str
    confidence: float
    inference_depth: InferenceDepth
    chunk_id: int


class GraphResponse(BaseModel):
    """Full graph payload for one book."""

    book: BookSummary
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class EntityDetail(BaseModel):
    """Detail view for one entity — used by the side panel when a
    Cytoscape node is clicked."""

    entity: Entity
    mention_count: int
    outgoing_edges: list[Edge]
    incoming_edges: list[Edge]
    glucose_facts: list[GlucoseFact]


class ChunkDetail(BaseModel):
    """Detail view for one chunk — used by the evidence panel."""

    chunk: Chunk
    mentions: list[Mention]
    edges_in_chunk: list[Edge]
    glucose_facts_in_chunk: list[GlucoseFact]
