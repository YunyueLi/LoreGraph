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
are applied as the build copies each page. Read that file for the full list and
the measurements behind each one. In short:

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
- **The star count.** The live count replaced the whole button label, so
  "在 GitHub 上 Star" became "Star · 5" a moment after load on three of the four
  pages.

**Every patch asserts it matched.** If a future export changes the markup out
from under one, the build fails rather than shipping the page with the bug back
in it — so a patch that stops matching is either already fixed upstream (delete
it) or broken (rewrite it). Fixing any of these on the generating side is the
better outcome; deleting the corresponding patch is then the whole job.

Two things the patch step is careful *not* to do. The Chinese and Japanese pages
carry their own adaptation block — CJK font stacks, `font-synthesis-style: none`
so an `<em>` gets no synthetic oblique, and 1.2 leading because a Han glyph fills
its em box where a Latin lowercase fills half of it. The corrections are appended
after that block, so anything they set has to re-state the CJK value or it
silently undoes it. And the interpunct removal leaves two dots alone: Japanese's
中点 inside a word list and Chinese's 间隔号 inside a transliterated name.

Deliberately not patched, because it wants a decision rather than a regex: the
heading levels that skip from `h2` to `h4`, whose CSS selectors would have to
move with them.

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
