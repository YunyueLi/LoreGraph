"""LoreGraph CLI entrypoint."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from loregraph import __version__
from loregraph.cli._runner import (
    run_extract,
    run_ingest,
    run_status,
)

app = typer.Typer(
    name="loregraph",
    help="Knowledge graphs from closed-world fiction, with evidence on every edge.",
    no_args_is_help=True,
    add_completion=False,
)
console = Console()


def _version_callback(value: bool) -> None:
    if value:
        typer.echo(f"loregraph {__version__}")
        raise typer.Exit()


@app.callback()
def _root(
    version: bool = typer.Option(
        False,
        "--version",
        "-V",
        callback=_version_callback,
        is_eager=True,
        help="Show version and exit.",
    ),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable debug logging."),
) -> None:
    """LoreGraph — knowledge graphs from closed-world fiction."""
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)-5s %(name)s :: %(message)s",
    )


@app.command()
def init() -> None:
    """Print the bootstrap checklist (DB + .env) for a fresh clone."""
    typer.echo(
        "loregraph init — bootstrap checklist:\n"
        "  1. Copy .env.example to .env and set OPENROUTER_API_KEY (or your provider's key)\n"
        "  2. docker compose up -d\n"
        "  3. alembic upgrade head\n"
        "  4. loregraph ingest <path> --title <name>\n"
        "  5. loregraph extract --book-id <id>\n"
    )


@app.command()
def ingest(
    path: Path = typer.Argument(..., exists=True, dir_okay=False, readable=True),
    title: str = typer.Option(..., "--title", help="Book title."),
    author: str = typer.Option("", "--author", help="Book author."),
    language: str = typer.Option("en", "--language", help="Two-letter language code."),
) -> None:
    """Ingest a closed-world text into the database."""
    book_id = asyncio.run(
        run_ingest(
            path=path.resolve(),
            title=title,
            author=author,
            language=language,
        )
    )
    console.print(f"[green]Ingested[/]: book_id=[bold]{book_id}[/], title={title!r}")


@app.command()
def extract(
    book_id: int = typer.Option(..., "--book-id", help="ID of the ingested book."),
    from_pass: int = typer.Option(1, "--from", min=1, max=8, help="First pass to run."),
    to_pass: int = typer.Option(8, "--to", min=1, max=8, help="Last pass to run."),
) -> None:
    """Run the full extraction pipeline (Pass-1..Pass-8)."""
    from loregraph.pipeline.orchestrator import CostCeilingError

    try:
        asyncio.run(run_extract(book_id=book_id, from_pass=from_pass, to_pass=to_pass))
    except CostCeilingError as exc:
        console.print(f"[yellow]Stopped on budget[/]: {exc}")
        raise typer.Exit(1) from exc
    console.print(f"[green]Extraction done[/]: book_id={book_id}, passes={from_pass}-{to_pass}")


@app.command()
def export(
    book_id: int = typer.Option(..., "--book-id", help="ID of the extracted book."),
    frontend_id: str = typer.Option(..., "--frontend-id", help="Frontend id for the export."),
    out: Path = typer.Option(..., "--out", help="Output JSON path."),
    license_: str = typer.Option("public-domain", "--license", help="public-domain | copyrighted."),
    max_entities: int = typer.Option(0, "--max-entities", help="Cap to top-N by degree (0 = all)."),
) -> None:
    """Export an extracted book to frontend-ready JSON."""
    import json

    from loregraph.exporters.book_export import export_book

    meta = asyncio.run(export_book(book_id, frontend_id, license_, out.resolve(), max_entities))
    console.print(f"[green]Exported[/] {frontend_id}: {json.dumps(meta['counts'])} -> {out}")


@app.command()
def i18n(
    frontend_id: str = typer.Option(..., "--frontend-id", help="Frontend id (reads its export)."),
) -> None:
    """Translate a book's entity names + glosses into the UI locales."""
    from loregraph.exporters.translate import run

    asyncio.run(run(frontend_id))


@app.command()
def factions(
    book_id: int = typer.Option(..., "--book-id", help="ID of the extracted book."),
    frontend_id: str | None = typer.Option(
        None, "--frontend-id", help="Required with --factions-only."
    ),
    limit: int = typer.Option(0, "--limit", help="Only the top-N by degree (0 = all)."),
    dry_run: bool = typer.Option(False, "--dry-run", help="Print results, write nothing."),
    factions_only: bool = typer.Option(
        False, "--factions-only", help="Just localize existing DB factions."
    ),
) -> None:
    """Re-run LLM canonicalization (names / factions) on an extracted book."""
    from loregraph.exporters.canonicalize_cli import run, run_factions

    if factions_only:
        if not frontend_id:
            raise typer.BadParameter("--factions-only requires --frontend-id")
        asyncio.run(run_factions(book_id, frontend_id))
    else:
        asyncio.run(run(book_id, limit, dry_run))


