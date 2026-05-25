import { BookSummary } from "../types";
import { Github } from "lucide-react";

interface HeaderProps {
  books: BookSummary[];
  selectedBookId: number | null;
  onSelectBook: (id: number) => void;
}

export default function Header({ books, selectedBookId, onSelectBook }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-ink-200 bg-white">
      <div className="flex items-center gap-6">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-ink-900">LoreGraph</span>
          <span className="text-xs text-ink-400 font-mono">
            knowledge graphs from closed-world fiction
          </span>
        </div>

        {books.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="book-select" className="text-sm text-ink-500">
              Book:
            </label>
            <select
              id="book-select"
              value={selectedBookId ?? ""}
              onChange={(e) => onSelectBook(Number(e.target.value))}
              className="rounded border border-ink-300 bg-white px-3 py-1.5 text-sm focus:border-accent-agent focus:outline-none"
            >
              {selectedBookId === null && <option value="">— choose —</option>}
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                  {b.author && ` · ${b.author}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <a
        href="https://github.com/YunyueLi/LoreGraph"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900"
      >
        <Github size={16} />
        <span>GitHub</span>
      </a>
    </header>
  );
}
