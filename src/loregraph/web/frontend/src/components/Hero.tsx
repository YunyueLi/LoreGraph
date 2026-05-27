import { useI18n } from "../i18n";

type Shape = "circle" | "square" | "diamond" | "hexagon";
const SHAPE_CYCLE: Shape[] = ["circle", "square", "diamond", "hexagon"];

function NodeGlyph({ shape }: { shape: Shape }) {
  const p = { fill: "var(--surface)", stroke: "var(--ink)", strokeWidth: 1.4 };
  if (shape === "circle")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" {...p} />
      </svg>
    );
  if (shape === "square")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24">
        <rect x="4" y="4" width="16" height="16" {...p} />
      </svg>
    );
  if (shape === "diamond")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24">
        <polygon points="12,3 21,12 12,21 3,12" {...p} />
      </svg>
    );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <polygon points="7,4 17,4 22,12 17,20 7,20 2,12" {...p} />
    </svg>
  );
}

export default function Hero({ onEnter }: { onEnter: () => void }) {
  const { t } = useI18n();

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
      {/* eyebrow */}
      <div className="text-tiny font-bold uppercase tracking-wide2 text-ink-whisper mb-10">
        {t.heroEyebrow}
      </div>

      {/* headline with handwritten gold emphasis */}
      <h1 className="font-sans font-bold text-hero tracking-tight max-w-5xl text-ink">
        {t.heroLine1}
        <span className="hand-emphasis whitespace-nowrap mx-3 inline-block">
          {t.heroEmphasis}
        </span>
        {t.heroLine2}
      </h1>

      {/* sub */}
      <p className="mt-8 max-w-xl text-large text-ink-muted leading-relaxed">
        {t.heroSub}
      </p>

      {/* CTA */}
      <button
        onClick={onEnter}
        className="mt-10 inline-flex items-center gap-2 text-caption font-bold uppercase tracking-caps text-ink hover:text-gold transition-colors"
      >
        {t.heroCta}
        <span aria-hidden>→</span>
      </button>

      {/* handwritten footer line */}
      <div className="mt-24 font-hand text-2xl text-ink-muted">{t.heroFooter}</div>

      {/* a row of graph-node glyphs (LoreGraph's answer to mighta's people) */}
      <div className="mt-6 flex items-end gap-3 opacity-70 flex-wrap justify-center max-w-4xl">
        {Array.from({ length: 18 }).map((_, i) => (
          <NodeGlyph key={i} shape={SHAPE_CYCLE[i % SHAPE_CYCLE.length]} />
        ))}
      </div>
    </section>
  );
}
