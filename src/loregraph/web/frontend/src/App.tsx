import { useEffect, useState } from "react";
import Header from "./components/Header";
import GraphView from "./components/GraphView";
import EvidencePanel from "./components/EvidencePanel";
import { useBooks, useBookGraph } from "./api/client";

type Selection =
  | { mode: null }
  | { mode: "entity"; entityDbId: number }
  | { mode: "chunk"; chunkId: number; highlightEdgeDbId: number | null };

function getInitialBookIdFromUrl(): number | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const v = p.get("book_id");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function App() {
  const booksQ = useBooks();
  const [selectedBookId, setSelectedBookId] = useState<number | null>(
    getInitialBookIdFromUrl(),
  );
  const [selection, setSelection] = useState<Selection>({ mode: null });

  useEffect(() => {
    if (booksQ.data && booksQ.data.length > 0 && selectedBookId === null) {
      setSelectedBookId(booksQ.data[0].id);
    }
  }, [booksQ.data, selectedBookId]);

  useEffect(() => {
    if (selectedBookId === null) return;
    const url = new URL(window.location.href);
    url.searchParams.set("book_id", String(selectedBookId));
    window.history.replaceState(null, "", url.toString());
  }, [selectedBookId]);

  const graphQ = useBookGraph(selectedBookId);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-paper">
      <Header
        books={booksQ.data ?? []}
        selectedBookId={selectedBookId}
        onSelectBook={(id) => {
          setSelectedBookId(id);
          setSelection({ mode: null });
        }}
      />
      <main className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 relative bg-paper">
          {booksQ.isLoading && (
            <Centered>
              <span className="font-serif italic text-body text-ink-muted">
                Loading books…
              </span>
            </Centered>
          )}

          {booksQ.data && booksQ.data.length === 0 && <EmptyState />}

          {graphQ.isLoading && selectedBookId !== null && (
            <Centered>
              <span className="font-serif italic text-body text-ink-muted">
                Loading graph…
              </span>
            </Centered>
          )}

          {graphQ.isError && (
            <Centered>
              <div className="text-center">
                <div className="section-label mb-1">Error</div>
                <div className="font-serif italic text-body text-ink-muted">
                  Failed to load graph.
                </div>
              </div>
            </Centered>
          )}

          {graphQ.data && (
            <GraphView
              data={graphQ.data}
              onSelectNode={(dbId) =>
                setSelection({ mode: "entity", entityDbId: dbId })
              }
              onSelectEdge={(chunkId, edgeDbId) =>
                setSelection({
                  mode: "chunk",
                  chunkId,
                  highlightEdgeDbId: edgeDbId,
                })
              }
            />
          )}
        </div>

        <EvidencePanel
          mode={selection.mode}
          entityDbId={selection.mode === "entity" ? selection.entityDbId : null}
          chunkId={selection.mode === "chunk" ? selection.chunkId : null}
          highlightEdgeDbId={
            selection.mode === "chunk" ? selection.highlightEdgeDbId : null
          }
          onClose={() => setSelection({ mode: null })}
        />
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <Centered>
      <div className="max-w-lg text-center">
        <div className="section-label mb-1">No books yet</div>
        <div className="h-px bg-gold mb-6 mx-auto w-16"></div>
        <p className="font-serif italic text-large text-ink-muted leading-relaxed mb-8">
          The shelf is empty. Feed a closed-world text to LoreGraph and it
          will return the graph that lives inside it.
        </p>
        <div className="inline-block text-left bg-surface border border-ink-soft px-5 py-4 font-mono text-caption text-ink leading-loose">
          <div>
            <span className="text-ink-whisper">$</span> loregraph ingest{" "}
            <span className="text-gold-deep">&lt;file&gt;</span> --title{" "}
            <span className="text-gold-deep">&quot;…&quot;</span>
          </div>
          <div>
            <span className="text-ink-whisper">$</span> loregraph extract
            --book-id <span className="text-gold-deep">1</span>
          </div>
        </div>
      </div>
    </Centered>
  );
}
