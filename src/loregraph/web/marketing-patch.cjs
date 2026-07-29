// Fixes applied to the generated marketing bundle as the build copies it.
//
// `marketing/` is generated outside this repo and committed verbatim, so a
// regeneration is a clean overwrite of every file in it (see
// marketing/README.md). Editing those pages by hand would therefore lose the
// edit on the next export. The fixes below live here instead: they are code the
// build runs, so they survive a regeneration and are reviewable as a diff.
//
// Every patch asserts it matched somewhere in the bundle. If a future export
// changes the markup out from under one of them, the build FAILS rather than
// quietly shipping the page with the bug back in it. A patch that stops matching
// is either fixed upstream — delete it here — or broken, and both need a human.
//
// Anything editorial (heading levels that would need their CSS selectors moved
// with them, alt text that is too long to hear read aloud) is deliberately NOT
// here. Those want a decision on the generating side, not a regex.
const fs = require("fs");
const path = require("path");

// The bundle was generated against the old GitHub Pages address. Left alone,
// `canonical` hands crawlers a stale mirror and `og:image` points at a file that
// does not exist there — so sharing any page produced a card with no image.
const SITE = "https://loregraph.ungetsu.net/";
const STALE = "https://yunyueli.github.io/LoreGraph/";

// Solved against the page's own paper ground (#efe7d2) for a 4.5:1 contrast
// ratio, holding each hue and taking only as much lightness as the ratio needs.
// --ink-faint carried plate credits, coordinates and metadata rows at 2.95:1;
// --coral carried the small-caps labels and numerals at 2.42:1.
const INK_FAINT_WAS = "#8b8676";
const INK_FAINT_NOW = "#6b675b"; // 2.95:1 -> 4.58:1
const CORAL_TEXT = "#a44d3f"; // 2.42:1 -> 4.59:1

// Both cards quote the README section they should have linked to all along.
const CORPUS_URL = "https://github.com/YunyueLi/LoreGraph#the-corpus";
const LINK_ATTRS = "target='_blank' rel='noreferrer noopener'";

const IMG_RE = /<img\b[^>]*>/g;

// The stylesheet documents itself with prose, and that prose contains tag-shaped
// text — `.amr-band-logo` is explained with a literal `<img>` inside a CSS
// comment. A naive tag regex finds that first and treats it as the page's
// above-the-fold image, which put `fetchpriority='high'` on a comment and
// `loading='lazy'` on the actual hero. So markup edits run only over the regions
// that are markup: everything outside <style>, <script> and HTML comments.
const OPAQUE_RE = /<style\b[\s\S]*?<\/style>|<script\b[\s\S]*?<\/script>|<!--[\s\S]*?-->/gi;

