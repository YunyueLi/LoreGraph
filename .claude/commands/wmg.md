---
description: Drive the 85-book end-to-end pipeline (acquire → extract → export → wire → QA → deploy). Idempotent, resumable across turns. Uses Opus 4.7 via OpenRouter.
---

# /wmg — 85 books end-to-end

Take every book listed in the frontend landing page through the full LoreGraph 8-pass pipeline, expose all of them on the deployed landing page (reader, graph, timeline, index, full multi-language), and ship the result to GitHub open-source.

**This is a multi-day autonomous job. Do not stop until done.**

---

## Locked-in user decisions

1. **All 85 books processed locally. Source txt must NEVER be committed.**
   - `data/books/*/source.txt` is in `.gitignore`. Audit `git status` before every commit.
   - Only derived JSON exports (`data/exports/*.json`) go to GitHub — those are metadata, no copyright issue.
2. **Model: `anthropic/claude-opus-4.7` via OpenRouter.** Already wired in `.env` + `client.py`. Don't downgrade to Sonnet "to save money" — user explicitly chose Opus for quality.
3. **Budget: uncapped.** Track cumulative spend in state, never abort on cost.
4. **Quality is non-negotiable.** Visual bugs get root-caused and fixed in source. No CSS bandaids. Per [`MEMORY.md`](/Users/admin/.claude/projects/-Users-admin-Desktop-WMG/memory/MEMORY.md): fix the real cause, not the symptom.
5. **Multi-language is end-to-end.** Source text in original script (zh/en/es/etc.), UI labels via i18n, entity canonical names preserved in original language. LLM prompts stay English (Opus 4.7 handles all source languages natively).

---

## State file — `.goal/state.json`

Single source of truth. Read at the start of every turn. Write atomically (tmp + rename) at the end. If lost, the pipeline must be safely re-runnable from manifest.

```json
{
  "schema": 1,
  "phase": "init|manifest|acquire|extract|export|wire|qa|deploy|done",
  "started_at": "<iso8601>",
  "updated_at": "<iso8601>",
  "turns": 0,
  "cumulative_cost_usd": 0.0,
  "model": "anthropic/claude-opus-4.7",
  "books": {
    "<frontend_id>": {
      "title": "...",
      "author": "...",
      "lang": "zh|en|es|fr|...",
      "license": "public-domain|copyrighted|unknown|blocked",
      "source_url": "<where the txt came from>",
      "source_hash": "<sha256 of the txt>",
      "txt_path": "data/books/<id>/source.txt",
      "ingested_book_id": null,
      "passes_done": [],
      "export_path": "data/exports/<id>.json",
      "qa_passed": false,
      "errors": []
    }
  },
  "last_commit": "<sha>"
}
```

---

## Per-turn protocol

Every invocation:

1. Read `.goal/state.json` (init empty struct if missing).
2. Identify the current phase. Do as much work as fits this turn (caps below).
3. Update state. Atomically write back.
4. If anything still pending: `ScheduleWakeup(delaySeconds=60, prompt="/wmg", reason="<specific>")`.
5. If phase == `done`: final summary, **no** wakeup.

**Per-turn caps (to keep context manageable + cost predictable):**

| Phase    | Cap                             |
|----------|---------------------------------|
| acquire  | 10 books per turn               |
| extract  | 1 book per turn (Opus + 8 passes is heavy) |
| export   | 10 books per turn               |
| wire     | 1 visible feature per turn      |
| qa       | 1 book per turn (full 4-view walkthrough) |
| deploy   | 1 deploy attempt + sample-check |

After hitting the cap, ScheduleWakeup and stop. Don't try to fit "one more" — context bloat compounds.

---

## Phase definitions

