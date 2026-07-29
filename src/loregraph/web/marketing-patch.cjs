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

// Every rule here fixes something measured, and nothing here restyles the design
// for its own sake. Appended after the export's own stylesheet so it wins on
// order without needing !important.
const CORRECTIONS = `
/* ---------------------------------------------------------------------------
 * Build-time corrections. See src/loregraph/web/marketing-patch.cjs — edit
 * there, not here; this block is generated.
 * ------------------------------------------------------------------------ */

/* The hero carries two rows of furniture under the copy: three buttons, which
 * need 545px to sit on one line, and three stats, which need 524px. The exported
 * two-column grid gives the copy column 414px at 1200 and 466px at 1440, so it
 * cannot hold either row at any desktop width — and the export's own
 * flex-wrap:nowrap did not fit them, it hid the overflow: the third button and
 * the third stat slid under the plate panel, which paints after them, and were
 * cut in half.
 *
 * Releasing the wrap instead surfaced the same shortfall as a ragged 2 + 1, four
 * rows of furniture where the design has two. Neither setting can win, because
 * the column is too narrow either way. So the column gets the width:
 *
 *   ≤ 700px   the rows genuinely do not fit on one line — wrap them. Without
 *             this the stats' 524px min-content floors the whole document and
 *             every phone scrolls sideways, which is where this started.
 *   ≤ 1100px  one column, the copy at full container width. Both rows fit with
 *             room to spare and the plate stacks beneath, which is what the
 *             export already does below 880.
 *   > 1100px  two columns again, the copy floored at 560px so the rows always
 *             fit, the plate taking what is left. */
@media (max-width: 1100px) {
  .hero-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (min-width: 1101px) {
  .hero-grid { grid-template-columns: minmax(560px, 1fr) 1fr; }
}
@media (max-width: 700px) {
  .hero-stats { flex-wrap: wrap; row-gap: 16px; }
  .hero-actions { flex-wrap: wrap; row-gap: 12px; }
}

/* With the interpuncts gone, the language switcher's 7px gap was doing all the
 * separating and the four links ran together. */
.lang-switch { gap: 14px; }

/* The bibliography row moved here from the section that used to restate the rule.
 * It was laid out inside a narrow copy column; here it spans the section, so it
 * gets its own breathing room and the partner list can use the width. */
.merged-bibliography { margin-top: 64px; }
.merged-bibliography .partners-text { max-width: 58ch; }
.merged-bibliography .partners { margin-top: 22px; }
.merged-bibliography .read-more { display: inline-block; margin-top: 26px; }

/* The app entry, styled from .nav-cta's own declarations but deliberately NOT
 * given that class: the export's star-count script does
 * querySelector('a.nav-cta:not(.ghost)') and rewrote this button's label to
 * "Star · 5" the first time it shared it. Its own class also keeps it out of the
 * rule that hides .nav-cta below 1080px, which is how a phone ended up with no
 * navigation and no way into the app at all. */
.nav-app {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}
.nav-app:hover { background: #2a2620; }

/* With the app filled and primary, the repository steps back to outlined. Its
 * ★ was mustard on the dark fill; on paper that is 1.48:1, so it takes the ink
 * tone instead. */
.nav-cta-repo {
  background: transparent;
  color: var(--ink);
  border: 1px solid rgba(21, 20, 15, 0.22);
}
.nav-cta-repo:hover { background: rgba(21, 20, 15, 0.05); }
.nav-cta-repo::after { color: var(--ink-mute); }

/* The count is appended after the label and the ★ comes from ::after, so the
 * button read "Star on GitHub 5 ★" with the number stranded between the two
 * things it belongs to. Both are flex items, so order puts the star back in
 * front of its own number. */
.nav-cta::after { order: 1; }
.nav-cta [data-github-stars] { order: 2; margin-left: -12px; }

/* The top bar is a space-between row whose children are all white-space:nowrap,
 * so below ~430px the language switcher simply hung off the right edge — 117px
 * past it at 360. */
@media (max-width: 880px) {
  .topbar-inner { flex-wrap: wrap; gap: 6px 14px; }
  .topbar-inner .right { flex-wrap: wrap; gap: 6px 12px; }
  .lang-switch { flex-wrap: wrap; }
}

/* These four frames took their width from their content, which is one lazy
 * plate. Until that plate loads its intrinsic size is 0x0, so the frame
 * collapsed to 0 wide — and each frame anchors an absolutely-positioned caption,
 * which then had nothing to be positioned against and printed straight over the
 * body copy in the next column. That is the overlap of
 * "Closed-world extraction: every claim goes back to a line in the book" across
 * "It is told, explicitly, to forget the Elizabeth Bennet it already knows."
 *
 * Sizing them from the column instead of from the image fixes the cause: the
 * frame is the right size before the plate arrives, so the caption has a box to
 * sit in and the plate fades into a space already reserved for it. (The earlier
 * pass was wrong to conclude no image needed dimensions — true for .lab-img and
 * the card frames, which set their own aspect-ratio, false for these four.) */
.about-art,
.capabilities-art,
.cta-art,
.testimonial-art { width: 100%; max-width: 100%; }

/* The footer keeps three columns down to the smallest phone. Their min-content
 * adds to 292px inside a 278px track once the two 40px gaps are taken, so the
 * last column hung 27px off the edge at 360. */
@media (max-width: 560px) {
  .foot-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 30px 24px; }
}

/* At 320 the header cannot hold the wordmark and two pills — 412px of content in
 * 288px. The app button is the one that matters there; the repository is still
 * linked from the top bar and the footer. The hero's install line does not break
 * either, partly because of a non-breaking space and 0.18em of tracking. */
@media (max-width: 400px) {
  .foot-grid { grid-template-columns: minmax(0, 1fr); }
  .nav-cta-repo { display: none; }
  /* Uppercase tracked labels, the section rules and inline code are all
   * unbreakable runs: "uv sync -> loregraph extract" and "evidence_span" are
   * single tokens as far as the line breaker is concerned. */
  .meta,
  .sec-rule,
  .topbar-inner > span,
  .topbar-inner .right > span,
  .topbar-inner .right > a { white-space: normal; overflow-wrap: anywhere; letter-spacing: 0.1em; }
  .sec-rule .meta-grp { flex-wrap: wrap; gap: 4px 12px; }
  .code-inline { overflow-wrap: anywhere; }

  /* Everything above this fixes a named cause. This is the backstop for 320px,
   * a width nothing in the export was laid out for: releasing every remaining
   * nowrap (the stylesheet sets no pre / pre-wrap anywhere, so nothing depends
   * on preserved whitespace) and clipping the shell, because a page that scrolls
   * sideways is worse than one whose ornament is cropped. Without it each fix
   * just uncovers the next unbreakable label. */
  [class] { white-space: normal; }
  .shell * { overflow-wrap: anywhere; }
  .shell { overflow-x: clip; }

  /* …except the short atomic marks, which that blanket rule mangled: the roman
   * numeral "I." broke between the letter and the period, and the section
   * counter "001 / 008" split across two lines. None of these is long enough to
   * overflow anything. */
  .roman,
  .dot-mark,
  .sec-rule > span:last-child,
  .work-rule > span:last-child,
  .hero-stats .stat-label b { white-space: nowrap; }
  /* 320px (an SE) leaves 288px of content, and the wordmark plus the app pill
   * plus two 18px gaps plus the status dot came to exactly that or more. The dot
   * is ornament and goes; the gaps tighten. */
  .nav-inner { gap: 12px; }
  .nav-side { gap: 10px; }
  .nav-side .status-dot { display: none; }
}

@media (max-width: 1080px) {
  /* Rotated ornament pinned 32-42px outside the art frame, with no margin to
   * hang it in below desktop. Hiding it also clears a real overlap: the closing
   * section's "VIII" numeral sat on top of the "LOREGRAPH · APACHE-2.0" ribbon. */
  .capabilities-art .ribbon,
  .cta-art .ribbon { display: none; }
}

/* NOTHING here repositions .about-side-note, and that is deliberate. An earlier
 * pass made it position:static below 1080px to stop it hanging 20px past the
 * viewport — but that 20px was measured mid-transition, while the reveal was
 * still animating, and does not exist in the settled layout. The rule was
 * therefore fixing nothing, and it dropped the note into .about-art's flow
 * directly on top of the absolutely-positioned .about-caption: four overlapping
 * text runs, "It is told, explicitly, to forget the Elizabeth Bennet it already
 * knows" printed straight through "Closed-world extraction: every claim goes
 * back to a line in the book." Measure the settled layout, and measure overlap
 * as well as overflow. */

/* White on the bright coral is 2.99:1, under the 4.5:1 floor — and these are
 * the two buttons carrying the page's main actions. The darker tone reads the
 * same and measures 5.66:1. */
.btn-primary,
.btn-app {
  background: var(--coral-text);
  box-shadow: 0 14px 26px -16px rgba(164, 77, 63, 1);
}
.btn-primary:hover,
.btn-app:hover { background: #8f4235; transform: translateY(-1px); }

/* The other three places white type sits on the bright fill: the active filter
 * pill, the card's hover mark and the section's active arrow. */
.pill.active,
.card:hover .arrow-mark,
.work-arrows .nav-btn.active { background: var(--coral-text); border-color: var(--coral-text); }

@media (max-width: 880px) {
  /* 28px arrow buttons are well under the 44px touch minimum, and they are the
   * links into the app. Grown on touch widths only; the desktop mark is a
   * deliberate size in a deliberate corner. */
  .card .arrow-mark,
  .lab .arrow-mark { width: 44px; height: 44px; }
  .card .arrow-mark svg,
  .lab .arrow-mark svg { width: 14px; height: 14px; }
}

@media (max-width: 880px) {
  /* The language switcher's four links were 13-32px wide and 15px tall. */
  .topbar-inner .lang-switch a,
  .topbar-link { display: inline-flex; align-items: center; min-height: 34px; padding: 0 5px; }
}

/* The small end of the scale ran 9 / 9.5 / 10 / 10.5 / 11 / 11.5 / 12 — seven
 * sizes inside three pixels, which is not a scale, just seven components that
 * fail to match. An earlier pass floored them at 11px on phones only, on the
 * reasoning that the desktop scale was deliberate. It is not: 9px is below the
 * legibility floor on any screen, and the two smallest are carrying real
 * content, not ornament — .about-caption is the museum credit for the plate and
 * .about-side-note states the closed-world rule. Same floor everywhere. */
.topbar-inner,
.nav-links a .num,
.about-caption,
.card .num .tag,
.lab-img .badge,
.annot,
.annot.coord,
.brand-meta,
.coord,
.partner small,
.pill .count,
.about-side-note,
.capabilities-art .ribbon,
.cta-art .ribbon,
.hero-art .index,
.lab .num-row,
.labs-meta .meta-text,
.meta,
.sec-rule,
.side-rail .rail-text,
.wire-item .wire-coord,
.wire-item .wire-role,
.wire-title span,
.work-card .small-label,
.work-rule { font-size: 11px; }

/* Seven section headlines came out at seven sizes — 64, 66, 68, 72, 74.9, 77.8
 * and 95px at 1440 — because each one got its own clamp() ramp: three of them
 * differ only in the vw coefficient with identical endpoints. The 95px one is a
 * section heading set larger than the page's own h1, which inverts the
 * hierarchy. Two ramps replace the twelve: one for the hero, one for sections,
 * so the h1 is the largest thing on the page and the seven sections match. */
.hero h1,
h1.display { font-size: clamp(40px, 5.2vw, 74px); }
.section-header h2,
.about h2.display,
.capabilities h2.display,
.labs-head h2,
.method-head h2,
.work-copy h2,
.cta h2.display { font-size: clamp(30px, 4.1vw, 56px); }

/* The closing wordmark is nowrap inside an overflow-hidden band, and its clamp
 * floors at 70px — which needs 300px for "LoreGraph." against 272px of content
 * at 320. The brand name was cropped to "LoreGrap". Nothing else on the page
 * bleeds, so this was the floor being wrong rather than a deliberate crop. */
.foot-mega .word { font-size: clamp(58px, 13vw, 200px); }

/* line-height equal to font-size, so the descenders of one line and the
 * ascenders of the next clear each other by 4.1px at 72px — 0.06em, which at
 * display size reads as touching.
 *
 * The number is set by ink, not by the em box. Inter Tight descends 0.204em and
 * Playfair's italic ascends 0.795em, so a line of one over a line of the other
 * spends 0.999em before any gap exists at all — which is why 1.06 still left
 * 3.4px between the "p" of "graph" and the "h" of "relationship". 1.12 leaves
 * about 0.12em, and that is the whole reason the value looks loose for a
 * display size: it is paying for the second typeface. */
.hero h1,
h1.display,
h2.display,
.labs-head h2,
.work-copy h2,
.section-header h2 { line-height: 1.12; }

/* Except on the Chinese and Japanese pages. Their own adaptation block sets
 * .display to 1.2, because a Han or Kana glyph fills its em box where a Latin
 * lowercase fills half of it, and this correction is appended after that block
 * — so without saying so it would undo it. 1.2 also reaches the one heading
 * that adaptation missed, the corpus h2, which carries no .display class and
 * was still at 1.0. */
html[lang='zh-CN'] .display,
html[lang='zh-CN'] .work-copy h2,
html[lang='ja'] .display,
html[lang='ja'] .work-copy h2 { line-height: 1.2; }

/* The four steps stack number, title, copy and plate in flow, and the four
 * copy blocks are 4 to 7 lines long, so the four plates landed at four
 * different heights — a 63px spread across a row that is otherwise aligned to
 * the pixel. The steps are already equal-height grid items; the plate just has
 * to sit at the bottom of one. */
.method-step { display: flex; flex-direction: column; }
.method-step .img { margin-top: auto; }
/* The numeral is an inline-block painted in the paper colour so it knocks a hole
 * in the rule threaded across the row. Turning the step into a flex column made
 * it a flex item, which stretches — so the hole became the full column width and
 * swallowed the rule. It has to keep shrinking to its own glyphs. */
.method-step .num { align-self: flex-start; }

/* Each section rule is a three-part row — roman numeral, plate caption,
 * counter — flexed with align-items:center. Below ~700px the caption wraps to
 * two lines and the numeral centres itself against both of them, landing in the
 * gap between them and hard against the caption's first character. Aligning the
 * numeral to the caption's first baseline puts it back on a line of text. */
.sec-rule { align-items: baseline; column-gap: 18px; }

/* The five filter pills need 522px and their grid column was 488px, so
 * "Catalogue" wrapped alone onto a second row while 684px of headline column
 * sat half empty beside it. The headline is smaller now and needs less of the
 * split, and the pills themselves come down from 18px of side padding to 14,
 * which is 48px off the row. Together that fits them on one line from about
 * 1200px up. Below that they still wrap — the column cannot be widened far
 * enough without starving the headline — but flex-end keeps the second row
 * flush right instead of ragged. */
@media (min-width: 1101px) {
  .labs-head { grid-template-columns: 1.15fr 1fr; }
  .pills { gap: 8px; }
  .pill { padding: 9px 14px; }
}

/* 16 characters wide, right-aligned, absolutely positioned over the plate: five
 * ragged lines averaging three words, two of them a single word. It states the
 * closed-world rule, which is the section's whole argument. Widened to a
 * readable measure — still right-aligned against the plate's edge, which is the
 * design, but no longer a classified ad. */
.about-side-note { max-width: 30ch; }

/* Same shape: a full sentence set in tracked uppercase inside 28 characters,
 * breaking as "READER, GRAPH," / "TIMELINE," / "INDEX AND ASK ALL READ" / "THE
 * SAME GRAPH." Caps at 0.18em need roughly twice the measure of lowercase. */
.labs-meta .meta-text { max-width: 44ch; letter-spacing: 0.08em; }

/* Inline code is a background plus 6px of horizontal padding on an inline box,
 * which does two things to the prose it sits in. It breaks across lines, so
 * "loregraph ingest" shipped as a chip fragment ending mid-air; and the padding
 * puts a 6px space between the chip and any punctuation that follows it, so the
 * quick-start paragraph read "uv sync , then" and "loregraph extract . One" —
 * a space before a comma, four times in four lines. The nowrap fixes the first;
 * the second needs the punctuation pulled back over the padding, which is what
 * tuck-punctuation marks up. */
.code-inline { white-space: nowrap; }
.punct-tuck { font-style: normal; margin-left: -6px; }
.code-inline.sm + .punct-tuck { margin-left: -4px; }
/* Except at 320-400px, where "loregraph extract" and "multilingual-e5-large"
 * are wider than the column and a chip that cannot break is a chip that
 * overflows. The 400px block above already releases every other nowrap for the
 * same reason; this rule comes after it, so it has to say so itself. */
@media (max-width: 400px) {
  .code-inline { white-space: normal; overflow-wrap: anywhere; }
}

/* A comma set in 800-weight Inter Tight immediately after an italic Playfair
 * word: "Strict about <em>evidence</em>, relaxed". It reads as a much heavier
 * mark than the word it belongs to. Only commas are re-set — the full stops
 * after an em are the coral and black terminal dots, which are deliberate. */
.em-punct { font-family: var(--serif); font-style: italic; font-weight: 500; }

/* The header drops all five section links below 1080px and puts nothing in
 * their place: no menu, no button, no anchors — on every tablet and phone the
 * only way to any section was to scroll the whole 17,000px page. They come back
 * as their own row under the wordmark, scrolling sideways if they have to,
 * which needs no menu state and no script. The superscript counters go: they
 * are ornament, and they are what makes each link too wide. */
@media (max-width: 1080px) {
  .nav-inner { flex-wrap: wrap; row-gap: 12px; }
  .nav-inner > nav { order: 3; width: 100%; }
  .nav-links {
    display: flex;
    gap: 22px;
    list-style: none;
    margin: 0;
    padding: 11px 0 0;
    border-top: 1px solid var(--line-soft);
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    /* Five links need 407px and a 390px phone gives the row 358px, so the last
     * one is partly off the end. The fade says so; without it a half-drawn
     * "Quick start" just looks broken. */
    mask-image: linear-gradient(90deg, #000 calc(100% - 40px), transparent);
    -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 40px), transparent);
  }
  .nav-links::-webkit-scrollbar { display: none; }
  .nav-links li { flex: 0 0 auto; }
  .nav-links a { white-space: nowrap; }
  .nav-links a .num { display: none; }
}

/* Below 1080px the footer hid its fourth and fifth columns outright, so every
 * tablet and phone lost the repository, the issue tracker, the changelog and
 * the licence. The grid already reflows to two columns at 560 and one at 400;
 * it never needed to drop the content. */
@media (max-width: 1080px) {
  .foot-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px 32px; }
  .foot-grid .foot-col:nth-child(4),
  .foot-grid .foot-col:nth-child(5) { display: block; }
}
`;

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
    name: "corrections-stylesheet",
    why: "the export has no working phone layout — the document floors at 541px wide",
    run(html) {
      if (!html.includes("</head>")) return { html, count: 0 };
      const tag = `<style>${CORRECTIONS}</style>\n`;
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
