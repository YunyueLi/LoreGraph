// LoreGraph — Pipeline view
// Shows extraction run: passes, costs, logs.

function ViewPipeline({ ctx }) {
  const { tt, data, locale, activeBook } = ctx;
  const { useState } = React;
  const [runIdx, setRunIdx] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const run = data.runs[runIdx];
  const runBook = data.books.find(b => b.id === run.bookId);

  const totalCost = run.passes.reduce((s, p) => s + p.cost, 0);
  const totalTokensIn = run.passes.reduce((s, p) => s + p.tokensIn, 0);
  const totalTokensOut = run.passes.reduce((s, p) => s + p.tokensOut, 0);
  const totalCached = run.passes.reduce((s, p) => s + p.cachedIn, 0);
  const totalDuration = run.passes.reduce((s, p) => s + p.durationS, 0);
  const cacheRate = totalTokensIn > 0 ? totalCached / totalTokensIn : 0;

  const fmtDuration = (s) => {
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };
  const fmtTokens = (n) => {
    if (n >= 1000000) return (n/1000000).toFixed(2) + "M";
    if (n >= 1000) return (n/1000).toFixed(1) + "k";
    return String(n);
  };

  return (
    <div className="pv">
      {/* `data.runs` is a hand-written illustration of what a run looks like —
          per-pass timings, token counts and gleaning rounds that no run
          produced. Every other figure in the app now comes from a real
          export; this one does not, and has to say so rather than sit next
          to them looking equally sourced. */}
      <div className="pv-demo-note" role="note">{tt("pv.demoNote")}</div>
      <div className="pv-head">
        <div>
          <div className="eyebrow-s" style={{marginBottom:6}}>{tt("pv.title").toUpperCase()}</div>
          <h1>{tt("pv.title.em")} · <em>{runBook?.title}</em></h1>
          <div style={{marginTop:6, display:"flex", gap:18}}>
            <div className="sub">
              {tt("pv.startedAt")} <span style={{color:"var(--paper-text)"}}>{run.startedAt}</span>
            </div>
            {run.finishedAt && (
              <div className="sub">
                {tt("pv.finishedAt")} <span style={{color:"var(--paper-text)"}}>{run.finishedAt}</span>
              </div>
            )}
            <div className={"bar-pill " + run.status}>
              <span className="dot" />
              {run.status === "running" && `${tt("status.running")} · Pass-${run.currentPass}`}
              {run.status === "verified" && (run.matchRate != null
                ? `${tt("status.verified")} · ${(run.matchRate*100).toFixed(1)}%`
                : tt("status.verified"))}
              {run.status === "failed" && tt("status.failed")}
            </div>
          </div>
        </div>
        <div style={{display:"flex", gap:8}}>
          {/* Titles were cut at 18 characters with no ellipsis, so the picker
              read "The Name of the Ro". CSS ellipsises instead. */}
          {data.runs.map((r, i) => (
            <button key={i}
              className={"bar-btn bar-btn-book " + (i === runIdx ? "primary" : "")}
              title={window.bookTitle(data.books.find(b => b.id === r.bookId) || {}, locale)}
              onClick={() => setRunIdx(i)}>
              {window.bookTitle(data.books.find(b => b.id === r.bookId) || {}, locale)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary — 3 cells, user-meaningful only */}
      <div className="pv-summary" style={{gridTemplateColumns: "1.4fr 1fr 1fr"}}>
        <div className="pv-summary-cell">
          <div className="pv-summary-lbl">{tt("pv.matchRate")}</div>
          {/* A run that hasn't reached the Pass-7 gate has no match rate yet. It
              used to render as a bare em-dash under a caption asserting that
              every claim traces back to the text — which read as broken, and
              claimed something the run has not established. */}
          <div className="pv-summary-val">
            {run.matchRate
              ? <><span className="gold">{(run.matchRate*100).toFixed(1)}</span><small>%</small></>
              : <span className="pv-summary-pending">{tt("pv.matchRate.pending")}</span>}
          </div>
          <div style={{marginTop:10, fontFamily:"'Spectral', serif", fontStyle:"italic", color:"var(--ink-text-mute)", fontSize:12.5, lineHeight:1.4}}>
            {run.matchRate ? tt("pv.matchRate.caption") : tt("pv.matchRate.await")}
          </div>
        </div>
        <div className="pv-summary-cell">
          <div className="pv-summary-lbl">{tt("pv.duration")}</div>
          <div className="pv-summary-val">{fmtDuration(totalDuration)}</div>
        </div>
        <div className="pv-summary-cell">
          <div className="pv-summary-lbl">{tt("pv.totalCost")}</div>
          <div className="pv-summary-val"><span className="gold">$</span>{totalCost.toFixed(2)}</div>
        </div>
      </div>

      {/* Passes */}
      <div>
        {run.passes.map((p, i) => {
          // Fall back rather than crash if the run data ever carries a pass the
          // stage table doesn't describe yet.
          const stage = window.LG_STAGES[p.n - 1] || { en: p.name, sub: { en: "" } };
          const friendlyName = stage[locale] || stage.en || p.name;
          const friendlySub = (stage.sub && (stage.sub[locale] || stage.sub.en)) || "";
          return (
            <div key={p.n} className={"pv-pass " + p.status + (p.n === 7 ? " gate" : "")}
                 style={{gridTemplateColumns: "60px 110px 1fr 110px"}}>
              <div className="pv-pass-num">{String(p.n).padStart(2,"0")}</div>
              <div>
                <div className={"pv-pass-status " + p.status}>{tt("status." + p.status)}</div>
                {p.durationS > 0 && (
                  <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:"var(--fs-label)", color:"var(--paper-text-mute)", marginTop:4, letterSpacing:".06em"}}>
                    {fmtDuration(p.durationS)}
                  </div>
                )}
              </div>
              <div className="pv-pass-name">
                <strong>{friendlyName}</strong>
                <small>{friendlySub}</small>
                {p.output && <div className="pv-pass-output">▸ {p.output}</div>}
              </div>
              <div className="pv-pass-stat">
                <div className="pv-pass-stat-val" style={{color: p.cost > 0 ? "var(--paper-text)" : "var(--paper-text-mute)"}}>
                  {p.cost > 0 ? "$" + p.cost.toFixed(2) : "—"}
                </div>
                <div className="pv-pass-stat-lbl">{tt("pv.cost")}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Details (logs + cost) hidden by default — power-user content */}
      <div style={{marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--paper-line)"}}>
        <button onClick={() => setShowDetails(v => !v)}
          style={{
            fontFamily:"'JetBrains Mono', monospace",
            fontSize: "var(--fs-label)", letterSpacing: "var(--track-l)", textTransform:"uppercase",
            color:"var(--gold-deep)",
            padding: "6px 0",
          }}>
          {showDetails ? "▾ " : "▸ "}
          {tt("pv.behindScenes")}
          <span style={{marginLeft: 12, color:"var(--paper-text-mute)", letterSpacing:".08em"}}>
            {fmtTokens(totalTokensIn + totalTokensOut)} tokens · {(cacheRate*100).toFixed(0)}% cache hit · {run.logs.length} log lines
          </span>
        </button>
      </div>

      {showDetails && (
        <div className="pv-section">
          <div className="pv-logs">
            <div style={{display:"flex", justifyContent:"space-between", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--ink-line)"}}>
              <span style={{color:"var(--gold)", letterSpacing:"var(--track-l)", fontSize:"var(--fs-label)"}}>{tt("pv.logs")}</span>
              <span style={{color:"var(--ink-text-mute)"}}>{run.logs.length} entries</span>
            </div>
            {run.logs.map((l, i) => (
              <div key={i} className="pv-log-row">
                <span className="pv-log-t">{l.t}</span>
                <span className={"pv-log-lv " + l.level}>{l.level.toUpperCase()}</span>
                <span className="pv-log-msg">{l.msg}</span>
              </div>
            ))}
            {run.status === "running" && (
              <div className="pv-log-row" style={{marginTop:6, opacity:.7}}>
                <span className="pv-log-t">▒▒▒▒▒</span>
                <span className="pv-log-lv info">···</span>
                <span className="pv-log-msg" style={{fontStyle:"italic"}}>extracting…</span>
              </div>
            )}
          </div>

          <div className="pv-cost">
            <h3>{tt("pv.costBreakdown")}</h3>
            {run.passes.filter(p => p.cost > 0).map(p => {
              const stage = window.LG_STAGES[p.n - 1];
              return (
                <div key={p.n} className="pv-cost-row">
                  <span>{String(p.n).padStart(2,"0")} · {stage[locale] || stage.en}</span>
                  <span>${p.cost.toFixed(2)}</span>
                </div>
              );
            })}
            <div className="pv-cost-row">
              <span>{tt("pv.subtotal")}</span>
              <span>${totalCost.toFixed(2)}</span>
            </div>

            <div style={{marginTop:24, padding:"14px 16px", background:"rgba(184,149,74,.08)", borderLeft:"2px solid var(--gold)"}}>
              <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:"var(--fs-label)", color:"var(--gold-deep)", letterSpacing:"var(--track-l)", marginBottom:6}}>
                {tt("pv.cacheSavings")}
              </div>
              <div style={{fontFamily:"'Spectral', serif", fontSize:16, lineHeight:1.4}}>
                <strong style={{color:"var(--gold-deep)"}}>~${(totalCached / 1000000 * 3 * 0.9).toFixed(2)}</strong>
                <span style={{fontStyle:"italic"}}> {tt("pv.cacheText")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.ViewPipeline = ViewPipeline;
