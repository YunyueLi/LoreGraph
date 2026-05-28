// LoreGraph — App shell
// Sidebar, topbar, view routing, language state.

const { useState, useEffect, useMemo, useRef } = React;

/* =================== ERROR BOUNDARY =================== */
// Wraps each view so a render error in one view doesn't white-screen the entire app.
class ViewErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("[LoreGraph view crash]", error, info); }
  componentDidUpdate(prevProps) { if (prevProps.viewKey !== this.props.viewKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:"60px 48px", maxWidth: 720, fontFamily:"'Spectral', serif", color:"var(--paper-text)"}}>
          <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:10, letterSpacing:".26em", color:"var(--rust)", textTransform:"uppercase", marginBottom: 14}}>
            ▲ View error
          </div>
          <h2 style={{fontWeight:300, fontSize:32, lineHeight:1.15, marginBottom: 12, fontStyle:"italic", color:"var(--paper-text)"}}>
            Something went wrong rendering this view.
          </h2>
          <p style={{fontStyle:"italic", color:"var(--paper-text-mute)", fontSize:15, lineHeight:1.55, marginBottom: 24}}>
            其他视图仍可正常使用。点击下方按钮重试，或切换到其他视图。
          </p>
          <pre style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 11, padding:"14px 16px", background:"rgba(160,74,42,.06)", borderLeft:"2px solid var(--rust)", color:"var(--rust)", whiteSpace:"pre-wrap", marginBottom: 20, lineHeight: 1.5}}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{padding:"8px 18px", border:"1px solid var(--gold)", background:"transparent", color:"var(--gold-deep)", fontFamily:"'Spectral', serif", fontStyle:"italic", fontSize: 13, cursor:"pointer"}}>
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const data = window.LG_DATA;
  const [locale, setLocaleState] = useState(() => localStorage.getItem("lg_locale") || "zh-CN");
  const [activeView, setActiveView] = useState(() => localStorage.getItem("lg_view") || "library");
  const [activeBookId, setActiveBookId] = useState(() => {
    // Restore the most recently opened book if any.
    try {
      const mru = JSON.parse(localStorage.getItem("lg_book_mru") || "[]");
      if (Array.isArray(mru) && mru.length) return mru[0];
    } catch {}
    return "pap";
  });
  // Most-recently-used book order. Prepended on every active-book change.
  const [bookMru, setBookMru] = useState(() => {
    try {
      const mru = JSON.parse(localStorage.getItem("lg_book_mru") || "[]");
      return Array.isArray(mru) ? mru : [];
    } catch { return []; }
  });
  const [selectedEntityId, setSelectedEntityId] = useState("e01");
  const [selectedConvId, setSelectedConvId] = useState(0);
  const [sbCollapsed, setSbCollapsed] = useState(() => localStorage.getItem("lg_sb_collapsed") === "1");
  const [settingsSection, setSettingsSection] = useState("provider");
  // Graph panel state lifted here so Topbar can render the pill
  const [graphViewMode, setGraphViewMode] = useState("social");
  const [graphLeftHidden, setGraphLeftHidden] = useState(false);
  const [graphRightHidden, setGraphRightHidden] = useState(false);
  // Timeline mode — lifted so topbar can render the pill
  const [tlMode, setTlMode] = useState(() => localStorage.getItem("lg_tl_mode") || "folio");

  useEffect(() => { window.__lg_locale = locale; localStorage.setItem("lg_locale", locale); }, [locale]);
  useEffect(() => { localStorage.setItem("lg_view", activeView); }, [activeView]);
  useEffect(() => { localStorage.setItem("lg_sb_collapsed", sbCollapsed ? "1" : "0"); }, [sbCollapsed]);
  useEffect(() => { localStorage.setItem("lg_tl_mode", tlMode); }, [tlMode]);
  // Promote the active book to the head of the MRU list whenever it changes.
  useEffect(() => {
    if (!activeBookId) return;
    setBookMru(prev => {
      const filtered = (prev || []).filter(id => id !== activeBookId);
      const next = [activeBookId, ...filtered];
      try { localStorage.setItem("lg_book_mru", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [activeBookId]);

  const setLocale = (l) => setLocaleState(l);

  // helpers
  const tt = (key, params) => window.t(key, locale, params);
  const activeBook = data.books.find(b => b.id === activeBookId) || data.books[0];

  // Per-book scoping. Legacy records (no bookId) belong to P&P.
  const _abId = activeBook ? activeBook.id : "pap";
  const _belongs = (rec) => (rec.bookId || "pap") === _abId;
  const entities = data.entities.filter(_belongs);
  const edges = data.edges.filter(_belongs);
  const chunks = data.chunks.filter(_belongs);
  const glucose = data.glucose.filter(_belongs);
  const conversations = data.conversations.filter(_belongs);

  // navigate to entity from anywhere
  const gotoEntity = (entId, view) => {
    setSelectedEntityId(entId);
    if (view) setActiveView(view);
  };

  const ctx = { data, locale, setLocale, tt, activeView, setActiveView, activeBook, setActiveBookId, bookMru, entities, edges, chunks, glucose, conversations, selectedEntityId, setSelectedEntityId, gotoEntity, selectedConvId, setSelectedConvId, settingsSection, setSettingsSection, graphViewMode, setGraphViewMode, graphLeftHidden, setGraphLeftHidden, graphRightHidden, setGraphRightHidden, tlMode, setTlMode };

  return (
    <div className={"app" + (sbCollapsed ? " sb-collapsed" : "")}>
      <Sidebar ctx={ctx}
        collapsed={sbCollapsed} setCollapsed={setSbCollapsed}
        goToSettings={(section) => { setSettingsSection(section || "provider"); setActiveView("settings"); }} />
      <div className="main">
        <Topbar ctx={ctx} />
        <div className="main-content">
          <ViewErrorBoundary viewKey={activeView}>
            {activeView === "library"   && <ViewLibrary ctx={ctx} />}
            {activeView === "graph"     && <ViewGraph ctx={ctx} />}
            {activeView === "reader"    && <ViewReader ctx={ctx} />}
            {activeView === "entities"  && <ViewEntities ctx={ctx} />}
            {activeView === "timeline"  && <ViewTimeline ctx={ctx} />}
            {activeView === "pipeline"  && <ViewPipeline ctx={ctx} />}
            {activeView === "ask"       && <ViewAsk ctx={ctx} />}
            {activeView === "settings"  && <ViewSettings ctx={ctx} />}
            {["graph","entities","timeline"].includes(activeView) && <BookshelfSwitcher ctx={ctx} />}
            {activeView === "technical" && <ViewTechnical ctx={ctx} />}
          </ViewErrorBoundary>
        </div>
      </div>
    </div>
  );
}

/* =============== SIDEBAR =============== */
function Sidebar({ ctx, collapsed, setCollapsed, goToSettings }) {
  const { tt, activeView, setActiveView, data, activeBook, conversations } = ctx;

  const counts = {
    library:  data.books.length,
    graph:    activeBook ? activeBook.edges : "—",
    reader:   activeBook ? activeBook.chapters : "—",
    entities: activeBook ? activeBook.entities : "—",
    pipeline: data.runs.filter(r => r.status === "running").length || null,
    ask:      conversations.length,
  };

  const NavItem = ({ id, icon, label, count, dot }) => (
    <div className={"sb-item " + (activeView === id ? "active" : "")}
         onClick={() => setActiveView(id)}
         data-tip={label}>
      <span className="sb-item-icon">{icon}</span>
      <span className="sb-item-label">{label}</span>
      {dot && <span className="sb-item-dot" />}
      {count !== undefined && count !== null && <span className="sb-item-count">{count}</span>}
    </div>
  );

  return (
    <aside className="sb"
      onClick={collapsed ? () => setCollapsed(false) : undefined}
      style={collapsed ? {cursor:"pointer"} : {}}
      title={collapsed ? tt("sb.expand") : undefined}>
      <div className="sb-brand">
        <div className="sb-mark" aria-label="LoreGraph">
          <svg viewBox="0 0 28 28" fill="none">
            <line x1="8" y1="9" x2="20" y2="19" stroke="#b8954a" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="8"  cy="9"  r="3.4" fill="#1a1714" stroke="#d1ac5e" strokeWidth="1.6" />
            <circle cx="20" cy="19" r="2.6" fill="#d1ac5e" />
          </svg>
        </div>
        {!collapsed && (<>
          <div className="sb-name">
            <span className="sb-wordmark">LoreGraph</span>
          </div>
          <button className="sb-toggle"
            onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}
            title={tt("sb.collapse")}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M 10 4 L 6 8 L 10 12" />
            </svg>
          </button>
        </>)}
      </div>

      <div className="sb-section">{tt("nav.section.workspace")}</div>
      <div className="sb-nav">
        <NavItem id="library"  icon={<I.book />}     label={tt("nav.library")}  count={counts.library} />
        <NavItem id="graph"    icon={<I.graph />}    label={tt("nav.graph")}    count={counts.graph} />
        <NavItem id="reader"   icon={<I.read />}     label={tt("nav.reader")}   count={counts.reader} />
        <NavItem id="entities" icon={<I.entity />}   label={tt("nav.entities")} count={counts.entities} />
        <NavItem id="timeline" icon={<I.timeline />} label={tt("nav.timeline")} count={8} />
      </div>

      <div className="sb-section">{tt("nav.section.analysis")}</div>
      <div className="sb-nav">
        <NavItem id="pipeline" icon={<I.pipe />}     label={tt("nav.pipeline")} dot={counts.pipeline > 0} />
        <NavItem id="ask"      icon={<I.chat />}     label={tt("nav.ask")}      count={counts.ask} />
      </div>

      <div className="sb-section">{tt("nav.section.system")}</div>
      <div className="sb-nav">
        <NavItem id="technical" icon={<I.tech />} label={tt("nav.technical")} />
        <NavItem id="settings" icon={<I.settings />} label={tt("nav.settings")} />
      </div>

      <div className="sb-foot">
        <div className="sb-budget">
          <div className="sb-budget-row">
            <span>{tt("budget.title")}</span>
            <span style={{color:"var(--gold)"}}>{data.user.budgetUsed.toFixed(2)} / {data.user.budgetCap.toFixed(0)}$</span>
          </div>
          <div className="sb-budget-bar">
            <div style={{width: (data.user.budgetUsed/data.user.budgetCap*100)+"%"}} />
          </div>
        </div>
        <div className="sb-user">
          <div className="sb-user-avatar">Y</div>
          <div style={{flex:1, minWidth: 0}}>
            <div className="sb-user-name">{data.user.name}</div>
            <div className="sb-user-plan">{tt("user.plan").toUpperCase()} · ANTHROPIC</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function _DEPRECATED_AccountMenu_REMOVED() { return null; }

/* =============== TOPBAR =============== */
function Topbar({ ctx }) {
  const { tt, activeView, activeBook, locale, setLocale, graphViewMode, setGraphViewMode, graphLeftHidden, setGraphLeftHidden, graphRightHidden, setGraphRightHidden, tlMode, setTlMode } = ctx;
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const fn = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const currentLoc = window.LG_LOCALES.find(l => l.code === locale) || window.LG_LOCALES[0];

  // breadcrumb / context per view
  const viewLabel = {
    library: tt("nav.library"),
    graph: tt("nav.graph"),
    reader: tt("nav.reader"),
    entities: tt("nav.entities"),
    timeline: tt("nav.timeline"),
    pipeline: tt("nav.pipeline"),
    ask: tt("nav.ask"),
    technical: tt("nav.technical"),
  }[activeView];

  const showBook = ["graph","reader","entities","timeline","ask","pipeline"].includes(activeView) && activeBook;

  // Graph pill labels
  const pillLabels = {
    filters: { en:"Filters","zh-CN":"筛选","zh-TW":"篩選",ja:"フィルタ",ko:"필터",fr:"Filtres",es:"Filtros",de:"Filter" },
    social:  { en:"Social","zh-CN":"人物","zh-TW":"人物",ja:"人物",ko:"사회",fr:"Social",es:"Social",de:"Sozial" },
    themes:  { en:"Themes","zh-CN":"主题","zh-TW":"主題",ja:"テーマ",ko:"주제",fr:"Thèmes",es:"Temas",de:"Themen" },
    details: { en:"Details","zh-CN":"详情","zh-TW":"詳情",ja:"詳細",ko:"세부",fr:"Détails",es:"Detalles",de:"Details" },
  };
  const pl = (k) => pillLabels[k][locale] || pillLabels[k].en;

  return (
    <div className="main-bar">
      <div className="crumbs">
        <span className="cur">{viewLabel}</span>
        {showBook && (
          <>
            <span className="sep">/</span>
            <em>{activeBook.title}</em>
            <span style={{fontSize:11, opacity:.5}}>· {activeBook.author}</span>
          </>
        )}
      </div>

      {activeView === "graph" && (
        <div className="gv-pill-bar">
          <button className={"gv-pill-btn " + (!graphLeftHidden ? "active" : "")} onClick={() => setGraphLeftHidden(h => !h)}>{pl("filters")}</button>
          <div className="gv-pill-sep" />
          {["social","themes"].map(k => (
            <button key={k} className={"gv-pill-btn gv-pill-mode " + (graphViewMode === k ? "active" : "")} onClick={() => setGraphViewMode(k)}>{pl(k)}</button>
          ))}
          <div className="gv-pill-sep" />
          <button className={"gv-pill-btn " + (!graphRightHidden ? "active" : "")} onClick={() => setGraphRightHidden(h => !h)}>{pl("details")}</button>
        </div>
      )}

      {activeView === "timeline" && (
        <div className="gv-pill-bar">
          {[
            { k: "folio",  en: "Folio",  "zh-CN": "卷册", "zh-TW": "卷冊", ja: "折本", ko: "필사", fr: "Folio",  es: "Folio",  de: "Folio" },
            { k: "stage",  en: "Stage",  "zh-CN": "舞台", "zh-TW": "舞台", ja: "舞台", ko: "무대", fr: "Scène",  es: "Escena", de: "Bühne" },
            { k: "ribbon", en: "Ribbon", "zh-CN": "卷轴", "zh-TW": "卷軸", ja: "巻物", ko: "두루마리", fr: "Ruban", es: "Cinta",  de: "Band"  },
          ].map(m => (
            <button key={m.k}
              className={"gv-pill-btn gv-pill-mode " + (tlMode === m.k ? "active" : "")}
              onClick={() => setTlMode(m.k)}>
              {m[locale] || m.en}
            </button>
          ))}
        </div>
      )}

      <div className="bar-spacer" />

      {showBook && activeBook.status === "verified" && (
        <div className="bar-pill verified"><span className="dot" />{(activeBook.matchRate*100).toFixed(0)}% cited</div>
      )}
      {showBook && activeBook.status === "running" && (
        <div className="bar-pill running"><span className="dot" />running</div>
      )}

      {/* language switcher */}
      <div style={{position:"relative"}} ref={langRef}>
        <button
          className="bar-btn"
          onClick={() => setLangOpen(o => !o)}
          style={{display:"inline-flex", alignItems:"center", gap: 6}}
        >
          <span style={{fontFamily: "'Spectral', serif", fontStyle:"italic", color:"var(--gold-deep)"}}>{currentLoc.label}</span>
          <span style={{opacity:.5, fontSize:9}}>▾</span>
        </button>
        {langOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            background: "var(--paper)", border: "1px solid var(--paper-line)",
            minWidth: 200, zIndex: 50,
            boxShadow: "0 16px 40px -10px rgba(60,40,10,.25)",
          }}>
            {window.LG_LOCALES.map(l => (
              <button
                key={l.code}
                onClick={() => { setLocale(l.code); setLangOpen(false); }}
                style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  width:"100%", padding:"10px 14px",
                  background: locale === l.code ? "var(--paper-deep)" : "transparent",
                  borderBottom:"1px solid var(--paper-line-soft)",
                  textAlign:"left", cursor:"pointer",
                  color: locale === l.code ? "var(--gold-deep)" : "var(--paper-text)",
                }}
              >
                <span style={{fontFamily:"'Spectral', serif", fontSize: 14}}>{l.name}</span>
                <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize:10, letterSpacing:".16em", color: locale === l.code ? "var(--gold)" : "var(--paper-text-mute)"}}>{l.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeView === "library" && (
        <button className="bar-btn primary">+ {tt("lib.import.text")}</button>
      )}
      {activeView === "graph" && showBook && (
        <button className="bar-btn">{tt("common.openReader")}</button>
      )}
    </div>
  );
}

/* =============== ICONS =============== */
const I = {
  book: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M2 3 L8 4 L14 3 L14 13 L8 13.6 L2 13 z" />
      <path d="M8 4 L8 13.6" />
    </svg>
  ),
  graph: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="3.5" cy="4" r="1.6" />
      <circle cx="12.5" cy="4" r="1.6" />
      <circle cx="8" cy="12" r="1.6" />
      <line x1="3.5" y1="4" x2="12.5" y2="4" />
      <line x1="3.5" y1="4" x2="8" y2="12" />
      <line x1="12.5" y1="4" x2="8" y2="12" />
    </svg>
  ),
  read: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M1.5 4 L8 5 L14.5 4 L14.5 13 L8 13.8 L1.5 13 z" />
      <line x1="3.5" y1="6.5" x2="6.5" y2="6.8" />
      <line x1="3.5" y1="9" x2="6.5" y2="9.2" />
      <line x1="3.5" y1="11.2" x2="6.5" y2="11.4" />
      <line x1="9.5" y1="6.8" x2="12.5" y2="6.5" />
      <line x1="9.5" y1="9.2" x2="12.5" y2="9" />
    </svg>
  ),
  entity: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="4" cy="4" r="2" />
      <rect x="9.5" y="2.5" width="4" height="4" />
      <path d="M4 10 L6 13 L2 13 z" />
      <path d="M11.5 9 L13.8 10.4 L13.8 12.6 L11.5 14 L9.2 12.6 L9.2 10.4 z" />
    </svg>
  ),
  pipe: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="3" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="13" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <line x1="4.5" y1="8" x2="6.5" y2="8" />
      <line x1="9.5" y1="8" x2="11.5" y2="8" />
    </svg>
  ),
  chat: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M2 3 L14 3 L14 11 L9 11 L6 13.5 L6 11 L2 11 z" />
      <line x1="4.5" y1="6" x2="11.5" y2="6" />
      <line x1="4.5" y1="8.5" x2="9.5" y2="8.5" />
    </svg>
  ),
  tech: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1.5" y="3" width="13" height="9" />
      <line x1="1.5" y1="6" x2="14.5" y2="6" />
      <circle cx="3.5" cy="4.5" r="0.4" fill="currentColor" />
      <circle cx="5" cy="4.5" r="0.4" fill="currentColor" />
      <line x1="4" y1="9" x2="9" y2="9" stroke="var(--gold)" />
      <line x1="4" y1="10.5" x2="7" y2="10.5" stroke="var(--gold)" />
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <line x1="2" y1="4" x2="14" y2="4" />
      <circle cx="5" cy="4" r="1.6" fill="currentColor" stroke="none" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <circle cx="11" cy="8" r="1.6" fill="currentColor" stroke="none" />
      <line x1="2" y1="12" x2="14" y2="12" />
      <circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  timeline: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <line x1="2" y1="8" x2="14" y2="8" />
      <circle cx="4" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="8" r="1.4" fill="none" />
      <circle cx="12.5" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <line x1="4" y1="5.5" x2="4" y2="3" />
      <line x1="8.5" y1="10.5" x2="8.5" y2="13" />
      <line x1="12.5" y1="5.5" x2="12.5" y2="3" />
    </svg>
  ),
};

