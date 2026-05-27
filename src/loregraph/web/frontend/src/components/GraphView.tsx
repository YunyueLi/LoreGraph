import { useEffect, useRef } from "react";
import cytoscape, { Core, EventObjectNode, EventObjectEdge } from "cytoscape";
// @ts-expect-error: no types for cytoscape-cose-bilkent
import coseBilkent from "cytoscape-cose-bilkent";
import type { GraphResponse } from "../types";

if (
  !(cytoscape as unknown as { _coseBilkentRegistered?: boolean })._coseBilkentRegistered
) {
  cytoscape.use(coseBilkent);
  (cytoscape as unknown as { _coseBilkentRegistered?: boolean })._coseBilkentRegistered = true;
}

type NodeShape = "ellipse" | "round-rectangle" | "diamond" | "hexagon" | "rectangle";

const ENTITY_SHAPES: Record<string, NodeShape> = {
  Agent: "ellipse",
  Object: "round-rectangle",
  Event: "diamond",
  Concept: "hexagon",
};

interface GraphViewProps {
  data: GraphResponse;
  dark: boolean;
  onSelectNode: (dbId: number) => void;
  onSelectEdge: (chunkId: number, edgeDbId: number) => void;
}

export default function GraphView({ data, dark, onSelectNode, onSelectEdge }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const C = dark
      ? {
          nodeFill: "#1a1a17",
          nodeBorder: "#f0ebe0",
          nodeSelFill: "#0e0e0d",
          text: "#f0ebe0",
          outline: "#0e0e0d",
          edge: "#8f8a7e",
          gold: "#d4af6a",
          goldText: "#d4af6a",
          label: "#a39e92",
        }
      : {
          nodeFill: "#fafafa",
          nodeBorder: "#1a1a1a",
          nodeSelFill: "#ffffff",
          text: "#1a1a1a",
          outline: "#ffffff",
          edge: "#1a1a1a",
          gold: "#b8954a",
          goldText: "#8a6f37",
          label: "#666666",
        };

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
            shape: ((ele: cytoscape.NodeSingular) =>
              ENTITY_SHAPES[ele.data("type") as string] ?? "ellipse") as unknown as NodeShape,
            "background-color": C.nodeFill,
            "border-color": C.nodeBorder,
            "border-width": 1.5,
            color: C.text,
            "text-valign": "bottom",
            "text-margin-y": 6,
            "font-size": "11px",
            "font-family": "Inter, system-ui, sans-serif",
            "font-weight": 500,
            "text-outline-color": C.outline,
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
            "border-color": C.gold,
            "border-width": 3,
            "background-color": C.nodeSelFill,
          },
        },
        {
          selector: "edge",
          style: {
            "line-color": C.edge,
            "target-arrow-color": C.edge,
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 0.9,
            opacity: 0.78,
            width: 1.2,
            label: "data(relation)",
            "font-size": "9px",
            "font-family": "JetBrains Mono, monospace",
            "font-weight": 600,
            color: C.label,
            "text-rotation": "autorotate",
            "text-background-color": dark ? "#0e0e0d" : "#ffffff",
            "text-background-opacity": 1,
            "text-background-padding": "2",
            "text-margin-y": -2,
          },
        },
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
            "line-color": C.gold,
            "target-arrow-color": C.gold,
            color: C.goldText,
            "line-style": "dashed",
            "line-dash-pattern": [6, 3],
            width: 1.8,
            opacity: 1,
          },
        },
        {
          selector: "edge:selected",
          style: {
            "line-color": C.gold,
            "target-arrow-color": C.gold,
            width: 3,
            opacity: 1,
            color: C.goldText,
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
      onSelectNode(e.target.data("dbId") as number);
    });
    cy.on("tap", "edge", (e: EventObjectEdge) => {
      onSelectEdge(e.target.data("chunkId") as number, e.target.data("dbId") as number);
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [data, dark, onSelectNode, onSelectEdge]);

  return <div ref={containerRef} className="w-full h-full bg-paper" />;
}
