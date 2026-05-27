# LoreGraph web

Two separate things live here:

- **`frontend/`** — the React + Vite + TypeScript app (backend-connected UI, served by `loregraph view`).
- **`landing/`** — the static **GitHub Pages landing page** (the design workbench). Self-contained: React + plain CSS, all assets via CDN (React, Google Fonts, public-domain covers). No local binaries.

## Landing page — preview locally

The editable source is `landing/`. It runs with in-browser Babel, so no build is needed for a quick look:

```bash
node serve-landing.cjs            # → http://localhost:4178
```

## Landing page — publish to GitHub Pages

Live site: **https://yunyueli.github.io/LoreGraph/**

```bash
cd frontend
npm install        # first time on a machine
npm run deploy     # build landing/ → dist/ (precompiled, prod React), then push to the gh-pages branch
```

`npm run deploy` works from any fresh clone — it publishes via the [`gh-pages`](https://www.npmjs.com/package/gh-pages) package using the repo's `origin` remote, so there's no branch or worktree to set up by hand. `build-landing.cjs` does the build; `gh-pages` does the publish.

### Cross-device workflow

1. `git clone git@github.com:YunyueLi/LoreGraph.git`
2. `cd LoreGraph/src/loregraph/web/frontend && npm install`
3. edit files under `../landing/`, then `npm run deploy`

Daily: `git pull` before you start, `git add -A && git commit -m "…" && git push` when you're done.