/* =============== BookshelfSwitcher — floating popover on graph/index/timeline =============== */
const BS_PALETTE = {
  ink:    { bg: "#1a1714", fg: "#d1ac5e" },
  dark:   { bg: "#221d18", fg: "#d1ac5e" },
  gold:   { bg: "#8a6e36", fg: "#fbf7ea" },
  rust:   { bg: "#6b2d22", fg: "#f0d6ad" },
  indigo: { bg: "#2b3056", fg: "#f0d6ad" },
  cream:  { bg: "#d4c5a0", fg: "#3d2f1a" },
  deep:   { bg: "#152133", fg: "#d1ac5e" },
};

function BookshelfSwitcher({ ctx }) {
  const [open, setOpen] = useState(false);
  const { data, activeBook, setActiveBookId, bookMru, locale } = ctx;

  // Close on Esc.
  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  const triggerLabel =
    locale === "en"    ? "Bookshelf" :
    locale === "zh-TW" ? "書架" :
    locale === "ja"    ? "本棚" :
    locale === "ko"    ? "책장" :
    locale === "fr"    ? "Étagère" :
    locale === "es"    ? "Estantería" :
    locale === "de"    ? "Bücherregal" :
                         "书架";

  if (!open) {
    return (
      <button className="bs-switcher-trigger"
        onClick={() => setOpen(true)}
        title={triggerLabel}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="3"    y="4" width="2.6" height="12" />
          <rect x="6.5"  y="3" width="2.6" height="13" />
          <rect x="10"   y="5" width="2.6" height="11" />
          <rect x="13.5" y="4" width="2.6" height="12" />
        </svg>
      </button>
    );
  }

  // Sort active first, then MRU order, then unopened books in original order.
  const mruIdx = new Map((bookMru || []).map((id, i) => [id, i]));
  const sorted = [...data.books].sort((a, b) => {
    if (activeBook && a.id === activeBook.id) return -1;
    if (activeBook && b.id === activeBook.id) return 1;
    const ai = mruIdx.has(a.id) ? mruIdx.get(a.id) : Infinity;
    const bi = mruIdx.has(b.id) ? mruIdx.get(b.id) : Infinity;
    if (ai !== bi) return ai - bi;
    return data.books.indexOf(a) - data.books.indexOf(b);
  });

  return (
    <div className="bs-switcher-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="bs-switcher-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bs-switcher-handle" />
        {activeBook && (() => {
          const title  = window.bookTitle(activeBook, locale);
          const author = window.bookAuthor(activeBook, locale);
          const yr     = activeBook.year ? (activeBook.year > 0 ? activeBook.year : `${-activeBook.year} BC`) : null;
          const meta   = [author, yr].filter(Boolean).join("  ·  ");
          return (
            <div className="bs-switcher-active">
              <div className="bs-switcher-active-eyebrow">{triggerLabel} · {sorted.length}</div>
              <div className="bs-switcher-active-title"><em>{title}</em></div>
              <div className="bs-switcher-active-meta">{meta}</div>
            </div>
          );
        })()}
        <div className="bs-switcher-spines">
          {sorted.map((b) => {
            const p = BS_PALETTE[b.coverTone] || BS_PALETTE.ink;
            const w = Math.round(Math.max(22, Math.min(46, 22 + Math.sqrt((b.tokens || 20000) / 30000) * 7)));
            const title = window.bookTitle(b, locale);
            const author = window.bookAuthor(b, locale);
            const isActive = activeBook && b.id === activeBook.id;
            return (
              <div key={b.id}
                className={"bs-switcher-spine " + (isActive ? "active" : "")}
                style={{ width: `${w}px`, background: p.bg, color: p.fg }}
                title={`${title} — ${author}` + (b.year ? ` (${b.year})` : "")}
                onClick={() => { setActiveBookId(b.id); setOpen(false); }}>
                <div className="bs-switcher-spine-title">{title}</div>
              </div>
            );
          })}
        </div>
        <div className="bs-switcher-shelf-rail" />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

window.I = I;
window.App = App;
