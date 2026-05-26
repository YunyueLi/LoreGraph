/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
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
          "sans-serif",
        ],
        serif: [
          "Fraunces",
          "Georgia",
          "Cambria",
          '"Times New Roman"',
          "Times",
          "serif",
        ],
        mono: [
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        // Figure palette — same tokens as the README SVGs.
        paper: "#ffffff",
        surface: "#fafafa",
        ink: {
          DEFAULT: "#1a1a1a",
          muted: "#666666",
          whisper: "#999999",
          soft: "#e8e8e8",
          ghost: "#cfcfcf",
        },
        gold: {
          DEFAULT: "#b8954a",
          deep: "#8a6f37",
        },
      },
      letterSpacing: {
        caps: "0.18em",
      },
      fontSize: {
        tiny: ["10px", "14px"],
        caption: ["11px", "16px"],
        body: ["13px", "20px"],
        h2: ["14px", "20px"],
        large: ["18px", "26px"],
        title: ["22px", "30px"],
      },
    },
  },
  plugins: [],
};
