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
// Anything that needs a judgement call rather than a rule belongs on the
// generating side, not here. What is left in that category is the copy voice
// itself; the copy-edits patch only removes repetition it can point at.
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

// The export shipped no way into the app. The only links to it were five 28px
// arrows starting 6396px down a 16000px page, and the most prominent button on
// the whole site — in the header and in the hero — was "Star on GitHub". A reader
// could not reach the product without scrolling 40% of the page and finding an
// icon. So the app becomes the primary action in both places, and the repository
// steps back to secondary.
const APP_LABEL = {
  en: "Open the app",
  "zh-CN": "打开应用",
  ja: "アプリを開く",
  fr: "Ouvrir l'application",
};
const ARROW =
  "<span class='arrow'><svg viewBox='0 0 24 24'><path d='M5 19L19 5M19 5H8M19 5v11'/></svg></span>";

function appLabel(html) {
  const lang = (html.match(/<html[^>]*\blang=['"]([^'"]+)/) || [])[1] || "en";
  return APP_LABEL[lang] || APP_LABEL.en;
}

// The app's own wording for the same link, from landing/i18n.js — one phrase, and
// no reason for the two halves of the site to say it differently.
const SKIP_LABEL = {
  en: "Skip to content",
  "zh-CN": "跳到正文",
  ja: "本文へスキップ",
  fr: "Aller au contenu",
};

// Every rule the corrections stylesheet carries fixes something measured, and
// nothing in it restyles the design for its own sake. It is authored as real CSS
// in marketing-corrections.css, so it lints, diffs and reads like a stylesheet
// instead of like a 640-line string inside a build script — and so the design
// side can take the file as it is. The build inlines it into each page's <head>,
// after the export's own stylesheet, so it wins on order without needing
// !important.
const CORRECTIONS = fs.readFileSync(path.join(__dirname, "marketing-corrections.css"), "utf8");

// Every collage plate on the page sits in a frame that declares its own
// aspect-ratio, and object-fit: cover then quietly discards whatever does not fit.
// Two of the seven frames were the wrong shape for the plates they hold, and the
// corrections give them the plates' shape instead. That fix is only correct as long
// as both sides stay put, and neither side is under this repo's control: the plates
// are re-exported from the design project and the frames are declared in the
// exported stylesheet.
//
// So the build reads the real pixel dimensions out of the WebP files and compares
// them with the ratio each frame declares. A re-export that changes either one
// fails here instead of silently cropping the artwork again.
const PLATE_FRAMES = [
  { frame: ".about-art", plates: ["about.webp"] },
  { frame: ".capabilities-art", plates: ["capabilities.webp"] },
  { frame: ".testimonial-art", plates: ["testimonial.webp"] },
  { frame: ".cta-art", plates: ["cta.webp"] },
  { frame: ".method-step .img", plates: ["method-1.webp", "method-2.webp", "method-3.webp", "method-4.webp"] },
  { frame: ".lab-img", plates: ["lab-1.webp", "lab-2.webp", "lab-3.webp", "lab-4.webp", "lab-5.webp"] },
  { frame: ".work-card .img", plates: ["work-1.webp", "work-2.webp"] },
];

// Intrinsic size from a WebP header — the three container forms a plate can take.
// Cheaper and more honest than trusting a filename convention or a note in a
// comment, and it needs no image library on the build machine.
function webpSize(buf) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  let at = 12;
  while (at + 8 <= buf.length) {
    const tag = buf.toString("ascii", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    const body = at + 8;
    if (tag === "VP8X") return { w: (buf.readUIntLE(body + 4, 3) & 0xffffff) + 1, h: (buf.readUIntLE(body + 7, 3) & 0xffffff) + 1 };
    if (tag === "VP8 ") {
      // 3-byte frame tag, then the 3-byte sync code, then two 16-bit fields whose
      // low 14 bits are the dimensions.
      if (buf.readUIntBE(body + 3, 3) !== 0x9d012a) return null;
      return { w: buf.readUInt16LE(body + 6) & 0x3fff, h: buf.readUInt16LE(body + 8) & 0x3fff };
    }
    if (tag === "VP8L") {
      const bits = buf.readUInt32LE(body + 1);
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
    at = body + size + (size % 2); // chunks are padded to an even length
  }
  return null;
}

// The ratio a frame ends up with: the corrections are appended after the export's
// stylesheet, so a declaration there wins.
function declaredRatio(css, frame) {
  let found = null;
  let at = -1;
  while ((at = css.indexOf(frame + " {", at + 1)) >= 0) {
    const block = css.slice(at, css.indexOf("}", at));
    const m = block.match(/aspect-ratio:\s*([\d.]+)\s*\/\s*([\d.]+)/);
    if (m) found = Number(m[1]) / Number(m[2]);
  }
  return found;
}

const PLATES_DIR = path.join(__dirname, "marketing", "assets");

function assertPlateFramesFitTheirPlates(html) {
  const css = html + "\n" + CORRECTIONS;
  const wrong = [];
  for (const { frame, plates } of PLATE_FRAMES) {
    const declared = declaredRatio(css, frame);
    if (declared == null) {
      throw new Error(`marketing-patch plate-frames: ${frame} no longer declares an aspect-ratio`);
    }
    for (const file of plates) {
      const size = webpSize(fs.readFileSync(path.join(PLATES_DIR, file)));
      if (!size) throw new Error(`marketing-patch plate-frames: cannot read the size of ${file}`);
      const real = size.w / size.h;
      if (Math.abs(real - declared) > 0.005) {
        const lost =
          real < declared
            ? `${Math.round((1 - real / declared) * 100)}% of its height`
            : `${Math.round((1 - declared / real) * 100)}% of its width`;
        wrong.push(`${frame} declares ${declared.toFixed(3)}, ${file} is ${size.w}×${size.h} (${real.toFixed(3)}) — cover throws away ${lost}`);
      }
    }
  }
  if (wrong.length) {
    throw new Error(
      "marketing-patch plate-frames: a frame is the wrong shape for the plates it holds.\n  " +
        wrong.join("\n  ") +
        "\nGive the frame the plates' ratio in marketing-corrections.css, or re-export the plates.",
    );
  }
}

// Exact-string copy edits, per page language, in marketing-copy-edits.json. Data
// rather than code, because that is what they are: the copy deck upstream is one
// JSON file of {en, zh, ja, fr} strings, and these pairs are edits to it that
// cannot be made there from this repo. Keeping them in the same shape means
// folding them into the deck is a merge, not a reading of a build script.
//
// Every pair must match exactly once on its page or the build fails. These are
// sentences, and a near-miss would silently ship half an edit.
const COPY_EDITS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "marketing-copy-edits.json"), "utf8"),
);

// Remove CSS comments from a stylesheet, keeping the rules byte-for-byte.
//
// Quote-aware rather than a bare /\/\*[\s\S]*?\*\//g, because these stylesheets
// carry an SVG data URL inside url("…") and a future rule could carry a string
// with /* in it — a naive strip would swallow everything to the next */ and take
// live rules with it. And self-checking, because that failure is invisible: the
// page still builds, still validates, and is simply missing a rule until someone
// notices the layout. Counting braces inside the comments as they are skipped
// makes the check exact instead of a heuristic about size.
function stripCssComments(css) {
  const pass = (src) => {
    let out = "";
    let quote = null;
    let bracesInComments = 0;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (quote) {
        out += ch;
        if (ch === "\\") out += src[++i] ?? "";
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        out += ch;
        continue;
      }
      if (ch === "/" && src[i + 1] === "*") {
        const end = src.indexOf("*/", i + 2);
        if (end < 0) throw new Error("marketing-patch strip-css-comments: unterminated comment");
        for (let j = i; j < end; j++) if (src[j] === "{" || src[j] === "}") bracesInComments++;
        i = end + 1;
        continue;
      }
      out += ch;
    }
    if (quote) throw new Error("marketing-patch strip-css-comments: unterminated string");
    return { out, bracesInComments };
  };

  const { out, bracesInComments } = pass(css);
  const braces = (s) => (s.match(/[{}]/g) || []).length;
  if (braces(out) !== braces(css) - bracesInComments) {
    throw new Error(
      `marketing-patch strip-css-comments: ${braces(css) - bracesInComments} braces expected, ${braces(out)} left — a rule was eaten`,
    );
  }
  // Idempotence is the check that nothing comment-shaped survived, and it is the
  // quote-aware one: a bare search for /* in the output would fire on the legal
  // `content: "/*"` that the pass above deliberately preserves.
  if (pass(out).out !== out) {
    throw new Error("marketing-patch strip-css-comments: a comment survived the strip");
  }
  // What the comments leave behind: their indentation, and the blank lines that
  // separated them from the rules they explained.
  return out
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+/, "");
}

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
    name: "merge-rule-sections",
    why: "section VII restated section II's rule; its bibliography row moves to II",
    // The export states the evidence rule five times: II's headline, II's lead,
    // III's first card, V's third step and VII's pull-quote. VII adds nothing but
    // a fifth phrasing — except the bibliography row, which is the only place the
    // page credits Splink, GraphRAG, pgvector, e5-large and Gutenberg. So this is
    // a merge, not a deletion: the row moves into II, then VII goes.
    //
    // The section cannot be dropped upstream. The design template declares all
    // eight as required (`about: AboutBlock`) and compose.ts reads them
    // unconditionally, so omitting one from the copy deck throws. Structural
    // surgery on the output is the only lever, which is why it is done as one
    // move plus one delete plus the renumber, each asserted.
    run(html) {
      let count = 0;
      const sectionOf = (name) => {
        const open = html.indexOf(`<section class='${name}'`);
        if (open < 0) return null;
        const close = html.indexOf("</section>", open);
        if (close < 0) return null;
        return { start: open, end: close + "</section>".length };
      };

      const vii = sectionOf("testimonial");
      const ii = sectionOf("about");
      if (!vii || !ii) return { html, count: 0 };

      // The bibliography run is contiguous: rule, caption, the six partner
      // anchors, and the link out to references.bib.
      const slice = html.slice(vii.start, vii.end);
      const from = slice.indexOf("<div class='divider'></div>");
      const to = slice.indexOf("</a>", slice.indexOf("class='read-more'"));
      if (from < 0 || to < 0) return { html, count: 0 };
      const moved = slice.slice(from, to + "</a>".length);

      // Land it as the last child of II's container — after the two-column grid,
      // not inside it, so it spans the section instead of becoming a third column.
      const iiSlice = html.slice(ii.start, ii.end);
      const anchor = iiSlice.lastIndexOf("</div>");
      if (anchor < 0) return { html, count: 0 };
      const iiPatched =
        iiSlice.slice(0, anchor) +
        `<div class='merged-bibliography'>\n${moved}\n</div>\n` +
        iiSlice.slice(anchor);
      count++;

      // Rebuild: II with the row, everything between II and VII untouched, VII gone.
      let out =
        html.slice(0, ii.start) + iiPatched + html.slice(ii.end, vii.start) + html.slice(vii.end);
      count++;

      // Seven sections now, so the numbering has to follow or the page shows a
      // gap at VII and every counter still reads "/ 008".
      const before = out;
      out = out
        .replace(/<span class='roman'>VIII\.<\/span>/, "<span class='roman'>VII.</span>")
        .replace(/(<div class='index'>)VIII(<\/div>)/, "$1VII$2")
        .split(" / 008<")
        .join(" / 007<")
        .replace(/>008 \/ 007</, ">007 / 007<");
      if (out !== before) count++;

      return { html: out, count };
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
      // Matches `color:` and also `border-color:` / `outline-color:`, on purpose:
      // all four of the latter sit on a ring, pill or hover mark whose own text
      // this same pass darkens, so a bright border beside dark type would read as
      // a mismatch. Backgrounds are NOT swept up here — those are handled by name
      // in CORRECTIONS, where the text colour on top decides the right fill.
      out = out.replace(/color:\s*var\(--coral\)/g, () => {
        count++;
        return `color: var(--coral-text)`;
      });
      return { html: out, count };
    },
  },
  {
    name: "app-entry-nav",
    why: "the header's only button was 'Star on GitHub', and it was hidden on phones",
    run(html) {
      let count = 0;
      const label = appLabel(html);
      const out = mapMarkup(html, (chunk) =>
        chunk.replace(/(<div class='nav-side'>\s*)<a class='nav-cta'/, (m, open) => {
          count++;
          return (
            `${open}<a class='nav-app' href='./app'>${label}</a>\n` +
            `<a class='nav-cta nav-cta-repo'`
          );
        }),
      );
      return { html: out, count };
    },
  },
  {
    name: "app-entry-hero",
    why: "the hero's primary action starred a repository instead of opening the app",
    run(html) {
      let count = 0;
      const label = appLabel(html);
      const out = mapMarkup(html, (chunk) =>
        chunk.replace(/(<div class='hero-actions'[^>]*>\s*)<a class='btn btn-primary'/, (m, open) => {
          count++;
          return (
            `${open}<a class='btn btn-primary btn-app' href='./app'>\n${label}\n${ARROW}\n</a>\n` +
            `<a class='btn btn-ghost'`
          );
        }),
      );
      return { html: out, count };
    },
  },
  {
    name: "copy-edits",
    why: "one 10-word clause and one 7-word clause were each on the page twice, verbatim",
    // The page carries 594 words of body copy across 24 blocks — lean for seven
    // sections, so the problem was never length. It was repetition, and it was
    // measurable: two clauses appeared twice each, word for word.
    //
    //   "claim carries an evidence_span, a literal substring of the source"
    //       hero lead + the rule section's lead
    //   "source text stays in its original script"
    //       the alias card + the reference-set card
    //
    // Each clause stays where it belongs and goes everywhere else. The rule
    // section owns the definition, because defining the rule is what that
    // section is for; the hero states the consequence instead, which also folds
    // its third sentence into its second — those two said the same thing, once
    // abstractly and once concretely. The reference-set card owns "original
    // script, nothing transliterated", because that is a fact about the corpus;
    // the alias card was using it as a run-up to its own subject.
    //
    // Two more, not about repetition:
    //
    // The engineering lead promised one thing with its colon and delivered
    // another — "researched against Splink, ComEM and GraphRAG:" followed by
    // four features of LoreGraph, not four points of comparison. Naming what
    // the list is fixes the grammar without touching the hedge: the project read
    // those papers, it does not implement them.
    //
    // And the reference set localised four of its five titles per language but
    // left 西游记 in Chinese on the English and French pages, while translating
    // Crime and Punishment out of Russian on both. Five titles, two different
    // rules. The other three pages localise all five, so the exception joins
    // them. The English page still demonstrates CJK where it earns its place —
    // "forget the Elizabeth Bennet or 孫悟空 it already knows" — so nothing is
    // lost by not proving it with a book title.
    //
    // And the spec strip closed four fragments with four full stops, none of
    // them a sentence — the same tic as the interpuncts, with a different glyph.
    // Spacing separates them, the way it now does everywhere else on the page.
    //
    // This belongs in the copy deck upstream, which is one JSON file of
    // {en, zh, ja, fr} strings. It is here because the deck lives outside this
    // repo — see marketing-copy-edits.json, written in the same shape so that
    // moving it there is a merge. Then delete this patch.
    run(html) {
      // Landing pages only. The credits pages reuse the head and the chrome but
      // carry none of this prose — and they do have a .lead of their own, so the
      // hero section is the marker, not that class.
      if (!html.includes("<section class='hero'")) return { html, count: 0 };
      const lang = (html.match(/<html[^>]*lang=['"]([^'"]+)/) || [])[1] || "en";
      const pairs = COPY_EDITS[lang];
      if (!pairs) throw new Error(`marketing-patch copy-edits: no edits for lang '${lang}'`);
      let out = html;
      let count = 0;
      for (const [from, to] of pairs) {
        const hits = out.split(from).length - 1;
        if (hits !== 1) {
          throw new Error(
            `marketing-patch copy-edits (${lang}): expected exactly 1 match, found ${hits}:\n  ${from}`,
          );
        }
        out = out.split(from).join(to);
        count++;
      }
      return { html: out, count };
    },
  },
  {
    name: "main-landmark-and-skip-link",
    why: "eleven tab stops stand between the keyboard and the page's first heading, with no way past them",
    // The page has a header, a footer and eight sections, and no main landmark at
    // all — so there is nothing for a screen reader to jump to and nothing for a
    // skip link to point at. Tabbing in means eleven controls before the h1, on
    // every one of the four pages, every time.
    //
    // The eight sections become the main region and a skip link goes in front of
    // the header, in the same words the app already uses for its own. Wrapping is
    // safe here: the sections are plain blocks in normal flow and nothing in
    // either stylesheet selects a direct child of .shell.
    run(html) {
      if (!html.includes("<section class='hero'")) return { html, count: 0 };
      const lang = (html.match(/<html[^>]*lang=['"]([^'"]+)/) || [])[1] || "en";
      const label = SKIP_LABEL[lang];
      if (!label) throw new Error(`marketing-patch skip-link: no label for lang '${lang}'`);

      const headerEnd = html.indexOf("</header>");
      const footerAt = html.indexOf("<footer");
      if (headerEnd < 0 || footerAt < 0 || footerAt < headerEnd) {
        throw new Error("marketing-patch main-landmark: cannot find </header> … <footer> to wrap");
      }
      const after = headerEnd + "</header>".length;
      // tabindex='-1' is what makes the skip link actually skip: without it the
      // browser scrolls to the target but leaves focus on the link, so the next Tab
      // carries on through the header and the reader is back where they started.
      html =
        html.slice(0, after) +
        "\n<main id='main' tabindex='-1'>" +
        html.slice(after, footerAt) +
        "</main>\n" +
        html.slice(footerAt);

      // In front of everything, so it is the first tab stop.
      const shellAt = html.indexOf("<div class='shell'>");
      if (shellAt < 0) throw new Error("marketing-patch skip-link: no .shell to put the link in front of");
      const insertAt = shellAt + "<div class='shell'>".length;
      html =
        html.slice(0, insertAt) +
        `\n  <a class='skip-link' href='#main'>${label}</a>` +
        html.slice(insertAt);

      return { html, count: 2 };
    },
  },
  {
    name: "drop-restated-labels",
    why: "a status column with one value in it, five chips restating the heading below them, and one tagline three times",
    // Three things the page says more than it needs to. All three are structural,
    // so this reads the shape rather than the words and works on all four
    // languages without knowing any of them.
    //
    // 1. The five reading-room cards each carry a status: "Shipped", "已上线",
    //    "実装済み", "Livré" — the same word five times. A column whose every cell
    //    holds the same value says nothing per row; it is a fact about the set. So
    //    the cells go and the set's own annotation takes it, in the copy edits:
    //    "Five views" becomes "Five views, all built". Same claim, one fifth of
    //    the ink, and no column of identical values.
    //
    // 2. Each plate carries a chip — Text, Graph, Time, Index, Ask — and the
    //    heading 12px below it reads Reader, Graph, Timeline, Index, Ask. Four are
    //    the same word twice; the other two differ, which is worse than a
    //    duplicate, because the reader has to work out whether "Text" and "Reader"
    //    are the same view. The heading names the view. The chip goes.
    //
    // 3. "eight passes, one gate" appears three times, in the hero footer, the
    //    call to action's footer and the page footer — as an ornament in a metadata
    //    slot each time, never as a claim being made. The page states the fact
    //    twice more where it is doing work: the hero's stat block ("8 passes, one
    //    of them a gate") and the pipeline section's own heading. Six statements of
    //    one fact on one page; the three ornaments go.
    run(html) {
      if (!html.includes("<section class='hero'")) return { html, count: 0 };
      let count = 0;

      // 1. The status cells, asserted to be a constant column before removing it.
      const rows = [...html.matchAll(/<div class='num-row'><span>\d+<\/span><span>([^<]*)<\/span><\/div>/g)];
      if (rows.length !== 5) {
        throw new Error(`marketing-patch drop-restated-labels: expected 5 .num-row cards, found ${rows.length}`);
      }
      const statuses = new Set(rows.map((m) => m[1]));
      if (statuses.size !== 1) {
        throw new Error(
          `marketing-patch drop-restated-labels: the status column is no longer one value — ${[...statuses].join(", ")}. It now carries information; leave it alone.`,
        );
      }
      html = html.replace(/(<div class='num-row'><span>\d+<\/span>)<span>[^<]*<\/span>(<\/div>)/g, (m, head, tail) => {
        count++;
        return head + tail;
      });

      // 2. The plate chips.
      const chips = (html.match(/<span class='badge'>[^<]*<\/span>/g) || []).length;
      if (chips !== 5) {
        throw new Error(`marketing-patch drop-restated-labels: expected 5 plate badges, found ${chips}`);
      }
      html = html.replace(/<span class='badge'>[^<]*<\/span>/g, () => {
        count++;
        return "";
      });

      // 3. The tagline, keyed off the hero footer's own copy so the words come from
      //    the page rather than from a list here.
      const coord = html.match(/<span class='coord'>([^<]+)<\/span>/);
      if (!coord) throw new Error("marketing-patch drop-restated-labels: no .coord in the hero footer");
      const tagline = coord[1];
      const hits = html.split(`>${tagline}<`).length - 1;
      if (hits !== 3) {
        throw new Error(
          `marketing-patch drop-restated-labels: expected the tagline "${tagline}" 3 times, found ${hits}`,
        );
      }
      html = html.replace(
        new RegExp(`[ \\t]*<span(?: [^>]*)?>${tagline.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</span>\\n?`, "g"),
        () => {
          count++;
          return "";
        },
      );

      return { html, count };
    },
  },
  {
    name: "drop-dead-and-duplicate-furniture",
    why: "five buttons that filter nothing, and five section rules that repeat the label 57px below them",
    // Two kinds of furniture that carry no information.
    //
    // The reading room's five filter pills — All 05, Text 01, Graph 01, Time 01,
    // Catalogue 02 — are <button>s with no handler anywhere in the bundle, and the
    // cards they would filter carry no category data at all. Clicking one leaves
    // all five cards visible. The counts do map cleanly onto the cards, so the
    // intent is legible and they could be wired; they should not be. A filter over
    // five items that all fit on one row and are all already visible is not a
    // control, it is decoration shaped like one.
    //
    // And five of the six section rules open with the section's own name, which
    // the coral label repeats verbatim 57px below: "The rule" over "The rule",
    // "Engineering" over "Engineering", and so on. The label is the one that
    // belongs — it sits directly above the headline and names the section there.
    // The rule keeps its annotation, which is the part that says something the
    // label does not: docs/8-pass-pipeline.md, src/loregraph, eight passes. Only
    // the hero's rule is left whole, because its two halves differ.
    run(html) {
      let count = 0;
      const balanced = (src, at, tag) => {
        const open = `<${tag}`, close = `</${tag}>`;
        let depth = 0, p = at;
        while (p < src.length) {
          if (src.startsWith(open, p)) depth++;
          else if (src.startsWith(close, p)) {
            depth--;
            if (depth === 0) return p + close.length;
          }
          p++;
        }
        return -1;
      };
      const strip = (frag) => frag.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

      // 1. the pills
      const pillsAt = html.indexOf("<div class='pills'");
      if (pillsAt >= 0) {
        const end = balanced(html, pillsAt, "div");
        if (end > 0) {
          html = html.slice(0, pillsAt) + html.slice(end);
          count++;
        }
      }

      // 1b. the corpus section's two 46px arrow buttons, which are the same thing
      //     again: no handler anywhere in the bundle, and nothing to page through —
      //     the cards they sit under are a three-column grid, not a scroller. They
      //     are also the page's only two controls with no accessible name, so a
      //     screen reader announces "button, button" and a keyboard user Tabs onto
      //     two dead ends. Labelling them would be labelling nothing.
      const arrowsAt = html.indexOf("<div class='work-arrows'");
      if (arrowsAt >= 0) {
        if (/nav-btn[\s\S]{0,400}addEventListener/.test(html)) {
          throw new Error("marketing-patch: .work-arrows now has a handler — wire them up rather than dropping them");
        }
        const end = balanced(html, arrowsAt, "div");
        if (end > 0) {
          html = html.slice(0, arrowsAt) + html.slice(end);
          count++;
        }
      }

      // 2. the duplicated name in each section rule. The corpus section is the
      //    odd one out: its rule is .work-rule and its middle group is an
      //    inline-styled span rather than .meta-grp, but it repeats its label the
      //    same way — "The corpus" over "The corpus".
      html = html.replace(/<section class='[^']*'[^>]*>[\s\S]*?<\/section>/g, (sec) => {
        let ruleAt = sec.indexOf("<div class='sec-rule'");
        let grpMark = "<span class='meta-grp'>";
        if (ruleAt < 0) {
          ruleAt = sec.indexOf("<div class='work-rule'");
          grpMark = "<span style='display:inline-flex;gap:24px;'>";
        }
        const labelAt = sec.indexOf("<span class='label'");
        if (ruleAt < 0 || labelAt < 0) return sec;
        const grpAt = sec.indexOf(grpMark, ruleAt);
        if (grpAt < 0) return sec;
        const grpEnd = balanced(sec, grpAt, "span");
        const firstAt = sec.indexOf("<span", grpAt + grpMark.length);
        if (grpEnd < 0 || firstAt < 0 || firstAt > grpEnd) return sec;
        const firstEnd = balanced(sec, firstAt, "span");
        if (firstEnd < 0) return sec;
        const labelEnd = balanced(sec, labelAt, "span");
        if (labelEnd < 0) return sec;
        if (strip(sec.slice(firstAt, firstEnd)) !== strip(sec.slice(labelAt, labelEnd))) return sec;
        // take the separator element with it if one is still there
        let cut = firstEnd;
        const after = sec.slice(cut);
        const sep = after.match(/^\s*<span (?:class='dot-mark'|style='color:var\(--coral\);')>[\s\S]*?<\/span>/);
        if (sep) cut += sep[0].length;
        count++;
        return sec.slice(0, firstAt) + sec.slice(cut);
      });

      return { html, count };
    },
  },
  {
    name: "heading-levels",
    why: "the outline jumped h2 to h4 three times, so heading navigation gave a broken tree",
    // Nine h4s and four h5s sit directly under an h2 with no h3 between them:
    // the five reading-room cards, the four pipeline steps, and the four footer
    // columns. Someone navigating by heading gets a tree with two levels missing
    // and no way to tell whether they have skipped something.
    //
    // An earlier pass left this alone on the grounds that the styling is bound to
    // the tag name, so moving the tag would mean copying its declarations into
    // the corrections sheet — a copy that goes stale silently the next time the
    // export changes them. That was wrong: the stylesheet is inline in the same
    // file this patch already rewrites, so the selector moves with the tag and
    // nothing is duplicated.
    run(html) {
      let count = 0;
      const selector = (from, to, expect) => {
        const hits = html.split(from).length - 1;
        if (hits !== expect) {
          throw new Error(
            `marketing-patch heading-levels: expected ${expect} of '${from}', found ${hits}`,
          );
        }
        html = html.split(from).join(to);
        count += hits;
      };
      selector(".lab h4", ".lab h3", 1);
      selector(".method-step h4", ".method-step h3", 2);
      selector(".method-step:last-child h4", ".method-step:last-child h3", 1);
      selector(".foot-col h5", ".foot-col h3", 1);

      // Tags only — mapMarkup steps over <style>, <script> and comments, so the
      // selectors just renamed above are not touched again.
      let tags = 0;
      html = mapMarkup(html, (chunk) =>
        chunk.replace(/<(\/?)h[45]\b/g, (m, slash) => {
          tags++;
          return `<${slash}h3`;
        }),
      );
      // The credits pages carry the same stylesheet — so the selectors above are
      // there — but none of these headings, so they legitimately rewrite nothing.
      const expectTags = html.includes("<section class='hero'") ? 26 : 0;
      if (tags !== expectTags) {
        throw new Error(
          `marketing-patch heading-levels: expected ${expectTags} h4/h5 tags, found ${tags}`,
        );
      }
      return { html, count: count + tags };
    },
  },
  {
    name: "fold-topbar-into-header",
    why: "two beige bands with one hairline between them read as one 124px block, not as a utility rail plus a header",
    // The top bar carried four things. Three of them already appear elsewhere
    // within two rows: the wordmark (the nav's own brand mark, one row down),
    // "v0.1.0-dev" and "Alpha" (the same fact stated twice, and again in the
    // footer), and "Apache-2.0 / Python 3.11+" (also the brand meta, also the
    // footer). The fourth, the language switcher, is the only thing on the strip
    // that exists nowhere else — so the strip goes and the switcher moves into
    // the header, between the section links and the actions.
    //
    // That is one band fewer above the fold and 39px less before the headline.
    // The cost, accepted deliberately: the release link behind "Alpha" and the
    // version number no longer appear above the fold. Both are still in the
    // footer.
    run(html) {
      // The switcher is one balanced <span>; the bar is one balanced <div>.
      const balanced = (src, at, tag) => {
        const open = `<${tag}`, close = `</${tag}>`;
        let depth = 0, p = at;
        while (p < src.length) {
          if (src.startsWith(open, p)) depth++;
          else if (src.startsWith(close, p)) {
            depth--;
            if (depth === 0) return p + close.length;
          }
          p++;
        }
        return -1;
      };

      const barAt = html.indexOf("<div class='topbar'");
      const langAt = html.indexOf("<span class='lang-switch'>");
      const sideAt = html.indexOf("<div class='nav-side'>");
      if (barAt < 0 || langAt < 0 || sideAt < 0) return { html, count: 0 };

      const barEnd = balanced(html, barAt, "div");
      const langEnd = balanced(html, langAt, "span");
      if (barEnd < 0 || langEnd < 0) return { html, count: 0 };
      // The switcher has to be inside the bar for this to be the right surgery.
      if (langAt < barAt || langEnd > barEnd) return { html, count: 0 };

      // The switcher's four items were separated by " · ". drop-dot-chains would
      // turn each into two non-breaking spaces, and in the header the switcher
      // is an inline-flex row with a real 14px gap — so those spaces become flex
      // items of their own and the group pays for both separators: 114px of gap
      // and padding around 99px of text, 241px in a header that has none to
      // spare. The gap is enough on its own.
      const lang = html
        .slice(langAt, langEnd)
        .split(" · ")
        .join("")
        .split("&nbsp;·&nbsp;")
        .join("");
      let out = html.slice(0, barAt) + html.slice(barEnd);
      const shift = barEnd - barAt;
      const side = sideAt > barAt ? sideAt - shift : sideAt;
      out = out.slice(0, side) + lang + "\n      " + out.slice(side);
      return { html: out, count: 2 };
    },
  },
  {
    name: "corrections-stylesheet",
    why: "the export has no working phone layout — the document floors at 541px wide",
    run(html) {
      if (!html.includes("</head>")) return { html, count: 0 };
      // The plate frames only exist on the landing pages; the credits pages carry
      // the same <head> but none of the sections.
      if (html.includes("<section class='hero'")) assertPlateFramesFitTheirPlates(html);
      const tag = `<style>\n${CORRECTIONS}</style>\n`;
      return { html: html.replace("</head>", tag + "</head>"), count: 1 };
    },
  },
  {
    name: "drop-dot-chains",
    why: "the interpuncts joining short phrases everywhere read as machine-written",
    // Every one of these is a separator between two things that spacing can
    // separate on its own — "LoreGraph · v0.1.0-dev", "Apache-2.0 · Python 3.11+",
    // "COVER PLATE • DESIGN FOR A THEATER SET". Removing the glyph is typographic,
    // not editorial: no word changes, the items stay, the gap does the work.
    //
    // Two dots stay, because in their languages they are not separators at all:
    // Japanese's 中点 (・) inside a list of words — 小説・戯曲・脚本 — and Chinese's
    // 间隔号 in a transliterated name — 伊丽莎白·班纳特. Removing either produces
    // broken text rather than cleaner text. Both survive because the patterns
    // below require the dot to have space around it, which a word-internal dot
    // never does.
    run(html) {
      let count = 0;
      const out = mapMarkup(html, (chunk) => {
        let c = chunk;
        const before = c;
        c = c.split("&nbsp;·&nbsp;").join("&nbsp;&nbsp;&nbsp;");
        c = c.split(" · ").join("&nbsp;&nbsp;");
        // The section rules give the mark its own element — as a class in most
        // rules and as an inline style in the corpus one — and both sit in an
        // inline-flex row with a gap already, so the element simply goes.
        c = c.replace(/<span[^>]*>\s*[•·]\s*<\/span>\s*/g, "");
        if (c !== before) count++;
        return c;
      });
      return { html: out, count };
    },
  },
  {
    name: "star-count-label",
    why: "the live star count replaced the localised button label with English",
    // The export's script does `cta.textContent = 'Star · ' + count`, which
    // throws away whatever the button said. On the Chinese page that means
    // "在 GitHub 上 Star" is replaced by "Star · 5" a moment after load; same on
    // the Japanese and French pages. It also reintroduces an interpunct that
    // drop-dot-chains cannot reach, because the string is assembled at runtime.
    // Appending the number keeps the label in its own language and lets the
    // button's own gap do the separating.
    run(html) {
      const from = "cta.textContent = 'Star · ' + format(data.stargazers_count);";
      if (!html.includes(from)) return { html, count: 0 };
      const to =
        "var n = document.createElement('span');\n" +
        "        n.setAttribute('data-github-stars', '');\n" +
        "        n.textContent = format(data.stargazers_count);\n" +
        "        cta.appendChild(n);";
      return { html: html.split(from).join(to), count: html.split(from).length - 1 };
    },
  },
  {
    name: "tuck-punctuation",
    why: "6px of chip padding put a space between inline code and the comma after it",
    // Two marks land a visible space too far right. An inline code chip carries
    // 6px of padding, and the comma or full stop that follows sits outside it:
    // "uv sync , then", "loregraph extract . One". And a comma directly after an
    // italic Playfair word is set in the headline's 800-weight sans, so it reads
    // heavier than the word it belongs to.
    //
    // Only commas are re-set after an em. The full stops there are the coral
    // terminal dot the headlines end on and the black dot the footer wordmark
    // ends on — both deliberate, both much larger than a period.
    run(html) {
      let count = 0;
      const out = mapMarkup(html, (chunk) => {
        let c = chunk;
        // Full-width CJK punctuation too: the Chinese and Japanese pages put a
        // 、 or 。 straight after a chip, and those already carry a wide left
        // sidebearing of their own, so the padding on top of it opens a gap
        // twice the size of the Latin one.
        c = c.replace(/(<\/code>)([,.;:!?)]|[，。、；：！？）」』])/g, (m, close, mark) => {
          count++;
          return `${close}<span class='punct-tuck'>${mark}</span>`;
        });
        c = c.replace(/(<\/em>)(,)/g, (m, close, mark) => {
          count++;
          return `${close}<span class='em-punct'>${mark}</span>`;
        });
        return c;
      });
      return { html: out, count };
    },
  },
  {
    name: "single-font-request",
    why: "the four webfont families are requested twice — once by <link>, once by @import",
    // The stylesheet opens with an @import for the exact URL the head already
    // loads with <link rel=stylesheet>, alongside both preconnects. The <link>
    // is the one that wins on timing: it is discovered by the preload scanner,
    // while an @import inside an inline <style> is not seen until the parser
    // reaches the style block and then blocks rendering on its own request.
    run(html) {
      let count = 0;
      const out = html.replace(/@import\s+url\((['"])https:\/\/fonts\.googleapis\.com[^)]*\1\);\s*/g, () => {
        count++;
        return "";
      });
      return { html: out, count };
    },
  },
  {
    name: "short-alt-text",
    why: "three plates carry 231-576 character alt text — a museum title read aloud",
    // The plates are attributed twice over: a visible caption on the page and a
    // full entry on the credits page, which is where the complete object title
    // belongs. In the alt attribute an unabridged 18th-century title is a
    // penalty paid only by someone using a screen reader. The head of the title
    // and the attribution stay; the subtitle, the alternate-language rendering
    // and the plate number go.
    run(html) {
      let count = 0;
      const out = mapMarkup(html, (chunk) =>
        chunk.replace(/(<img\b[^>]*\balt=)(['"])([^'"]*)\2/g, (m, head, q, alt) => {
          if (alt.length <= 180) return m;
          // The attribution is the tail after the last full stop that precedes
          // it; everything before is the object title.
          const credit = alt.match(/(The Met, CC0[^.]*\.?)\s*$/);
          const tail = credit ? credit[1] : "";
          let title = credit ? alt.slice(0, credit.index) : alt;
          // Cut at the first structural break in the title: a bracketed gloss,
          // an ellipsis, or ", from '…'".
          title = title
            .split(/\s*(?:\.\.\.|&hellip;|\(|, from )/)[0]
            .replace(/[\s,:]+$/, "")
            // The titles quote their own titles, so a cut can land inside an
            // entity: "…Les Noces de Thétis&#39;, from…" split at ", from "
            // leaves a bare "&#39" that renders as those four characters.
            .replace(/&(?:#\d{0,4}|[a-zA-Z]{0,8})$/, "");
          const next = tail ? `${title}. ${tail}` : `${title}.`;
          if (next.length >= alt.length) return m;
          count++;
          return `${head}${q}${next}${q}`;
        }),
      );
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
  {
    // Last, so it also strips the corrections this build just inlined.
    name: "strip-css-comments",
    why: "23% of every page's bytes were CSS comments — 28 KB of build notes in the head",
    // The prose is the point of these stylesheets: nearly every rule records the
    // measurement behind it, and the corrections file is 70% comment by weight.
    // It belongs in the repo. It does not belong in the bytes eight pages hand
    // every reader, in the <head>, on the critical path, before anything paints.
    // The export's own stylesheet documents itself the same way and keeps its
    // prose in marketing/, so it can ship without it too.
    run(html) {
      let count = 0;
      const out = html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (m, open, css, close) => {
        const stripped = stripCssComments(css);
        if (stripped === css) return m;
        count++;
        return open + stripped + close;
      });
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