@app.command()
def view(
    host: str = typer.Option("127.0.0.1", "--host", help="Bind address."),
    port: int = typer.Option(8000, "--port", help="HTTP port."),
    reload: bool = typer.Option(False, "--reload", help="Auto-reload on code change."),
    book_id: int | None = typer.Option(
        None,
        "--book-id",
        help="Optional: print a direct link to this book's graph.",
    ),
) -> None:
    """Launch the FastAPI query API (optional; the public site is static)."""
    import uvicorn

    base = f"http://{host}:{port}"
    console.print(f"[green]Starting LoreGraph[/] at [bold]{base}[/]")
    if book_id is not None:
        console.print(f"  Graph: {base}/?book_id={book_id}")
    console.print(f"  API : {base}/api/books")
    console.print(f"  Docs: {base}/docs")
    uvicorn.run(
        "loregraph.web.server:app",
        host=host,
        port=port,
        reload=reload,
    )


@app.command()
def status(book_id: int = typer.Option(..., "--book-id", help="ID of the book.")) -> None:
    """Show pass-by-pass extraction status, cost, and counts."""
    runs = asyncio.run(run_status(book_id=book_id))
    if not runs:
        console.print(f"No pass runs recorded yet for book_id={book_id}.")
        return
    table = Table(title=f"Pass runs · book_id={book_id}")
    table.add_column("Pass", justify="right")
    table.add_column("Status")
    table.add_column("Stats summary")
    table.add_column("Error", overflow="fold")
    for r in runs:
        summary = ", ".join(
            f"{k}={v}"
            for k, v in r.stats.items()
            if k in {"chunks", "mentions", "chunks_processed", "elapsed_sec"}
        )
        table.add_row(str(r.pass_num), r.status.value, summary, r.error or "")
    console.print(table)


@app.command(name="eval")
def eval_(
    which: str = typer.Argument(
        "all",
        help="graph · gaps · perturbation · contamination · entailment · all",
    ),
    book: str = typer.Option("all", "--book", "-b", help="Book id from data/exports, or 'all'."),
    as_json: bool = typer.Option(False, "--json", help="Machine-readable output."),
    budget: int = typer.Option(150, "--budget", help="Claims to sample for entailment."),
    probes: int = typer.Option(24, "--probes", help="Questions for contamination."),
    examples: int = typer.Option(3, "--examples", help="Example findings to print."),
) -> None:
    """Score the extraction, not just count it.

    `graph` and `gaps` need no model or credentials. The other three run a dry
    preview without a provider — showing exactly what would be sent — and the
    full comparison with one.
    """
    from loregraph.evals import contamination, entailment, gaps, graph_usability, perturbation
    from loregraph.evals.corpus import available_books, load_book
    from loregraph.evals.report import render

    books = available_books() if book == "all" else [book]
    if not books:
        console.print(
            "[yellow]No exports found in data/exports.[/yellow] "
            "Run `loregraph export --book-id N --frontend-id NAME --out data/exports/NAME.json` "
            "first."
        )
        raise typer.Exit(1)

    from collections.abc import Callable

    from loregraph.evals.corpus import BookUnderTest
    from loregraph.evals.report import EvalResult

    registry: dict[str, Callable[[BookUnderTest], EvalResult]] = {
        # No model, no credentials.
        "graph": graph_usability.run,
        "gaps": gaps.run,
        # These fall back to a dry preview when no provider is configured,
        # printing exactly what would be sent rather than failing or, worse,
        # silently scoring a subset.
        "perturbation": lambda b: asyncio.run(perturbation.run(b, per_kind=2)),
        "contamination": lambda b: asyncio.run(contamination.run(b, limit=probes)),
        "entailment": lambda b: asyncio.run(entailment.run(b, budget=budget)),
    }
    if which != "all" and which not in registry:
        console.print(f"[red]Unknown eval {which!r}.[/red] Choose: {', '.join(registry)}, all")
        raise typer.Exit(2)
    chosen = list(registry) if which == "all" else [which]

    results = []
    for book_id in books:
        loaded = load_book(book_id)
        for name in chosen:
            results.append(registry[name](loaded))

    typer.echo(render(results, as_json=as_json, examples=examples))


if __name__ == "__main__":
    app()
