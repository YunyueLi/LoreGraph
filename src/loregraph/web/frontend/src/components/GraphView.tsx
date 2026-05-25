import { useEffect, useRef } from "react";
import cytoscape, { Core, EventObjectNode, EventObjectEdge } from "cytoscape";
// @ts-expect-error: no types for cytoscape-cose-bilkent
import coseBilkent from "cytoscape-cose-bilkent";
import type { GraphResponse } from "../types";

if (!(cytoscape as unknown as { _coseBilkentRegistered?: boolean })._coseBilkentRegistered) {
  cytoscape.use(coseBilkent);
  (cytoscape as unknown as { _coseBilkentRegistered?: boolean })._coseBilkentRegistered = true;
}

const ENTITY_COLORS: Record<string, string> = {
  Agent: "#3a6fa5",
  Object: "#0e7a7a",
  Event: "#b17304",
  Concept: "#6d4e94",
};

const RELATION_COLORS: Record<string, string> = {
  STRUCTURAL: "#475569",
  INTERACTS: "#3a6fa5",
  ASSERTS: "#0e7a7a",
  INFLUENCES: "#b17304",
  PREDICTS: "#1e8848",
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
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": (ele: cytoscape.NodeSingular) =>
              ENTITY_COLORS[ele.data("type") as string] ?? "#64748b",
            color: "#0f172a",
            "text-valign": "bottom",
            "text-margin-y": 4,
            "font-size": "11px",
            "font-family": "Inter, system-ui, sans-serif",
            width: (ele: cytoscape.NodeSingular) =>
              Math.min(60, 14 + Math.sqrt((ele.data("mentionCount") as number) ?? 1) * 4),
            height: (ele: cytoscape.NodeSingular) =>
              Math.min(60, 14 + Math.sqrt((ele.data("mentionCount") as number) ?? 1) * 4),
            "border-width": 1,
            "border-color": "#1e293b",
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 3,
            "border-color": "#0f172a",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": (ele: cytoscape.EdgeSingular) =>
              RELATION_COLORS[ele.data("relation") as string] ?? "#94a3b8",
            "target-arrow-color": (ele: cytoscape.EdgeSingular) =>
              RELATION_COLORS[ele.data("relation") as string] ?? "#94a3b8",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            opacity: 0.75,
            label: "data(relation)",
            "font-size": "9px",
            "font-family": "JetBrains Mono, monospace",
            color: "#475569",
            "text-rotation": "autorotate",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.85,
            "text-background-padding": "2",
          },
        },
        {
          selector: "edge:selected",
          style: {
            width: 3,
            opacity: 1,
          },
        },
      ],
      layout: {
        name: "cose-bilkent",
        // @ts-expect-error: cose-bilkent layout options not in core typing
        nodeRepulsion: 4500,
        idealEdgeLength: 100,
        edgeElasticity: 0.45,
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

  return <div ref={containerRef} className="w-full h-full bg-ink-50" />;
}
