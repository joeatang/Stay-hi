#!/usr/bin/env python3
"""
Robust HTTP Server for Stay Hi Development
Handles CORS and serves files reliably
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Configuration
PORT = 5500
DIRECTORY = "public"

class RobustHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler with CORS support and better error handling"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        # Prevent caching issues
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        # More readable logging
        print(f"[{self.log_date_time_string()}] {format % args}")

def main():
    # Ensure we're in the right directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Check if public directory exists
    if not Path(DIRECTORY).exists():
        print(f"❌ Error: '{DIRECTORY}' directory not found!")
        print(f"Current directory: {os.getcwd()}")
        sys.exit(1)
    
    # Create server
    with socketserver.TCPServer(("", PORT), RobustHTTPRequestHandler) as httpd:
        print(f"🚀 Stay Hi Server starting...")
        print(f"📂 Serving directory: {Path(DIRECTORY).absolute()}")
        print(f"🌐 Local server: http://localhost:{PORT}")
        print(f"🌐 Network server: http://127.0.0.1:{PORT}")
        print(f"⚡ Press Ctrl+C to stop the server")
        print("-" * 50)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n⭐ Server stopped gracefully")
        except Exception as e:
            print(f"❌ Server error: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()