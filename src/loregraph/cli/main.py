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
        "  1. Copy .env.example to .env and set ANTHROPIC_API_KEY\n"
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
    asyncio.run(run_extract(book_id=book_id, from_pass=from_pass, to_pass=to_pass))
    console.print(f"[green]Extraction done[/]: book_id={book_id}, passes={from_pass}-{to_pass}")


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
    """Launch the FastAPI + React web UI."""
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


if __name__ == "__main__":
    app()
