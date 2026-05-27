import { useEntityDetail, useChunkDetail } from "../api/client";
import type { EntityType, RelationType } from "../types";
import { useI18n, type Strings } from "../i18n";

interface EvidencePanelProps {
  mode: "entity" | "chunk" | null;
  entityDbId: number | null;
  chunkId: number | null;
  highlightEdgeDbId: number | null;
  onClose: () => void;
}

function typeLabel(type: EntityType, t: Strings): string {
  return {
    Agent: t.typeAgent,
    Object: t.typeObject,
    Event: t.typeEvent,
    Concept: t.typeConcept,
  }[type];
}

function ShapeGlyph({ type }: { type: EntityType }) {
  const p = { fill: "var(--surface)", stroke: "var(--ink)", strokeWidth: 1.4 };
  if (type === "Agent")
    return (
      <svg width="14" height="14" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7" {...p} />
      </svg>
    );
  if (type === "Object")
    return (
      <svg width="14" height="14" viewBox="0 0 20 20">
        <rect x="3" y="3" width="14" height="14" {...p} />
      </svg>
    );
  if (type === "Event")
    return (
      <svg width="14" height="14" viewBox="0 0 20 20">
        <polygon points="10,2 18,10 10,18 2,10" {...p} />
      </svg>
    );
  return (
    <svg width="14" height="14" viewBox="0 0 20 20">
      <polygon points="6,3 14,3 18,10 14,17 6,17 2,10" {...p} />
    </svg>
  );
}

function EntityChip({ type, t }: { type: EntityType; t: Strings }) {
  return (
    <span className="chip-ink inline-flex items-center gap-1.5">
      <ShapeGlyph type={type} />
      {typeLabel(type, t)}
    </span>
  );
}

function RelationChip({ relation }: { relation: RelationType }) {
  const isPrediction = relation === "PREDICTS";
  return (
    <span
      className={
        isPrediction
          ? "inline-flex items-center px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider bg-gold text-paper"
          : "chip-relation"
      }
    >
      {relation}
    </span>
  );
}

