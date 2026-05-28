// LoreGraph — Library view
// Grid of books with status, stats, and "+ add new"

function ViewLibrary({ ctx }) {
  const { tt, data, activeBook, setActiveBookId, setActiveView, locale } = ctx;
  const { useState } = React;
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("lg_view_mode") || "grid");
  React.useEffect(() => { localStorage.setItem("lg_view_mode", viewMode); }, [viewMode]);

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
        <div className="lib-view-toggle">
          <button
            className={viewMode === "grid" ? "active" : ""}
            onClick={() => setViewMode("grid")}
            title={tt("lib.view.grid")}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="2" y="2" width="5" height="5" />
              <rect x="9" y="2" width="5" height="5" />
              <rect x="2" y="9" width="5" height="5" />
              <rect x="9" y="9" width="5" height="5" />
            </svg>
            <span>{tt("lib.view.grid")}</span>
          </button>
          <button
            className={viewMode === "shelf" ? "active" : ""}
            onClick={() => setViewMode("shelf")}
            title={tt("lib.view.shelf")}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="2"    y="3" width="2.4" height="10" />
              <rect x="5.2"  y="2" width="2.4" height="11" />
              <rect x="8.4"  y="4" width="2.4" height="9" />
              <rect x="11.6" y="3" width="2.4" height="10" />
            </svg>
            <span>{tt("lib.view.shelf")}</span>
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="lib-grid">
          {filtered.map(b => (
            <BookCard key={b.id} book={b} active={b.id === activeBook.id} onClick={() => openBook(b)} ctx={ctx} />
          ))}
          <div className="lib-card import">
            <div>
              <div className="plus">+</div>
              <p>{tt("lib.import.text")}</p>
              <div className="formats">{tt("lib.import.formats")}</div>
            </div>
          </div>
        </div>
      ) : (
        <BookShelf books={filtered} activeId={activeBook && activeBook.id} ctx={ctx} onOpen={openBook} />
      )}
    </div>
  );
}

function BookCard({ book, active, onClick, ctx }) {
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
        {window.bookCover(book, "photo")}
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

/* =============== BookShelf — books as physical spines on shelves =============== */
// Each spine: width scaled by `tokens` (so epics look thick, short plays slim),
// body color from book.coverTone, title typeset vertically along the spine
// (writing-mode: vertical-rl + text-orientation: mixed = CJK reads top-down,
// Latin scripts rotate 90° like real spine lettering). Gold "hub" rules at the
// caps echo the bands on raised-cord bindings. Hover lifts the volume off the
// shelf; click opens the book in the graph view.
const SPINE_PALETTE = {
  ink:    { bg: "#1a1714", fg: "#d1ac5e", accent: "#b8954a" },
  dark:   { bg: "#221d18", fg: "#d1ac5e", accent: "#a08758" },
  gold:   { bg: "#8a6e36", fg: "#fbf7ea", accent: "#f0d6ad" },
  rust:   { bg: "#6b2d22", fg: "#f0d6ad", accent: "#d1ac5e" },
  indigo: { bg: "#2b3056", fg: "#f0d6ad", accent: "#d1ac5e" },
  cream:  { bg: "#d4c5a0", fg: "#3d2f1a", accent: "#8a6e36" },
  deep:   { bg: "#152133", fg: "#d1ac5e", accent: "#b8954a" },
};

function BookShelf({ books, activeId, ctx, onOpen }) {
  const { locale } = ctx;
  const spineWidth = (tokens) =>
    Math.round(Math.max(28, Math.min(60, 28 + Math.sqrt((tokens || 20000) / 30000) * 9)));

  return (
    <div className="lib-shelf">
      {books.map((book) => {
        const palette = SPINE_PALETTE[book.coverTone] || SPINE_PALETTE.ink;
        const w = spineWidth(book.tokens);
        const title = window.bookTitle(book, locale);
        const author = window.bookAuthor(book, locale);
        return (
          <div
            key={book.id}
            className={"lib-spine " + (book.id === activeId ? "active" : "")}
            onClick={() => onOpen(book)}
            title={`${title} — ${author} (${book.year})`}
            style={{
              width: `${w}px`,
              background: palette.bg,
              color: palette.fg,
            }}
          >
            <div className="lib-spine-cap top" style={{ color: palette.accent }}>
              <div className="lib-spine-rule" />
              <div className="lib-spine-rule" />
            </div>
            <div className="lib-spine-title">{title}</div>
            <div className="lib-spine-cap bot" style={{ color: palette.accent }}>
              <div className="lib-spine-rule" />
              <div className="lib-spine-rule" />
              <div className="lib-spine-year">{book.year > 0 ? book.year : ""}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.ViewLibrary = ViewLibrary;
