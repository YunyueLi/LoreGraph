// LoreGraph — Entities view
// Left: list (search + type tabs) · Right: detail (summary + outgoing/incoming/glucose/mentions).

function ViewEntities({ ctx }) {
  const { tt, data, entities, edges, locale, selectedEntityId, setSelectedEntityId, glucose: bookGlucose } = ctx;
  const { useState } = React;
  const [search, setSearch] = useState("");
  const [typeTab, setTypeTab] = useState("all");
  const [detailTab, setDetailTab] = useState("outgoing");
  const [aliasOpen, setAliasOpen] = useState(false);

  const counts = {
    all:     entities.length,
    agent:   entities.filter(e => e.type === "agent").length,
    object:  entities.filter(e => e.type === "object").length,
    event:   entities.filter(e => e.type === "event").length,
    concept: entities.filter(e => e.type === "concept").length,
  };

  const filtered = entities.filter(e => {
    if (typeTab !== "all" && e.type !== typeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      const loc = window.entityLocale(e.id, locale)?.name || "";
      return e.name.toLowerCase().includes(q) ||
             loc.toLowerCase().includes(q) ||
             e.aliases.some(a => a.toLowerCase().includes(q));
    }
    return true;
  }).sort((a, b) => b.mentions - a.mentions);

  const selected = entities.find(e => e.id === selectedEntityId) || filtered[0] || entities[0];
  const loc = window.entityLocale(selected.id, locale);

  const outgoing = edges.filter(e => e.src === selected.id);
  const incoming = edges.filter(e => e.dst === selected.id);
  const glucose = bookGlucose.filter(g => g.entity === selected.id);

  return (
    <div className="ev">
      {/* LIST */}
      <aside className="ev-list">
        <div className="ev-search">
          <input
            type="text"
            placeholder={tt("ev.search")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="ev-tabs" role="radiogroup" aria-label={tt("a11y.filterByType")}>
          <div className={"ev-tab " + (typeTab === "all" ? "active" : "")}
               {...window.clickable(() => setTypeTab("all"), {role: "radio"})}
               aria-checked={typeTab === "all"}>
            <div>{tt("common.all").toUpperCase()}</div>
            <div className="ct">{counts.all}</div>
          </div>
          <div className={"ev-tab " + (typeTab === "agent" ? "active" : "")}
               {...window.clickable(() => setTypeTab("agent"), {role: "radio"})}
               aria-checked={typeTab === "agent"}>
            <div>○ {tt("type.agent").toUpperCase()}</div>
            <div className="ct">{counts.agent}</div>
          </div>
          <div className={"ev-tab " + (typeTab === "object" ? "active" : "")}
               {...window.clickable(() => setTypeTab("object"), {role: "radio"})}
               aria-checked={typeTab === "object"}>
            <div>▢ {tt("type.object").toUpperCase()}</div>
            <div className="ct">{counts.object}</div>
          </div>
          <div className={"ev-tab " + (typeTab === "event" ? "active" : "")}
               {...window.clickable(() => setTypeTab("event"), {role: "radio"})}
               aria-checked={typeTab === "event"}>
            <div>◇ {tt("type.event").toUpperCase()}</div>
            <div className="ct">{counts.event}</div>
          </div>
          <div className={"ev-tab " + (typeTab === "concept" ? "active" : "")}
               {...window.clickable(() => setTypeTab("concept"), {role: "radio"})}
               aria-checked={typeTab === "concept"}>
            <div>⬡ {tt("type.concept").toUpperCase()}</div>
            <div className="ct">{counts.concept}</div>
          </div>
        </div>
        <div className="ev-rows" role="listbox" aria-label={tt("nav.entities")}
             onKeyDown={window.listNav(".ev-row")}>
          {filtered.map(e => {
            const l = window.entityLocale(e.id, locale);
            return (
              <div key={e.id}
                   className={"ev-row " + (selected.id === e.id ? "active" : "")}
                   {...window.clickable(() => setSelectedEntityId(e.id),
                                       {role: "option", roving: selected.id !== e.id})}
                   aria-selected={selected.id === e.id}>
                <div className="ev-row-shape" style={{width: 40, height: 40}}>
                  <svg viewBox="-22 -22 44 44" width="40" height="40">
                    {e.type === "agent"   && <circle cx="0" cy="0" r="20" fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1" />}
                    {e.type === "object"  && <rect x="-19" y="-19" width="38" height="38" fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1" />}
                    {e.type === "event"   && <rect x="-16" y="-16" width="32" height="32" fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1" transform="rotate(45)" />}
                    {e.type === "concept" && <polygon points="0,-20 17,-10 17,10 0,20 -17,10 -17,-10" fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1" />}
                    {window.avatarFor(e)}
                  </svg>
                </div>
                <div className="ev-row-info">
                  <div className="ev-row-name"><em>{l?.name || e.name}</em></div>
                  <div className="ev-row-meta">
                    {tt("type." + e.type)} · <strong>{e.mentions.toLocaleString()}</strong> {tt("common.mentions")} · {tt("ev.row.range", { a: e.chapters[0], b: e.chapters[e.chapters.length-1] })}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{padding:40, textAlign:"center", color:"var(--paper-text-mute)", fontStyle:"italic", fontFamily:"'Spectral', serif"}}>
              {tt("ev.empty.search")}
            </div>
          )}
        </div>
      </aside>

      {/* DETAIL */}
      <main className="ev-detail">
        <div className="ev-detail-head">
          <div style={{display:"flex", alignItems:"center", gap:18, marginBottom:14}}>
            <svg viewBox="-22 -22 44 44" width="76" height="76" style={{flexShrink:0}}>
              {selected.type === "agent"   && <circle cx="0" cy="0" r="20" fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1.2" />}
              {selected.type === "object"  && <rect x="-19" y="-19" width="38" height="38" fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1.2" />}
              {selected.type === "event"   && <rect x="-16" y="-16" width="32" height="32" fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1.2" transform="rotate(45)" />}
              {selected.type === "concept" && <polygon points="0,-20 17,-10 17,10 0,20 -17,10 -17,-10" fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1.2" />}
              {window.avatarFor(selected)}
            </svg>
            <div style={{flex: 1}}>
              <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:6}}>
                <div className="chip">{({agent:"○ "+tt("type.agent"),object:"▢ "+tt("type.object"),event:"◇ "+tt("type.event"),concept:"⬡ "+tt("type.concept")})[selected.type].toUpperCase()}</div>
              </div>
              <div className="ev-detail-name"><em>{loc?.name || selected.name}</em></div>
              {locale !== "en" && selected.name !== (loc?.name) && (
                <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:"var(--paper-text-mute)", marginTop:4, letterSpacing:".06em"}}>
                  <span style={{color:"var(--gold-deep)", marginRight:8, letterSpacing:"var(--track-l)", fontSize:"var(--fs-label)"}}>EN</span>
                  {selected.name}
                </div>
              )}
            </div>
          </div>

          {/* Metric labels were hardcoded English ("mentions", "outgoing",
              "glucose") in all eight locales, and "glucose" is the pipeline's
              internal name for inferred implicit facts — not a word to put in
              front of a reader. */}
          <div className="ev-detail-meta-row" style={{marginTop:12}}>
            <div><strong>{selected.mentions.toLocaleString()}</strong> {tt("common.mentions")}</div>
            <div><strong>{selected.chapters.length}</strong> {tt("common.chapters")}</div>
            <div><strong>{outgoing.length}</strong> {tt("ev.metric.outgoing")}</div>
            <div><strong>{incoming.length}</strong> {tt("ev.metric.incoming")}</div>
            <div><strong>{glucose.length}</strong> {tt("ev.metric.implicit")}</div>
          </div>

          {/* Aliases: 孙悟空 carries over six hundred of them, which used to be
              dumped inline as one unbroken wall of quoted strings that filled
              the pane and pushed the entity's actual content off screen. They
              are reference data, so they collapse to a countable handful. */}
          {selected.aliases.length > 0 && (() => {
            const CAP = 10;
            const shown = aliasOpen ? selected.aliases : selected.aliases.slice(0, CAP);
            const rest = selected.aliases.length - shown.length;
            return (
              <div className="ev-alias">
                <span className="ev-alias-label">{tt("gv.panel.aliases")}</span>
                <span className="ev-alias-count">{selected.aliases.length}</span>
                <div className={"ev-alias-chips" + (aliasOpen ? " open" : "")}>
                  {shown.map((a, i) => <span key={i} className="ev-alias-chip">{a}</span>)}
                  {rest > 0 && (
                    <button className="ev-alias-more" onClick={() => setAliasOpen(true)}>
                      {tt("ev.alias.more", { n: rest })}
                    </button>
                  )}
                  {aliasOpen && selected.aliases.length > CAP && (
                    <button className="ev-alias-more" onClick={() => setAliasOpen(false)}>
                      {tt("ev.alias.less")}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="ev-detail-summary">{loc?.gloss || selected.summary}</div>
        </div>

        <div className="ev-detail-tabs">
          <div className={"ev-detail-tab " + (detailTab === "outgoing" ? "active" : "")} onClick={() => setDetailTab("outgoing")}>{tt("ev.detail.outgoing")}<span className="ct">{outgoing.length}</span></div>
          <div className={"ev-detail-tab " + (detailTab === "incoming" ? "active" : "")} onClick={() => setDetailTab("incoming")}>{tt("ev.detail.incoming")}<span className="ct">{incoming.length}</span></div>
          <div className={"ev-detail-tab " + (detailTab === "glucose"  ? "active" : "")} onClick={() => setDetailTab("glucose")}>{tt("ev.detail.glucose")}<span className="ct">{glucose.length}</span></div>
          <div className={"ev-detail-tab " + (detailTab === "mentions" ? "active" : "")} onClick={() => setDetailTab("mentions")}>{tt("ev.detail.mentions")}<span className="ct">{selected.mentions}</span></div>
        </div>

        <div className="ev-detail-body">
          {detailTab === "outgoing" && (
            outgoing.length === 0 ?
              <div className="empty" style={{padding:60}}><div className="glyph">○</div><div>{tt("ev.empty.outgoing")}</div></div>
            : outgoing.map(e => <EvClaim key={e.id} edge={e} ctx={ctx} dir="out" />)
          )}
          {detailTab === "incoming" && (
            incoming.length === 0 ?
              <div className="empty" style={{padding:60}}><div className="glyph">○</div><div>{tt("ev.empty.incoming")}</div></div>
            : incoming.map(e => <EvClaim key={e.id} edge={e} ctx={ctx} dir="in" />)
          )}
          {detailTab === "glucose" && (
            glucose.length === 0 ?
              <div className="empty" style={{padding:60}}><div className="glyph">○</div><div>{tt("ev.empty.glucose")}</div></div>
            : glucose.map((g, i) => (
              <div key={i} className="ev-claim-card">
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                  <div style={{fontFamily:"'Spectral', serif", fontStyle:"italic", color:"var(--gold-deep)", fontSize:15}}>{g.dim}</div>
                  <div className="chip" style={{fontSize:"var(--fs-micro)"}}>{g.depth.replace("_"," ")}</div>
                </div>
                <div style={{fontFamily:"'Spectral', serif", fontSize:15, lineHeight:1.55, marginBottom:10}}>{g.text}</div>
                <window.EvidPeek><div className="evid">{g.evidence}</div></window.EvidPeek>
                <div className="evid-meta">
                  <span>{window.friendlyChunkId(g.chunk, locale)}</span>
                  {g.verified && <span className="ok">{tt("gv.verifiedBy")}</span>}
                </div>
              </div>
            ))
          )}
          {detailTab === "mentions" && (
            <div>
              <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:"var(--paper-text-mute)", letterSpacing:".06em", marginBottom: 20}}>
                {selected.mentions} mentions across {selected.chapters.length} chapters · canonical id <span style={{color:"var(--gold-deep)"}}>{selected.id}</span>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(15, 1fr)", gap:4, marginBottom: 24}}>
                {Array.from({length:61}, (_, i) => i + 1).map(n => {
                  const isActive = selected.chapters.includes(n);
                  return <div key={n} title={`ch${n}`} style={{
                    aspectRatio:"1", border:"1px solid var(--paper-line)",
                    background: isActive ? "var(--gold)" : "transparent",
                    fontFamily:"'JetBrains Mono', monospace", fontSize: "var(--fs-label)",
                    display:"grid", placeItems:"center",
                    color: isActive ? "var(--ink)" : "var(--paper-text-mute)",
                  }}>{n}</div>;
                })}
              </div>
              <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:"var(--fs-label)", color:"var(--paper-text-mute)", letterSpacing:".06em"}}>
                Each cell = one chapter. Filled cells mark a mention from Pass-2 cluster <span style={{color:"var(--gold-deep)"}}>{selected.id}</span>.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EvClaim({ edge, ctx, dir }) {
  const { tt, entities, locale, gotoEntity } = ctx;
  const src = entities.find(e => e.id === edge.src);
  const dst = entities.find(e => e.id === edge.dst);
  const sLoc = window.entityLocale(edge.src, locale)?.name || src?.name;
  const dLoc = window.entityLocale(edge.dst, locale)?.name || dst?.name;
  // The card used to print the triple twice: once as source → relation → target,
  // then again as edge.claim (or, off English, the same three parts rejoined with
  // em dashes). One statement, once — with the predicate the pipeline actually
  // extracted (edge.label) rather than the name of the category it filed the
  // edge under. The predicate stays in the source's own words, like the evidence
  // span it came from; the category rides alongside as a tag.
  const predicate = edge.label || window.t("rel." + edge.rel);
  const arrow = dir === "out" ? "→" : "←";
  return (
    <div className="ev-claim-card">
      <div className="ev-claim-triple">
        <button className="ev-claim-node" onClick={() => gotoEntity(edge.src)}>{sLoc}</button>
        <span className="ev-claim-pred">{arrow} {predicate} {arrow}</span>
        <button className="ev-claim-node" onClick={() => gotoEntity(edge.dst)}>{dLoc}</button>
        <span className="ev-claim-cat">{window.t("rel." + edge.rel)}</span>
      </div>
      <window.EvidPeek><div className="evid">{edge.evidence}</div></window.EvidPeek>
      <div className="evid-meta">
        <span>{window.friendlyChunkId(edge.chunk, locale)}</span>
        {edge.verified && <span className="ok">{tt("gv.verifiedBy")}</span>}
      </div>
    </div>
  );
}

window.ViewEntities = ViewEntities;
