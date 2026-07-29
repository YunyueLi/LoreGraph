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
the reasoning; in short it rewrites the site's own URL (the export was built
against the old GitHub Pages address), lazy-loads the fifteen plates below the
fold, darkens the two palette tones that fell under 4.5:1 contrast where they
carry text, drops `.html` from internal links so navigation stops paying a
redirect, and points the two corpus cards that were `href="#"` at the README
section they quote.

**Every patch asserts it matched.** If a future export changes the markup out
from under one, the build fails rather than shipping the page with the bug back
in it — so a patch that stops matching is either already fixed upstream (delete
it) or broken (rewrite it). Fixing any of these on the generating side is the
better outcome; deleting the corresponding patch is then the whole job.

Deliberately not patched, because they want a decision rather than a regex: the
heading levels that skip from `h2` to `h4` (their CSS selectors would have to
move with them) and the alt text that runs to 576 characters on one plate.

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
