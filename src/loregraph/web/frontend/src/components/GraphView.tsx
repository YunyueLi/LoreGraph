import { useEffect, useRef } from "react";
import cytoscape, { Core, EventObjectNode, EventObjectEdge } from "cytoscape";
// @ts-expect-error: no types for cytoscape-cose-bilkent
import coseBilkent from "cytoscape-cose-bilkent";
import type { GraphResponse } from "../types";

if (
  !(cytoscape as unknown as { _coseBilkentRegistered?: boolean })
    ._coseBilkentRegistered
) {
  cytoscape.use(coseBilkent);
  (cytoscape as unknown as { _coseBilkentRegistered?: boolean })._coseBilkentRegistered = true;
}

// ────────────────────────────────────────────────────────────────────
// Shape encodes ontological type. Color stays uniform (ink on paper)
// except for the gold PREDICTS edge and selected highlights. Matches
// the README/SVG figure language exactly.
// ────────────────────────────────────────────────────────────────────

type NodeShape =
  | "ellipse"
  | "round-rectangle"
  | "diamond"
  | "hexagon"
  | "rectangle";

const ENTITY_SHAPES: Record<string, NodeShape> = {
  Agent: "ellipse",
  Object: "round-rectangle",
  Event: "diamond",
  Concept: "hexagon",
};

interface GraphViewProps {
  data: GraphResponse;
  onSelectNode: (dbId: number) => void;
  onSelectEdge: (chunkId: number, edgeDbId: number) => void;
}

export default function GraphView({ data, onSelectNode, onSelectEdge }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements = [
      ...data.nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          dbId: n.db_id,
          mentionCount: n.mention_count,
        },
      })),
      ...data.edges.map((e) => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          relation: e.relation,
          dbId: e.db_id,
          chunkId: e.chunk_id,
          confidence: e.confidence,
        },
      })),
    ];

    cyRef.current?.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        // ── nodes · shape encodes type, fill stays neutral ──
        {
          selector: "node",
          style: {
            label: "data(label)",
            shape: ((ele: cytoscape.NodeSingular) =>
              ENTITY_SHAPES[ele.data("type") as string] ?? "ellipse") as unknown as NodeShape,
            "background-color": "#fafafa",
            "border-color": "#1a1a1a",
            "border-width": 1.5,
            color: "#1a1a1a",
            "text-valign": "bottom",
            "text-margin-y": 6,
            "font-size": "11px",
            "font-family": "Inter, system-ui, sans-serif",
            "font-weight": 500,
            "text-outline-color": "#ffffff",
            "text-outline-width": 2,
            width: (ele: cytoscape.NodeSingular) =>
              Math.min(64, 18 + Math.sqrt((ele.data("mentionCount") as number) ?? 1) * 4),
            height: (ele: cytoscape.NodeSingular) =>
              Math.min(64, 18 + Math.sqrt((ele.data("mentionCount") as number) ?? 1) * 4),
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-color": "#b8954a",
            "border-width": 3,
            "background-color": "#ffffff",
          },
        },

        // ── edges · base style (overridden below per relation) ──
        {
          selector: "edge",
          style: {
            "line-color": "#1a1a1a",
            "target-arrow-color": "#1a1a1a",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 0.9,
            opacity: 0.78,
            width: 1.2,
            label: "data(relation)",
            "font-size": "9px",
            "font-family": "JetBrains Mono, monospace",
            "font-weight": 600,
            color: "#666666",
            "text-rotation": "autorotate",
            "text-background-color": "#ffffff",
            "text-background-opacity": 1,
            "text-background-padding": "2",
            "text-margin-y": -2,
          },
        },

        // ── per-relation styling · line weight + dash pattern encodes type ──
        { selector: 'edge[relation = "STRUCTURAL"]', style: { width: 1.2 } },
        { selector: 'edge[relation = "INTERACTS"]', style: { width: 2.4 } },
        {
          selector: 'edge[relation = "ASSERTS"]',
          style: { "line-style": "dashed", "line-dash-pattern": [2, 3] },
        },
        {
          selector: 'edge[relation = "INFLUENCES"]',
          style: { "line-style": "dashed", "line-dash-pattern": [6, 3] },
        },
        {
          selector: 'edge[relation = "PREDICTS"]',
          style: {
            "line-color": "#b8954a",
            "target-arrow-color": "#b8954a",
            color: "#8a6f37",
            "line-style": "dashed",
            "line-dash-pattern": [6, 3],
            width: 1.8,
            opacity: 1,
          },
        },

        {
          selector: "edge:selected",
          style: {
            "line-color": "#b8954a",
            "target-arrow-color": "#b8954a",
            width: 3,
            opacity: 1,
            color: "#8a6f37",
          },
        },
      ],
      layout: {
        name: "cose-bilkent",
        // @ts-expect-error: cose-bilkent layout options not in core typing
        nodeRepulsion: 5000,
        idealEdgeLength: 110,
        edgeElasticity: 0.42,
        animate: false,
        randomize: true,
      },
      wheelSensitivity: 0.2,
    });

    cy.on("tap", "node", (e: EventObjectNode) => {
      const dbId = e.target.data("dbId") as number;
      onSelectNode(dbId);
    });
    cy.on("tap", "edge", (e: EventObjectEdge) => {
      const dbId = e.target.data("dbId") as number;
      const chunkId = e.target.data("chunkId") as number;
      onSelectEdge(chunkId, dbId);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [data, onSelectNode, onSelectEdge]);

  return <div ref={containerRef} className="w-full h-full bg-paper" />;
}
