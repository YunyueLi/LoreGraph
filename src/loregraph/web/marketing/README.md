# `marketing/` — the static landing site

This directory is a **build input, not a build output.** `build-landing.cjs`
copies it into `dist/`, where it becomes the site root: `/`, `/zh`, `/ja`, `/fr`,
the four matching `credits*` plate-credits pages, the WebP plates under
`assets/`, the social card and the favicon. The React app is built separately
from `../landing/` and lands at `/app`.

**Do not hand-edit the HTML, the CSS inside it, or the images.** They are
generated outside this repo and the whole directory is committed as-is; the next
regeneration overwrites anything edited here. To change the copy or the layout,
change it on the generating side and re-export.

## The patch step

Because a hand edit here would not survive that re-export, the fixes the current
export still needs live in [`../marketing-patch.cjs`](../marketing-patch.cjs) and
are applied as the build copies each page. Two of them are large enough to be
their own files, in the shape they would take upstream:

| File | What it is |
|---|---|
| [`../marketing-corrections.css`](../marketing-corrections.css) | the corrections stylesheet, inlined into each `<head>` after the export's own |
| [`../marketing-copy-edits.json`](../marketing-copy-edits.json) | the copy edits, keyed by language, the same shape as the upstream copy deck |

Read the patch file for the full list and the measurements behind each one. In
short:

- **The site's own URL.** The export was built against the old GitHub Pages
  address, so `canonical` pointed crawlers at a stale mirror and `og:image` at a
  404 — no social card image on any of the four pages.
- **A phone layout.** `.hero-stats` was `flex-wrap: nowrap`, so its 524px
  min-content sized the hero grid's only column and floored the whole document at
  541px wide: every phone scrolled sideways. The header also hid its links *and*
  its call to action below 1080px with no menu in their place.
- **A way into the app.** The only links to it were five 28px arrows starting
  6396px down a 16000px page; the most prominent button on the site was "Star on
  GitHub". The app is now the primary action in the header and the hero, in all
  four languages.
- **Contrast.** Two palette tones and three filled buttons sat under 4.5:1.
- **Weight.** The fifteen plates below the fold are lazy; the hero preloads. The
  four webfont families were requested twice, by `<link>` and again by an
  `@import` inside the inline stylesheet.
- **Links.** `.html` dropped from internal links, so navigation stops paying a
  redirect; the two corpus cards that were `href="#"` now open the README section
  they quote.
- **One headline size.** Twelve `clamp()` ramps produced seven section headlines
  at seven sizes — 64 to 95px at 1440, three of the ramps differing only in the
  vw coefficient — and the largest of them was a section heading set bigger than
  the page's own `h1`. Two ramps replace the twelve.
- **Leading.** `line-height` equalled `font-size` on every display heading, which
  left 4.1px between one line's descenders and the next line's ascenders at 72px.
  Playfair's italic ascender is 9% taller than Inter Tight's cap, so a line of
  one over a line of the other spends 0.999em before any gap exists.
- **A type floor.** The small end ran 9 / 9.5 / 10 / 10.5 / 11 / 11.5 / 12px —
  seven sizes inside three pixels. The two smallest carried real content: the
  museum credit under the plate and the note stating the closed-world rule.
- **Measure.** That note was 16 characters wide, right-aligned over the plate,
  five ragged lines with two of them a single word. The reading-room caption was
  a whole sentence in tracked uppercase inside 28 characters.
- **Punctuation.** Inline code is a background plus 6px of padding on an inline
  box, so the quick start read "uv sync , then" and "loregraph extract . One",
  and a chip could break across lines mid-background. A comma after an italic
  `<em>` was set in the headline's 800-weight sans.
- **Alignment.** The four pipeline steps stacked plate under copy in flow, and
  the four copy blocks are 4 to 7 lines long, so the plates landed at four
  different heights across a row aligned to the pixel elsewhere.
- **Navigation on a phone.** The header dropped all five section links below
  1080px with nothing in their place, and the footer hid two whole columns —
  the repository, the issues, the changelog and the licence.
- **One header, not two bands.** The top bar and the header had the same
  background, the same width and the same 11px tracked caps, separated by one
  hairline, so they read as a single 124px beige block with a stray line through
  it. Three of the bar's four items already appeared within two rows: the
  wordmark (the nav's own brand mark), "v0.1.0-dev" and "Alpha" (one fact twice,
  and again in the footer), "Apache-2.0 / Python 3.11+" (also the brand meta,
  also the footer). The fourth, the language switcher, moved into the header and
  the bar went.
