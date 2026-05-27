interface ThemeToggleProps {
  dark: boolean;
  onToggle: () => void;
}

// Minimal sun/moon toggle. Icon is inline SVG so it inherits currentColor
// and needs no icon library.
export default function ThemeToggle({ dark, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="p-1.5 text-ink-muted hover:text-ink transition-colors"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "light" : "dark"}
    >
      {dark ? (
        // sun
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
        </svg>
      ) : (
        // moon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
