#!/usr/bin/env node
// Build the LoreGraph landing site into ./dist as a PRODUCTION bundle:
// JSX is precompiled (no in-browser Babel) and React is loaded from its
// production CDN build. The editable source stays in ./landing (which still
// runs via Babel-in-browser for quick local previews).
//
// To build AND publish to GitHub Pages in one step, run `npm run deploy` from
// the web/ directory. This script only builds (into ./dist):
//   node src/loregraph/web/build-landing.cjs
//
// Each source file is transformed and wrapped in its OWN IIFE, exactly mirroring
// how Babel-standalone runs each <script type="text/babel"> in an isolated scope.
// Files talk to each other only through window.* globals (LG_DATA, t, ViewGraph,
// ...), so the per-file scopes are required: a flat concatenation would collide
// on the top-level `const { useState } = React` declared in several files.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const esbuild = require("esbuild");

const SRC = path.join(__dirname, "landing");
const DEST = path.join(__dirname, "dist");

// Load order — must match the <script> order in landing/index.html.
const ORDER = [
  "data.js",
  "i18n.js",
  "data-exports.js",
  "avatars.jsx",
  "covers.jsx",
  "view-library.jsx",
  "view-shelf3d.jsx",
  "graph-physics.jsx",
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

// Asset URLs are content-hashed (cssName / bundleName), so a new build always
// has a new URL — caches (browser + GitHub Pages CDN) can never serve a stale
// build over a deployed fix.
const htmlDoc = (cssName, bundleName) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="LoreGraph — knowledge graphs from closed-world fiction, with evidence on every edge." />
<title>LoreGraph</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%231a1714'/%3E%3Cline x1='10' y1='11' x2='22' y2='21' stroke='%23d1ac5e' stroke-width='2.4' stroke-linecap='round'/%3E%3Ccircle cx='10' cy='11' r='4.5' fill='%231a1714' stroke='%23d1ac5e' stroke-width='2'/%3E%3Ccircle cx='22' cy='21' r='3.5' fill='%23d1ac5e'/%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<link rel="stylesheet" href="${cssName}" />
<script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script crossorigin src="https://unpkg.com/three@0.160.1/build/three.min.js"></script>
</head>
<body>
<div id="root"></div>
<script src="${bundleName}"></script>
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

  // 2. Content-hash the asset filenames so caches can never serve a stale build.
  const hash = (buf) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 10);
  const cssBuf = fs.readFileSync(path.join(SRC, "styles.css"));
  const bundleName = `app.${hash(bundle)}.js`;
  const cssName = `styles.${hash(cssBuf)}.css`;

  // 3. Reset DEST (keep the gh-pages git metadata) and write production output.
  fs.mkdirSync(DEST, { recursive: true });
  for (const f of fs.readdirSync(DEST)) {
    if (f !== ".git") fs.rmSync(path.join(DEST, f), { recursive: true, force: true });
  }
  fs.writeFileSync(path.join(DEST, bundleName), bundle);
  fs.writeFileSync(path.join(DEST, cssName), cssBuf);
  fs.writeFileSync(path.join(DEST, "index.html"), htmlDoc(cssName, bundleName));
  fs.copyFileSync(path.join(SRC, "Technical.html"), path.join(DEST, "Technical.html"));

  // Static assets referenced by URL at runtime (the 3-D shelf's binding
  // materials). Copied verbatim — these are already compressed and are fetched
  // lazily, so they never touch the critical path.
  const assetsSrc = path.join(SRC, "assets");
  if (fs.existsSync(assetsSrc)) {
    fs.cpSync(assetsSrc, path.join(DEST, "assets"), { recursive: true });
  }

  // 4. GitHub Pages: skip Jekyll; route unknown paths back to the app.
  fs.writeFileSync(path.join(DEST, ".nojekyll"), "");
  fs.copyFileSync(path.join(DEST, "index.html"), path.join(DEST, "404.html"));

  // The custom domain has to be BUILT, not left sitting on the gh-pages branch.
  // `npm run deploy` empties that branch before it publishes, so a CNAME that
  // only exists there is deleted by the next deploy — and GitHub reads the
  // absence as "no custom domain" and drops it from the repo's Pages settings,
  // which takes the live site off loregraph.ungetsu.net. That is exactly what
  // happened on the first deploy after the domain was added by hand. Anything
  // the published site needs belongs in the source tree.
  const cname = path.join(SRC, "CNAME");
  if (fs.existsSync(cname)) fs.copyFileSync(cname, path.join(DEST, "CNAME"));

  // 5. Cloudflare Workers serves this same directory as static assets, where the
  // two files above are meaningless — one is a Jekyll opt-out, the other tells
  // GitHub which domain to answer on. Neither should be reachable as a URL.
  fs.writeFileSync(path.join(DEST, ".assetsignore"), ".nojekyll\nCNAME\n");

  const kb = (Buffer.byteLength(bundle) / 1024).toFixed(0);
  console.log(`Built landing → ${DEST}  (${bundleName} ${kb} KB, ${cssName})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
