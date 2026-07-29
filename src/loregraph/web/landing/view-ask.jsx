// LoreGraph — Ask view
// Left: conversation history · Right: chat with evidence-anchored answers.

function ViewAsk({ ctx }) {
  const { tt, data, locale, selectedConvId, setSelectedConvId, setActiveView, setSelectedEntityId, entities, gotoEntity, conversations } = ctx;
  const { useState } = React;
  const [draft, setDraft] = useState("");

  const conv = conversations[selectedConvId] || conversations[0];

  // Suggested prompts are built from THIS book's most-mentioned entities. The
  // previous version hard-coded Pemberley and the letters from Pride and
  // Prejudice, so every other work in the library was offered questions about
  // a novel it has nothing to do with.
  const named = entities
    .slice()
    .sort((a, b) => (b.mentions || 0) - (a.mentions || 0))
    .map((e) => (window.entityLocale(e.id, locale) || {}).name || e.name)
    .filter(Boolean);
  const suggested = [
    named[0] && tt("ask.sug.role", { n: named[0] }),
    named[0] && named[1] && tt("ask.sug.relation", { a: named[0], b: named[1] }),
    tt("ask.sug.turning"),
  ].filter(Boolean);

  const composer = (
    <div className="av-input-area">
      <div className="av-input">
        <textarea
          placeholder={tt("ask.placeholder")}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={2}
        />
        <button>{tt("ask.send")} →</button>
      </div>
      <div className="av-input-hint">
        {tt("ask.hint", {k: "<span class='k'>⌘ ⏎</span>"}).split(/<span class='k'>(.*?)<\/span>/).map((part, i) =>
          i % 2 === 0 ? part : <span key={i} className="k">{part}</span>
        )}
      </div>
    </div>
  );

  // A work with no recorded conversations is the normal case, not an error —
  // most of the library has never been asked anything. Reading conv.q here is
  // what used to take the whole view down with the error boundary.
  if (!conv) {
    return (
      <div className="av av-solo">
        <div className="av-conv">
          <div className="av-conv-body av-empty">
            <h2 className="av-empty-title">{tt("ask.empty.title")}</h2>
            <p className="av-empty-body">{tt("ask.empty.body")}</p>
            <div className="av-empty-start">{tt("ask.empty.start")}</div>
            <div className="av-suggest-row">
              {suggested.map((s, i) => (
                <button key={i} className="av-suggest" onClick={() => setDraft(s)}>{s}</button>
              ))}
            </div>
          </div>
          {composer}
        </div>
      </div>
    );
  }

  return (
    <div className="av">
      <aside className="av-history">
        <h3>{tt("ask.history")}</h3>
        <button className="av-new">{tt("ask.new")}</button>
        {conversations.map((c, i) => (
          <div key={i}
               className={"av-hist-item " + (selectedConvId === i ? "active" : "")}
               onClick={() => setSelectedConvId(i)}>
            {c.q}
            <div className="meta">{tt("ask.hist.points", { n: c.points.length })}</div>
          </div>
        ))}
      </aside>

      <div className="av-conv">
        <div className="av-conv-body">
          <div className="av-q">{conv.q}</div>

          <div className="av-a">{conv.a}</div>

          <div className="av-points">
            {conv.points.map((p, i) => (
              <div key={i} className="av-point">
                <div className="av-point-text">
                  <strong style={{color:"var(--gold-deep)", marginRight:8, fontFamily:"'JetBrains Mono', monospace", fontSize:12, fontWeight:500}}>
                    {String(i+1).padStart(2,"0")}
                  </strong>
                  {p.text}
                </div>
                <div className="av-point-refs">
                  {p.chunk && (
                    <span className="av-ref chunk" onClick={() => { setActiveView("reader"); }}>{p.chunk}</span>
                  )}
                  {p.entity && (() => {
                    const e = entities.find(en => en.id === p.entity);
                    if (!e) return null;
                    const loc = window.entityLocale(p.entity, locale);
                    return <span className="av-ref ent" onClick={() => { gotoEntity(p.entity, "entities"); }}>{loc?.name || e.name}</span>;
                  })()}
                  {p.edge && (
                    <span className="av-ref" onClick={() => { setActiveView("graph"); }}>edge {p.edge}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {conv.caveat && (
            <div className="av-caveat">
              <span className="av-caveat-label">{tt("ask.caveat")}</span>
              {conv.caveat}
            </div>
          )}

          {/* Suggested follow-ups */}
          <div style={{marginTop:48, paddingTop: 24, borderTop:"1px solid var(--paper-line-soft)"}}>
            <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:"var(--fs-label)", letterSpacing:"var(--track-l)", color:"var(--gold-deep)", textTransform:"uppercase", marginBottom: 14}}>
              {ctx.tt("ask.suggested")}
            </div>
            <div className="av-suggest-row">
              {suggested.map((s, i) => (
                <button key={i} className="av-suggest" onClick={() => setDraft(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {composer}
      </div>
    </div>
  );
}

window.ViewAsk = ViewAsk;
