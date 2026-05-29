// LoreGraph — Timeline view (bold redesign)
// Three modes: Folio (vertical codex), Stage (one-at-a-time cinematic), Ribbon (compact horizontal).
// Event detail + evidence expansion redesigned: pivot quote as the centerpiece,
// chunk context unfoldable, phase marginalia, gold rules.

const { useState, useRef, useEffect, useMemo, useCallback } = React;

/* =================== EVENTS + PHASES =================== */

const TL_EVENTS = [
  { id: "v01", chapter: 1,  phase: "opening",    lane: -2, pivotEdge: null,    pivotQuote: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife." },
  { id: "v02", chapter: 3,  phase: "opening",    lane:  0, pivotEdge: "ed01",  pivotQuote: null },
  { id: "v08", chapter: 22, phase: "misreading", lane: -1, pivotEdge: "ed11",  pivotQuote: null },
  { id: "v03", chapter: 34, phase: "misreading", lane: -2, pivotEdge: "ed04",  pivotQuote: null },
  { id: "v05", chapter: 43, phase: "crisis",     lane:  1, pivotEdge: "ed19",  pivotQuote: null },
  { id: "v04", chapter: 46, phase: "crisis",     lane:  2, pivotEdge: "ed08",  pivotQuote: null },
  { id: "v06", chapter: 56, phase: "resolution", lane:  1, pivotEdge: "ed13",  pivotQuote: null },
  { id: "v07", chapter: 58, phase: "resolution", lane: -1, pivotEdge: "ed14",  pivotQuote: null },
];

const TL_PHASES = [
  { id: "opening",    start: 1,  end: 12, color: "#5a6a3f", roman: "I",
    label: { en: "Opening", "zh-CN": "开篇", "zh-TW": "開篇", ja: "序", ko: "도입", fr: "Ouverture", es: "Apertura", de: "Eröffnung" },
    sub:   { en: "Meryton & first impressions", "zh-CN": "梅里顿，第一印象", "zh-TW": "梅里頓，第一印象", ja: "メリトンと第一印象", ko: "메리튼과 첫인상", fr: "Meryton & premières impressions", es: "Meryton y las primeras impresiones", de: "Meryton & erster Eindruck" } },
  { id: "misreading", start: 13, end: 38, color: "#8a6e36", roman: "II",
    label: { en: "Misreading", "zh-CN": "误读", "zh-TW": "誤讀", ja: "誤読", ko: "오독", fr: "Méprise", es: "Equívoco", de: "Missdeutung" },
    sub:   { en: "Hunsford & the letter", "zh-CN": "亨斯福德与达西的信", "zh-TW": "亨斯福德與達西的信", ja: "ハンスフォードと手紙", ko: "헌스포드와 편지", fr: "Hunsford & la lettre", es: "Hunsford y la carta", de: "Hunsford & Brief" } },
  { id: "crisis",     start: 39, end: 51, color: "#a04a2a", roman: "III",
    label: { en: "Crisis", "zh-CN": "危机", "zh-TW": "危機", ja: "危機", ko: "위기", fr: "Crise", es: "Crisis", de: "Krise" },
    sub:   { en: "Lydia & Pemberley", "zh-CN": "莉迪亚与潘伯里", "zh-TW": "莉迪亞與潘伯里", ja: "リディアとペンバリー", ko: "리디아와 펨벌리", fr: "Lydia & Pemberley", es: "Lydia y Pemberley", de: "Lydia & Pemberley" } },
  { id: "resolution", start: 52, end: 61, color: "#4a6a8a", roman: "IV",
    label: { en: "Resolution", "zh-CN": "终章", "zh-TW": "終章", ja: "終結", ko: "결말", fr: "Résolution", es: "Resolución", de: "Auflösung" },
    sub:   { en: "Reckoning & reunion", "zh-CN": "对峙与重逢", "zh-TW": "對峙與重逢", ja: "対峙と再会", ko: "대치와 재회", fr: "Confrontation & retrouvailles", es: "Confrontación y reencuentro", de: "Konfrontation & Wiedersehen" } },
];

// Active phases for the current book. ViewTimeline points this at the book's
// generated timeline (or the curated P&P default) before any child renders, so
// the mode components can read it without prop-threading.
let _activePhases = TL_PHASES;

/* =================== HELPERS =================== */

function toRoman(n) {
  const map = [["M",1000],["CM",900],["D",500],["CD",400],["C",100],["XC",90],["L",50],["XL",40],["X",10],["IX",9],["V",5],["IV",4],["I",1]];
  let r = ""; for (const [k,v] of map) { while (n >= v) { r += k; n -= v; } } return r;
}
function tlPhaseLabel(phase, locale, key="label") { return phase[key][locale] || phase[key].en; }
function tlGetParticipants(eventId, edges, entities) {
  const ev = entities.find(e => e.id === eventId);
  const chapters = new Set(ev?.chapters || []);
  const out = new Set();
  edges.forEach(e => {
    // Direct: event ↔ entity
    if (e.src === eventId) {
      const dst = entities.find(en => en.id === e.dst);
      if (dst?.type === "agent") out.add(e.dst);
    }
    if (e.dst === eventId) {
      const src = entities.find(en => en.id === e.src);
      if (src?.type === "agent") out.add(e.src);
    }
    // Same chapter
    const m = /^ch(\d+)_p\d+$/.exec(e.chunk || "");
    if (m && chapters.has(parseInt(m[1]))) {
      const src = entities.find(en => en.id === e.src);
      const dst = entities.find(en => en.id === e.dst);
      if (src?.type === "agent") out.add(e.src);
      if (dst?.type === "agent") out.add(e.dst);
    }
  });
  return Array.from(out);
}
function tlGetEvidenceEdges(eventId, edges, entities) {
  const ev = entities.find(e => e.id === eventId);
  const chapters = new Set(ev?.chapters || []);
  const seen = new Set();
  const out = [];
  // 1. Direct edges
  edges.forEach(e => {
    if (e.src === eventId || e.dst === eventId) {
      if (!seen.has(e.id)) { seen.add(e.id); out.push(e); }
    }
  });
  // 2. Same-chapter edges
  edges.forEach(e => {
    if (seen.has(e.id)) return;
    const m = /^ch(\d+)_p\d+$/.exec(e.chunk || "");
    if (m && chapters.has(parseInt(m[1]))) { seen.add(e.id); out.push(e); }
  });
  return out;
}
function tlGetPivot(ev, allEdges, evidenceEdges) {
  // Prefer explicit pivotEdge id (might be outside the event's evidenceEdges
  // because it's a thematic anchor between entities in the same chapter).
  if (ev.pivotEdge) {
    return allEdges.find(e => e.id === ev.pivotEdge) || evidenceEdges[0];
  }
  return evidenceEdges[0];
}

/* =================== TOP-LEVEL =================== */

function ViewTimeline({ ctx }) {
  const { tt, data: _rawData, entities, edges, locale, selectedEntityId, setSelectedEntityId, tlMode, chunks: bookChunks, glucose: bookGlucose, activeBook } = ctx;
  // Shadow `data` with per-book-scoped chunks/edges/glucose so every internal
  // `data.X` reference and every subcomponent receiving `data={data}` reads
  // the active book's records (not the global pool that mixes all books).
  const data = { ..._rawData, chunks: bookChunks, edges, glucose: bookGlucose };
  const mode = tlMode || "folio";
  const [selectedEventId, setSelectedEventId] = useState("v03");
  const [phaseFilter, setPhaseFilter] = useState(null);

  const events = (activeBook && activeBook.timelineEvents && activeBook.timelineEvents.length)
    ? activeBook.timelineEvents : TL_EVENTS;
  _activePhases = (activeBook && activeBook.timelinePhases && activeBook.timelinePhases.length)
    ? activeBook.timelinePhases : TL_PHASES;
  const visibleEvents = phaseFilter ? events.filter(e => e.phase === phaseFilter) : events;
  const safeEventId = events.some(e => e.id === selectedEventId) ? selectedEventId : (events[0] && events[0].id);

  const shared = {
    ctx, tt, data, entities, locale,
    selectedEntityId, setSelectedEntityId,
    selectedEventId: safeEventId, setSelectedEventId,
    events, visibleEvents, phaseFilter, setPhaseFilter,
  };

  return (
    <div className={"tl2 tl2-mode-" + mode}>
      <TimelineToolbar {...shared} />
      {mode === "folio"  && <FolioMode  {...shared} />}
      {mode === "stage"  && <StageMode  {...shared} />}
      {mode === "ribbon" && <RibbonMode {...shared} />}
    </div>
  );
}

/* =================== TOOLBAR (title + phase filter only) =================== */

function TimelineToolbar({ tt, locale, events, phaseFilter, setPhaseFilter }) {
  return (
    <div className="tl2-toolbar">
      <div className="tl2-title">
        <div className="tl2-eyebrow">{tt("nav.timeline").toUpperCase()} · {events.length} {locale === "en" ? "events" : locale === "zh-CN" ? "个事件" : locale === "zh-TW" ? "個事件" : locale === "ja" ? "件" : locale === "ko" ? "사건" : locale === "fr" ? "événements" : locale === "es" ? "eventos" : "Ereignisse"}</div>
        <h1>{tt("tl.title")}</h1>
      </div>

      <div className="tl2-controls">
        {/* phase filter */}
        <div className="tl2-phase-row">
          <button
            className={"tl2-phase-pip " + (!phaseFilter ? "active" : "")}
            onClick={() => setPhaseFilter(null)}>
            <span className="tl2-phase-pip-bar" style={{background: "var(--gold-deep)"}} />
            <span>{tt("tl.all")}</span>
            <span className="tl2-phase-pip-ct">{events.length}</span>
          </button>
          {_activePhases.map(p => {
            const n = events.filter(e => e.phase === p.id).length;
            return (
              <button key={p.id}
                className={"tl2-phase-pip " + (phaseFilter === p.id ? "active" : "")}
                onClick={() => setPhaseFilter(p.id === phaseFilter ? null : p.id)}
                style={{"--phase-color": p.color}}>
                <span className="tl2-phase-pip-bar" style={{background: p.color}} />
                <span>{tlPhaseLabel(p, locale)}</span>
                <span className="tl2-phase-pip-ct">{n}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ModeIcon() { return null; /* deprecated — mode switcher moved to topbar */ }

/* =================== EVIDENCE — shared expandable =================== */

function EvidenceBlock({ edge, data, locale, tt, dense, big }) {
  const [open, setOpen] = useState(false);
  const chunk = data.chunks.find(c => c.id === edge.chunk);
  const rel = window.t("rel."+edge.rel) || edge.rel;
  // Highlight evidence inside the chunk
  const evidenceText = (edge.evidence || "").trim();
  let head = null, hit = null, tail = null;
  if (chunk && evidenceText) {
    const idx = chunk.text.indexOf(evidenceText.slice(0, Math.min(40, evidenceText.length)));
    if (idx >= 0) {
      head = chunk.text.slice(0, idx);
      const end = idx + evidenceText.length;
      hit = chunk.text.slice(idx, end);
      tail = chunk.text.slice(end);
    } else {
      head = chunk.text;
    }
  }
  const confColor = edge.conf >= 0.98 ? "var(--green)" : edge.conf >= 0.92 ? "var(--gold-deep)" : "var(--rust)";

  return (
    <div className={"tl2-evid " + (open ? "open " : "") + (big ? "tl2-evid-big " : "") + (dense ? "tl2-evid-dense" : "")}>
      <div className="tl2-evid-rel">
        <span className="tl2-evid-rel-dot" />
        <span className="tl2-evid-rel-text">{rel}</span>
        <span className="tl2-evid-rel-cite">{window.friendlyChunkId(edge.chunk, locale)}</span>
        {edge.verified && (
          <span className="tl2-evid-rel-verified">
            <svg viewBox="0 0 12 12" width="10" height="10" stroke="currentColor" strokeWidth="1.4" fill="none">
              <path d="M 2 6.5 L 5 9 L 10 3.5" />
            </svg>
            {tt("gv.verifiedBy")}
          </span>
        )}
      </div>

      <blockquote className="tl2-evid-quote">
        <span className="tl2-evid-mark-open">&ldquo;</span>
        {evidenceText}
        <span className="tl2-evid-mark-close">&rdquo;</span>
      </blockquote>

      <div className="tl2-evid-foot">
        <span className="tl2-evid-conf" style={{color: confColor}}>
          <span className="tl2-evid-conf-bar" style={{background: confColor}}>
            <span style={{width: (edge.conf * 100) + "%", background: confColor}} />
          </span>
          <span className="tl2-evid-conf-num">{(edge.conf * 100).toFixed(0)}</span>
          <span className="tl2-evid-conf-lbl">{tt("gv.conf")}</span>
        </span>
        {chunk && (
          <button className="tl2-evid-expand" onClick={() => setOpen(o => !o)}>
            <span className="tl2-evid-expand-caret" style={{transform: open ? "rotate(90deg)" : ""}}>▸</span>
            <span>{open
              ? (locale === "en" ? "Fold passage" : locale === "zh-CN" ? "收起原文" : locale === "zh-TW" ? "收起原文" : locale === "ja" ? "原文を畳む" : locale === "ko" ? "원문 접기" : locale === "fr" ? "Replier le passage" : locale === "es" ? "Plegar el pasaje" : "Passage einklappen")
              : (locale === "en" ? "Read passage in context" : locale === "zh-CN" ? "在原文中阅读" : locale === "zh-TW" ? "在原文中閱讀" : locale === "ja" ? "原文で読む" : locale === "ko" ? "원문에서 읽기" : locale === "fr" ? "Lire dans le contexte" : locale === "es" ? "Leer en contexto" : "Im Kontext lesen")}
            </span>
          </button>
        )}
      </div>

      {open && chunk && (
        <div className="tl2-evid-passage">
          <div className="tl2-evid-passage-meta">
            <span className="mono">CH {chunk.chapter} · ¶{chunk.seq} · {chunk.tokens} tok</span>
            <span className="mono dim">{chunk.id}</span>
          </div>
          <div className="tl2-evid-passage-body">
            {head && <span className="tl2-evid-passage-grey">{head}</span>}
            {hit && <mark className="tl2-evid-passage-hit">{hit}</mark>}
            {tail && <span className="tl2-evid-passage-grey">{tail}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* =================== PARTICIPANTS — shared =================== */

function ParticipantsRow({ ids, entities, locale, onPick, big }) {
  if (!ids?.length) return null;
  return (
    <div className={"tl2-pp-row " + (big ? "tl2-pp-row-big" : "")}>
      {ids.map(pid => {
        const p = entities.find(e => e.id === pid);
        if (!p) return null;
        const loc = window.entityLocale(pid, locale);
        const name = loc?.name || p.name;
        const r = big ? 32 : 22;
        return (
          <button key={pid} className="tl2-pp" onClick={() => onPick?.(pid)} title={name}>
            <svg viewBox={`-${r+4} -${r+4} ${2*(r+4)} ${2*(r+4)}`} width={2*(r+4)} height={2*(r+4)} className="tl2-pp-avatar">
              <circle cx="0" cy="0" r={r} fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1.1" />
              {window.avatarFor(p)}
            </svg>
            <span className="tl2-pp-name"><em>{name}</em></span>
          </button>
        );
      })}
    </div>
  );
}

/* =================== MODE 1 — FOLIO (vertical codex) =================== */

function FolioMode({ ctx, tt, data, entities, locale, visibleEvents, setSelectedEntityId, setSelectedEventId, phaseFilter }) {
  const scrollRef = useRef(null);
  // Sticky rail: which event is in view → progress dot tracking
  const [inViewId, setInViewId] = useState(visibleEvents[0]?.id);

  useEffect(() => {
    if (!scrollRef.current) return;
    const root = scrollRef.current;
    const obs = new IntersectionObserver((entries) => {
      const top = entries
        .filter(e => e.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (top) {
        const id = top.target.getAttribute("data-event-id");
        if (id) { setInViewId(id); setSelectedEventId(id); }
      }
    }, { root, rootMargin: "-30% 0px -30% 0px", threshold: [0.1, 0.3, 0.6, 0.9] });
    root.querySelectorAll("[data-event-id]").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [visibleEvents, phaseFilter]);

  return (
    <div className="tl2-folio">
      {/* sticky left rail — phase ribbon + event dots */}
      <FolioRail visibleEvents={visibleEvents} inViewId={inViewId} locale={locale}
        onPick={(id) => {
          const el = scrollRef.current?.querySelector(`[data-event-id="${id}"]`);
          el?.scrollIntoView({behavior: "smooth", block: "start"});
        }} />

      <div className="tl2-folio-scroll" ref={scrollRef}>
        {visibleEvents.map((ev, idx) => (
          <FolioSpread key={ev.id} ev={ev} idx={idx} total={visibleEvents.length}
            data={data} entities={entities} locale={locale} tt={tt}
            setSelectedEntityId={setSelectedEntityId} />
        ))}
        <div className="tl2-folio-end">
          <div className="tl2-folio-end-rule" />
          <div className="tl2-folio-end-mark">FINIS</div>
        </div>
      </div>
    </div>
  );
}

function FolioRail({ visibleEvents, inViewId, locale, onPick }) {
  // Group events by phase for the rail
  return (
    <aside className="tl2-folio-rail">
      <div className="tl2-folio-rail-spine" />
      {_activePhases.map(p => {
        const phaseEvents = visibleEvents.filter(e => e.phase === p.id);
        if (!phaseEvents.length) return null;
        return (
          <div key={p.id} className="tl2-folio-rail-phase">
            <div className="tl2-folio-rail-phase-head" style={{"--phase-color": p.color}}>
              <span className="tl2-folio-rail-phase-roman">{p.roman}</span>
              <span className="tl2-folio-rail-phase-label">{tlPhaseLabel(p, locale)}</span>
            </div>
            <div className="tl2-folio-rail-phase-dots">
              {phaseEvents.map(ev => {
                const ent = window.LG_DATA.entities.find(e => e.id === ev.id);
                const loc = window.entityLocale(ev.id, locale);
                const name = loc?.name || ent?.name;
                return (
                  <button key={ev.id}
                    className={"tl2-folio-rail-dot " + (ev.id === inViewId ? "active" : "")}
                    style={{"--phase-color": p.color}}
                    onClick={() => onPick(ev.id)}
                    title={name}>
                    <span className="tl2-folio-rail-dot-mark" />
                    <span className="tl2-folio-rail-dot-ch">{ev.chapter}</span>
                    <span className="tl2-folio-rail-dot-name">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </aside>
  );
}

function FolioSpread({ ev, idx, total, data, entities, locale, tt, setSelectedEntityId }) {
  const phase = _activePhases.find(p => p.id === ev.phase);
  const entity = entities.find(e => e.id === ev.id);
  const loc = window.entityLocale(ev.id, locale);
  const name = loc?.name || entity?.name;
  const gloss = loc?.gloss || entity?.summary;
  const participants = tlGetParticipants(ev.id, data.edges, entities);
  const evidenceEdges = tlGetEvidenceEdges(ev.id, data.edges, entities);
  // Pivot evidence — prefer flagged pivot edge, else first
  const pivot = tlGetPivot(ev, data.edges, evidenceEdges);
  // Pivot quote can be event-defined override (e.g. v01) or pivot edge's evidence
  const pivotQuote = ev.pivotQuote || pivot?.evidence;
  const otherEdges = evidenceEdges.filter(e => e.id !== pivot?.id);
  const roman = toRoman(ev.chapter);

  // GLUCOSE rows tied to participants — "what changes after"
  const glucose = data.glucose.filter(g => participants.includes(g.entity)).slice(0, 3);

  return (
    <article className="tl2-folio-spread" data-event-id={ev.id} style={{"--phase-color": phase.color, "--roman-chars": roman.length}}>
      {/* phase strap at top of spread */}
      <div className="tl2-folio-strap">
        <span className="tl2-folio-strap-roman">{phase.roman}</span>
        <span className="tl2-folio-strap-label">{tlPhaseLabel(phase, locale)}</span>
        <span className="tl2-folio-strap-rule" />
        <span className="tl2-folio-strap-sub">{tlPhaseLabel(phase, locale, "sub")}</span>
        <span className="tl2-folio-strap-rule" />
        <span className="tl2-folio-strap-num">{String(idx+1).padStart(2,"0")} / {String(total).padStart(2,"0")}</span>
      </div>

      <div className="tl2-folio-grid">
        {/* LEFT GUTTER — chapter as huge roman + page label */}
        <div className="tl2-folio-gutter">
          <div className="tl2-folio-gutter-eyebrow">CHAPTER</div>
          <div className="tl2-folio-gutter-roman">{roman}</div>
          <div className="tl2-folio-gutter-arabic">ch. {ev.chapter}</div>
          {pivot && (
            <div className="tl2-folio-gutter-cite">
              <span className="dot" />
              {window.friendlyChunkId(pivot.chunk, locale)}
            </div>
          )}
        </div>

        {/* HEAD — title + gloss */}
        <header className="tl2-folio-head">
          <h2 className="tl2-folio-title"><em>{name}</em></h2>
          <p className="tl2-folio-gloss">{gloss}</p>
        </header>

        {/* PIVOT QUOTE — the moment as written */}
        {pivotQuote && (
          <div className="tl2-folio-pivot">
            <div className="tl2-folio-pivot-rule"><span /></div>
            <div className="tl2-folio-pivot-mark">{tt("tl.evidence")}</div>
            <blockquote className="tl2-folio-pivot-q">
              <span className="tl2-folio-pivot-open">&ldquo;</span>
              {pivotQuote}
              <span className="tl2-folio-pivot-close">&rdquo;</span>
            </blockquote>
            {pivot && (
              <div className="tl2-folio-pivot-attr">
                <span>{window.t("rel."+pivot.rel)}</span>
                <span className="dim">·</span>
                <span>{window.friendlyChunkId(pivot.chunk, locale)}</span>
                {pivot.verified && <span className="ok">· {tt("gv.verifiedBy")}</span>}
              </div>
            )}
          </div>
        )}

        {/* PARTICIPANTS */}
        {participants.length > 0 && (
          <div className="tl2-folio-pp">
            <div className="tl2-folio-sect-head">
              <span className="tl2-folio-sect-rule" />
              <span>{tt("tl.participants")}</span>
              <span className="tl2-folio-sect-ct">{participants.length}</span>
            </div>
            <ParticipantsRow ids={participants} entities={entities} locale={locale} onPick={setSelectedEntityId} big />
          </div>
        )}

        {/* OTHER EVIDENCE — expandable */}
        {otherEdges.length > 0 && (
          <div className="tl2-folio-more">
            <div className="tl2-folio-sect-head">
              <span className="tl2-folio-sect-rule" />
              <span>{locale === "en" ? "More from this moment" : locale === "zh-CN" ? "此刻其他线索" : locale === "zh-TW" ? "此刻其他線索" : locale === "ja" ? "この瞬間の他の証拠" : locale === "ko" ? "이 순간의 추가 증거" : locale === "fr" ? "Plus de ce moment" : locale === "es" ? "Más de este momento" : "Mehr aus diesem Augenblick"}</span>
              <span className="tl2-folio-sect-ct">{otherEdges.length}</span>
            </div>
            <div className="tl2-folio-more-list">
              {otherEdges.map(e => (
                <EvidenceBlock key={e.id} edge={e} data={data} locale={locale} tt={tt} />
              ))}
            </div>
          </div>
        )}

        {/* GLUCOSE — what changes after */}
        {glucose.length > 0 && (
          <div className="tl2-folio-glucose">
            <div className="tl2-folio-sect-head">
              <span className="tl2-folio-sect-rule" />
              <span>{locale === "en" ? "What changes after" : locale === "zh-CN" ? "此后发生了什么" : locale === "zh-TW" ? "此後發生了什麼" : locale === "ja" ? "この後の変化" : locale === "ko" ? "이후의 변화" : locale === "fr" ? "Ce qui change ensuite" : locale === "es" ? "Lo que cambia después" : "Was sich danach ändert"}</span>
            </div>
            <ul className="tl2-folio-glucose-list">
              {glucose.map((g, i) => {
                const ent = entities.find(e => e.id === g.entity);
                const ploc = window.entityLocale(g.entity, locale);
                return (
                  <li key={i} className="tl2-folio-glucose-row">
                    <span className="tl2-folio-glucose-dim">{g.dim}</span>
                    <span className="tl2-folio-glucose-text">
                      <em className="tl2-folio-glucose-ent" onClick={() => setSelectedEntityId(g.entity)}>{ploc?.name || ent?.name}</em>
                      <span className="tl2-folio-glucose-body"> — {g.text}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="tl2-folio-foot">
        <span className="tl2-folio-foot-mark">&#9670;</span>
      </div>
    </article>
  );
}

/* =================== MODE 2 — STAGE (cinematic one-at-a-time) =================== */

function StageMode({ ctx, tt, data, entities, locale, visibleEvents, setSelectedEntityId, selectedEventId, setSelectedEventId }) {
  // Find current index
  const curIdx = Math.max(0, visibleEvents.findIndex(e => e.id === selectedEventId));
  const cur = visibleEvents[curIdx] || visibleEvents[0];

  const go = useCallback((delta) => {
    const next = (curIdx + delta + visibleEvents.length) % visibleEvents.length;
    setSelectedEventId(visibleEvents[next].id);
  }, [curIdx, visibleEvents, setSelectedEventId]);

  useEffect(() => {
    const fn = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [go]);

  if (!cur) return <div className="empty">No events</div>;

  const phase = _activePhases.find(p => p.id === cur.phase);
  const entity = entities.find(e => e.id === cur.id);
  const loc = window.entityLocale(cur.id, locale);
  const name = loc?.name || entity?.name;
  const gloss = loc?.gloss || entity?.summary;
  const evidenceEdges = tlGetEvidenceEdges(cur.id, data.edges, entities);
  const pivot = tlGetPivot(cur, data.edges, evidenceEdges);
  const pivotQuote = cur.pivotQuote || pivot?.evidence;
  const participants = tlGetParticipants(cur.id, data.edges, entities);

  return (
    <div className="tl2-stage" style={{"--phase-color": phase.color}}>
      {/* progress dot bar */}
      <div className="tl2-stage-progress">
        {visibleEvents.map((ev, i) => {
          const p = _activePhases.find(x => x.id === ev.phase);
          return (
            <button key={ev.id}
              className={"tl2-stage-progress-dot " + (i === curIdx ? "active" : "") + (i < curIdx ? " past" : "")}
              style={{"--phase-color": p.color}}
              onClick={() => setSelectedEventId(ev.id)}>
              <span className="tl2-stage-progress-num">{String(i+1).padStart(2,"0")}</span>
              <span className="tl2-stage-progress-mark" />
              <span className="tl2-stage-progress-ch">ch{ev.chapter}</span>
            </button>
          );
        })}
      </div>

      <div className="tl2-stage-canvas">
        {/* head row — phase + sigil in normal flow */}
        <div className="tl2-stage-head">
          <div className="tl2-stage-phase">
            <span className="tl2-stage-phase-roman">{phase.roman}</span>
            <span className="tl2-stage-phase-bar" />
            <div>
              <div className="tl2-stage-phase-label">{tlPhaseLabel(phase, locale)}</div>
              <div className="tl2-stage-phase-sub">{tlPhaseLabel(phase, locale, "sub")}</div>
            </div>
          </div>
          {(() => {
            const stageRoman = toRoman(cur.chapter);
            return (
              <div className="tl2-stage-sigil" style={{"--roman-chars": stageRoman.length}}>
                <div className="tl2-stage-sigil-eyebrow">CHAPTER</div>
                <div className="tl2-stage-sigil-roman">{stageRoman}</div>
                <div className="tl2-stage-sigil-arabic">ch. {cur.chapter}</div>
              </div>
            );
          })()}
        </div>

        {/* the quote — centerpiece */}
        {pivotQuote && (
          <div className="tl2-stage-quote">
            <div className="tl2-stage-quote-mark-open">&ldquo;</div>
            <p>{pivotQuote}</p>
            <div className="tl2-stage-quote-mark-close">&rdquo;</div>
          </div>
        )}

        {/* title + gloss */}
        <div className="tl2-stage-title">
          <h2><em>{name}</em></h2>
          <p>{gloss}</p>
        </div>

        {/* attribution */}
        {pivot && (
          <div className="tl2-stage-attr">
            <span>{window.t("rel."+pivot.rel)}</span>
            <span className="dim">·</span>
            <span>{window.friendlyChunkId(pivot.chunk, locale)}</span>
            <span className="dim">·</span>
            <span className="conf">conf {(pivot.conf*100).toFixed(0)}</span>
            {pivot.verified && <>
              <span className="dim">·</span>
              <span className="ok">{tt("gv.verifiedBy")}</span>
            </>}
          </div>
        )}

        {/* cast */}
        {participants.length > 0 && (
          <div className="tl2-stage-cast">
            <div className="tl2-stage-cast-head">
              <span className="rule" />
              <span>{locale === "en" ? "Cast" : locale === "zh-CN" ? "登场人物" : locale === "zh-TW" ? "登場人物" : locale === "ja" ? "登場人物" : locale === "ko" ? "등장인물" : locale === "fr" ? "Distribution" : locale === "es" ? "Reparto" : "Besetzung"}</span>
              <span className="rule" />
            </div>
            <ParticipantsRow ids={participants} entities={entities} locale={locale} onPick={setSelectedEntityId} big />
          </div>
        )}

        {/* nav arrows */}
        <button className="tl2-stage-nav tl2-stage-nav-prev" onClick={() => go(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M 15 5 L 9 12 L 15 19" />
          </svg>
          <span>{String((curIdx-1+visibleEvents.length)%visibleEvents.length+1).padStart(2,"0")}</span>
        </button>
        <button className="tl2-stage-nav tl2-stage-nav-next" onClick={() => go(1)}>
          <span>{String((curIdx+1)%visibleEvents.length+1).padStart(2,"0")}</span>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M 9 5 L 15 12 L 9 19" />
          </svg>
        </button>
      </div>

      {/* bottom dock — all evidence (collapsible + resizable) */}
      {evidenceEdges.length > 0 && (
        <StageDock evidenceEdges={evidenceEdges} data={data} locale={locale} tt={tt} />
      )}
    </div>
  );
}

function StageDock({ evidenceEdges, data, locale, tt }) {
  const [open, setOpen] = useState(() => localStorage.getItem("lg_tl_dock_open") === "1");
  useEffect(() => { localStorage.setItem("lg_tl_dock_open", open ? "1" : "0"); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const label = tt("tl.evidence");

  if (!open) {
    return (
      <button className="tl2-stage-dock-trigger"
        onClick={() => setOpen(true)}
        title={locale === "en" ? "Show evidence" : "查看原文证据"}>
        <span className="tl2-stage-dock-trigger-dot" />
        <span className="tl2-stage-dock-trigger-label">{label}</span>
        <span className="tl2-stage-dock-trigger-count">{evidenceEdges.length}</span>
        <span className="tl2-stage-dock-trigger-chev">
          <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M 3 7.5 L 6 4.5 L 9 7.5" />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <div className="tl2-stage-dock-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="tl2-stage-dock-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="tl2-stage-dock-handle" onClick={() => setOpen(false)} />
        <div className="tl2-stage-dock-label">
          <span className="rule" />
          <span>{label}</span>
          <span className="ct">{evidenceEdges.length}</span>
          <span className="rule" />
        </div>
        <div className="tl2-stage-dock-list">
          {evidenceEdges.map(e => (
            <EvidenceBlock key={e.id} edge={e} data={data} locale={locale} tt={tt} dense />
          ))}
        </div>
      </div>
    </div>
  );
}

/* =================== MODE 3 — RIBBON (compact horizontal) =================== */

function RibbonMode({ ctx, tt, data, entities, locale, visibleEvents, selectedEventId, setSelectedEventId, setSelectedEntityId }) {
  const wrapRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [scrollPct, setScrollPct] = useState({left: 0, width: 1});
  const [dockOpen, setDockOpen] = useState(() => localStorage.getItem("lg_tl_ribbon_dock") === "1");
  useEffect(() => { localStorage.setItem("lg_tl_ribbon_dock", dockOpen ? "1" : "0"); }, [dockOpen]);
  useEffect(() => {
    if (!dockOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setDockOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dockOpen]);
  // --- Layout (research: react-chrono / MUI "alternating" narrative pattern) ---
  // Narrative timelines read best on an ORDINAL (sequential) scale, not a true
  // chronological one: events are spaced EVENLY and alternate strictly above /
  // below the axis. This removes the clustering + dead-gaps + multi-row chaos a
  // chapter-scaled axis produced, and gives the clean, balanced rhythm we want.
  const [wrapW, setWrapW] = useState(0);
  const CARD_W = 180;
  const AXIS_PAD = 100;     // half-card + margin → first/last card never clips
  const MIN_STEP = 98;      // 2*MIN_STEP > CARD_W → same-side cards never touch; small enough that ~9 events fit a desktop width without scrolling
  const MAX_STEP = 300;
  const PAD_TOP = 34;       // phase-label strip above the top cards
  const CARD_H = 84;
  const CONN = 28;          // connector length — constant on both sides
  const AXIS_Y = PAD_TOP + CARD_H + CONN;
  const trackH = AXIS_Y + CONN + CARD_H + 30;

  const sorted = useMemo(
    () => [...visibleEvents].sort(
      (a, b) => (a.chapter - b.chapter) || String(a.id).localeCompare(String(b.id))
    ),
    [visibleEvents]
  );
  const n = sorted.length;
  const usable = Math.max(wrapW || 0, 680);
  const fitStep = n > 1 ? (usable - 2 * AXIS_PAD) / (n - 1) : MIN_STEP;
  const baseStep = Math.max(MIN_STEP, Math.min(MAX_STEP, fitStep));
  const STEP = Math.max(MIN_STEP, baseStep * zoom);
  const contentW = 2 * AXIS_PAD + (n > 1 ? (n - 1) * STEP : 0);
  const totalWidth = Math.max(usable, contentW);
  const startX = n > 1 ? Math.max(AXIS_PAD, (totalWidth - (n - 1) * STEP) / 2) : totalWidth / 2;

  const layout = useMemo(
    () => sorted.map((ev, i) => ({ ev, i, x: startX + i * STEP, side: i % 2 === 0 ? "up" : "down" })),
    [sorted, startX, STEP]
  );
  const phaseSpans = useMemo(() => {
    const m = {};
    layout.forEach(({ ev, x }) => {
      if (!m[ev.phase]) m[ev.phase] = { min: x, max: x };
      else { m[ev.phase].min = Math.min(m[ev.phase].min, x); m[ev.phase].max = Math.max(m[ev.phase].max, x); }
    });
    return m;
  }, [layout]);

  const cur = visibleEvents.find(e => e.id === selectedEventId) || visibleEvents[0];
  const curPhase = cur && _activePhases.find(p => p.id === cur.phase);
  const curEntity = cur && entities.find(e => e.id === cur.id);
  const curLoc = cur && window.entityLocale(cur.id, locale);
  const curName = curLoc?.name || curEntity?.name;
  const curGloss = curLoc?.gloss || curEntity?.summary;
  const curParticipants = cur ? tlGetParticipants(cur.id, data.edges, entities) : [];
  const curEvidence = cur ? tlGetEvidenceEdges(cur.id, data.edges, entities) : [];

  useEffect(() => {
    const sel = layout.find(l => l.ev.id === selectedEventId);
    if (sel && wrapRef.current) {
      wrapRef.current.scrollTo({ left: Math.max(0, sel.x - wrapRef.current.clientWidth / 2), behavior: "smooth" });
    }
  }, [zoom, selectedEventId, wrapW]);

  // Measure wrap width (for fit-to-width spacing) + update scroll indicator
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      setWrapW(el.clientWidth);
      const total = el.scrollWidth;
      const view = el.clientWidth;
      if (total <= view) { setScrollPct({left: 0, width: 1}); return; }
      setScrollPct({
        left: el.scrollLeft / total,
        width: view / total,
      });
    };
    update();
    el.addEventListener("scroll", update, {passive: true});
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [zoom, visibleEvents]);

  return (
    <div className="tl2-ribbon">
      <div className="tl2-ribbon-zoom">
        <button onClick={() => setZoom(z => Math.max(0.5, z * 0.85))}>−</button>
        <span>{Math.round(zoom*100)}%</span>
        <button onClick={() => setZoom(z => Math.min(2.5, z * 1.18))}>+</button>
        <button onClick={() => setZoom(1)}>↻</button>
      </div>

      <div className="tl2-ribbon-wrap" ref={wrapRef}>
        <div className="tl2-ribbon-track" style={{width: totalWidth, height: trackH}}>
          {/* base axis line */}
          <div className="tl2-ribbon-axisline" style={{top: AXIS_Y, left: 24, width: Math.max(0, totalWidth - 48)}} />
          {/* phases — colored run on the axis + centered label above */}
          {_activePhases.map(p => {
            const sp = phaseSpans[p.id];
            if (!sp) return null;
            const segL = Math.max(8, sp.min - STEP * 0.42);
            const segR = Math.min(totalWidth - 8, sp.max + STEP * 0.42);
            const mid = (sp.min + sp.max) / 2;
            return (
              <React.Fragment key={p.id}>
                <div className="tl2-ribbon-seg" style={{top: AXIS_Y, left: segL, width: Math.max(0, segR - segL), "--phase-color": p.color}} />
                <div className="tl2-ribbon-phaselbl" style={{left: mid, top: 6, "--phase-color": p.color}}>
                  <span className="roman">{p.roman}</span>
                  <span className="name">{tlPhaseLabel(p, locale)}</span>
                </div>
              </React.Fragment>
            );
          })}
          {/* events — evenly spaced, strictly alternating above / below the axis */}
          {layout.map(({ ev, x, side }) => {
            const phase = _activePhases.find(p => p.id === ev.phase) || {};
            const ent = entities.find(e => e.id === ev.id);
            const loc = window.entityLocale(ev.id, locale);
            const name = loc?.name || ent?.name;
            const isSel = selectedEventId === ev.id;
            const connStyle = side === "up" ? { bottom: 0, height: CONN } : { top: 0, height: CONN };
            const cardStyle = side === "up" ? { bottom: CONN } : { top: CONN };
            return (
              <div key={ev.id}
                className={"tl2-ribbon-event tl2-ribbon-event-" + side + (isSel ? " active" : "")}
                style={{left: x, top: AXIS_Y, "--phase-color": phase.color}}
                onClick={() => setSelectedEventId(ev.id)}>
                <span className="tl2-ribbon-conn" style={connStyle} />
                <span className="tl2-ribbon-dot" />
                <div className="tl2-ribbon-card" style={cardStyle}>
                  <div className="tl2-ribbon-card-ch">CH {ev.chapter}</div>
                  <div className="tl2-ribbon-card-title"><em>{name}</em></div>
                </div>
              </div>
            );
          })}
          {!n && (
            <div className="tl2-ribbon-empty" style={{top: AXIS_Y}}>
              {locale === "en" ? "No events in this phase" : locale === "zh-CN" ? "本阶段暂无事件" : locale === "zh-TW" ? "本階段暫無事件" : locale === "ja" ? "この段階にイベントはありません" : locale === "ko" ? "이 단계에 이벤트가 없습니다" : locale === "fr" ? "Aucun événement dans cette phase" : locale === "es" ? "Sin eventos en esta fase" : "Keine Ereignisse in dieser Phase"}
            </div>
          )}
        </div>
      </div>

      {/* custom scroll indicator (replaces ugly default horizontal scrollbar) */}
      <div className="tl2-ribbon-indicator">
        <span style={{
          width: `${(scrollPct.width * 100).toFixed(2)}%`,
          marginLeft: `${(scrollPct.left * 100).toFixed(2)}%`,
        }} />
      </div>

      {/* small bottom trigger — pops the event detail up as a drawer */}
      {cur && !dockOpen && (() => {
        const trgRoman = toRoman(cur.chapter);
        return (
          <button className="tl2-ribbon-dock-trigger"
            style={{"--phase-color": curPhase.color}}
            onClick={() => setDockOpen(true)}
            title={locale === "en" ? "Show event detail" : "查看事件详情"}>
            <span className="tl2-ribbon-dock-trigger-dot" />
            <span className="tl2-ribbon-dock-trigger-roman">{trgRoman}</span>
            <span className="tl2-ribbon-dock-trigger-title"><em>{curName}</em></span>
            <span className="tl2-ribbon-dock-trigger-chev">
              <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M 3 7.5 L 6 4.5 L 9 7.5" />
              </svg>
            </span>
          </button>
        );
      })()}

      {/* drawer — bottom sheet pattern, scoped to the ribbon area */}
      {cur && dockOpen && (() => {
        const dockRoman = toRoman(cur.chapter);
        return (
          <div className="tl2-ribbon-dock-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) setDockOpen(false); }}>
            <div className="tl2-ribbon-dock-sheet"
              style={{"--phase-color": curPhase.color, "--roman-chars": dockRoman.length}}
              onClick={(e) => e.stopPropagation()}>
              <div className="tl2-ribbon-dock-handle" onClick={() => setDockOpen(false)} />
              <div className="tl2-ribbon-dock-head">
                <div className="tl2-ribbon-dock-roman">{dockRoman}</div>
                <div className="tl2-ribbon-dock-meta">
                  <div className="tl2-ribbon-dock-phase">
                    <span className="dot" /> {tlPhaseLabel(curPhase, locale)} · ch {cur.chapter}
                  </div>
                  <h2><em>{curName}</em></h2>
                  <p>{curGloss}</p>
                </div>
                {curParticipants.length > 0 && (
                  <div className="tl2-ribbon-dock-pp">
                    <ParticipantsRow ids={curParticipants} entities={entities} locale={locale} onPick={setSelectedEntityId} />
                  </div>
                )}
              </div>
              <div className="tl2-ribbon-dock-body">
                {curEvidence.map(e => (
                  <EvidenceBlock key={e.id} edge={e} data={data} locale={locale} tt={tt} dense />
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

window.ViewTimeline = ViewTimeline;
