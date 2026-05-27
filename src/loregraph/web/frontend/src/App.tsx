import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import GraphView from "./components/GraphView";
import EvidencePanel from "./components/EvidencePanel";
import { useBooks, useBookGraph } from "./api/client";
import { useI18n } from "./i18n";

type Selection =
  | { mode: null }
  | { mode: "entity"; entityDbId: number }
  | { mode: "chunk"; chunkId: number; highlightEdgeDbId: number | null };

export default function App() {
  const { t } = useI18n();
  const booksQ = useBooks();
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selection, setSelection] = useState<Selection>({ mode: null });

  const [dark, setDark] = useState<boolean>(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    if (typeof window !== "undefined")
      window.localStorage.setItem("loregraph.theme", next ? "dark" : "light");
  };

  useEffect(() => {
    if (booksQ.data && booksQ.data.length > 0 && selectedBookId === null) {
      setSelectedBookId(booksQ.data[0].id);
    }
  }, [booksQ.data, selectedBookId]);

  const graphQ = useBookGraph(selectedBookId);

  const explorerRef = useRef<HTMLElement>(null);
  const goToGraph = () =>
    explorerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const book = graphQ.data?.book;

  return (
    <div className="bg-paper text-ink">
      <Header dark={dark} onToggleTheme={toggleTheme} onNavGraph={goToGraph} />

      <Hero onEnter={goToGraph} />

      <section ref={explorerRef} id="explorer" className="h-screen flex flex-col pt-[52px]">
        {/* book bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-y border-ink-soft bg-surface">
          <span className="chip-gold">{t.demoNote}</span>
          {book && (
            <span className="text-body text-ink">
              <span className="font-semibold">{book.title}</span>
              {book.author && (
                <span className="text-ink-muted"> · {book.author}</span>
              )}
            </span>
          )}
        </div>

        <main className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 relative bg-paper">
            {graphQ.isLoading && (
              <Centered>
                <span className="font-serif italic text-body text-ink-muted">
                  {t.loadingGraph}
                </span>
              </Centered>
            )}
            {graphQ.isError && (
              <Centered>
                <span className="font-serif italic text-body text-ink-muted">{t.failed}</span>
              </Centered>
            )}
            {graphQ.data && (
              <GraphView
                data={graphQ.data}
                dark={dark}
                onSelectNode={(dbId) => setSelection({ mode: "entity", entityDbId: dbId })}
                onSelectEdge={(chunkId, edgeDbId) =>
                  setSelection({ mode: "chunk", chunkId, highlightEdgeDbId: edgeDbId })
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
      </section>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">{children}</div>
  );
}
