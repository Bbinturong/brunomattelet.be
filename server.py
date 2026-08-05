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
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "db" / "skills.db"
SCHEMA_PATH = ROOT / "db" / "schema.sql"
PORT = 8127


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    with get_db() as conn:
        conn.executescript(SCHEMA_PATH.read_text())


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/skills":
            with get_db() as conn:
                rows = conn.execute(
                    "SELECT name, category, count FROM skill_counters ORDER BY id"
                ).fetchall()
            return self._send_json([dict(row) for row in rows])
        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/skills/increment":
            return self._send_json({"error": "not found"}, 404)

        length = int(self.headers.get("Content-Length", 0))
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
            name = str(data["name"])
        except (ValueError, KeyError):
            return self._send_json({"error": 'body must be {"name": ...}'}, 400)

        with get_db() as conn:
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
                "INSERT INTO skill_increments (skill_id) VALUES (?)", (row["id"],)
            )
            count = conn.execute(
                "SELECT count FROM skill_counters WHERE id = ?", (row["id"],)
            ).fetchone()["count"]
        return self._send_json({"name": name, "count": count})


if __name__ == "__main__":
    init_db()
    print(f"Serving on http://localhost:{PORT} (db: {DB_PATH})")
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
