#!/usr/bin/env node
// Zero-dependency static file server for the LoreGraph landing site.
// Used by .claude/launch.json for previews; handy for a quick local look too:
//   node src/loregraph/web/serve-landing.cjs                 # source → http://localhost:4178
//   node src/loregraph/web/serve-landing.cjs dist   # built output
const http = require("http");
const fs = require("fs");
const path = require("path");

// Directory to serve, relative to this file (default: the editable source).
const ROOT = path.join(__dirname, process.argv[2] || "landing");
const PORT = Number(process.env.PORT) || 4178;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

http
  .createServer((req, res) => {
    let rel = decodeURIComponent((req.url || "/").split("?")[0]);
    if (rel.endsWith("/")) rel += "index.html";
    const fp = path.normalize(path.join(ROOT, rel));
    if (!fp.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    fs.readFile(fp, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end("Not found: " + rel);
      }
      // The source tree is served with unversioned filenames — index.html asks
      // for "view-shelf3d.jsx", not "view-shelf3d.a1b2c3.jsx". With no
      // Cache-Control at all, browsers apply heuristic caching and keep serving
      // the file they already have, so an edit lands on disk, the server has it,
      // and the page still runs the old code. That turns every "fixed it" into a
      // question of whose copy you are looking at. Never cache the dev tree; the
      // built output in dist/ is content-hashed and needs no such rule.
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(fp)] || "application/octet-stream",
        "Cache-Control": "no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`landing server on http://localhost:${PORT}`));
