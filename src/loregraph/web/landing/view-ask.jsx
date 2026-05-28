// LoreGraph — Ask view
// Left: conversation history · Right: chat with evidence-anchored answers.

function ViewAsk({ ctx }) {
  const { tt, data, locale, selectedConvId, setSelectedConvId, setActiveView, setSelectedEntityId, entities, gotoEntity, conversations } = ctx;
  const { useState } = React;
  const [draft, setDraft] = useState("");

  const conv = conversations[selectedConvId] || conversations[0];

  // suggested follow-ups
  const suggested = [
    locale === "en"  ? "Trace the role of letters in the plot." :
    locale === "zh-CN" ? "追踪信件在情节中的作用。" :
    locale === "zh-TW" ? "追蹤信件在情節中的作用。" :
    locale === "ja"  ? "プロットにおける手紙の役割を追え。" :
    locale === "ko"  ? "줄거리에서 편지의 역할을 추적하라." :
    locale === "fr"  ? "Tracez le rôle des lettres dans l'intrigue." :
    locale === "es"  ? "Sigue el papel de las cartas en la trama." :
                       "Verfolge die Rolle der Briefe in der Handlung.",

    locale === "en"  ? "What does Pemberley symbolize?" :
    locale === "zh-CN" ? "Pemberley 象征什么？" :
    locale === "zh-TW" ? "Pemberley 象徵什麼？" :
    locale === "ja"  ? "ペンバリーは何を象徴するか？" :
    locale === "ko"  ? "펨벌리는 무엇을 상징하는가?" :
    locale === "fr"  ? "Que symbolise Pemberley ?" :
    locale === "es"  ? "¿Qué simboliza Pemberley?" :
                       "Was symbolisiert Pemberley?",
  ];

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
            <div className="meta">{c.points.length} EVIDENCE-ANCHORED POINTS</div>
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
            <div className="av-caveat">{conv.caveat}</div>
          )}

          {/* Suggested follow-ups */}
          <div style={{marginTop:48, paddingTop: 24, borderTop:"1px solid var(--paper-line-soft)"}}>
            <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:10, letterSpacing:".22em", color:"var(--gold-deep)", textTransform:"uppercase", marginBottom: 14}}>
              {ctx.tt("ask.suggested")}
            </div>
            <div style={{display:"flex", flexWrap:"wrap", gap: 8}}>
              {suggested.map((s, i) => (
                <button key={i}
                  onClick={() => setDraft(s)}
                  style={{
                    fontFamily:"'Spectral', serif",
                    fontStyle:"italic",
                    fontSize:13,
                    padding:"8px 14px",
                    border:"1px solid var(--paper-line)",
                    color:"var(--paper-text)",
                    background:"transparent",
                    transition:"all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.background = "rgba(184,149,74,.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--paper-line)"; e.currentTarget.style.background = "transparent"; }}
                >→ {s}</button>
              ))}
            </div>
          </div>
        </div>

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
      </div>
    </div>
  );
}

window.ViewAsk = ViewAsk;
