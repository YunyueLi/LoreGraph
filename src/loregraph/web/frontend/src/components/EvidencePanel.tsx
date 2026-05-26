import { useEntityDetail, useChunkDetail } from "../api/client";
import type { EntityType, RelationType } from "../types";

interface EvidencePanelProps {
  mode: "entity" | "chunk" | null;
  entityDbId: number | null;
  chunkId: number | null;
  highlightEdgeDbId: number | null;
  onClose: () => void;
}

// ────────────────────────────────────────────────────────────────────
// Type & relation chips
// ────────────────────────────────────────────────────────────────────

function ShapeGlyph({ type }: { type: EntityType }) {
  const props = {
    width: 14,
    height: 14,
    fill: "#fafafa",
    stroke: "#1a1a1a",
    strokeWidth: 1.4,
  };
  if (type === "Agent") {
    return (
      <svg {...props} viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7" />
      </svg>
    );
  }
  if (type === "Object") {
    return (
      <svg {...props} viewBox="0 0 20 20">
        <rect x="3" y="3" width="14" height="14" />
      </svg>
    );
  }
  if (type === "Event") {
    return (
      <svg {...props} viewBox="0 0 20 20">
        <polygon points="10,2 18,10 10,18 2,10" />
      </svg>
    );
  }
  return (
    <svg {...props} viewBox="0 0 20 20">
      <polygon points="6,3 14,3 18,10 14,17 6,17 2,10" />
    </svg>
  );
}

function EntityChip({ type }: { type: EntityType }) {
  return (
    <span className="chip-ink inline-flex items-center gap-1.5">
      <ShapeGlyph type={type} />
      {type}
    </span>
  );
}