### init
- Verify postgres is running: `pg_isready -h localhost`. If down: `brew services start postgresql@18`.
- Verify alembic at head: `uv run alembic current`. If not: `uv run alembic upgrade head`.
- Verify OpenRouter creds reach Opus 4.7 via a tiny smoke ping (use the same `LLMClient` the pipeline uses; one short prompt). Confirm `provider == "openrouter"` and `model == "anthropic/claude-opus-4.7"`.
- Verify `.gitignore` contains `data/books/*/source.txt`. If not, add it and commit (`chore: ignore source texts under data/books`).
- → phase `manifest`.

### manifest
- Locate the 85-book list in the frontend (likely `frontend/src/data.js` or sibling). Use `Agent` with `subagent_type=Explore` if not obvious.
- Extract per book: `id`, `title` (in original language), `author`, `lang` ISO code.
- Seed every entry into `state.books` with `license="unknown"`.
- → phase `acquire`.

### acquire
For each book lacking `txt_path`:
1. **Project Gutenberg first** — `https://www.gutenberg.org/ebooks/search/?query=<title>+<author>`. Fetch the Plain Text UTF-8 download.
2. **Archive.org** if not on PG — try `archive.org` text streams.
3. **WebSearch + WebFetch** as last resort for clearly out-of-copyright works.
4. **Modern / in-copyright works**: still process them — user accepted "全跑但不提交 txt". Mark `license="copyrighted"`, store locally only.
5. **Truly missing**: mark `license="blocked"` with an `errors` entry. Don't fabricate sources.

Save to `data/books/<id>/source.txt` plus `data/books/<id>/meta.json` with `source_url`, `fetched_at`, `sha256`.

**Never `git add` anything under `data/books/`.**

### extract
For each book with `txt_path` and no `ingested_book_id`:
- `uv run loregraph ingest --path data/books/<id>/source.txt --title "<title>" --author "<author>" --lang <lang>` → capture book_id, write to state.
For each book with `ingested_book_id` and `len(passes_done) < 8`:
- `uv run loregraph extract --book-id <N>` (orchestrator runs passes 1–8 sequentially).
- On any pass failure: log to `errors`, **diagnose root cause** before retry. Do not blindly re-run. If the failure is structural (prompt bug, schema mismatch), fix it before retrying.
- Update `passes_done` from `pass_runs` table after each successful pass.
- Read `pass_runs.stats.cost_usd` and add to `cumulative_cost_usd`.

**1 book per turn.** Opus 4.7 on a full novel through 8 passes can run 30+ minutes and many dollars. Don't gorge.

### export
For each book where extraction is complete but `export_path` doesn't exist:

Build a single JSON shaped for the frontend consumer:
```json
{
  "metadata": {"title", "author", "lang", "frontend_id", "book_id"},
  "chapters": [{"atom_id", "title", "position", "char_offset"}],
  "entities": [{"canonical_id", "type", "subtype", "tier", "canonical_name", "attributes"}],
  "edges": [{"src_canonical_id", "dst_canonical_id", "relation", "predicate", "weight", "sentiment", "evidence_span", "confidence", "chunk_atom_id"}],
  "glucose_facts": [{"entity_canonical_id", "dimension", "time_aspect", "statement", "chunk_atom_id"}],
  "entity_notes": {"<canonical_id>": "<note_md>"},
  "counts": {"entities": <n>, "edges": <n>, "chapters": <n>, ...}
}
```

Add `scripts/export_book.py` if it doesn't exist — a single CLI: `uv run python scripts/export_book.py --book-id <N> --out data/exports/<frontend_id>.json`.

**Keyed by `frontend_id`, not DB `book_id`.** The frontend addresses books by its own id; the DB book_id is implementation detail.

Commit `data/exports/*.json` (no copyright concern — derived metadata, evidence spans are short literal substrings under fair-use length).

### wire
Modify the frontend to load `data/exports/<frontend_id>.json` instead of the hardcoded demo `data.js`:
- Add `frontend/src/exports/loader.js`: per-book dynamic import + memoization.
- Replace the demo-data reads in graph view, reader view, timeline view, index view.
- Keep `data.js` as a graceful-degradation fallback for any book without an export yet — this matters while we're mid-rollout.
- Multi-language pass: ensure `canonical_name` renders in original script. If aliases are needed (Romanization, alt translations), store them in `entity.attributes.aliases` JSONB — no migration.
- Run dev server. `preview_start`. Walk through at least one PG book + one in-copyright book + one Chinese book. Check console for errors.

