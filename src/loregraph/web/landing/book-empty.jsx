// LoreGraph — the empty state for a work with no extracted graph.
//
// A work on the shelf with no graph to draw. Two views used to read straight into
// the first passage and the first entity, so this state took them down with the
// error boundary — for the 82 books that have never been through the pipeline as
// much as for one whose file is still arriving. Those are different facts, and it
// says which.
window.LGBookEmpty = function LGBookEmpty({ ctx }) {
  const { tt, activeBook } = ctx;
  if (window.LG_BOOK_PENDING(activeBook && activeBook.id)) {
    return (
      <div className="empty book-empty">
        <div className="glyph">◌</div>
        <div>{tt("empty.bookLoading")}</div>
      </div>
    );
  }
  return (
    <div className="empty book-empty">
      <div className="glyph">○</div>
      <h2 className="book-empty-title">{tt("empty.bookNone.title")}</h2>
      <p className="book-empty-body">{tt("empty.bookNone.body")}</p>
    </div>
  );
};
