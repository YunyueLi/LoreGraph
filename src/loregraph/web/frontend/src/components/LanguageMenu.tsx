import { useEffect, useRef, useState } from "react";
import { LOCALES, useI18n } from "../i18n";

// mighta-style language dropdown: a small "EN" button that opens a panel
// listing every locale by native name, with a gold dot on the active one.
export default function LanguageMenu() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1 text-tiny font-bold uppercase tracking-caps border border-ink-soft hover:border-gold text-ink transition-colors"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {current.short}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-paper border border-ink-soft shadow-lg z-50">
          <div className="flex items-baseline justify-between px-4 py-3 border-b border-ink-soft">
            <span className="section-label">{t.langLabel}</span>
            <span className="font-hand text-gold text-base leading-none">{t.langChoose}</span>
          </div>
          <ul className="py-1">
            {LOCALES.map((l) => {
              const active = l.code === locale;
              return (
                <li key={l.code}>
                  <button
                    onClick={() => {
                      setLocale(l.code);
                      setOpen(false);
                    }}
                    className={
                      "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors " +
                      (active ? "bg-surface" : "hover:bg-surface")
                    }
                  >
                    <span className="w-7 text-tiny font-bold uppercase tracking-wider text-ink-whisper">
                      {l.short}
                    </span>
                    <span className="flex-1 text-body text-ink">{l.native}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="px-4 py-2 border-t border-ink-soft">
            <span className="text-tiny font-bold uppercase tracking-caps text-ink-whisper">
              {t.langClose}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
