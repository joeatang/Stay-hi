#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

PORT = 7777
os.chdir('/Users/joeatang/Documents/GitHub/Stay-hi')

class QuietHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        return

try:
    with socketserver.TCPServer(("", PORT), QuietHTTPRequestHandler) as httpd:
        print(f"🚀 Tesla Hi Island Server running at http://localhost:{PORT}")
        print("✅ Schema fixes applied - ready for testing!")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n🛑 Server stopped")
except Exception as e:
    print(f"❌ Error: {e}")