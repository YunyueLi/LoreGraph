#!/usr/bin/env node
// Build the LoreGraph landing site into frontend/dist as a PRODUCTION bundle:
// JSX is precompiled (no in-browser Babel) and React is loaded from its
// production CDN build. The editable source stays in ./landing (which still
// runs via Babel-in-browser for quick local previews).
//
// To build AND publish to GitHub Pages in one step, run `npm run deploy` from
// the frontend/ directory. This script only builds (into frontend/dist):
//   node src/loregraph/web/build-landing.cjs
//
// Each source file is transformed and wrapped in its OWN IIFE, exactly mirroring
// how Babel-standalone runs each <script type="text/babel"> in an isolated scope.
// Files talk to each other only through window.* globals (LG_DATA, t, ViewGraph,
// ...), so the per-file scopes are required: a flat concatenation would collide
// on the top-level `const { useState } = React` declared in several files.
const fs = require("fs");
const path = require("path");
const esbuild = require(path.join(__dirname, "frontend", "node_modules", "esbuild"));

const SRC = path.join(__dirname, "landing");
const DEST = path.join(__dirname, "frontend", "dist");

// Load order — must match the <script> order in landing/index.html.
const ORDER = [
  "data.js",
  "i18n.js",
  "avatars.jsx",
  "covers.jsx",
  "view-library.jsx",
  "view-graph.jsx",
  "view-reader.jsx",
  "view-entities.jsx",
  "view-pipeline.jsx",
  "view-ask.jsx",
  "view-timeline.jsx",
  "view-settings.jsx",
  "view-technical.jsx",
  "app.jsx",
];

const FONTS =
  "https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&family=Noto+Serif+SC:wght@300;400;500;600&family=Noto+Serif+TC:wght@300;400;500;600&family=Noto+Serif+JP:wght@300;400;500;600&family=Noto+Serif+KR:wght@300;400;500;600&display=swap";

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="LoreGraph — knowledge graphs from closed-world fiction, with evidence on every edge." />
<title>LoreGraph</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%231a1714'/%3E%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%23b8954a' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='3.5' fill='%23d1ac5e'/%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<link rel="stylesheet" href="styles.css" />
<script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
</head>
<body>
<div id="root"></div>
<script src="app.bundle.js"></script>
</body>
</html>
`;

async function main() {
  // 1. Transform + IIFE-wrap each source file, in load order.
  const parts = [];
  for (const name of ORDER) {
    const code = fs.readFileSync(path.join(SRC, name), "utf8");
    const { code: js } = await esbuild.transform(code, {
      loader: name.endsWith(".jsx") ? "jsx" : "js",
      jsx: "transform",
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
      target: "es2020",
      charset: "utf8", // keep CJK literal instead of \u escapes
      minifyWhitespace: true, // safe: never renames the window.* globals
      legalComments: "none",
    });
    parts.push(`/* ${name} */\n;(function () {\n${js}\n})();\n`);
  }
  const bundle = parts.join("\n");

  // 2. Reset DEST (keep the gh-pages git metadata) and write production output.
  fs.mkdirSync(DEST, { recursive: true });
  for (const f of fs.readdirSync(DEST)) {
    if (f !== ".git") fs.rmSync(path.join(DEST, f), { recursive: true, force: true });
  }
  fs.writeFileSync(path.join(DEST, "app.bundle.js"), bundle);
  fs.writeFileSync(path.join(DEST, "index.html"), HTML);
  fs.copyFileSync(path.join(SRC, "styles.css"), path.join(DEST, "styles.css"));
  fs.copyFileSync(path.join(SRC, "Technical.html"), path.join(DEST, "Technical.html"));

  // 3. GitHub Pages: skip Jekyll; route unknown paths back to the app.
  fs.writeFileSync(path.join(DEST, ".nojekyll"), "");
  fs.copyFileSync(path.join(DEST, "index.html"), path.join(DEST, "404.html"));

  const kb = (Buffer.byteLength(bundle) / 1024).toFixed(0);
  console.log(`Built landing → ${DEST}  (app.bundle.js ${kb} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