export default function EvidencePanel(props: EvidencePanelProps) {
  const { mode, entityDbId, chunkId, highlightEdgeDbId, onClose } = props;
  const { t } = useI18n();

  const entityQ = useEntityDetail(mode === "entity" ? entityDbId : null);
  const chunkQ = useChunkDetail(mode === "chunk" ? chunkId : null);

  // ── empty state ──
  if (mode === null) {
    return (
      <aside className="w-[460px] border-l border-ink-soft bg-paper overflow-y-auto">
        <div className="p-8 space-y-6">
          <div>
            <div className="section-label">{t.howToRead}</div>
            <div className="section-rule" />
          </div>
          <p className="font-serif italic text-body text-ink-muted leading-relaxed">
            {t.howToReadBody}
          </p>
          <div className="space-y-4">
            <Legend type="Agent" label={t.typeAgent} hint={t.hintAgent} />
            <Legend type="Object" label={t.typeObject} hint={t.hintObject} />
            <Legend type="Event" label={t.typeEvent} hint={t.hintEvent} />
            <Legend type="Concept" label={t.typeConcept} hint={t.hintConcept} />
          </div>
          <p className="text-caption text-ink-whisper italic">{t.clickHint}</p>
        </div>
      </aside>
    );
  }

  // ── entity detail ──
  if (mode === "entity") {
    if (entityQ.isLoading)
      return (
        <PanelShell onClose={onClose} t={t}>
          <Loading>{t.loadingGraph}</Loading>
        </PanelShell>
      );
    if (entityQ.isError || !entityQ.data)
      return (
        <PanelShell onClose={onClose} t={t}>
          <Loading>{t.failed}</Loading>
        </PanelShell>
      );

    const { entity, mention_count, outgoing_edges, incoming_edges, glucose_facts } =
      entityQ.data;

    return (
      <PanelShell onClose={onClose} t={t}>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-large font-bold text-ink leading-tight">
            {entity.canonical_name}
          </h2>
          <EntityChip type={entity.type} t={t} />
        </div>
        <div className="text-caption text-ink-whisper font-mono mb-6">
          {entity.canonical_id} · {mention_count}
        </div>

        {entity.aliases.length > 0 && (
          <Section title={t.aliases}>
            <div className="font-serif text-body text-ink leading-relaxed">
              {entity.aliases.join("  ·  ")}
            </div>
          </Section>
        )}

        {outgoing_edges.length > 0 && (
          <Section title={`${t.outgoingEdges} · ${outgoing_edges.length}`}>
            {outgoing_edges.map((e) => (
              <EdgeRow key={e.id} relation={e.relation} evidence={e.evidence_span} />
            ))}
          </Section>
        )}

        {incoming_edges.length > 0 && (
          <Section title={`${t.incomingEdges} · ${incoming_edges.length}`}>
            {incoming_edges.map((e) => (
              <EdgeRow key={e.id} relation={e.relation} evidence={e.evidence_span} />
            ))}
          </Section>
        )}

        {glucose_facts.length > 0 && (
          <Section title={`${t.implicitFacts} · ${glucose_facts.length}`}>
            {glucose_facts.map((f) => (
              <div key={f.id} className="mb-4 last:mb-0">
                <div className="text-tiny text-ink-whisper font-mono uppercase tracking-wider mb-1">
                  {f.dimension} · {f.time_aspect} · {f.inference_depth}
                </div>
                <div className="text-body text-ink mb-1.5">{f.statement}</div>
                <Quote>{f.evidence_span}</Quote>
              </div>
            ))}
          </Section>
        )}

        <VerifiedFooter label={t.verified} />
      </PanelShell>
    );
  }

  // ── chunk detail ──
  if (chunkQ.isLoading)
    return (
      <PanelShell onClose={onClose} t={t}>
        <Loading>{t.loadingGraph}</Loading>
      </PanelShell>
    );
  if (chunkQ.isError || !chunkQ.data)
    return (
      <PanelShell onClose={onClose} t={t}>
        <Loading>{t.failed}</Loading>
      </PanelShell>
    );

  const { chunk, edges_in_chunk, glucose_facts_in_chunk } = chunkQ.data;
  const highlightedEdge = highlightEdgeDbId
    ? edges_in_chunk.find((e) => e.id === highlightEdgeDbId) ?? null
    : null;

  return (
    <PanelShell onClose={onClose} t={t}>
      <div className="flex items-baseline gap-3 mb-1">
        <h2 className="text-large font-bold font-mono text-ink leading-tight">
          {chunk.atom_id}
        </h2>
      </div>
      <div className="text-caption text-ink-whisper font-mono mb-6">
        ch {chunk.chapter} · seq {chunk.seq} · {chunk.token_count} tok
      </div>

      {highlightedEdge && (
        <div className="mb-6 border-l-2 border-gold bg-surface p-4">
          <div className="text-tiny text-gold-deep font-bold uppercase tracking-caps mb-2">
            {t.selectedEdge}
          </div>
          <div className="mb-2">
            <RelationChip relation={highlightedEdge.relation} />
          </div>
          <Quote>{highlightedEdge.evidence_span}</Quote>
        </div>
      )}

      <Section title={t.chunkText}>
        <div className="text-body text-ink leading-relaxed whitespace-pre-wrap font-serif">
          {chunk.text}
        </div>
      </Section>

      {edges_in_chunk.length > 0 && (
        <Section title={`${t.outgoingEdges} · ${edges_in_chunk.length}`}>
          {edges_in_chunk.map((e) => (
            <EdgeRow key={e.id} relation={e.relation} evidence={e.evidence_span} />
          ))}
        </Section>
      )}

      {glucose_facts_in_chunk.length > 0 && (
        <Section title={`${t.implicitFacts} · ${glucose_facts_in_chunk.length}`}>
          {glucose_facts_in_chunk.map((f) => (
            <div key={f.id} className="mb-3 last:mb-0">
              <div className="text-tiny text-ink-whisper font-mono uppercase tracking-wider mb-0.5">
                {f.dimension} · {f.time_aspect}
              </div>
              <div className="text-body text-ink">{f.statement}</div>
            </div>
          ))}
        </Section>
      )}

      <VerifiedFooter label={t.verified} />
    </PanelShell>
  );
}

function PanelShell({
  children,
  onClose,
  t,
}: {
  children: React.ReactNode;
  onClose: () => void;
  t: Strings;
}) {
  return (
    <aside className="w-[460px] border-l border-ink-soft bg-paper overflow-y-auto">
      <div className="sticky top-0 flex justify-end p-2 bg-paper/95 backdrop-blur border-b border-ink-soft">
        <button
          onClick={onClose}
          className="px-2 py-1 text-tiny font-bold uppercase tracking-caps text-ink-whisper hover:text-ink"
          aria-label={t.close}
        >
          {t.close} ✕
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
      <div className="section-rule" />
      {children}
    </div>
  );
}

function Legend({ type, label, hint }: { type: EntityType; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-3">
      <ShapeGlyph type={type} />
      <span className="text-body text-ink font-medium w-24">{label}</span>
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
  return <div className="font-serif italic text-body text-ink-muted">{children}</div>;
}

function VerifiedFooter({ label }: { label: string }) {
  return (
    <div className="mt-8 pt-4 border-t border-ink-soft">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold text-paper text-tiny font-bold uppercase tracking-caps">
        ✓ {label}
      </div>
    </div>
  );
}
