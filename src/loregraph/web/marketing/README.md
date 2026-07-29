# `marketing/` — the static landing site

This directory is a **build input, not a build output.** `build-landing.cjs`
copies it verbatim into `dist/`, where it becomes the site root: `/`, `/zh.html`,
`/ja.html`, `/fr.html`, the four matching `credits*.html` plate-credits pages,
the WebP plates under `assets/`, the social card and the favicon. The React app
is built separately from `../landing/` and lands at `/app.html`.

**Do not hand-edit the HTML, the CSS inside it, or the images.** They are
generated outside this repo and the whole directory is committed as-is; the next
regeneration overwrites anything edited here. To change the copy or the layout,
change it on the generating side and re-export.

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