function mapMarkup(html, fn) {
  let out = "";
  let last = 0;
  let m;
  OPAQUE_RE.lastIndex = 0;
  while ((m = OPAQUE_RE.exec(html)) !== null) {
    out += fn(html.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + fn(html.slice(last));
}

/**
 * Drop a trailing `.html` from a same-site URL, keeping any query or fragment.
 * `index` collapses to the directory itself. Returns null when the URL is not
 * ours to touch — an off-site link, or one with no extension to drop.
 */
function deExtension(url) {
  const sameSite = url.startsWith(SITE) || !/^[a-z][a-z0-9+.-]*:|^\/\//i.test(url);
  if (!sameSite) return null;
  const m = url.match(/^([^?#]*)([?#].*)?$/);
  let p = m[1];
  if (!p.endsWith(".html")) return null;
  p = p.slice(0, -".html".length).replace(/(^|\/)index$/, "$1");
  if (p === "") p = "./";
  return p + (m[2] || "");
}

function firstImageTag(html) {
  let found = null;
  mapMarkup(html, (chunk) => {
    if (found) return chunk;
    for (const tag of chunk.match(IMG_RE) || []) {
      if (/src=['"]/.test(tag)) {
        found = tag;
        break;
      }
    }
    return chunk;
  });
  return found;
}

const PATCHES = [
  {
    name: "site-url",
    why: "canonical / og:url / og:image / hreflang pointed at the old Pages address",
    run(html) {
      return { html: html.split(STALE).join(SITE), count: html.split(STALE).length - 1 };
    },
  },
  {
    name: "single-description",
    why: "two <meta name=description> per page; only the first is ever read",
    run(html) {
      let seen = 0;
      let count = 0;
      const out = mapMarkup(html, (chunk) =>
        chunk.replace(/[ \t]*<meta name=['"]description['"][^>]*>\n?/g, (m) => {
          if (seen++ === 0) return m;
          count++;
          return "";
        }),
      );
      return { html: out, count };
    },
  },
  {
    name: "image-priority",
    why: "16 plates, 1.4 MB, all eager — only the first is above the fold",
    run(html) {
      let i = 0;
      let count = 0;
      const out = mapMarkup(html, (chunk) =>
        chunk.replace(IMG_RE, (tag) => {
          if (/\bloading=|\bfetchpriority=/.test(tag)) return tag;
          const attrs =
            i++ === 0
              ? "fetchpriority='high' decoding='async'"
              : "loading='lazy' decoding='async'";
          const m = tag.match(/^(<img\b[\s\S]*?)(\s*\/?>)$/);
          if (!m) return tag;
          count++;
          return `${m[1]} ${attrs}${m[2]}`;
        }),
      );
      return { html: out, count };
    },
  },
  {
    name: "preload-hero",
    why: "the one above-the-fold plate should start downloading with the stylesheet",
    // Runs after image-priority, and preloads only an image that pass left
    // eager. The credits page opens with the same plate but lazy-loads it on
    // purpose — it is an index of all sixteen, not a hero — and preloading it
    // there would force back exactly the download the lazy attribute avoids.
    run(html) {
      const first = firstImageTag(html);
      if (!first || /\bloading=['"]lazy/.test(first)) return { html, count: 0 };
      const src = (first.match(/src=['"]([^'"]+)/) || [])[1];
      if (!src) return { html, count: 0 };
      const tag = `<link rel='preload' as='image' href='${src}' fetchpriority='high' />\n`;
      return { html: html.replace("</head>", tag + "</head>"), count: 1 };
    },
  },
  {
    name: "noscript-reveal",
    why: "90% of the text sits at opacity 0 until IntersectionObserver runs",
    run(html) {
      // Mirrors the stylesheet's own prefers-reduced-motion override, which is
      // the state the page already knows how to render.
      const tag =
        "<noscript><style>[data-reveal]{opacity:1 !important;translate:0 0 !important;" +
        "scale:1 !important;transition:none !important}</style></noscript>\n";
      if (!html.includes("data-reveal")) return { html, count: 0 };
      return { html: html.replace("</head>", tag + "</head>"), count: 1 };
    },
  },
  {
    name: "contrast-ink-faint",
    why: `${INK_FAINT_WAS} on paper is 2.95:1 — under the 4.5:1 floor for body text`,
    run(html) {
      const count = html.split(INK_FAINT_WAS).length - 1;
      return { html: html.split(INK_FAINT_WAS).join(INK_FAINT_NOW), count };
    },
  },
  {
    name: "contrast-coral-text",
    why: "--coral is 2.42:1; keep it for marks, darken only where it carries words",
    run(html) {
      let count = 0;
      // Declare the darker tone beside the original so the bright coral stays
      // available to the dots, rings and rules that are decoration, not text.
      let out = html.replace(/(--coral:\s*[^;]+;)/, (m) => {
        count++;
        return `${m}\n  --coral-text: ${CORAL_TEXT};`;
      });
      out = out.replace(/color:\s*var\(--coral\)/g, () => {
        count++;
        return `color: var(--coral-text)`;
      });
      return { html: out, count };
    },
  },
  {
    name: "extensionless-links",
    why: "Cloudflare serves dist/zh.html at /zh, so every .html link earns a 307",
    // The host answers `/zh` directly and 307-redirects `/zh.html` to it. There
    // is no config that keeps the .html form canonical: html_handling:"none"
    // stops the redirect but then `/` has no exact asset to match and 404s
    // (measured, not assumed). So the links move instead of the host — internal
    // navigation stops paying a round trip, old .html links still work via the
    // redirect, and canonical/hreflang/og:url stop pointing at a URL that
    // redirects.
    run(html) {
      let count = 0;
      const out = mapMarkup(html, (chunk) =>
        chunk.replace(/(\b(?:href|content)=)(['"])([^'"]+)\2/g, (m, attr, q, url) => {
          const next = deExtension(url);
          if (next === null) return m;
          count++;
          return `${attr}${q}${next}${q}`;
        }),
      );
      return { html: out, count };
    },
  },
  {
    name: "dead-cards",
    why: "two cards in the corpus section were <a href='#'> — they jumped to the top",
    run(html) {
      let count = 0;
      const out = mapMarkup(html, (chunk) =>
        chunk.replace(/(<a class=['"]work-card[^'"]*['"][^>]*)href=['"]#['"]/g, (m, head) => {
          count++;
          return `${head}href='${CORPUS_URL}' ${LINK_ATTRS}`;
        }),
      );
      return { html: out, count };
    },
  },
];

/**
 * Copy `src` into `dest`, running every patch over each .html file on the way.
 * Returns a one-line-per-patch report. Throws if any patch matched nothing.
 */
function patchMarketing(src, dest) {
  const totals = new Map(PATCHES.map((p) => [p.name, 0]));
  let files = 0;

  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const from = path.join(dir, entry.name);
      const to = path.join(dest, rel, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(to, { recursive: true });
        walk(from, path.join(rel, entry.name));
        continue;
      }
      // The directory's own README documents it for whoever finds it in the
      // repo; it is not part of the site.
      if (entry.name === "README.md") continue;
      if (!entry.name.endsWith(".html")) {
        fs.copyFileSync(from, to);
        continue;
      }
      let html = fs.readFileSync(from, "utf8");
      for (const p of PATCHES) {
        const { html: next, count } = p.run(html);
        html = next;
        totals.set(p.name, totals.get(p.name) + count);
      }
      fs.writeFileSync(to, html);
      files++;
    }
  };
  fs.mkdirSync(dest, { recursive: true });
  walk(src, "");

  const dead = PATCHES.filter((p) => totals.get(p.name) === 0);
  if (dead.length) {
    throw new Error(
      "marketing-patch: no longer matches the generated bundle: " +
        dead.map((p) => `${p.name} (${p.why})`).join("; ") +
        "\nEither the export fixed it upstream — delete the patch — or the markup " +
        "moved and the patch needs rewriting. Not shipping the pages unpatched.",
    );
  }
  return `Patched ${files} marketing pages: ` + PATCHES.map((p) => `${p.name}×${totals.get(p.name)}`).join(", ");
}

module.exports = { patchMarketing, SITE };
