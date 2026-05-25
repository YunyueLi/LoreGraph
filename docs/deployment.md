# Deployment

This guide walks you through deploying a public **LoreGraph demo** that visitors can browse without installing anything.

```
  ┌─────────────────────────┐     ┌──────────────────────────┐     ┌──────────────────┐
  │  Cloudflare Pages       │     │  Render web service       │     │  Neon Postgres   │
  │  React + Vite SPA       │ ──▶ │  FastAPI + LoreGraph      │ ──▶ │  pgvector        │
  │  loregraph.pages.dev    │     │  loregraph-api.onrender   │     │  (serverless)    │
  └─────────────────────────┘     └──────────────────────────┘     └──────────────────┘
                                              │
                                              ▼
                                       Anthropic API
                                       (your Claude key)
```

> **What this deployment serves**: a read-only public demo of pre-extracted graphs. Visitors browse; the API key is only used when *you* ingest new books from your shell.

---

## 1. Neon — Postgres + pgvector (3 min)

1. Go to [neon.tech](https://neon.tech) and sign in with GitHub.
2. **New Project** → choose region near your Render region (US-West Oregon if you use Render's default).
3. After project creation, open **Dashboard → Settings → Extensions** and enable **`vector`**. (Or run `CREATE EXTENSION vector;` once in the SQL editor.)
4. Open **Dashboard → Connection details**.
   - Switch the connection-string format to **Pooled** (better for serverless).
   - Copy the URL — it will look like
     `postgresql://USER:PWD@ep-...-pooler.aws.neon.tech/neondb?sslmode=require`
   - **Important**: edit the prefix to `postgresql+asyncpg://` for SQLAlchemy:
     `postgresql+asyncpg://USER:PWD@ep-...-pooler.aws.neon.tech/neondb?sslmode=require`

Save the URL somewhere safe — you will paste it into Render in step 2.

---

## 2. Render — FastAPI backend (5 min)

The repository ships a `render.yaml` blueprint, so you just connect Render to GitHub and let it apply the spec.

1. Go to [render.com](https://render.com) → sign in with GitHub.
2. **New → Blueprint** → pick `YunyueLi/LoreGraph`.
3. Render reads `render.yaml` and asks you for two secrets:
   - **`ANTHROPIC_API_KEY`** — your Claude API key.
   - **`DATABASE_URL`** — paste the Neon URL from step 1.
4. Click **Apply**. First build takes ~3 min (`pip install -e . && alembic upgrade head`).
5. When the service shows **Live**, note the URL — something like `https://loregraph-q9f8.onrender.com`. Test:
   ```
   curl https://loregraph-q9f8.onrender.com/healthz
   # → {"status":"ok","version":"0.1.0.dev0"}
   ```

---

## 3. Cloudflare Pages — React frontend (3 min)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Pages → Connect to Git**.
2. Pick `YunyueLi/LoreGraph`.
3. Build settings:
   - **Framework preset**: None.
   - **Build command**:
     `cd src/loregraph/web/frontend && npm install && npm run build`
   - **Build output directory**: `src/loregraph/web/static`
   - **Root directory**: leave as repo root.
   - **Environment variable**:
     - Name `VITE_API_BASE`, value = your Render URL from step 2
       (e.g. `https://loregraph-q9f8.onrender.com`).
4. **Save and Deploy**. First build takes ~2 min.
5. You will land at `https://loregraph.pages.dev` (or whatever the random subdomain is). Note this URL.

### 3.1 Tighten Render CORS

Go back to the Render service → **Environment** → set
`LOREGRAPH_CORS_ORIGINS` to your Cloudflare Pages URL (the one you noted in step 5 above). Trigger a redeploy. This prevents random third parties from hitting your API.

---

## 4. Seed demo data (run locally, once)

The deployed site shows an empty state until you ingest at least one book. Do this from your laptop because extraction needs your Anthropic key.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export DATABASE_URL="postgresql+asyncpg://USER:PWD@ep-...-pooler.aws.neon.tech/neondb?sslmode=require"

# Public-domain demo book (already in repo):
loregraph ingest examples/yellow_wallpaper/input.txt \
  --title "The Yellow Wallpaper" --author "Charlotte Perkins Gilman"

# Run the full pipeline. ~$0.20-1.00 in Anthropic spend per short book.
loregraph extract --book-id 1

# Sanity check:
loregraph status --book-id 1
```

After this finishes, refresh `https://loregraph.pages.dev` — the graph shows up.

---

## 5. Pin the URL on the GitHub repo

```bash
gh repo edit YunyueLi/LoreGraph --homepage https://loregraph.pages.dev
```

Now the **About** card on the GitHub repo page links visitors straight to your live demo.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/healthz` 502 from Render | Free service spun down (15 min idle) | First request wakes it up; takes ~30 s |
| Pages build fails `vite: command not found` | Wrong build command | Ensure `cd src/loregraph/web/frontend && npm install && npm run build` |
| Graph empty on UI after seed | CORS or wrong `VITE_API_BASE` | Open browser devtools → Network → confirm /api/books reaches the Render host |
| `alembic upgrade head` fails on Render | pgvector extension not enabled in Neon | Run `CREATE EXTENSION vector;` in Neon's SQL editor and retry |
| API returns 500 with `connection closed` | Used non-pooled Neon URL on a serverless platform | Switch to the Pooled connection string |