One visible feature per turn. Commit each as a conventional commit (`feat: wire exports loader for graph view`, etc.).

### qa
For every book in `state.books` with `qa_passed=false`:
1. `preview_start` if not running.
2. `preview_eval("window.location.hash = '#/book/<frontend_id>'")` to navigate.
3. **Graph view**: `preview_snapshot` — confirm nodes visible, edges drawn, no console errors via `preview_console_logs`.
4. **Reader view**: chapter list non-empty, first chapter renders.
5. **Timeline view**: events present, Roman numerals don't overflow, no z-index bugs.
6. **Index view**: entity list populated, search works.
7. **Side panel**: click an entity, confirm all 6 sections render (`[CONTEXT]`/`[FACTS]`/`[INFERENCES]`/`[BEHAVIOR_PATTERN]`/`[GAPS]`/`[EVIDENCE]`). Confirm `subtype` and `tier` chips show on Agent entities.
8. **Multi-language**: for non-English books, confirm UI labels are translated and original-script entity names render correctly (no mojibake).
9. **On any bug**: read the React source, find the root cause, edit, re-verify. **Never patch a symptom.** Examples of forbidden bandaids: `display:none` to hide a broken element, `try/catch` swallowing errors, `?? "—"` masking missing data.
10. Flip `qa_passed=true` only when every check passes clean. Log any fixes in errors with `[FIXED]` prefix.

1 book per turn. Schedule next.

### deploy
When all 85 are `qa_passed=true`:
1. `uv run ruff format && uv run ruff check && uv run mypy src && uv run pytest -m unit`. Fix anything that fails before proceeding.
2. Commit any pending changes (conventional commits, one logical feature per commit).
3. Push to `origin main`.
4. Identify the deploy target: check `frontend/package.json` for a `deploy` script, look for `.github/workflows/`, look for a Vercel/Cloudflare/Netlify config. Trigger or wait for deploy.
5. Sample-verify 5 random books on the live URL (use `preview_start` with the production URL or fetch + grep critical markers).
6. Any failure → drop those books back to phase `wire`.
7. → phase `done`.

### done
Final report:
- `85 / 85 books · X entities · Y edges · Z chapters total`
- `cumulative spend $A.BC over N turns over D days`
- `live URL: <...>`
- `repo: <...>`

Do **not** ScheduleWakeup. Stop.

---

## Hard rules

1. **No source.txt in commits.** Before `git add`, run `git status --short` and refuse the commit if `data/books/.*/source\.txt` matches anything staged.
2. **Root-cause fixes only.** [feedback_root-cause-fixes.md] — fix the cause, not the symptom. No `try/except: pass` to silence pipeline failures. No CSS hacks to hide broken UI.
3. **State file is the truth.** Conversation context can be compacted or wiped at any point. The state file must let any fresh turn resume cleanly.
4. **Honest cost accounting.** Every turn's user-facing summary reports `cumulative_cost_usd` delta. Pull from `pass_runs.stats` to compute actuals.
5. **No mocking in QA.** Hit real exports through the real preview server. `respx` is for unit tests, not for declaring a book "qa_passed".
6. **Stop conditions**: only when phase == `done`. Compaction does not mean stop.

---

## Per-turn user-facing summary

End every turn with exactly this block, nothing else:

```
phase: <name>
this turn: <one line — what advanced>
books: acquired <a>/85 · extracted <b>/85 · exported <c>/85 · qa <d>/85
spend: $<x>.xx this turn / $<X>.XX cumulative
errors: <n> (see .goal/state.json)
next: <ScheduleWakeup scheduled at +Ns | DONE>
```

No filler, no apologies, no "great progress". Just the report.
