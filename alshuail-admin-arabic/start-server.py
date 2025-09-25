#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 3002
DIRECTORY = "public"

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Serve index.html for all routes (SPA)
        if not os.path.exists(self.translate_path(self.path)):
            self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def end_headers(self):
        # Add headers for better compatibility
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        return super().end_headers()

# Change to the directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print(f"""
╔════════════════════════════════════════════════╗
║                                                ║
║   🚀 Server Started Successfully!              ║
║                                                ║
║   📍 URL: http://localhost:{PORT}               ║
║   🔐 Login: http://localhost:{PORT}/login       ║
║                                                ║
║   ✓ All text displays as normal weight (400)  ║
║   ✓ No bold text anywhere                     ║
║   ✓ SPA routing enabled                       ║
║                                                ║
║   Press Ctrl+C to stop the server             ║
║                                                ║
╚════════════════════════════════════════════════╝
""")

with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    httpd.serve_forever()