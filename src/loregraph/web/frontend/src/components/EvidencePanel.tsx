import { useEntityDetail, useChunkDetail } from "../api/client";
import type { EntityType, RelationType } from "../types";
import { X, Quote } from "lucide-react";

interface EvidencePanelProps {
  mode: "entity" | "chunk" | null;
  entityDbId: number | null;
  chunkId: number | null;
  highlightEdgeDbId: number | null;
  onClose: () => void;
}

function entityChip(type: EntityType) {
  const cls = {
    Agent: "chip-agent",
    Object: "chip-object",
    Event: "chip-event",
    Concept: "chip-concept",
  }[type];
  return <span className={cls}>{type}</span>;
}

function relationChip(relation: RelationType) {
  return <span className="chip-relation">{relation}</span>;
}

export default function EvidencePanel(props: EvidencePanelProps) {
  const { mode, entityDbId, chunkId, highlightEdgeDbId, onClose } = props;

  const entityQ = useEntityDetail(mode === "entity" ? entityDbId : null);
  const chunkQ = useChunkDetail(mode === "chunk" ? chunkId : null);

  if (mode === null) {
    return (
      <aside className="w-[420px] border-l border-ink-200 bg-white p-6 overflow-y-auto">
        <div className="text-sm text-ink-500 leading-relaxed">
          <h2 className="font-semibold text-ink-700 mb-3">How to read this graph</h2>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong>Nodes</strong> are typed entities — colour by type, size by mention
              count.
            </li>
            <li>
              <strong>Edges</strong> are typed relations between entities (the 5 relation
              classes from the WMG ontology).
            </li>
            <li>
              Click any node or edge to see the original chunk text and every
              evidence-grounded claim associated with it.
            </li>
          </ul>
        </div>
      </aside>
    );
  }

  if (mode === "entity") {
    if (entityQ.isLoading) return <PanelShell onClose={onClose}>Loading…</PanelShell>;
    if (entityQ.isError || !entityQ.data)
      return <PanelShell onClose={onClose}>Failed to load entity.</PanelShell>;

    const { entity, mention_count, outgoing_edges, incoming_edges, glucose_facts } =
      entityQ.data;

    return (
      <PanelShell onClose={onClose}>
        <div className="flex items-baseline gap-2 mb-1">
          <h2 className="text-xl font-bold text-ink-900">{entity.canonical_name}</h2>
          {entityChip(entity.type)}
        </div>
        <div className="text-xs text-ink-500 font-mono mb-4">
          {entity.canonical_id} · {mention_count} mentions
        </div>
        {entity.aliases.length > 0 && (
          <div className="mb-4">
            <div className="text-xs uppercase tracking-wide text-ink-400 font-mono mb-1">
              Aliases
            </div>
            <div className="flex flex-wrap gap-1.5">
              {entity.aliases.map((a) => (
                <span key={a} className="text-sm text-ink-700">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
        {outgoing_edges.length > 0 && (
          <Section title="Outgoing edges">
            {outgoing_edges.map((e) => (
              <EdgeRow key={e.id} relation={e.relation} evidence={e.evidence_span} />
            ))}
          </Section>
        )}
        {incoming_edges.length > 0 && (
          <Section title="Incoming edges">
            {incoming_edges.map((e) => (
              <EdgeRow key={e.id} relation={e.relation} evidence={e.evidence_span} />
            ))}
          </Section>
        )}
        {glucose_facts.length > 0 && (
          <Section title="Implicit (GLUCOSE) facts">
            {glucose_facts.map((f) => (
              <div key={f.id} className="mb-3 last:mb-0">
                <div className="text-xs font-mono text-ink-400 mb-0.5">
                  {f.dimension} · {f.time_aspect} · {f.inference_depth}
                </div>
                <div className="text-sm text-ink-800">{f.statement}</div>
                <Evidence>{f.evidence_span}</Evidence>
              </div>
            ))}
          </Section>
        )}
      </PanelShell>
    );
  }

  // mode === "chunk"
  if (chunkQ.isLoading) return <PanelShell onClose={onClose}>Loading…</PanelShell>;
  if (chunkQ.isError || !chunkQ.data)
    return <PanelShell onClose={onClose}>Failed to load chunk.</PanelShell>;

  const { chunk, mentions, edges_in_chunk, glucose_facts_in_chunk } = chunkQ.data;
  const highlightedEdge = highlightEdgeDbId
    ? edges_in_chunk.find((e) => e.id === highlightEdgeDbId) ?? null
    : null;

  return (
    <PanelShell onClose={onClose}>
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="text-lg font-bold text-ink-900">{chunk.atom_id}</h2>
        <span className="text-xs text-ink-400 font-mono">
          ch {chunk.chapter} · seq {chunk.seq} · {chunk.token_count} tokens
        </span>
      </div>

      {highlightedEdge && (
        <div className="mb-3 p-3 rounded border border-amber-200 bg-amber-50">
          <div className="text-xs font-mono text-ink-500 mb-1">Selected edge</div>
          <div className="text-sm text-ink-900">{relationChip(highlightedEdge.relation)}</div>
          <Evidence>{highlightedEdge.evidence_span}</Evidence>
        </div>
      )}

      <Section title="Chunk text">
        <div className="text-sm text-ink-800 leading-relaxed whitespace-pre-wrap">
          {chunk.text}
        </div>
      </Section>

      {mentions.length > 0 && (
        <Section title={`Mentions (${mentions.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {mentions.map((m) => (
              <span key={m.id} className="text-xs text-ink-600 font-mono">
                {m.surface_form} <span className="text-ink-400">·</span>{" "}
                {m.type.slice(0, 3).toLowerCase()}
              </span>
            ))}
          </div>
        </Section>
      )}

      {edges_in_chunk.length > 0 && (
        <Section title={`Edges (${edges_in_chunk.length})`}>
          {edges_in_chunk.map((e) => (
            <EdgeRow key={e.id} relation={e.relation} evidence={e.evidence_span} />
          ))}
        </Section>
      )}

      {glucose_facts_in_chunk.length > 0 && (
        <Section title={`Implicit facts (${glucose_facts_in_chunk.length})`}>
          {glucose_facts_in_chunk.map((f) => (
            <div key={f.id} className="mb-2 last:mb-0">
              <div className="text-xs font-mono text-ink-400">
                {f.dimension} · {f.time_aspect}
              </div>
              <div className="text-sm text-ink-800">{f.statement}</div>
            </div>
          ))}
        </Section>
      )}
    </PanelShell>
  );
}

function PanelShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <aside className="w-[420px] border-l border-ink-200 bg-white overflow-y-auto">
      <div className="sticky top-0 flex justify-end p-2 bg-white/95 backdrop-blur border-b border-ink-100">
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-ink-100 text-ink-500"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <h3 className="text-xs uppercase tracking-wide text-ink-400 font-mono mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function EdgeRow({ relation, evidence }: { relation: RelationType; evidence: string }) {
  return (
    <div className="mb-2 last:mb-0 flex items-start gap-2">
      <span className="mt-0.5">{relationChip(relation)}</span>
      <Evidence>{evidence}</Evidence>
    </div>
  );
}

function Evidence({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 mt-1">
      <Quote size={11} className="text-ink-300 mt-1 flex-shrink-0" />
      <span className="text-sm text-ink-600 italic leading-snug">{children}</span>
    </div>
  );
}