- **Furniture that fits its column.** Each section rule centred its plate
  caption by accident — `space-between` across three unequal items, landing 26px
  off the centre line at 1150 and somewhere else at every other width, six times
  down the page. And the section-summary row was placed inside the left grid
  column, whose 495px is exactly its three children's minimum, so the four
  claims wrapped to two ragged lines and "One rule / ≥ 95%" was crushed into
  57px — three words over five lines.
- **The star count.** The live count replaced the whole button label, so
  "在 GitHub 上 Star" became "Star · 5" a moment after load on three of the four
  pages.

- **Copy said two things twice.** The page carries 594 words of body copy across
  24 blocks, which is lean for seven sections — so the problem was never length.
  It was that one 10-word clause ("claim carries an `evidence_span`, a literal
  substring of the source") and one 7-word clause ("source text stays in its
  original script") each appeared twice, word for word, in different sections.
  Each clause now stays where it belongs and goes everywhere else. Two more, not
  about repetition: the engineering lead's colon promised four points of
  comparison and delivered four LoreGraph features, and the reference set
  localised four of its five book titles per language but left 西游记 in Chinese
  on the English and French pages while translating *Crime and Punishment* out of
  Russian on both.

  **This one belongs upstream more than any of the others.** The copy deck is a
  single JSON file of `{en, zh, ja, fr}` strings; these edits are exact-string
  replacements standing in for it. Move them into the deck and delete the patch.

- **Weight, again.** Both stylesheets document themselves in prose — nearly every
  rule records the measurement behind it, and the corrections file is 70% comment
  by weight. That belongs in the repo, not in the `<head>` of eight pages: 28 KB
  of build notes per page, 23% of every byte a reader downloads, ahead of anything
  that paints. The pages now ship without it and the prose stays here. English `/`
  went from 119 KB to 92 KB, and from 30 KB to 19 KB over the wire.

- **Frames the shape of the plates in them.** Every plate is 1024×1024 or
  768×1024, and five of the seven frames declare the ratio their plates actually
  are. Two did not, and `object-fit: cover` discarded the difference without
  saying so. `.work-card .img` was 4/3 around a 3/4 plate — not a trim but a
  landscape window onto a portrait picture, the plate scaled up 1.78× and 22% cut
  off each end: the Botticelli sheet lost all three figures' heads and showed a
  band of drapery, and the fan-shaped calligraphy was enlarged until it touched
  the edges. `.lab-img` was 4/5 around the same 3/4 shape — 6% of the height,
  which is exactly where the corner registration marks sit, on five plates in a
  row. The frames now take the plates' ratio and `cover` has nothing left to cut.

- **Things said more than once.** Five reading-room cards each carried the same
  status word — "Shipped", "已上线", "実装済み", "Livré" — a column whose every cell
  holds one value, which is a fact about the set and not about any row. The set's
  own annotation takes it instead: "Five views" became "Five views, all built".
  Each plate also carried a chip (Text, Graph, Time, Index, Ask) 12px above a
  heading reading Reader, Graph, Timeline, Index, Ask — four the same word twice
  and two *nearly* the same, which is worse, because the reader has to work out
  whether "Text" and "Reader" are one view or two. And "eight passes, one gate"
  appeared three times as an ornament in a metadata slot, on a page that already
  states the fact twice where it is doing work: the hero's stat block and the
  pipeline section's own heading.

- **One size for the same job.** Card body copy — a short paragraph inside a card
  — was 13px in the reading room, 13.5px in the pipeline steps and the capability
  cards, and 14px in the corpus cards. Nobody reads a half-pixel as a distinction,
  so the difference carried no meaning; it recorded that four sections were drawn
  at four different times. And the section lead was 16px in three sections and
  17px in one. Both are now one value.

**Every patch asserts it matched.** If a future export changes the markup out
from under one, the build fails rather than shipping the page with the bug back
in it — so a patch that stops matching is either already fixed upstream (delete
it) or broken (rewrite it). Fixing any of these on the generating side is the
better outcome; deleting the corresponding patch is then the whole job.

The copy edits assert harder: each replacement must match **exactly once** on its
page, because these are sentences and a near-miss would ship half an edit. That
caught two mistakes while it was being written — a guard that mistook the credits
pages for landing pages, and a French colon preceded by U+202F rather than a
plain space.

Three more assertions guard fixes that would otherwise fail invisibly. The
header's copy of the paper texture is compared against the export's own
`body::before` rather than trusted, because the two live in different files now
and an export that re-tuned its texture would leave the copy quietly mismatched —
the tone seam back, one shade smaller and much harder to see. Every plate's real
pixel dimensions are read out of its WebP header and compared with the ratio its
frame declares, because that fix depends on two things this repo does not control:
the plates come from the design project, the frames from the exported stylesheet.
A re-export that changes either fails the build with the arithmetic — "cover
throws away 44% of its height" — instead of cropping the artwork again in silence.
And the comment stripper is quote-aware and checked for idempotence: a bare regex
would swallow a live rule if a stylesheet ever carried `content: "/*"`, and the
page would still build.

## Measured, and deliberately not fixed here

The reading room's five plates hold objects of very different visual weight. Ink
covers 58% of the first plate's area, 49% of the second, then 28%, 23% and 22% — a
2.6× spread across one row, which is why the row reads as unfinished next to the
rest of the page.

CSS cannot honestly close that gap. Two of the five objects are landscape — a
hanging scroll and a type specimen — inside a portrait frame, and a third is a wide
krater. Scaling any of them until its ink matched the manuscript leaf's would push
it past the frame's sides and cut the object itself rather than its mount; matching
by ink area instead of height does the same to the scroll. The fix is to re-mount
those plates larger on their sheet, upstream, where the crop takes paper.

It is also the one correction that could not assert itself if it were done by eye.
Per-plate zoom factors are tuned to particular pictures, and a re-export would
apply the old numbers to new images with nothing to catch it. The ratio rule can be
checked, so the ratio rule is what lives here.

The spacing scale is undisciplined and is left alone. There are 26 distinct gap
values between 3px and 80px, seven of them used exactly once and sitting next to a
well-used neighbour — 7 beside 8, 9 beside 10, 38 beside 36 and 40, 48 beside 50.
Rounding a single-use 7px gap to 8px is a change no reader can see, and it would
add seven more values that must not drift, on a page where every change has to be
re-measured at every width in four languages. This is a design-token decision for
the generating side, not a build patch.

The type scale's small end is also still busier than it needs to be: 13px and
13.5px both survive outside the card copy, on footer links and a "read more". Those
are different roles from card body copy, so they were not swept up with it, but
there is no reason for the page to hold both.

Two things the patch step is careful *not* to do. The Chinese and Japanese pages
carry their own adaptation block — CJK font stacks, `font-synthesis-style: none`
so an `<em>` gets no synthetic oblique, and 1.2 leading because a Han glyph fills
its em box where a Latin lowercase fills half of it. The corrections are appended
after that block, so anything they set has to re-state the CJK value or it
silently undoes it. And the interpunct removal leaves two dots alone: Japanese's
中点 inside a word list and Chinese's 间隔号 inside a transliterated name.

## Where it comes from

An Open Design project holds the source and four scripts:

| Script | Produces |
|---|---|
| `build-plates.py` | the 16 collage plates, from Met Open Access (CC0) objects, plus `plates.json` and `CREDITS.md` |
| `build-page.py` | the four landing pages from one copy deck, `loregraph-content.json` (every string as `{en, zh, ja, fr}`) |
| `build-credits.py` | the four credits pages, reusing the built pages' own `<head>` and chrome |
| `build-deploy.py` | the deployable bundle: URL-shaped filenames, PNG → WebP, the OG card |

`build-deploy.py`'s output is what gets copied here — minus its
`*.artifact.json` sidecars, which are design-tool metadata and have no business
being served.

The plates are genuine public-domain museum objects, re-processed rather than
invented, and every one of them is attributed on the credits page. That is
deliberate: a project whose whole claim is that every edge cites its source
cannot illustrate itself with pictures it made up.

## What the pages assume about the app

The fourth section links five cards into the app by query string —
`./app.html?view=reader|graph|timeline|entities|ask`. `../landing/app.jsx` reads
`?view=` against a whitelist of the views it actually renders. If a view is ever
renamed, these links break silently (they fall back to the remembered view), so
rename on both sides.
