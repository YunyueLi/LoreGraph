import { BookSummary } from "../types";

interface HeaderProps {
  books: BookSummary[];
  selectedBookId: number | null;
  onSelectBook: (id: number) => void;
}

export default function Header({ books, selectedBookId, onSelectBook }: HeaderProps) {
  return (
    <header className="px-8 py-5 bg-paper border-b border-ink-soft">
      <div className="flex items-end justify-between gap-8 flex-wrap">
        {/* Wordmark + italic tagline · mighta-style */}
        <div className="flex items-baseline gap-5">
          <span className="text-title font-bold tracking-tight text-ink">LoreGraph</span>
          <span className="font-serif italic text-body text-ink-muted hidden sm:inline">
            knowledge graphs that quote the page they came from.
          </span>
        </div>

        <div className="flex items-end gap-8">
          {/* Book selector */}
          {books.length > 0 && (
            <label className="flex items-end gap-3">
              <span className="section-label">Book</span>
              <select
                value={selectedBookId ?? ""}
                onChange={(e) => onSelectBook(Number(e.target.value))}
                className="bg-paper text-body text-ink border-b border-ink hover:border-gold focus:border-gold focus:outline-none px-1 py-1 pr-6 font-medium cursor-pointer"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M0 0 L5 6 L10 0' fill='none' stroke='%231a1a1a' stroke-width='1.2'/></svg>\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 4px center",
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              >
                {selectedBookId === null && <option value="">— choose —</option>}
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                    {b.author && ` · ${b.author}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* GitHub link */}
          <a
            href="https://github.com/YunyueLi/LoreGraph"
            target="_blank"
            rel="noreferrer"
            className="section-label hover:text-ink transition-colors"
          >
            GitHub  →
          </a>
        </div>
      </div>
    </header>
  );
}
