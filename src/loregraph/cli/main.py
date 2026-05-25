"""litgraph CLI entrypoint.

In v0.1.0.dev0 every subcommand is a stub that prints which PR will implement it.
"""

from __future__ import annotations

import typer

from litgraph import __version__

app = typer.Typer(
    name="litgraph",
    help="Knowledge graphs from closed-world fiction, with evidence on every edge.",
    no_args_is_help=True,
    add_completion=False,
)


def _version_callback(value: bool) -> None:
    if value:
        typer.echo(f"litgraph {__version__}")
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
) -> None:
    """litgraph — knowledge graphs from closed-world fiction."""


@app.command()
def init() -> None:
    """Scaffold a litgraph.yaml and run database migrations."""
    typer.echo("init: not implemented yet (PR #2)")
    raise typer.Exit(code=1)


@app.command()
def ingest(
    path: str = typer.Argument(..., help="Path to the input text file."),
    title: str = typer.Option(..., "--title", help="Book title."),
    author: str = typer.Option("", "--author", help="Book author."),
) -> None:
    """Ingest a closed-world text into the database."""
    typer.echo(
        f"ingest: path={path!r} title={title!r} author={author!r} "
        "— not implemented yet (PR #3)"
    )
    raise typer.Exit(code=1)


@app.command()
def extract(
    book_id: int = typer.Option(..., "--book-id", help="ID of the ingested book."),
    from_pass: int = typer.Option(1, "--from", min=1, max=7, help="First pass to run."),
    to_pass: int = typer.Option(7, "--to", min=1, max=7, help="Last pass to run."),
    resume: bool = typer.Option(False, "--resume", help="Resume after the last completed pass."),
) -> None:
    """Run the 7-Pass extraction pipeline on an ingested book."""
    typer.echo(
        f"extract: book_id={book_id} from=pass{from_pass} to=pass{to_pass} "
        f"resume={resume} — not implemented yet (PR #3+)"
    )
    raise typer.Exit(code=1)


@app.command()
def view(
    book_id: int = typer.Option(..., "--book-id", help="ID of the extracted book."),
    port: int = typer.Option(8000, "--port", help="Web UI port."),
) -> None:
    """Launch the FastAPI + React web UI for an extracted book."""
    typer.echo(f"view: book_id={book_id} port={port} — not implemented yet (PR #6)")
    raise typer.Exit(code=1)


@app.command()
def status(
    book_id: int = typer.Option(..., "--book-id", help="ID of the book."),
) -> None:
    """Show pass-by-pass extraction status, cost, and match rate."""
    typer.echo(f"status: book_id={book_id} — not implemented yet (PR #3)")
    raise typer.Exit(code=1)


if __name__ == "__main__":
    app()
