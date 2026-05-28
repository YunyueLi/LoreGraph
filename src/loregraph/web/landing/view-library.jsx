// LoreGraph — Library view
// Grid of books with status, stats, and "+ add new"

function ViewLibrary({ ctx }) {
  const { tt, data, activeBook, setActiveBookId, setActiveView, locale } = ctx;
  const { useState } = React;
  const [filter, setFilter] = useState("all");
  const [coverStyle, setCoverStyle] = useState(() => localStorage.getItem("lg_cover_style") || "photo");
  React.useEffect(() => { localStorage.setItem("lg_cover_style", coverStyle); }, [coverStyle]);

  const books = data.books;
  const filtered = filter === "all" ? books : books.filter(b => (b.type || "novel") === filter);

  // global stats
  const totals = books.reduce((acc, b) => ({
    entities: acc.entities + (b.entities||0),
    edges:    acc.edges    + (b.edges||0),
    cost:     acc.cost     + (b.cost||0),
  }), { entities: 0, edges: 0, cost: 0 });

  const formatDate = (s) => {
    if (!s) return tt("lib.card.never");
    return s;
  };

  const openBook = (b) => {
    setActiveBookId(b.id);
    if (b.status === "verified") setActiveView("graph");
    else if (b.status === "running") setActiveView("pipeline");
    else if (b.status === "failed") setActiveView("pipeline");
    else setActiveView("graph");
  };

  return (
    <div className="lib">
      <div className="lib-head">
        <div>
          <div className="eyebrow-s" style={{marginBottom: 10}}>{tt("nav.library").toUpperCase()}</div>
          <h1>{tt("lib.title")}</h1>
          <p style={{fontFamily:"'Spectral', serif", fontStyle:"italic", color:"var(--paper-text-mute)", fontSize:17, maxWidth:560, marginTop: 6}}>{tt("lib.subtitle")}</p>
        </div>
        <div className="lib-stats">
          <div className="lib-stat">
            <div className="lib-stat-num">{books.length}</div>
            <div className="lib-stat-label">{tt("lib.stat.books")}</div>
          </div>
          <div className="lib-stat">
            <div className="lib-stat-num">{totals.entities.toLocaleString()}</div>
            <div className="lib-stat-label">{tt("lib.stat.entities")}</div>
          </div>
          <div className="lib-stat">
            <div className="lib-stat-num">{totals.edges.toLocaleString()}</div>
            <div className="lib-stat-label">{tt("lib.stat.edges")}</div>
          </div>
          <div className="lib-stat">
            <div className="lib-stat-num">${totals.cost.toFixed(2)}</div>
            <div className="lib-stat-label">{tt("lib.stat.cost")}</div>
          </div>
        </div>
      </div>

      <div className="lib-filters">
        <div className="gv-pill-bar" style={{position:"static", transform:"none", top:"auto", left:"auto"}}>
          {[
            {k:"all",        l: tt("lib.filter.all")},
            {k:"novel",      l: tt("work.type.novel")},
            {k:"play",       l: tt("work.type.play")},
            {k:"musical",    l: tt("work.type.musical")},
            {k:"opera",      l: tt("work.type.opera")},
            {k:"screenplay", l: tt("work.type.screenplay")},
          ].map(f => (
            <button
              key={f.k}
              className={"gv-pill-btn gv-pill-mode " + (filter === f.k ? "active" : "")}
              onClick={() => setFilter(f.k)}
            >{f.l}</button>
          ))}
        </div>
        <div style={{flex:1}} />
        <div className="lib-cover-toggle">
          <button
            className={coverStyle === "photo" ? "active" : ""}
            onClick={() => setCoverStyle("photo")}
            title={locale === "en" ? "Period photographs" : locale === "zh-CN" ? "原版扫描" : locale === "zh-TW" ? "原版掃描" : locale === "ja" ? "原版スキャン" : locale === "ko" ? "원본 스캔" : locale === "fr" ? "Scans d'époque" : locale === "es" ? "Escáneos de época" : "Originalscans"}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="2" y="3" width="12" height="10" />
              <circle cx="6.5" cy="7" r="1.5" />
              <path d="M 2 11 L 6 8 L 9 10 L 14 6" />
            </svg>
            <span>{locale === "en" ? "Original" : locale === "zh-CN" ? "原版" : locale === "zh-TW" ? "原版" : locale === "ja" ? "原版" : locale === "ko" ? "원본" : locale === "fr" ? "Original" : locale === "es" ? "Original" : "Original"}</span>
          </button>
          <button
            className={coverStyle === "illustrated" ? "active" : ""}
            onClick={() => setCoverStyle("illustrated")}
            title={locale === "en" ? "Illustrated covers" : locale === "zh-CN" ? "插画版" : locale === "zh-TW" ? "插畫版" : locale === "ja" ? "イラスト版" : locale === "ko" ? "일러스트 판" : locale === "fr" ? "Couvertures illustrées" : locale === "es" ? "Cubiertas ilustradas" : "Illustrierte Cover"}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M 4 2 L 12 2 L 12 14 L 4 14 z" />
              <line x1="6" y1="5" x2="10" y2="5" />
              <line x1="6" y1="7.5" x2="10" y2="7.5" />
              <line x1="6.5" y1="10" x2="9.5" y2="10" />
              <circle cx="8" cy="12" r="0.5" fill="currentColor" />
            </svg>
            <span>{locale === "en" ? "Illustrated" : locale === "zh-CN" ? "插画" : locale === "zh-TW" ? "插畫" : locale === "ja" ? "イラスト" : locale === "ko" ? "일러스트" : locale === "fr" ? "Illustré" : locale === "es" ? "Ilustrado" : "Illustriert"}</span>
          </button>
        </div>
      </div>

      <div className="lib-grid">
        {filtered.map(b => (
          <BookCard key={b.id} book={b} active={b.id === activeBook.id} onClick={() => openBook(b)} ctx={ctx} coverStyle={coverStyle} />
        ))}
        <div className="lib-card import">
          <div>
            <div className="plus">+</div>
            <p>{tt("lib.import.text")}</p>
            <div className="formats">{tt("lib.import.formats")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookCard({ book, active, onClick, ctx, coverStyle }) {
  const { tt, locale } = ctx;
  const title = window.bookTitle(book, locale);
  const author = window.bookAuthor(book, locale);
  const typeLabel = tt("work.type." + (book.type || "novel"));
  const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString());
  // Localized BC year for ancient works (Greek tragedies etc.).
  const fmtYear = (y) => {
    if (y >= 0) return y;
    const abs = -y;
    if (locale === "zh-CN" || locale === "zh-TW") return `公元前 ${abs}`;
    if (locale === "ja") return `紀元前 ${abs}`;
    if (locale === "ko") return `기원전 ${abs}`;
    if (locale === "fr") return `${abs} av. J.-C.`;
    if (locale === "es") return `${abs} a. C.`;
    if (locale === "de") return `${abs} v. Chr.`;
    return `${abs} BC`;
  };

  return (
    <div className={"lib-card " + (active ? "active" : "")} onClick={onClick}>
      <div className="lib-card-top">
        {window.bookCover(book, coverStyle)}
      </div>

      <div className="lib-card-info">
        <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing:".22em", color:"var(--gold-deep)", textTransform:"uppercase", marginBottom: 6, opacity: .85}}>
          {typeLabel}
        </div>
        <div className="lib-card-title">{title}</div>
        <div className="lib-card-meta">{author} · {fmtYear(book.year)}</div>
      </div>

      <div className="lib-card-stats">
        <div className="lib-card-stat">
          <div className="lib-card-stat-num">{fmt(book.entities)}</div>
          <div className="lib-card-stat-lbl">{tt("lib.card.characters")}</div>
        </div>
        <div className="lib-card-stat">
          <div className="lib-card-stat-num">{fmt(book.edges)}</div>
          <div className="lib-card-stat-lbl">{tt("lib.card.relations")}</div>
        </div>
        <div className="lib-card-stat">
          <div className="lib-card-stat-num">{fmt(book.tokens)}</div>
          <div className="lib-card-stat-lbl">{tt("lib.card.words")}</div>
        </div>
      </div>
    </div>
  );
}

window.ViewLibrary = ViewLibrary;
