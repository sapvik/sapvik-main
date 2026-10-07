"""
SAPVIK Static Local Development Server
NOTE: Cloudflare Pages Functions (/api/audit, /api/contact, and edge middleware)
are implemented exclusively in functions/ and executed via `wrangler pages dev`.
API handlers in server.py are retired to maintain a single source of truth.
"""

import http.server
import socketserver
import os

PORT = 8081
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVE_DIR = os.path.join(BASE_DIR, 'dist') if os.path.exists(os.path.join(BASE_DIR, 'dist')) else os.path.join(BASE_DIR, 'public')


class StaticOnlyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SERVE_DIR, **kwargs)

    def do_POST(self):
        # Direct users to Cloudflare Pages Functions runtime
        self.send_response(501)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(
            b'{"error": "api_retired_in_python_server", "message": "API endpoints are hosted by Cloudflare Functions in functions/. Run `npx wrangler pages dev public --port 8082`."}'
        )

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()


if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), StaticOnlyHandler) as httpd:
        print(f"SAPVIK Static Server active on http://127.0.0.1:{PORT} serving {SERVE_DIR}")
        print("For edge functions and API testing, run: npx wrangler pages dev public --port 8082")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
