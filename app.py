from __future__ import annotations

import mimetypes
import sys
import traceback
from io import BytesIO
from pathlib import Path

from web_app import BotWebHandler, ROOT, main, render_index, safe_filename


STATUS_TEXT = {
    200: "OK",
    400: "Bad Request",
    404: "Not Found",
    500: "Internal Server Error",
}


class WsgiApp:
    def __call__(self, environ, start_response):
        self.status = 200
        self.headers = []
        self.body = b""

        try:
            method = environ.get("REQUEST_METHOD", "GET").upper()
            path = environ.get("PATH_INFO", "/") or "/"
            query = environ.get("QUERY_STRING", "")

            if method == "GET" and path == "/":
                self.send_bytes(render_index(), "text/html; charset=utf-8")
            elif method == "GET" and path.startswith("/static/"):
                self.serve_file(ROOT / "static" / safe_filename(path.removeprefix("/static/")))
            else:
                self.call_web_handler(method, path, query, environ)
        except Exception:
            traceback.print_exc(file=sys.stderr)
            self.send_json({"ok": False, "message": "Server error."}, 500)

        reason = STATUS_TEXT.get(self.status, "OK")
        start_response(f"{self.status} {reason}", self.headers)
        return [self.body]

    def call_web_handler(self, method: str, path: str, query: str, environ) -> None:
        handler = object.__new__(BotWebHandler)
        handler.path = f"{path}?{query}" if query else path
        handler.headers = self.headers_from_environ(environ)
        handler.rfile = environ.get("wsgi.input", BytesIO())
        handler.wfile = BytesIO()

        handler.send_bytes = self.send_bytes
        handler.send_json = self.send_json
        handler.send_error_json = lambda message, status: self.send_json({"ok": False, "message": message}, status)
        handler.send_error = lambda status, message="Not found": self.send_json({"ok": False, "message": message}, status)

        if method == "GET":
            BotWebHandler.do_GET(handler)
        elif method == "POST":
            BotWebHandler.do_POST(handler)
        else:
            self.send_json({"ok": False, "message": "Method not allowed."}, 400)

    def serve_file(self, path: Path) -> None:
        if not path.exists() or not path.is_file() or ROOT not in path.resolve().parents:
            self.send_json({"ok": False, "message": "Not found."}, 404)
            return
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        self.send_bytes(path.read_bytes(), content_type)

    def send_bytes(self, body: bytes, content_type: str, status: int = 200) -> None:
        self.status = status
        self.body = body
        self.headers = [
            ("Content-Type", content_type),
            ("Content-Length", str(len(body))),
        ]

    def send_json(self, payload, status: int = 200) -> None:
        import json

        self.send_bytes(json.dumps(payload).encode("utf-8"), "application/json", status)

    @staticmethod
    def headers_from_environ(environ) -> dict:
        headers = {}
        if environ.get("CONTENT_TYPE"):
            headers["Content-Type"] = environ["CONTENT_TYPE"]
        if environ.get("CONTENT_LENGTH"):
            headers["Content-Length"] = environ["CONTENT_LENGTH"]
        for key, value in environ.items():
            if key.startswith("HTTP_"):
                name = key[5:].replace("_", "-").title()
                headers[name] = value
        return headers


app = WsgiApp()
application = app
handler = app


if __name__ == "__main__":
    main()
