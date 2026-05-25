# LoreGraph Frontend

React + Vite + Cytoscape.js + Tailwind, single-page graph explorer for the LoreGraph backend.

## Local dev

```bash
# 1. Start the FastAPI backend in another shell:
loregraph view --port 8000

# 2. Then in this directory:
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` to `localhost:8000`.

## Production build

```bash
npm run build
```

Output lands in `../static/`, which the FastAPI app mounts at `/`.
After `npm run build`, just running `loregraph view` serves the built UI on the same origin as the API.

## Layout

- `src/types.ts` — TypeScript mirror of `loregraph.web.schemas`. Keep in sync with the server.
- `src/api/client.ts` — TanStack Query hooks over the FastAPI endpoints.
- `src/components/`
  - `Header.tsx` — top bar with book selector and GitHub link.
  - `GraphView.tsx` — Cytoscape.js wrapper. Cose-bilkent layout, colour-by-type nodes, colour-by-relation edges.
  - `EvidencePanel.tsx` — right-side detail panel for the selected node / edge.

## Style

- Tailwind tokens in `tailwind.config.js` define the type-coloured palette.
- `index.css` ships a handful of semantic component classes (`chip-agent`, `chip-relation`, `panel`).
- No UI component library — v0.1 is intentionally lean. shadcn/ui can be layered on top later if forms grow.
