/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          // CJK fallbacks (system fonts — no heavy Noto download)
          '"PingFang SC"',
          '"Hiragino Sans"',
          '"Microsoft YaHei"',
          '"Malgun Gothic"',
          '"Noto Sans CJK SC"',
          "sans-serif",
        ],
        serif: [
          "Fraunces",
          "Georgia",
          "Cambria",
          '"Songti SC"',
          '"Yu Mincho"',
          '"Times New Roman"',
          "serif",
        ],
        hand: ["Caveat", "Fraunces", "cursive"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // All driven by CSS variables so the .dark class flips the whole
        // palette at once (see index.css).
        paper: "var(--paper)",
        surface: "var(--surface)",
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          whisper: "var(--ink-whisper)",
          soft: "var(--ink-soft)",
          ghost: "var(--ink-ghost)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          deep: "var(--gold-deep)",
        },
      },
      letterSpacing: {
        caps: "0.18em",
        wide2: "0.28em",
      },
      fontSize: {
        tiny: ["10px", "14px"],
        caption: ["11px", "16px"],
        body: ["13px", "20px"],
        h2: ["14px", "20px"],
        large: ["18px", "26px"],
        title: ["22px", "30px"],
        hero: ["clamp(2.6rem, 7vw, 5.5rem)", "1.05"],
      },
    },
  },
  plugins: [],
};
