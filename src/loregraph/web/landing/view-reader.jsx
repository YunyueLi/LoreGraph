// LoreGraph — Reader view
// Left TOC · center prose with highlighted entities · right chunk info.

// ---------------------------------------------------------------------------
// Chapter heading parsing.
//
// A chunk's text opens with the source's own chapter heading, and the heading's
// anatomy differs across the corpus:
//
//   xyj      "第1回\t第一回 靈根育孕源流出 心性修持大道生"   ordinal, then the
//                                                            book's own heading
//   alice    "CHAPTER II."                                   ordinal on line 1,
//            "The Pool of Tears"                             title on line 2
//   soledad  (no heading — a synopsis)
//   pride    (no heading — Austen only numbered her chapters)
//
// `chapterHead` normalizes all four into { ord, parts, lines }: the ordinal as
// the source words it, the title split into the lines it should be set on, and
// how many leading lines the heading occupied so the prose can skip them
// instead of restating what the page's own <h1> already says.
// ---------------------------------------------------------------------------
const _ORD_CJK = /^[ \t　]*第\s*[〇零一二三四五六七八九十百千两\d]+\s*[回章卷節节折篇]\.?[ \t　:：—\-]*/;
const _ORD_LAT = /^[ \t]*(?:CHAPTER|Chapter|CANTO|Canto|BOOK|Book|PART|Part)\s+(?:[IVXLCDM]+|\d+)\.?[ \t:：—\-]*/;

// Chapter titles in 章回小说 are couplets — two balanced hemistichs, set as two
// lines in print. Splitting them the way a typesetter would keeps a 240px rail
// from breaking "心性修持大道生" between 心 and 性.
function splitCouplet(title) {
  if (!/[㐀-鿿]/.test(title)) return [title];
  const halves = title.split(/[\s　]+/).filter(Boolean);
  if (halves.length === 2 && Math.abs(halves[0].length - halves[1].length) <= 2) return halves;
  return [title];
}

// Plain-text sources hard-wrap prose at ~70 columns, and rendering every
// newline as a break turned Carroll's paragraphs into ragged half-lines. Rejoin
// wrapped prose; leave verse alone, where the short lines are the author's.
//
// The test is the mean width of a paragraph's lines (ideographs counting
// double), excluding the last, which is short by nature. The substitution is
// one character for one — "\n" becomes " " — so every offset computed against
// the original text still lands in the same place.
function softWrap(text) {
  const width = (s) => s.length + (s.match(/[ᄀ-ᇿ⺀-꓏ꥠ-꥿가-퟿豈-﫿︰-﹏＀-｠]/g) || []).length;
  return text.split(/(\n\n+)/).map(block => {
    const lines = block.split("\n");
    if (lines.length < 2 || /^\n+$/.test(block)) return block;
    const measured = lines.length > 2 ? lines.slice(0, -1) : [lines[0]];
    const mean = measured.reduce((a, l) => a + width(l), 0) / measured.length;
    return mean >= 45 ? lines.join(" ") : block;
  }).join("");
}

function chapterHead(text) {
  const none = { ord: null, parts: [], lines: 0 };
  if (!text) return none;
  const raw = text.replace(/^\n+/, "").split("\n");
  let line = raw[0] || "";
  let ord = null;
  // Peel ordinals: a synthesized "第1回" may sit in front of the book's own
  // "第一回". The innermost one is the source's, so keep the last match.
  for (let guard = 0; guard < 3; guard++) {
    const m = line.match(_ORD_CJK) || line.match(_ORD_LAT);
    if (!m) break;
    ord = m[0].replace(/[\s　:：—\-.]+$/, "").replace(/^[\s　]+/, "");
    line = line.slice(m[0].length);
  }
  if (!ord) return none;

  let title = line.trim();
  let lines = 1;
  // "CHAPTER II." exhausted line 1 — the title is on line 2, and a blank line
  // follows it. Anything longer or unterminated is prose, not a title.
  if (!title) {
    const next = (raw[1] || "").trim();
    const after = raw[2] === undefined ? "" : raw[2].trim();
    if (next && next.length <= 64 && !after) { title = next; lines = 2; }
  }
  return { ord, parts: title ? splitCouplet(title) : [], lines };
}

