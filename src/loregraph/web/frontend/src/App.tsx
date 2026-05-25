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

  // Auto-select first book once books load and no URL preselection.
  useEffect(() => {
    if (booksQ.data && booksQ.data.length > 0 && selectedBookId === null) {
      setSelectedBookId(booksQ.data[0].id);
    }
  }, [booksQ.data, selectedBookId]);

  // Reflect selection in URL so the link is shareable.
  useEffect(() => {
    if (selectedBookId === null) return;
    const url = new URL(window.location.href);
    url.searchParams.set("book_id", String(selectedBookId));
    window.history.replaceState(null, "", url.toString());
  }, [selectedBookId]);

  const graphQ = useBookGraph(selectedBookId);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header
        books={booksQ.data ?? []}
        selectedBookId={selectedBookId}
        onSelectBook={(id) => {
          setSelectedBookId(id);
          setSelection({ mode: null });
        }}
      />
      <main className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 relative">
          {booksQ.isLoading && (
            <Centered>Loading books…</Centered>
          )}
          {booksQ.data && booksQ.data.length === 0 && (
            <Centered>
              <div className="text-center max-w-md">
                <h2 className="text-lg font-semibold text-ink-700 mb-2">
                  No books ingested yet
                </h2>
                <p className="text-sm text-ink-500 leading-relaxed">
                  Run <code className="font-mono bg-ink-100 px-1.5 rounded">loregraph ingest &lt;file&gt; --title &quot;…&quot;</code>{" "}
                  in your shell, then{" "}
                  <code className="font-mono bg-ink-100 px-1.5 rounded">loregraph extract --book-id 1</code>.
                </p>
              </div>
            </Centered>
          )}
          {graphQ.isLoading && selectedBookId !== null && (
            <Centered>Loading graph…</Centered>
          )}
          {graphQ.isError && (
            <Centered>
              <span className="text-red-600">Failed to load graph.</span>
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
    <div className="absolute inset-0 flex items-center justify-center p-6 text-ink-500">
      {children}
    </div>
  );
}
