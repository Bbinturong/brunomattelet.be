#!/usr/bin/env python3
"""
brn • std — site server with the skill-counter API.

Serves the static site exactly like `python3 -m http.server`, plus a tiny
JSON API backed by SQLite that persists the about-page skill counters.

    python3 server.py            # http://localhost:8127

Endpoints:
    GET  /api/skills             -> [{"name", "category", "count"}, ...]
    POST /api/skills/increment   {"name": "..."} -> {"name", "count"}

The database is db/skills.db, created from db/schema.sql on first run.
All queries are parameterized; unknown skill names are rejected with 404,
so the API cannot be used to grow the table or inject SQL.
"""
import json
import sqlite3
from contextlib import closing
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "db" / "skills.db"
SCHEMA_PATH = ROOT / "db" / "schema.sql"
PORT = 8127

# Loopback only. Binding to "" would publish this folder on every network the
# laptop joins, so anyone on the same wifi could browse it. Set HOST="0.0.0.0"
# deliberately if you ever need to open the preview to another device.
HOST = "127.0.0.1"


# Largest body the increment endpoint will read. The only valid payload is
# {"name": "..."}, so anything beyond this is noise or an attempt to make the
# server allocate memory on demand.
MAX_BODY_BYTES = 1024

# Only these extensions are served as site content. Everything else — the
# SQLite database, the schema, this script, dotfiles — is refused, so the
# server cannot hand out the repository it is running from. `.git` is the
# important one: it holds the whole commit history, not just what is live.
PUBLIC_SUFFIXES = {
    ".html", ".css", ".js", ".mjs", ".json", ".txt", ".xml", ".webmanifest",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".ico",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
    ".mp4", ".webm", ".mp3", ".pdf",
}


def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    # ThreadingHTTPServer serves requests concurrently; WAL lets readers run
    # alongside a writer instead of colliding on "database is locked", and the
    # busy timeout above absorbs the brief waits that remain.
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def init_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    with get_db() as conn:
        conn.executescript(SCHEMA_PATH.read_text())


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _is_public(self, path):
        """True when `path` is site content a visitor may fetch."""
        relative = Path(self.translate_path(path)).relative_to(ROOT)
        # Any dot-segment (.git, .gitignore, .claude, .DS_Store) is private.
        if any(part.startswith(".") for part in relative.parts):
            return False
        # A bare directory resolves to its index.html, which passes below.
        target = Path(self.translate_path(path))
        if target.is_dir():
            return True
        return target.suffix.lower() in PUBLIC_SUFFIXES

    def end_headers(self):
        """Disable caching for local dev, so edits to CSS/JS always show up
        on a plain reload instead of serving a stale copy."""
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/skills":
            try:
                with closing(get_db()) as conn, conn:
                    rows = conn.execute(
                        "SELECT name, category, count FROM skill_counters"
                        " ORDER BY id"
                    ).fetchall()
            except sqlite3.Error:
                return self._send_json({"error": "database unavailable"}, 503)
            return self._send_json([dict(row) for row in rows])

        try:
            allowed = self._is_public(self.path)
        except ValueError:
            allowed = False  # resolved outside ROOT
        if not allowed:
            self.send_error(404, "Not Found")
            return
        return super().do_GET()

    def do_HEAD(self):
        try:
            allowed = self._is_public(self.path)
        except ValueError:
            allowed = False
        if not allowed:
            self.send_error(404, "Not Found")
            return
        return super().do_HEAD()

    def do_POST(self):
        if self.path != "/api/skills/increment":
            return self._send_json({"error": "not found"}, 404)

        try:
            length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            return self._send_json({"error": "bad Content-Length"}, 400)
        if length > MAX_BODY_BYTES:
            return self._send_json({"error": "body too large"}, 413)

        try:
            data = json.loads(self.rfile.read(length) or b"{}")
            name = str(data["name"])
        except (ValueError, KeyError, TypeError):
            return self._send_json({"error": 'body must be {"name": ...}'}, 400)

        # `closing` returns the connection to the OS on every path — the
        # threaded server opens one per request, so leaking them adds up.
        # The inner `conn` is the transaction: commit on success, roll back
        # if a statement raises.
        try:
            with closing(get_db()) as conn, conn:
                row = conn.execute(
                    "SELECT id FROM skill_counters WHERE name = ?", (name,)
                ).fetchone()
                if row is None:
                    return self._send_json({"error": f"unknown skill: {name}"}, 404)
                conn.execute(
                    "UPDATE skill_counters"
                    "   SET count = count + 1, updated_at = datetime('now')"
                    " WHERE id = ?",
                    (row["id"],),
                )
                conn.execute(
                    "INSERT INTO skill_increments (skill_id) VALUES (?)",
                    (row["id"],),
                )
                count = conn.execute(
                    "SELECT count FROM skill_counters WHERE id = ?", (row["id"],)
                ).fetchone()["count"]
        except sqlite3.Error:
            # Busy/locked past the timeout, or a corrupt file: say so rather
            # than returning a 500 with a traceback in the log.
            return self._send_json({"error": "database unavailable"}, 503)
        return self._send_json({"name": name, "count": count})


if __name__ == "__main__":
    init_db()
    print(f"Serving on http://{HOST}:{PORT} (db: {DB_PATH})")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