// A work with no passages has no reader: the body below reads straight into the
// current chunk's text, which used to throw and hand the whole view to the error
// boundary. That happened for all 82 books on the shelf that have never been
// through the pipeline, and now also for the moment before a lazily fetched graph
// lands. Split in two so the guard runs before any hook — an early return past
// them would change the hook count between the empty and the loaded render.
function ViewReader({ ctx }) {
  if (!ctx.chunks.length) return <window.LGBookEmpty ctx={ctx} />;
  return <Reader ctx={ctx} />;
}

function Reader({ ctx }) {
  const { tt, data, entities, locale, selectedEntityId, setSelectedEntityId, chunks, activeBook } = ctx;
  const { useState, useMemo, useEffect } = React;

  // Prefer the full-chapter chunk for a given chapter, falling back to any
  // chunk that touches it (e.g. a paragraph chunk that exists only as an
  // evidence anchor for an edge).
  const chunkForChapter = (n) =>
    chunks.find(c => c.chapter === n && c.full) || chunks.find(c => c.chapter === n);

  const firstFull = chunks.find(c => c.full) || chunks[0];
  const defaultChunkId = firstFull ? firstFull.id : null;
  const [selectedChunkId, setSelectedChunkId] = useState(defaultChunkId);
  const [entOpen, setEntOpen] = useState(false);
  const ENT_CAP = 12;
  // Phone only: the TOC rail is off-canvas below 1080px, which left a
  // hundred-chapter book with no way to change chapter. It becomes a drawer,
  // opened from a control in the content flow rather than from the crowded bar.
  const [tocOpen, setTocOpen] = useState(false);
  // Re-anchor when switching books so a stale id from one book doesn't show null.
  useEffect(() => {
    if (!chunks.find(c => c.id === selectedChunkId)) {
      const f = chunks.find(c => c.full) || chunks[0];
      setSelectedChunkId(f ? f.id : null);
    }
  }, [activeBook && activeBook.id]);
  useEffect(() => { setEntOpen(false); setTocOpen(false); }, [selectedChunkId]);
  useEffect(() => {
    if (!tocOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setTocOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tocOpen]);
  const currentChunk = chunks.find(c => c.id === selectedChunkId) || firstFull || chunks[0];

  // Chapters list — derived from scoped chunks. Books whose chapters carry no
  // title (Austen only numbered hers) fall back to a localized ordinal rather
  // than inventing scene-based names. A title carried on the chunk itself
  // (future pipeline output) wins over one parsed out of the text.
  const chapters = useMemo(() => {
    const byNum = new Map();
    for (const c of chunks) {
      const head = chapterHead(c.text);
      const parts = c.chapterName ? splitCouplet(c.chapterName) : head.parts;
      const existing = byNum.get(c.chapter);
      if (!existing) {
        byNum.set(c.chapter, {
          n: c.chapter,
          ord: head.ord || tt("rd.chapter", {n: c.chapter}),
          parts: parts.length ? parts : [tt("rd.chapter", {n: c.chapter})],
          hasTitle: parts.length > 0,
          entities: 0,
          hasFull: !!c.full,
        });
      } else {
        if (parts.length && !existing.hasTitle) {
          existing.parts = parts; existing.hasTitle = true;
          if (head.ord) existing.ord = head.ord;
        }
        if (c.full) existing.hasFull = true;
      }
    }
    for (const c of chunks) byNum.get(c.chapter).entities += (c.mentions || 0);
    return [...byNum.values()].sort((a, b) => a.n - b.n);
  }, [activeBook && activeBook.id, locale]);

  const currentChapter = (currentChunk && chapters.find(c => c.n === currentChunk.chapter)) || chapters[0];

  // Most-mentioned entity of a type, named in the reader's language, for the
  // highlight legend. Short names only — the legend is 240px wide, and event
  // entities are whole clauses.
  const legendSample = (type) => {
    const pool = entities
      .filter(e => e.type === type)
      .sort((a, b) => (b.mentions || 0) - (a.mentions || 0));
    for (const e of pool) {
      const name = window.entityLocale(e.id, locale)?.name || e.name;
      if (name && name.length <= 16) return name;
    }
    return pool.length ? (window.entityLocale(pool[0].id, locale)?.name || pool[0].name).slice(0, 15) + "…" : null;
  };

  // build a single token aliases map for highlight
  const aliasMap = useMemo(() => {
    const map = [];
    entities.forEach(e => {
      const all = new Set([e.name, ...e.aliases]);
      all.forEach(a => {
        // Same one-for-one newline substitution as softWrap, so an alias that
        // straddles a source line break still matches the rejoined prose.
        if (a && a.length >= 2) map.push({ text: a.replace(/\n/g, " "), entId: e.id, type: e.type, locName: window.entityLocale(e.id, locale)?.name || e.name });
      });
    });
    // sort by length desc to match longer first
    map.sort((a, b) => b.text.length - a.text.length);
    return map;
  }, [locale]);

  // chunk entities — those whose aliases appear in this chunk
  const chunkEntities = useMemo(() => {
    const found = new Map();
    const hay = currentChunk.text.replace(/\s+/g, " ").toLowerCase();
    aliasMap.forEach(({text, entId}) => {
      if (hay.includes(text.replace(/\s+/g, " ").toLowerCase()) && !found.has(entId)) {
        found.set(entId, entities.find(e => e.id === entId));
      }
    });
    return Array.from(found.values()).filter(Boolean);
  }, [currentChunk, aliasMap]);

  // A selection carried over from another book resolves to nothing — don't let
  // it print a heading over an empty card.
  const selectedEntity = selectedEntityId ? entities.find(e => e.id === selectedEntityId) : null;

  return (
    <div className={"rd" + (tocOpen ? " toc-open" : "")}>
      <div className="rd-toc-scrim" onClick={() => setTocOpen(false)} aria-hidden="true" />
      {/* TOC */}
      <aside className="rd-toc" onKeyDown={window.listNav(".rd-ch")}>
        <h3>{tt("rd.toc")}</h3>
        {chapters.map(c => {
          const target = chunkForChapter(c.n);
          const active = currentChunk && currentChunk.chapter === c.n;
          return (
            <div
              key={c.n}
              className={"rd-ch " + (active ? "active" : "")}
              {...window.clickable(() => { if (target) setSelectedChunkId(target.id); },
                                   {role: "option", disabled: !target, roving: !active})}
              aria-selected={active}
              style={{opacity: target ? 1 : 0.5}}
            >
              {/* The ordinal is only useful alongside a real title; when the
                  name is just "Chapter N" it would duplicate the number. */}
              {c.hasTitle && <div className="rd-ch-num">{String(c.n).padStart(2, "0")}</div>}
              <div className="rd-ch-name">
                {c.parts.map((p, i) => <span key={i} className="rd-ch-line">{p}</span>)}
              </div>
              <div className="rd-ch-ent" title={tt("rd.entHere")}>{c.entities}</div>
            </div>
          );
        })}

        <div style={{marginTop:32, padding:"14px 12px", background:"var(--paper-deep)"}}>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:"var(--fs-micro)", letterSpacing:"var(--track-l)", color:"var(--gold-deep)", marginBottom:10}}>{tt("rd.legend")}</div>
          {/* The examples were Elizabeth, Pemberley, proposes, pride — Austen's,
              printed above whatever book was open. They now come from this book,
              which is also the only way the reader can match a sample against
              something they will actually meet in the prose. */}
          <div className="rd-legend-rows">
            {[
              { type: "agent",   cls: "ent agent" },
              { type: "object",  cls: "ent object" },
              { type: "event",   cls: "ent event" },
              { type: "concept", cls: "ent concept" },
            ].map(({ type, cls }) => {
              const sample = legendSample(type);
              if (!sample) return null;
              return (
                <div key={type}>
                  <span className={cls}>{sample}</span> <span className="rd-legend-type">{tt("type." + type)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* PROSE */}
      <div className="rd-text">
        <button className="rd-toc-trigger" onClick={() => setTocOpen(true)}
                aria-expanded={tocOpen} aria-label={tt("rd.toc")}>
          <span className="rd-toc-trigger-icon" aria-hidden="true">☰</span>
          <span className="rd-toc-trigger-label">{tt("rd.toc")}</span>
          <span className="rd-toc-trigger-cur">
            {currentChapter.hasTitle ? currentChapter.ord : currentChapter.parts[0]}
          </span>
        </button>

        <div className="rd-text-head">
          {/* The kicker used to read "ATOM CH01_P000" — an internal chunk key
              standing where a book prints its chapter ordinal. The ordinal is
              what belongs here; the key stays in the prose gutter, where an
              auditor tracing a claim actually looks for it. */}
          {currentChapter.hasTitle && <div className="ch-meta">{currentChapter.ord}</div>}
          <h1>{currentChapter.parts.map((p, i) => <em key={i} className="rd-title-line">{p}</em>)}</h1>
          <div className="author">{window.bookTitle(activeBook, locale)} · {window.bookAuthor(activeBook, locale)}</div>
        </div>

        <div className="rd-prose">
          {chunks.filter(c => c.chapter === currentChunk.chapter).map((ck, i) => {
            // The heading above already sets this chapter's title; leaving it at
            // the head of the prose printed it twice over.
            const head = chapterHead(ck.text);
            const stripped = head.lines
              ? ck.text.replace(/^\n+/, "").split("\n").slice(head.lines).join("\n").replace(/^\n+/, "")
              : ck.text;
            const body = softWrap(stripped);
            return (
              <div key={ck.id} className="chunk-block" id={ck.id}>
                <span className="atom-id">{ck.id}</span>
                <HighlightedText text={body} aliasMap={aliasMap} entities={entities}
                  selectedEntityId={selectedEntityId}
                  onSelect={setSelectedEntityId} />
                <div className="rd-chunk-meta">
                  <span className="gold">{ck.tokens} {tt("rd.tokens")}</span>
                  <span>{ck.mentions} {tt("common.mentions")}</span>
                  <span>{ck.edges} {tt("lib.card.edges")}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PANEL */}
      <aside className="rd-panel">
        <h4>{tt("rd.thisChunk")}</h4>
        <div className="rd-chunk-card">
          {/* The passage reads as an ordinal; the chunk key below it is the
              citation an auditor quotes back at the pipeline. Both, labelled —
              rather than the bare key standing in for a heading. */}
          <div className="rd-chunk-card-id">{tt("rd.passage", {n: (currentChunk.seq || 0) + 1})}</div>
          <div className="rd-chunk-card-key">{currentChunk.id}</div>
          <div className="rd-chunk-stat-row">
            <div><strong>{currentChunk.tokens}</strong> {tt("rd.tokens")}</div>
            <div><strong>{currentChunk.mentions}</strong> {tt("common.mentions")}</div>
            <div><strong>{currentChunk.edges}</strong> {tt("lib.card.edges")}</div>
          </div>
        </div>

        <h4>{tt("rd.chunkEntities")}</h4>
        {chunkEntities.length > 0 ? (
          <div className="rd-chunk-entities">
            {/* A dense passage yields dozens of entities, and event names are
                whole clauses — unshown, they pushed the summary off the rail. */}
            {(entOpen ? chunkEntities : chunkEntities.slice(0, ENT_CAP)).map(e => {
              const loc = window.entityLocale(e.id, locale);
              return (
                <div key={e.id}
                     className={"rd-ent-mini " + e.type}
                     onClick={() => setSelectedEntityId(e.id)}
                     title={loc?.name || e.name}
                     style={selectedEntityId === e.id ? {background:"var(--gold)", color:"var(--ink)"} : null}>
                  {loc?.name || e.name}
                </div>
              );
            })}
            {chunkEntities.length > ENT_CAP && (
              <button className="rd-ent-more" onClick={() => setEntOpen(v => !v)}>
                {entOpen ? tt("ev.alias.less") : tt("ev.alias.more", {n: chunkEntities.length - ENT_CAP})}
              </button>
            )}
          </div>
        ) : (
          /* A heading with nothing under it read as a broken panel. Say what an
             empty result means instead. */
          <p className="rd-panel-empty">{tt("rd.noEntities")}</p>
        )}

        {/* The summary heading used to render whether or not an entity was
            selected — and whether or not the selected one belonged to this
            book — leaving a second orphaned label. */}
        {selectedEntity && (
          <div className="rd-panel-sel">
            <h4>{tt("ev.summary")}</h4>
            <SelectedEntityCard entity={selectedEntity} ctx={ctx} />
          </div>
        )}
      </aside>
    </div>
  );
}

// Gutenberg marks emphasis with underscores, and an emphasized phrase routinely
// contains an entity name — "_took a watch out of its waistcoat-pocket_". Doing
// emphasis after the entity pass lost every such run, because the two
// underscores ended up in different slices. Resolve emphasis first, then run the
// entity pass inside each run.
function emphRuns(text) {
  if (text.indexOf("_") === -1) return [{ t: text, em: false }];
  const runs = [];
  const re = /_([^_\s][^_]*)_/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push({ t: text.slice(last, m.index), em: false });
    runs.push({ t: m[1], em: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ t: text.slice(last), em: false });
  return runs.length ? runs : [{ t: text, em: false }];
}

function HighlightedText({ text, aliasMap, entities, selectedEntityId, onSelect }) {
  const runs = emphRuns(text);
  if (runs.length === 1 && !runs[0].em) {
    return <MarkedText text={text} aliasMap={aliasMap} entities={entities}
                       selectedEntityId={selectedEntityId} onSelect={onSelect} />;
  }
  return <>{runs.map((r, i) => {
    const inner = <MarkedText text={r.t} aliasMap={aliasMap} entities={entities}
                              selectedEntityId={selectedEntityId} onSelect={onSelect} />;
    return r.em
      ? <em key={i}>{inner}</em>
      : <React.Fragment key={i}>{inner}</React.Fragment>;
  })}</>;
}

function MarkedText({ text, aliasMap, entities, selectedEntityId, onSelect }) {
  // build a list of matches over the text (non-overlapping)
  const matches = [];
  const lowered = text.toLowerCase();
  const occupied = new Array(text.length).fill(false);

  for (const a of aliasMap) {
    const lower = a.text.toLowerCase();
    let from = 0;
    while (true) {
      const idx = lowered.indexOf(lower, from);
      if (idx === -1) break;
      // must be word-boundary-ish (not in middle of a word)
      const before = idx === 0 ? " " : text[idx-1];
      const after = idx + lower.length >= text.length ? " " : text[idx + lower.length];
      const boundary = !/[A-Za-z0-9]/.test(before) && !/[A-Za-z0-9]/.test(after);
      const overlaps = occupied.slice(idx, idx + lower.length).some(Boolean);
      if (boundary && !overlaps) {
        matches.push({ start: idx, end: idx + lower.length, entId: a.entId, type: a.type, locName: a.locName });
        for (let i = idx; i < idx + lower.length; i++) occupied[i] = true;
      }
      from = idx + lower.length;
    }
  }
  matches.sort((a, b) => a.start - b.start);

  // build output
  const parts = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start > cursor) parts.push(<TxtSpan key={"t"+i} text={text.slice(cursor, m.start)} />);
    const sel = m.entId === selectedEntityId;
    parts.push(
      <span key={"e"+i}
            className={"ent " + m.type + (sel ? " selected" : "")}
            data-ent={m.entId}
            onClick={() => onSelect(m.entId)}
            title={m.locName}>
        {text.slice(m.start, m.end)}
      </span>
    );
    cursor = m.end;
  });
  if (cursor < text.length) parts.push(<TxtSpan key="last" text={text.slice(cursor)} />);
  return <>{parts}</>;
}

function TxtSpan({ text }) {
  // split on double newlines as paragraphs
  const paras = text.split(/\n\n+/);
  return <>{paras.map((p, i) => (
    <React.Fragment key={i}>
      {i > 0 && <><br/><br/></>}
      {p.split("\n").map((line, j) => (
        <React.Fragment key={j}>{j > 0 && <br/>}{line}</React.Fragment>
      ))}
    </React.Fragment>
  ))}</>;
}

function SelectedEntityCard({ entity, ctx }) {
  const { tt, locale, setActiveView } = ctx;
  if (!entity) return null;
  const loc = window.entityLocale(entity.id, locale);
  return (
    <div>
      <div style={{fontFamily:"'Spectral', serif", fontSize:18, marginBottom:6}}><em>{loc?.name || entity.name}</em></div>
      <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:"var(--fs-label)", color:"var(--paper-text-mute)", letterSpacing:".06em", marginBottom:10}}>
        {entity.type.toUpperCase()} · {entity.mentions} mentions
      </div>
      <div style={{fontFamily:"'Spectral', serif", fontSize:13.5, lineHeight:1.55, color:"var(--paper-text)"}}>
        {loc?.gloss || entity.summary}
      </div>
      <button onClick={() => setActiveView("entities")}
        style={{marginTop:14, fontFamily:"'JetBrains Mono', monospace", fontSize:"var(--fs-label)", letterSpacing:"var(--track-l)", color:"var(--gold-deep)", textTransform:"uppercase"}}>
        {tt("common.viewAll")} →
      </button>
    </div>
  );
}

window.ViewReader = ViewReader;
