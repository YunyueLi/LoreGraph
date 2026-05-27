// LoreGraph — Reader view
// Left TOC · center prose with highlighted entities · right chunk info.

function ViewReader({ ctx }) {
  const { tt, data, entities, locale, selectedEntityId, setSelectedEntityId } = ctx;
  const { useState, useMemo } = React;

  const chunks = data.chunks;
  const [selectedChunkId, setSelectedChunkId] = useState("ch36_p04");
  const currentChunk = chunks.find(c => c.id === selectedChunkId) || chunks[0];

  // chapters list (simplified — show only chapters that have chunks)
  const chapters = [
    { n: 1,  name: "It is a truth universally acknowledged", entities: 6 },
    { n: 3,  name: "The Assembly at Meryton", entities: 8 },
    { n: 11, name: "Mr. Darcy's character", entities: 4 },
    { n: 19, name: "Mr. Collins proposes", entities: 5 },
    { n: 22, name: "Charlotte's pragmatism", entities: 4 },
    { n: 34, name: "First proposal at Hunsford", entities: 5 },
    { n: 35, name: "The Letter", entities: 7 },
    { n: 36, name: "Till this moment, I never knew myself", entities: 4 },
    { n: 43, name: "Visit to Pemberley", entities: 9 },
    { n: 46, name: "Lydia is gone off with Wickham", entities: 8 },
    { n: 52, name: "Mrs. Gardiner's letter", entities: 6 },
    { n: 56, name: "Lady Catherine confronts Elizabeth", entities: 3 },
    { n: 58, name: "Second proposal", entities: 3 },
  ];

  const currentChapter = chapters.find(c => c.n === currentChunk.chapter) || chapters[0];

  // build a single token aliases map for highlight
  const aliasMap = useMemo(() => {
    const map = [];
    entities.forEach(e => {
      const all = new Set([e.name, ...e.aliases]);
      all.forEach(a => {
        if (a && a.length >= 2) map.push({ text: a, entId: e.id, type: e.type, locName: window.entityLocale(e.id, locale)?.name || e.name });
      });
    });
    // sort by length desc to match longer first
    map.sort((a, b) => b.text.length - a.text.length);
    return map;
  }, [locale]);

  // chunk entities — those whose aliases appear in this chunk
  const chunkEntities = useMemo(() => {
    const found = new Map();
    aliasMap.forEach(({text, entId}) => {
      if (currentChunk.text.toLowerCase().includes(text.toLowerCase()) && !found.has(entId)) {
        found.set(entId, entities.find(e => e.id === entId));
      }
    });
    return Array.from(found.values()).filter(Boolean);
  }, [currentChunk, aliasMap]);

  return (
    <div className="rd">
      {/* TOC */}
      <aside className="rd-toc">
        <h3>{tt("rd.toc")}</h3>
        {chapters.map(c => {
          const hasChunk = chunks.some(ch => ch.chapter === c.n);
          const active = currentChunk.chapter === c.n;
          return (
            <div
              key={c.n}
              className={"rd-ch " + (active ? "active" : "")}
              onClick={() => {
                if (hasChunk) {
                  const ch = chunks.find(ch => ch.chapter === c.n);
                  setSelectedChunkId(ch.id);
                }
              }}
              style={{opacity: hasChunk ? 1 : 0.5}}
            >
              <div className="rd-ch-num">{String(c.n).padStart(2, "0")}</div>
              <div className="rd-ch-name">{c.name}</div>
              <div className="rd-ch-ent">{c.entities}</div>
            </div>
          );
        })}

        <div style={{marginTop:32, padding:"14px 12px", background:"var(--paper-deep)"}}>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:9.5, letterSpacing:".22em", color:"var(--gold-deep)", marginBottom:10}}>{tt("rd.legend")}</div>
          <div style={{fontSize:11.5, lineHeight:1.9, fontFamily:"'Spectral', serif"}}>
            <div><span style={{borderBottom:"1px solid var(--gold)"}}>Elizabeth</span> &nbsp;{tt("type.agent").toLowerCase()}</div>
            <div><span style={{background:"rgba(184,149,74,.15)"}}>Pemberley</span> &nbsp;{tt("type.object").toLowerCase()}</div>
            <div><span style={{fontStyle:"italic", textDecoration:"underline", textDecorationColor:"var(--gold)", textUnderlineOffset:"3px"}}>proposes</span> &nbsp;{tt("type.event").toLowerCase()}</div>
            <div><span style={{color:"var(--gold-deep)", fontStyle:"italic"}}>pride</span> &nbsp;{tt("type.concept").toLowerCase()}</div>
          </div>
        </div>
      </aside>

      {/* PROSE */}
      <div className="rd-text">
        <div className="rd-text-head">
          <div className="ch-meta">{tt("rd.chapter", {n: currentChunk.chapter})} · ATOM {currentChunk.id}</div>
          <h1><em>{currentChapter.name}</em></h1>
          <div className="author">Pride and Prejudice · Jane Austen</div>
        </div>

        <div className="rd-prose">
          {chunks.filter(c => c.chapter === currentChunk.chapter).map((ck, i) => (
            <div key={ck.id} className="chunk-block" id={ck.id}>
              <span className="atom-id">{ck.id}</span>
              <HighlightedText text={ck.text} aliasMap={aliasMap} entities={entities}
                selectedEntityId={selectedEntityId}
                onSelect={setSelectedEntityId} />
              <div style={{marginTop:10, fontFamily:"'JetBrains Mono', monospace", fontSize:9.5, color:"var(--paper-text-faint)", letterSpacing:".06em"}}>
                <span style={{color:"var(--gold-deep)"}}>{ck.tokens} {tt("rd.tokens")}</span> · {ck.mentions} mentions · {ck.edges} edges
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PANEL */}
      <aside className="rd-panel">
        <h4>{tt("rd.thisChunk")}</h4>
        <div className="rd-chunk-card">
          <div className="rd-chunk-card-id">▾ {currentChunk.id}</div>
          <div className="rd-chunk-stat-row">
            <div><strong>{currentChunk.tokens}</strong> tok</div>
            <div><strong>{currentChunk.mentions}</strong> mentions</div>
            <div><strong>{currentChunk.edges}</strong> edges</div>
          </div>
        </div>

        <h4>{tt("rd.chunkEntities")}</h4>
        <div className="rd-chunk-entities">
          {chunkEntities.map(e => {
            const loc = window.entityLocale(e.id, locale);
            return (
              <div key={e.id}
                   className={"rd-ent-mini " + e.type}
                   onClick={() => setSelectedEntityId(e.id)}
                   style={selectedEntityId === e.id ? {background:"var(--gold)", color:"var(--ink)"} : null}>
                {loc?.name || e.name}
              </div>
            );
          })}
        </div>

        {selectedEntityId && (
          <div style={{marginTop:24, paddingTop:18, borderTop:"1px solid var(--paper-line)"}}>
            <h4>{tt("ev.summary")}</h4>
            <SelectedEntityCard entity={entities.find(e => e.id === selectedEntityId)} ctx={ctx} />
          </div>
        )}
      </aside>
    </div>
  );
}

function HighlightedText({ text, aliasMap, entities, selectedEntityId, onSelect }) {
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
      <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:"var(--paper-text-mute)", letterSpacing:".06em", marginBottom:10}}>
        {entity.type.toUpperCase()} · {entity.mentions} mentions
      </div>
      <div style={{fontFamily:"'Spectral', serif", fontSize:13.5, lineHeight:1.55, color:"var(--paper-text)"}}>
        {loc?.gloss || entity.summary}
      </div>
      <button onClick={() => setActiveView("entities")}
        style={{marginTop:14, fontFamily:"'JetBrains Mono', monospace", fontSize:10, letterSpacing:".18em", color:"var(--gold-deep)", textTransform:"uppercase"}}>
        {tt("common.viewAll")} →
      </button>
    </div>
  );
}

window.ViewReader = ViewReader;
