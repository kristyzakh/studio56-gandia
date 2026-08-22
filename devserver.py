#!/usr/bin/env python3
"""
Dev server for the Studio 56 site.

Same as `python3 -m http.server`, but sends no-cache headers on every response.
Without this, phones aggressively cache HTML, CSS and images, so edits appear
not to have landed — which costs more time than it sounds like it should.
Not for production; this is a local preview server only.
"""
import http.server
import socketserver
import time
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4056
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        # /fresh            -> index.html with a one-off token
        # /fresh/precios    -> precios.html with a one-off token
        # A URL the phone has never seen cannot be served from its cache, which
        # is the only reliable way past iOS Safari holding an old copy.
        if self.path == "/fresh" or self.path.startswith("/fresh/"):
            page = self.path[len("/fresh/"):] if self.path.startswith("/fresh/") else ""
            page = page.strip("/") or "index"
            if not page.endswith(".html"):
                page += ".html"
            target = f"/{page}?t={int(time.time())}"
            self.send_response(302)
            self.send_header("Location", target)
            self.end_headers()
            return
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # keep the log readable: only show non-200s and page loads
        msg = fmt % args
        if " 200 " not in msg or ".html" in msg:
            sys.stderr.write("%s\n" % msg)


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    with ReusableTCPServer(("0.0.0.0", PORT), NoCacheHandler) as httpd:
        print(f"Studio 56 dev server (no-cache) on port {PORT}, serving {ROOT}")
        httpd.serve_forever()