function RelationChip({ relation }: { relation: RelationType }) {
  const isPrediction = relation === "PREDICTS";
  return (
    <span
      className={
        isPrediction
          ? "inline-flex items-center px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider bg-gold text-ink"
          : "chip-relation"
      }
    >
      {relation}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────
// Panel
// ────────────────────────────────────────────────────────────────────

export default function EvidencePanel(props: EvidencePanelProps) {
  const { mode, entityDbId, chunkId, highlightEdgeDbId, onClose } = props;

  const entityQ = useEntityDetail(mode === "entity" ? entityDbId : null);
  const chunkQ = useChunkDetail(mode === "chunk" ? chunkId : null);

  // ── empty state · how to read the graph ──
  if (mode === null) {
    return (
      <aside className="w-[460px] border-l border-ink-soft bg-paper overflow-y-auto">
        <div className="p-8 space-y-6">
          <div>
            <div className="section-label">How to read this graph</div>
            <div className="section-rule"></div>
          </div>
          <p className="font-serif italic text-body text-ink-muted leading-relaxed">
            Every node is a typed entity, every edge a typed relation. Each
            claim is anchored to a literal span of the source text.
          </p>
          <div className="space-y-4">
            <Legend type="Agent" label="Agent" hint="characters, groups" />
            <Legend type="Object" label="Object" hint="places, things, documents" />
            <Legend type="Event" label="Event" hint="realis triggers — what happened" />
            <Legend type="Concept" label="Concept" hint="themes, predictions, motifs" />
          </div>
          <p className="text-caption text-ink-whisper italic">
            Click any node or edge to inspect its source.
          </p>
        </div>
      </aside>
    );
  }

  // ── entity detail ──
  if (mode === "entity") {
    if (entityQ.isLoading)
      return (
        <PanelShell onClose={onClose}>
          <Loading>Loading entity…</Loading>
        </PanelShell>
      );
    if (entityQ.isError || !entityQ.data)
      return (
        <PanelShell onClose={onClose}>
          <Failed>Failed to load entity.</Failed>
        </PanelShell>
      );

    const { entity, mention_count, outgoing_edges, incoming_edges, glucose_facts } =
      entityQ.data;

    return (
      <PanelShell onClose={onClose}>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-large font-bold text-ink leading-tight">
            {entity.canonical_name}
          </h2>
          <EntityChip type={entity.type} />
        </div>
        <div className="text-caption text-ink-whisper font-mono mb-6">
          {entity.canonical_id}  ·  {mention_count} mentions
        </div>

        {entity.aliases.length > 0 && (
          <Section title="Aliases">
            <div className="font-serif text-body text-ink leading-relaxed">
              {entity.aliases.join("  ·  ")}
            </div>
          </Section>
        )}

        {outgoing_edges.length > 0 && (
          <Section title={`Outgoing edges  ·  ${outgoing_edges.length}`}>
            {outgoing_edges.map((e) => (
              <EdgeRow key={e.id} relation={e.relation} evidence={e.evidence_span} />
            ))}
          </Section>
        )}

        {incoming_edges.length > 0 && (
          <Section title={`Incoming edges  ·  ${incoming_edges.length}`}>
            {incoming_edges.map((e) => (
              <EdgeRow key={e.id} relation={e.relation} evidence={e.evidence_span} />
            ))}
          </Section>
        )}

        {glucose_facts.length > 0 && (
          <Section title={`Implicit facts  ·  GLUCOSE  ·  ${glucose_facts.length}`}>
            {glucose_facts.map((f) => (
              <div key={f.id} className="mb-4 last:mb-0">
                <div className="text-tiny text-ink-whisper font-mono uppercase tracking-wider mb-1">
                  {f.dimension}  ·  {f.time_aspect}  ·  {f.inference_depth}
                </div>
                <div className="text-body text-ink mb-1.5">{f.statement}</div>
                <Quote>{f.evidence_span}</Quote>
              </div>
            ))}
          </Section>
        )}

        <VerifiedFooter />
      </PanelShell>
    );
  }

  // ── chunk detail ──
  if (chunkQ.isLoading)
    return (
      <PanelShell onClose={onClose}>
        <Loading>Loading chunk…</Loading>
      </PanelShell>
    );
  if (chunkQ.isError || !chunkQ.data)
    return (
      <PanelShell onClose={onClose}>
        <Failed>Failed to load chunk.</Failed>
      </PanelShell>
    );

  const { chunk, mentions, edges_in_chunk, glucose_facts_in_chunk } = chunkQ.data;
  const highlightedEdge = highlightEdgeDbId
    ? edges_in_chunk.find((e) => e.id === highlightEdgeDbId) ?? null
    : null;

  return (
    <PanelShell onClose={onClose}>
      <div className="flex items-baseline gap-3 mb-1">
        <h2 className="text-large font-bold font-mono text-ink leading-tight">
          {chunk.atom_id}
        </h2>
      </div>
      <div className="text-caption text-ink-whisper font-mono mb-6">
        chapter {chunk.chapter}  ·  seq {chunk.seq}  ·  {chunk.token_count} tokens
      </div>

      {highlightedEdge && (
        <div className="mb-6 border-l-2 border-gold bg-surface p-4">
          <div className="text-tiny text-gold-deep font-bold uppercase tracking-caps mb-2">
            Selected edge
          </div>
          <div className="mb-2">
            <RelationChip relation={highlightedEdge.relation} />
          </div>
          <Quote>{highlightedEdge.evidence_span}</Quote>
        </div>
      )}

      <Section title="Chunk text">
        <div className="text-body text-ink leading-relaxed whitespace-pre-wrap font-serif">
          {chunk.text}
        </div>
      </Section>

      {mentions.length > 0 && (
        <Section title={`Mentions  ·  ${mentions.length}`}>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {mentions.map((m) => (
              <span key={m.id} className="text-caption text-ink-muted font-mono">
                {m.surface_form}{" "}
                <span className="text-ink-whisper">{m.type.toLowerCase()}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {edges_in_chunk.length > 0 && (
        <Section title={`Edges in this chunk  ·  ${edges_in_chunk.length}`}>
          {edges_in_chunk.map((e) => (
            <EdgeRow key={e.id} relation={e.relation} evidence={e.evidence_span} />
          ))}
        </Section>
      )}

      {glucose_facts_in_chunk.length > 0 && (
        <Section title={`Implicit facts  ·  ${glucose_facts_in_chunk.length}`}>
          {glucose_facts_in_chunk.map((f) => (
            <div key={f.id} className="mb-3 last:mb-0">
              <div className="text-tiny text-ink-whisper font-mono uppercase tracking-wider mb-0.5">
                {f.dimension}  ·  {f.time_aspect}
              </div>
              <div className="text-body text-ink">{f.statement}</div>
            </div>
          ))}
        </Section>
      )}

      <VerifiedFooter />
    </PanelShell>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────

function PanelShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <aside className="w-[460px] border-l border-ink-soft bg-paper overflow-y-auto">
      <div className="sticky top-0 flex justify-end p-2 bg-paper/95 backdrop-blur border-b border-ink-soft">
        <button
          onClick={onClose}
          className="px-2 py-1 text-tiny font-bold uppercase tracking-caps text-ink-whisper hover:text-ink"
          aria-label="Close"
        >
          close ✕
        </button>
      </div>
      <div className="p-8">{children}</div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <div className="section-label">{title}</div>
      <div className="section-rule"></div>
      {children}
    </div>
  );
}

function Legend({
  type,
  label,
  hint,
}: {
  type: EntityType;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <ShapeGlyph type={type} />
      <span className="text-body text-ink font-medium w-20">{label}</span>
      <span className="font-serif italic text-caption text-ink-whisper">{hint}</span>
    </div>
  );
}

function EdgeRow({ relation, evidence }: { relation: RelationType; evidence: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5">
        <RelationChip relation={relation} />
      </div>
      <Quote>{evidence}</Quote>
    </div>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return <div className="quote text-[13.5px]">{children}</div>;
}

function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-body text-ink-muted italic font-serif">{children}</div>
  );
}

function Failed({ children }: { children: React.ReactNode }) {
  return <div className="text-body text-ink-muted">{children}</div>;
}

function VerifiedFooter() {
  return (
    <div className="mt-8 pt-4 border-t border-ink-soft">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold text-ink text-tiny font-bold uppercase tracking-caps">
        ✓  Pass-7 verified
      </div>
    </div>
  );
}
